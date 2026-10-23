/* 2v2 yeni-eski bot teşhisi: node tools/aivs2.js [--matches 40] [--diff expert] [--diffB aynı] [--aiA yeni] [--aiB eski2] [--seed 1] [--threads 4] [--tune '{"3":{"siege":0}}'] [--dump out.json] [--early 1: kule farkı 2+ olunca bitir] [--hero mage: iki takımın ilk kahramanı] [--buildA ad: A takımına items.js BUILDS adı]
   Takım kahramanları rastgele (tohumlu), her eşleşme iki kez (A takım 0 ve 1). A = aiA, B = aiB. Taraf başına maç ortalaması:
   son vuruş (minyon/canavar), ölüm sebebi (rakip kule altında, sayıca az, kule/minyon son vuruşu), kahramanların yapılara hasarı,
   yıkılan yapı, ilk kule kaybı, 5/10/15. dk servet ve XP farkı (A-B), Titan/güçlendirme, ölü geçen süre, kazanma. */
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TICK, STATS, TOWER } from '../data.js';
import { S, resetGame, step, heroWorth, totalXP } from '../sim.js';
import { BOTS } from './match.js';
import { LEVEL_IDS, LEVEL_PARAMS } from '../ai.js';
import { parseArgs, wilson } from './pool.js';

const FILE = fileURLToPath(import.meta.url);
const isMain = () => { try { return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===pathToFileURL(FILE).href; } catch { return false; } };
const mulberry=a=>()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };

function one(job){
  const undo=[];   // ayarlar maç sonunda geri alınır (aynı iş parçacığında farklı ayarlı maçlar: tools/evolve.js)
  if(job.tune) for(const [k,v] of Object.entries(job.tune)){ const L=LEVEL_PARAMS[+k]; for(const key of Object.keys(v)) undo.push([L,key,Object.prototype.hasOwnProperty.call(L,key),L[key]]); Object.assign(L, v); }
  try { return one0(job); } finally { for(const [L,key,own,val] of undo.reverse()) { if(own) L[key]=val; else delete L[key]; } }
}
function one0(job){
  const { a, b, aTeam, seed, maxTime, aiA, aiB, diffA, diffB, buildA }=job, A=aTeam, B=1-aTeam;
  resetGame({ types: A===0 ? [a,b] : [b,a], levels:[1,1], human:null, seed, fx:false, ...(buildA ? { builds: A===0 ? [buildA,null] : [null,buildA] } : {}) });   // --buildA: A takımına BUILDS adı (kahramanda yoksa default)
  for(const h of S.heroes) h.botLevel = LEVEL_IDS.indexOf(h.team===A ? diffA : diffB);
  const ctl = A===0 ? [BOTS[aiA], BOTS[aiB]] : [BOTS[aiB], BOTS[aiA]];
  const side = t => t===A ? 0 : 1;
  const M = [0,1].map(()=>({ cs:0, mon:0, deaths:0, dTower:0, dOut:0, dByStruct:0, dByMin:0, dSolo:0, structDmg:0, structs:0, deadT:0, firstLost:null, kills:0 }));
  const near=(t,x,y,R)=>S.heroes.filter(u=>u.team===t && !u.dead && Math.hypot(u.x-x,u.y-y)<R).length;
  S.onDamage=(e, amt, src)=>{
    if(!src) return;
    const owner = src.owner || src;
    if(e.kind==='struct' && owner.kind==='hero' && owner.team!==e.team) M[side(owner.team)].structDmg+=Math.min(amt, amt);
    if(e.hp>0) return;
    if(e.kind==='minion' && owner.kind==='hero') M[side(owner.team)].cs++;
    if(e.kind==='monster' && owner.kind==='hero') M[side(owner.team)].mon++;
    if(e.kind==='hero' && !e.dead){
      const m=M[side(e.team)]; m.deaths++;
      if(S.structs.some(s=>!s.dead && s.team!==e.team && s.sub!=='nexus' && Math.hypot(s.x-e.x,s.y-e.y)<TOWER.range+60)) m.dTower++;
      const f=near(1-e.team,e.x,e.y,1100), al=near(e.team,e.x,e.y,1100);
      if(f>al) m.dOut++;
      if(al===1 && f===1) m.dSolo++;
      if(owner.kind==='struct') m.dByStruct++; else if(owner.kind==='minion') m.dByMin++;
    }
  };
  const snaps={}; let tick=0;
  let early=null;
  while(!S.over && S.time<maxTime && !early){
    step(TICK, (h,dt)=>ctl[h.team](h,dt)); tick++;
    if(job.early && tick%60===0){ const lost=[0,0]; for(const s of S.structs) if(s.dead && s.sub!=='nexus') lost[s.team]++; for(const t of [0,1]) if(lost[1-t]-lost[t]>=2 || (lost[1-t]>=2 && lost[t]===0)) early={ winner:t }; }
    if(tick%60===0){
      for(const h of S.heroes) if(h.dead) M[side(h.team)].deadT+=1;
      for(const s of S.structs) if(s.dead && !s._c){ s._c=1; M[side(1-s.team)].structs++; if(M[side(s.team)].firstLost===null) M[side(s.team)].firstLost=S.time; }
    }
    for(const mn of [5,10,15]) if(tick===mn*3600){
      const w=t=>S.heroes.filter(h=>h.team===t).reduce((s,h)=>s+heroWorth(h),0), x=t=>S.heroes.filter(h=>h.team===t).reduce((s,h)=>s+totalXP(h),0);
      snaps[mn]={ g:w(A)-w(B), x:x(A)-x(B) };
    }
  }
  S.onDamage=null;
  for(const h of S.heroes) M[side(h.team)].kills+=h.kills;
  const J=S.jstats;
  const W = S.over ? S.over.winner : early ? early.winner : null;
  return { win: W===null ? null : (W===A ? 1 : 0), time:S.time, M, snaps, big:[J.big[A],J.big[B]], buffs:[J.buffs[A],J.buffs[B]], camps:[J.camps[A],J.camps[B]] };
}

export function jobs({ matches, seed, maxTime, aiA, aiB, diffA, diffB, tune, early=false, hero=null, buildA=null }){
  const H=Object.keys(STATS), rnd=mulberry(seed*7919+13), pick=()=>H[Math.floor(rnd()*H.length)], out=[]; let k=0;
  while(out.length<matches){ const t0=[hero||pick(),pick()], t1=[hero||pick(),pick()], sd=seed*100003+k*31+1; k++;
    for(const aTeam of [0,1]) if(out.length<matches) out.push({ a: aTeam===0?t0:t1, b: aTeam===0?t1:t0, aTeam, seed:sd, maxTime, aiA, aiB, diffA, diffB, tune, early, buildA }); }
  return out;
}
export async function run(js, threads){
  const out=new Array(js.length); let next=0;
  await Promise.all(Array.from({ length:Math.min(threads, js.length) }, ()=>new Promise((res,rej)=>{
    const w=new Worker(FILE, { workerData:{ worker:true } });
    const feed=()=>{ if(next>=js.length){ w.terminate(); res(); return; } const i=next++; w.postMessage({ i, job:js[i] }); };
    w.on('message', m=>{ if(m.error){ rej(new Error(m.error)); return; } out[m.i]=m.r; feed(); }); w.on('error', rej); feed();
  })));
  return out;
}
export function report(rs){
  const n=rs.length, dec=rs.filter(r=>r.win!==null), w=dec.filter(r=>r.win).length, [lo,hi]=wilson(w,Math.max(1,dec.length));
  const av=f=>rs.reduce((s,r)=>s+f(r),0)/n, f1=x=>x.toFixed(1);
  console.log(`A kazanma %${(100*w/Math.max(1,dec.length)).toFixed(0)} [${(lo*100).toFixed(0)}-${(hi*100).toFixed(0)}] ${w}/${dec.length} | süre ${(av(r=>r.time)/60).toFixed(1)} dk`);
  const keys=[['kills','öldürme'],['deaths','ölüm'],['dTower','  kule altı'],['dOut','  sayıca az'],['dSolo','  1e1'],['dByStruct','  kule vurdu'],['dByMin','  minyon vurdu'],['cs','son vuruş'],['mon','canavar'],['structDmg','yapı hasarı'],['structs','yıkılan yapı'],['deadT','ölü sn']];
  for(const [k,l] of keys) console.log(`${l.padEnd(14)} A ${f1(av(r=>r.M[0][k])).padStart(7)}  B ${f1(av(r=>r.M[1][k])).padStart(7)}`);
  const fl=i=>{ const x=rs.map(r=>r.M[i].firstLost).filter(v=>v!==null); return x.length ? (x.reduce((s,v)=>s+v,0)/x.length/60).toFixed(1) : '-'; };
  console.log(`ilk kule kaybı dk  A ${fl(0)}  B ${fl(1)}`);
  for(const mn of [5,10,15]){ const x=rs.filter(r=>r.snaps[mn]); if(x.length) console.log(`${mn}. dk fark (A-B) servet ${(x.reduce((s,r)=>s+r.snaps[mn].g,0)/x.length).toFixed(0)} XP ${(x.reduce((s,r)=>s+r.snaps[mn].x,0)/x.length).toFixed(0)} (${x.length} maç)`); }
  console.log(`Titan A ${f1(av(r=>r.big[0]))} B ${f1(av(r=>r.big[1]))} | güçlendirme A ${f1(av(r=>r.buffs[0]))} B ${f1(av(r=>r.buffs[1]))} | kamp A ${f1(av(r=>r.camps[0]))} B ${f1(av(r=>r.camps[1]))}`);
}

if(!isMainThread && workerData && workerData.worker){
  parentPort.on('message', ({ i, job })=>{ try { parentPort.postMessage({ i, r:one(job) }); } catch(e){ parentPort.postMessage({ error:String(e && e.stack || e) }); } });
} else if(isMain()){
  const o=parseArgs(process.argv.slice(2)), diff=o.diff||'expert';
  const js=jobs({ matches:+(o.matches||40), seed:+(o.seed||1), maxTime:+(o.maxTime||2400), aiA:o.aiA||'yeni', aiB:o.aiB||'eski2', diffA:diff, diffB:o.diffB||diff, tune:o.tune?JSON.parse(o.tune):undefined, early:!!o.early, hero:o.hero||null, buildA:o.buildA||null });
  const t0=Date.now(), rs=await run(js, +(o.threads||os.availableParallelism()));
  if(o.dump){ const fs=await import('node:fs'); fs.writeFileSync(o.dump, JSON.stringify(rs.map((r,i)=>({ ...r, a:js[i].a, b:js[i].b })))); }
  report(rs); console.log(`${rs.length} maç, ${((Date.now()-t0)/1000).toFixed(0)} sn`);
}

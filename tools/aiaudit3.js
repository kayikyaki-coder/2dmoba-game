/* Bot davranış denetimi 3: node tools/aiaudit3.js [--ai yeni|eski2] [--diff medium] [--matches 24] [--seed 3] [--duo 1] [--threads 4] [--hero spirit]
   Bütün kahramanlar aynı botla (ai, diff) oynar; kahramanlar rastgele (tohumlu). Ölçülenler (kahraman başına, sonra ortalama):
   - dürtme: hasar yeteneği hazır ve görünen rakip kahraman yetenek menzilindeyken (fırsat bölümü), bölüm içinde kullanma oranı
   - öldürme fırsatı: rakibin canı (kalkan dahil) < hazır yetenek hasarı + 2 düz vuruş, rakip 700 içinde; bu sırada rakipten uzaklaşma oranı (kaçırılan)
     ve 4 sn içinde rakibin ölmesi (dönüşüm)
   - hareket yetenekleri: kullanımdan 0,6 sn sonra en yakın rakibe uzaklık azaldıysa giriş, arttıysa kaçış
   - çalı: canlı zamanın çalıda geçen oranı, çalıdan rakip kahramana ilk vuruş sayısı
   - beceri atışı: rakip 1000 içindeyken atılan mermi/alan yeteneğinin 2 sn içinde rakip kahramana isabet oranı */
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { TICK, STATS } from '../data.js';
import { S, resetGame, step, canSee, atkDmg, apOf } from '../sim.js';
import { bushAt } from '../map.js';
import { BOTS } from './match.js';
import { LEVEL_IDS } from '../ai.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';

const FILE=fileURLToPath(import.meta.url);
const POKE=new Set(['fireball','ignite','meteor','bigarrow','bomb','hook','bloodbolt','beam','stunorb','tether','spiritburst','groworb','boomerang','volley','blink','breath','slam']);
const SHOT=new Set(['fireball','bigarrow','hook','beam','stunorb','tether','spiritburst','groworb','boomerang','bomb','meteor','volley']);
const MOB=new Set(['dash','tumble','flameleap','blink','leapslam','roll','duel']);
const keys=['r','e','s'];
const near=(h)=>{ let f=null, fd=1e9; for(const u of S.heroes) if(u.team!==h.team && !u.dead && canSee(h.team,u)){ const d=Math.hypot(u.x-h.x,u.y-h.y); if(d<fd){ fd=d; f=u; } } return [f,fd]; };
function burst(h){
  let s=atkDmg(h)*2;
  for(const k of keys){ const sk=h.def.skills[k]; if(h.rank[k]>0 && h.cd[k]<=0 && Array.isArray(sk.dmg)) s+=(sk.dmg[h.rank[k]-1]||0)+(sk.ap||0)*apOf(h); }
  return s*0.8;   // direnç kabası
}
function newStat(){ return { min:0, pokeOpp:0, pokeUse:0, kOpp:0, kFlee:0, kConv:0, mobIn:0, mobOut:0, mobN:0, bushT:0, aliveT:0, bushHit:0, kSaw:0, shot:0, shotHit:0, games:0, wins:0 }; }

function runOne(job){
  const { a, b, seed, ai, diff, duo, maxTime } = job;
  resetGame({ types: duo ? [a,b] : [a,b], human:null, seed, fx:false });
  const li=LEVEL_IDS.indexOf(diff); for(const h of S.heroes) h.botLevel=li;
  const ctl=BOTS[ai];
  const st=new Map(), per=new Map();
  for(const h of S.heroes){ st.set(h, newStat()); per.set(h, { prev:{r:0,e:0,s:0}, open:{r:false,e:false,s:false}, used:{r:false,e:false,s:false}, kOpen:false, kFled:false, kAway:0, kSaw:false, kT:0, kTgt:null, mob:[], shots:[], lastHitBush:-9 }); }
  S.onDamage=(e,amt,src,opts)=>{
    if(!src || src.kind!=='hero' || e.kind!=='hero' || e.team===src.team) return;
    const P=per.get(src), R=st.get(src); if(!P) return;
    if(opts && opts.basic){ if(bushAt(src.x,src.y)>=0 && S.time-P.lastHitBush>4){ R.bushHit++; } P.lastHitBush=S.time; return; }
    for(const sh of P.shots) if(!sh.hit && S.time-sh.t<2){ sh.hit=true; R.shotHit++; break; }
  };
  while(!S.over && S.time<maxTime){
    step(TICK, ctl);
    for(const h of S.heroes){
      const R=st.get(h), P=per.get(h);
      if(h.dead){ P.kOpen=false; for(const k of keys){ P.open[k]=false; P.prev[k]=h.cd[k]||0; } continue; }
      R.aliveT+=TICK; if(bushAt(h.x,h.y)>=0) R.bushT+=TICK;
      const [f,fd]=near(h);
      for(const k of keys){
        const sk=h.def.skills[k], cd=h.cd[k]||0, cast=cd>P.prev[k]+0.5; P.prev[k]=cd;
        if(cast){
          if(P.open[k]) { R.pokeUse++; P.open[k]=false; }
          if(MOB.has(sk.type) && f && fd<1400){ R.mobN++; P.mob.push({ t:S.time, d:fd, f }); }
          if(SHOT.has(sk.type) && f && fd<1000){ R.shot++; P.shots.push({ t:S.time, hit:false }); }
        }
        const ready=h.rank[k]>0 && cd<=0, rg=(sk.range||sk.radius||0)+(f?f.r:0);
        const op=ready && POKE.has(sk.type) && f && fd<rg && h.hp>h.maxHp*0.3;
        if(op && !P.open[k]){ R.pokeOpp++; P.open[k]=true; }
        if(!ready) P.open[k]=false;
        else if(!op && P.open[k]) P.open[k]=false;   // fırsat kaçtı (kullanılmadan)
      }
      P.shots=P.shots.filter(s=>S.time-s.t<2);
      P.mob=P.mob.filter(m=>{ if(S.time-m.t<0.6) return true; if(!m.f.dead){ const nd=Math.hypot(m.f.x-h.x,m.f.y-h.y); if(nd<m.d-60) R.mobIn++; else if(nd>m.d+60) R.mobOut++; } return false; });
      // öldürme fırsatı
      const kill = f && fd<700 && (f.hp+(f.st.shield?f.st.shield.amt:0)) < burst(h) && h.hp>h.maxHp*0.12;
      if(kill && !P.kOpen){ P.kOpen=true; P.kFled=false; P.kAway=0; P.kSaw=false; P.kT=S.time; P.kTgt=f; R.kOpp++; }
      if(P.kOpen){
        const tg=P.kTgt;
        if(h.ai && h.ai.v2 && h.ai.v2.kw) P.kSaw=true;
        if(tg.dead){ if(S.time-P.kT<4) R.kConv++; P.kOpen=false; if(P.kFled) R.kFlee++; if(P.kSaw) R.kSaw++; }
        else if(S.time-P.kT>4){ P.kOpen=false; if(P.kFled) R.kFlee++; if(P.kSaw) R.kSaw++; }
        else if(!P.kFled){ const dx=tg.x-h.x, dy=tg.y-h.y, l=Math.hypot(dx,dy)||1, v=((h.vx||0)*dx+(h.vy||0)*dy)/l; if(v < -60 && S.time-P.kT<1.5){ P.kAway+=TICK; if(P.kAway>=0.4) P.kFled=true; } }
      }
    }
  }
  S.onDamage=null;
  const out=[];
  for(const h of S.heroes){ const R=st.get(h); R.min=S.time/60; R.games=1; R.wins=S.over && S.over.winner===h.team ? 1 : 0; out.push({ type:h.type, R }); }
  return out;
}

if(!isMainThread && workerData && workerData.worker){
  parentPort.on('message', ({ i, job })=>{ try { parentPort.postMessage({ i, r:runOne(job) }); } catch(e){ parentPort.postMessage({ error:String(e && e.stack || e) }); } });
} else if(isMainThread){
  const o=parseArgs(process.argv.slice(2));
  const N=+(o.matches||24), seed=+(o.seed||3), ai=o.ai||'yeni', diff=o.diff||'medium', duo=!!o.duo, maxTime=+(o.maxTime||1500);
  const heroes=Object.keys(STATS); let rs=seed>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296), pk=()=>heroes[Math.floor(rnd()*heroes.length)];
  const jobs=[]; for(let i=0;i<N;i++){ const a=duo?[o.hero||pk(),pk()]:(o.hero||pk()), b=duo?[pk(),pk()]:pk(); jobs.push({ a, b, seed:seed*1000+i, ai, diff, duo, maxTime }); }
  const out=new Array(N); let next=0;
  const threads=Math.min(N, o.threads ? +o.threads : Math.max(1, os.availableParallelism()));
  await Promise.all(Array.from({ length:threads }, ()=>new Promise((res,rej)=>{
    const w=new Worker(FILE, { workerData:{ worker:true } });
    const feed=()=>{ if(next>=N){ w.terminate(); res(); return; } const i=next++; w.postMessage({ i, job:jobs[i] }); };
    w.on('message', m=>{ if(m.error){ rej(new Error(m.error)); return; } out[m.i]=m.r; feed(); }); w.on('error', rej); feed();
  })));
  const by={}, all=newStat();
  for(const r of out) for(const { type, R } of r){ if(o.hero && type!==o.hero) continue; const t=by[type]||(by[type]=newStat()); for(const k in R){ t[k]+=R[k]; all[k]+=R[k]; } }
  const p=(x,y)=>y?(x/y*100).toFixed(0)+'%':'-', f=(x)=>x.toFixed(2);
  const row=(n,t)=>`${n.padEnd(12)} dürtme ${p(t.pokeUse,t.pokeOpp).padStart(4)} (${t.pokeOpp}) | öldürme fırs. ${String(t.kOpp).padStart(4)} kaçtı ${p(t.kFlee,t.kOpp).padStart(4)} dönüştü ${p(t.kConv,t.kOpp).padStart(4)} gördü ${p(t.kSaw,t.kOpp).padStart(4)} | hareket ${t.mobN} giriş ${p(t.mobIn,t.mobN).padStart(4)} kaçış ${p(t.mobOut,t.mobN).padStart(4)} | çalı ${p(t.bushT,t.aliveT).padStart(4)} çalıdan vuruş/dk ${f(t.bushHit/t.min)} | isabet ${p(t.shotHit,t.shot).padStart(4)} (${t.shot})`;
  console.log(`aiaudit3: bot ${ai}, ${diff}, ${duo?'2v2':'1v1'}, ${N} maç, tohum ${seed}`);
  for(const [k,t] of Object.entries(by).sort()) console.log(row(k, t));
  console.log(row('TOPLAM', all));
}

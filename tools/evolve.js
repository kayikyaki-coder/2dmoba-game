/* Bot parametre öğrenme E (14.10.2026): çapraz entropi araması, 2v2, seviye başına.
   Aday ayarlar ana botun (ai.js 'yeni') seçilen seviyesine LEVEL_PARAMS üzerinden verilir (A tarafı); B tarafı ai.js?cand kopyasıdır
   (aynı seviye, ayarsız = mevcut bot). Kompozisyonlar rastgele (tohumlu), her kompozisyon iki kez oynanır (A takım 0 ve 1: taraf değişimi).
   Gürültü: bir nesildeki bütün adaylar aynı tohumlarla oynar (ortak rastgele sayılar). Erken bitirme açık (kule farkı 2+).
   Yalnız karar eşikleri aranır; insansılık (react, aimNoise, humanErr...) ve zorluk düğmeleri (misjudge, killSense, pokeP, lead) sabit.
   Son nesilden sonra en iyi adaylar (son ortalama + en yüksek puanlı birkaç aday) taze tohumlarla --val maçla doğrulanır.
   node tools/evolve.js --level medium [--gens 10] [--pop 12] [--matches 48] [--val 240] [--top 3] [--seed 1] [--threads N] [--out tools/evolve_medium.json]
   Uygulama: sonuç dosyasındaki 'best.tune' değerleri ai.js seviye nesnesine (MED / Uzman) yazılır. */
import os from 'node:os';
import fs from 'node:fs';
import { jobs, run } from './aivs2.js';
import { LEVEL_IDS, LEVEL_PARAMS } from '../ai.js';
import { parseArgs, wilson } from './pool.js';

/* Arama uzayı [alt, üst]. Ortak karar eşikleri; Uzman'a özel olanlar (sayı üstünlüğü, araf, kaçınma, hafıza) yalnız Uzman'da. */
const COMMON = {
  engageAdv:[0.85,1.5], stayAdv:[0.6,1.1], fleeAdv:[0.6,1.1], recallHp:[0.12,0.4], recallOut:[0.6,1], helpRange:[150,900],
  pokeAdv:[0.6,1.3], diveAdv:[0.3,1.0], diveGap:[0,200], diveHpGap:[0,0.4], commitTime:[1,5], defendAdv:[0.3,1.1],
  keepMelee:[0,150], homeBias:[0,1.5], cohesionGap:[300,1100], helpRun:[1000,2600], outnumR:[900,2000], allyHelpR:[600,1600],
  diveStart:[0.3,0.9], diveFloor:[0.1,0.45], diveMinDmg:[100,500], cheapDeath:[4,16], lhPushGuard:[0,1.5], artHp:[0.2,0.7]
};
const EXPERT = { limboT:[0.5,2.5], limboAdv:[0.7,1.3], numResp:[2,12], numAllyR:[800,2000], dodgeW:[1.5,3.5], dodgeNeed:[8,24], foeMemory:[2,8] };

const o=parseArgs(process.argv.slice(2));
const LEVEL=o.level||'medium', LI=LEVEL_IDS.indexOf(LEVEL); if(LI<1) throw new Error('seviye: medium|hard|expert');
const GENS=+(o.gens||10), POP=+(o.pop||12), M=+(o.matches||48), VAL=+(o.val||240), TOP=+(o.top||3), SEED=+(o.seed||1);
const THREADS=+(o.threads||os.availableParallelism()), OUT=o.out||`tools/evolve_${LEVEL}.json`;
const ELITE=Math.max(2, Math.round(POP/4));
const SPACE = LI===3 ? { ...COMMON, ...EXPERT } : COMMON;
const KEYS=Object.keys(SPACE), LP=LEVEL_PARAMS[LI];
const cur = Object.fromEntries(KEYS.map(k=>[k, LP[k]]));
const toU = p => KEYS.map(k=>{ const [lo,hi]=SPACE[k]; return Math.min(1,Math.max(0,(p[k]-lo)/(hi-lo))); });
const fromU = u => Object.fromEntries(KEYS.map((k,i)=>{ const [lo,hi]=SPACE[k]; return [k, +(lo+u[i]*(hi-lo)).toPrecision(3)]; }));
let rs=SEED*977+5; const rnd=()=>{ rs|=0; rs=rs+0x6D2B79F5|0; let t=Math.imul(rs^rs>>>15,1|rs); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
const randn=()=>{ let u=0,v=0; while(!u) u=rnd(); while(!v) v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const log=(...a)=>{ const s=new Date().toISOString().slice(11,19)+' '+a.join(' '); console.log(s); fs.appendFileSync(OUT.replace(/\.json$/,'.log'), s+'\n'); };

/* Bütün adayların maçları tek havuzda (iş parçacıkları boş kalmasın) */
async function evalMany(tunes, seed, m){
  const all=[], idx=[];
  tunes.forEach((t,ci)=>{ for(const j of jobs({ matches:m, seed, maxTime:2400, aiA:'yeni', aiB:'cand', diffA:LEVEL, diffB:LEVEL, tune:{ [LI]:t }, early:true })){ all.push(j); idx.push(ci); } });
  const res=await run(all, THREADS);
  return tunes.map((_,ci)=>{ const r=res.filter((_,i)=>idx[i]===ci), d=r.filter(x=>x.win!==null), w=d.filter(x=>x.win).length;
    return { sc:(w+0.5*(r.length-d.length))/r.length, w, n:d.length, time:r.reduce((s,x)=>s+x.time,0)/r.length }; });
}

const T0=Date.now();
let mean=toU(cur), sig=KEYS.map(()=>0.18);
const hist=[], pool=[];   // pool: bütün adaylar ve puanları (son seçim için)
log(`başladı: seviye ${LEVEL}, ${KEYS.length} parametre, nesil ${GENS}, aday ${POP}, aday başına ${M} maç, ${THREADS} iş parçacığı`);
for(let g=1; g<=GENS; g++){
  const t0=Date.now(), seed=SEED*100000+g*101;
  const cands=[mean.slice()];
  while(cands.length<POP) cands.push(mean.map((m,i)=>Math.min(1,Math.max(0,m+sig[i]*randn()))));
  const tunes=cands.map(fromU), sc=await evalMany(tunes, seed, M);
  const order=cands.map((_,i)=>i).sort((a,b)=>sc[b].sc-sc[a].sc);
  cands.forEach((u,i)=>pool.push({ g, u, tune:tunes[i], sc:sc[i].sc, mean:i===0 }));
  const el=order.slice(0,ELITE).map(i=>cands[i]);
  const em=KEYS.map((_,i)=>el.reduce((s,u)=>s+u[i],0)/el.length);
  const es=KEYS.map((_,i)=>Math.sqrt(el.reduce((s,u)=>s+(u[i]-em[i])**2,0)/el.length));
  mean=mean.map((m,i)=>0.4*m+0.6*em[i]); sig=sig.map((s,i)=>Math.max(0.03, 0.5*s+0.5*es[i]));
  const h={ g, best:sc[order[0]].sc, meanSc:sc[0].sc, avg:sc.reduce((s,x)=>s+x.sc,0)/sc.length, sig:sig.reduce((a,b)=>a+b,0)/sig.length, min:(Date.now()-t0)/60000 };
  hist.push(h);
  log(`nesil ${g}: en iyi %${(h.best*100).toFixed(1)}, ortalama aday %${(h.meanSc*100).toFixed(1)}, nesil ortalaması %${(h.avg*100).toFixed(1)}, yayılım ${h.sig.toFixed(3)} (${h.min.toFixed(1)} dk)`);
  fs.writeFileSync(OUT, JSON.stringify({ level:LEVEL, cur, hist, mean:fromU(mean), done:false }, null, 1));
}
/* Doğrulama: son ortalama + son iki nesildeki en yüksek puanlı adaylar, taze tohumlarla */
const last=pool.filter(p=>p.g>=GENS-1).sort((a,b)=>b.sc-a.sc).slice(0, TOP-1);
const finals=[{ tune:fromU(mean), from:'son ortalama' }, ...last.map(p=>({ tune:p.tune, from:`nesil ${p.g} aday %${(p.sc*100).toFixed(0)}` }))];
const vs=await evalMany(finals.map(f=>f.tune), SEED*100000+99991, VAL);
finals.forEach((f,i)=>{ const v=vs[i], [lo,hi]=wilson(v.w, Math.max(1,v.n)); f.val=v; log(`doğrulama ${f.from}: %${(v.sc*100).toFixed(1)} [${(lo*100).toFixed(0)}-${(hi*100).toFixed(0)}] ${v.w}/${v.n}, süre ${(v.time/60).toFixed(1)} dk`); });
const best=finals.slice().sort((a,b)=>b.val.sc-a.val.sc)[0];
const diff=Object.fromEntries(KEYS.filter(k=>best.tune[k]!==cur[k]).map(k=>[k,[cur[k], best.tune[k]]]));
fs.writeFileSync(OUT, JSON.stringify({ level:LEVEL, cur, hist, finals, best, diff, minutes:(Date.now()-T0)/60000, done:true }, null, 1));
log(`bitti (${((Date.now()-T0)/60000).toFixed(0)} dk). en iyi: ${best.from} %${(best.val.sc*100).toFixed(1)}`);
for(const [k,[a,b]] of Object.entries(diff)) log(`  ${k}: ${a} -> ${b}`);
process.exit(0);

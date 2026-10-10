/* Bot ayarlarını evrimsel aramayla iyileştirme (çapraz entropi yöntemi).
   Aday ayarlar ana botun bir kopyasına (cand) verilir, mevcut bota (yeni) karşı bütün kahraman eşleşmelerinde oynatılır.
   Her nesilde en iyi adaylara doğru ortalama ve yayılım güncellenir. Birkaç nesilde bir ortalama, hiç kullanılmamış
   seed'lerle daha çok maçta doğrulanır. En iyi doğrulanan ayarlar tools/evolve_best.json'a yazılır.
   node tools/evolve.js [nesil=20] [aday=12] [maç/eşleşme=12] > tools/evolve.log */
import os from 'node:os';
import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import { STATS } from '../data.js';
import { AI } from '../ai.js';

const [GENS=20, LAMBDA=12, M=12, VAL_M=40] = process.argv.slice(2).map(Number);
const ELITE=Math.max(2, Math.round(LAMBDA/3)), VAL_EVERY=3, MAXT=2700;
const HEROES=Object.keys(STATS);
const PAIRS=[]; for(const a of HEROES) for(const b of HEROES) PAIRS.push([a,b]);   // aday a ile, mevcut bot b ile (aynası dahil)

/* Aranan ayarlar ve aralıkları. Tepki süresi ve nişan sapması insan benzerliği için sabit tutulur. */
const SPACE = {
  recallHp:[0.1,0.4], recallOut:[0.6,1], engageAdv:[0.8,1.8], stayAdv:[0.5,1.2], fleeAdv:[0.5,1.2], homeBias:[0,1.5],
  diveAdv:[0.3,1.2], diveGap:[0,200], diveShieldGap:[0,250], diveHpGap:[0,0.4], commitTime:[1,5], lhSoon:[0.5,3],
  lhPushGuard:[0,1.5], stasisHp:[0.1,0.5], defendAdv:[0.3,1.2], pokeAdv:[0.5,1.5], towerMargin:[0,120], tankMargin:[0,100],
  tankHp:[20,150], keepMelee:[0,150], recallDist:[600,2500], diveEnemyDist:[400,1500], cheapDeath:[4,16],
  diveStart:[0.3,0.9], diveFloor:[0.1,0.5], diveMinDmg:[100,500]
};
const KEYS=Object.keys(SPACE).filter(k=>typeof AI[k]==='number');
const toU = p => KEYS.map(k=>{ const [lo,hi]=SPACE[k]; return Math.min(1,Math.max(0,(p[k]-lo)/(hi-lo))); });
const fromU = u => Object.fromEntries(KEYS.map((k,i)=>{ const [lo,hi]=SPACE[k]; return [k, +(lo+u[i]*(hi-lo)).toPrecision(4)]; }));

/* ---- iş parçacığı havuzu (worker.js ile aynı iş biçimi) ---- */
const THREADS=os.availableParallelism();
const workers=[]; const idle=[]; const waiting=[]; const pending=new Map(); let nextId=0;
for(let i=0;i<THREADS;i++){
  const w=new Worker(new URL('./worker.js', import.meta.url));
  w.on('message', m=>{ const cb=pending.get(m.valIdx); pending.delete(m.valIdx); cb(m.results); if(waiting.length) waiting.shift()(w); else idle.push(w); });
  w.on('error', e=>{ console.error(e); process.exit(1); });
  workers.push(w); idle.push(w);
}
const getWorker = () => idle.length ? Promise.resolve(idle.pop()) : new Promise(r=>waiting.push(r));
async function runJob(job){
  const w=await getWorker(), id=nextId++;
  return new Promise(res=>{ pending.set(id,res); w.postMessage({ ...job, valIdx:id }); });
}
/* Ayarların mevcut bota karşı ortalama skoru (kazanma 1, berabere/zaman aşımı 0,5) */
async function evaluate(tune, seed, m){
  const jobs=[];
  PAIRS.forEach(([a,b],pi)=>{ for(let i=0;i<m;i++) jobs.push(runJob({ overrides:[], tune:{}, candTune:tune, a, b, levelA:1, levelB:1,
    aiA:'cand', aiB:'yeni', buildA:'default', buildB:'default', seed:seed+pi*7919, maxTime:MAXT, from:i, to:i+1 })); });
  const res=(await Promise.all(jobs)).flat();
  const sc=res.reduce((s,r)=>s+(r.aWon===null?0.5:r.aWon?1:0),0)/res.length;
  const byPair=PAIRS.map((p,pi)=>{ const rr=res.slice(pi*m,(pi+1)*m); return rr.reduce((s,r)=>s+(r.aWon===null?0.5:r.aWon?1:0),0)/m; });
  return { sc, byPair };
}
const randn=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const log=(...a)=>{ console.log(new Date().toLocaleTimeString('tr-TR'), ...a); };

let mean=toU(AI), sig=KEYS.map(()=>0.15);
let best={ sc:0.5, tune:fromU(mean), gen:0 };
log(`başladı: ${KEYS.length} ayar, nesil ${GENS}, aday ${LAMBDA}, eşleşme başına ${M} maç (${PAIRS.length} eşleşme), ${THREADS} iş parçacığı`);
for(let g=1; g<=GENS; g++){
  const t0=Date.now(), seed=100000+g*1009;
  const cands=[mean.slice()];   // ortalamanın kendisi de aday
  while(cands.length<LAMBDA) cands.push(mean.map((m,i)=>Math.min(1,Math.max(0,m+sig[i]*randn()))));
  const scores=await Promise.all(cands.map(u=>evaluate(fromU(u), seed, M)));
  const order=cands.map((u,i)=>i).sort((a,b)=>scores[b].sc-scores[a].sc);
  const el=order.slice(0,ELITE).map(i=>cands[i]);
  const em=KEYS.map((_,i)=>el.reduce((s,u)=>s+u[i],0)/el.length);
  const es=KEYS.map((_,i)=>Math.sqrt(el.reduce((s,u)=>s+(u[i]-em[i])**2,0)/el.length));
  mean=mean.map((m,i)=>0.3*m+0.7*em[i]); sig=sig.map((s,i)=>Math.max(0.02, 0.3*s+0.7*es[i]));
  log(`nesil ${g}: en iyi ${(scores[order[0]].sc*100).toFixed(1)}%, ortalama aday ${(scores[0].sc*100).toFixed(1)}%, yayılım ${(sig.reduce((a,b)=>a+b,0)/sig.length).toFixed(3)} (${((Date.now()-t0)/60000).toFixed(1)} dk)`);
  if(g%VAL_EVERY===0 || g===GENS){
    const tune=fromU(mean), v=await evaluate(tune, 900000+g*7, VAL_M);
    log(`  doğrulama (${PAIRS.length*VAL_M} maç): ${(v.sc*100).toFixed(1)}%  | `+PAIRS.map((p,i)=>p[0][0]+p[1][0]+' '+Math.round(v.byPair[i]*100)).join(' '));
    if(v.sc>best.sc){ best={ sc:v.sc, tune, gen:g, byPair:v.byPair }; fs.writeFileSync(new URL('./evolve_best.json', import.meta.url), JSON.stringify(best,null,2)); log('  yeni en iyi kaydedildi'); }
  }
}
log('bitti. en iyi doğrulanmış: '+(best.sc*100).toFixed(1)+'% (nesil '+best.gen+')');
for(const k of KEYS) if(best.tune[k]!==AI[k]) log(`  ${k}: ${AI[k]} -> ${best.tune[k]}`);
workers.forEach(w=>w.terminate());

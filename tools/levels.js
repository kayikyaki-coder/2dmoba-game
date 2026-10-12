/* Bot zorluk karşılaştırması (--aiA yeni --aiB eski2: üst taraf yeni bot, alt taraf eski bot; --pairs medium:medium ile aynı seviye yeni-eski): node tools/levels.js --matches 40 [--seed 1] [--maxTime 2400] [--threads 8] [--duo 1] [--pairs medium:easy,hard:medium,expert:hard,expert:easy]
   Her çift "üst:alt" için üst seviye, alt seviyeye karşı oynar; kahraman çiftleri rastgele (tohumlu), taraflar dönüşümlü.
   --duo 1: 2v2 (iki rastgele kahraman her takımda). Çıktı: üst seviyenin kazanma oranı (+ %95 aralık) tablosu. */
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runMatch, runMatch2v2 } from './match.js';
import { STATS } from '../data.js';
import { LEVEL_PARAMS } from '../ai.js';
import { parseArgs, wilson } from './pool.js';

const isMain = metaUrl => { try { return process.argv[1] && new URL(metaUrl).href===pathToFileURL(path.resolve(process.argv[1])).href; } catch { return false; } };
const FILE = fileURLToPath(import.meta.url);

export async function runJobs(jobs, threads=Math.max(1, os.availableParallelism()-1)){
  const out=new Array(jobs.length); let next=0;
  await Promise.all(Array.from({ length:Math.min(threads, jobs.length) }, ()=>new Promise((res,rej)=>{
    const w=new Worker(FILE, { workerData:{ worker:true } });
    const feed=()=>{ if(next>=jobs.length){ w.terminate(); res(); return; } const i=next++; w.postMessage({ i, job:jobs[i] }); };
    w.on('message', m=>{ if(m.error){ rej(new Error(m.error)); return; } out[m.i]=m.r; feed(); });
    w.on('error', rej); feed();
  })));
  return out;
}
const mulberry=a=>()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };

/* Bir çift için iş listesi. Her kahraman çifti iki kez oynanır: kahramanlar takımlarında sabit, yalnız hangi seviyenin hangi takımı oynattığı değişir
   (kahraman ve taraf avantajı birbirini götürür). Aynı tohum ve eşleşmeler her seviye çiftinde aynı. */
export function levelJobs({ hi, lo, matches=40, seed=1, maxTime=2400, duo=false, lvTune, aiA='yeni', aiB='yeni' }){
  const heroes=Object.keys(STATS), rnd=mulberry(seed*7919+13), pick=()=>heroes[Math.floor(rnd()*heroes.length)];
  const jobs=[]; let k=0;
  while(jobs.length<matches){
    const t0=duo ? [pick(),pick()] : pick(), t1=duo ? [pick(),pick()] : pick(), sd=seed*100003+k*31+1; k++;
    // A = üst seviye. Oyun 1: A takım 0 (t0), oyun 2: A takım 1 (t1)
    jobs.push({ duo, a:t0, b:t1, aTeam:0, seed:sd, maxTime, levelA:1, levelB:1, diffA:hi, diffB:lo, lvTune, aiA, aiB });
    if(jobs.length<matches) jobs.push({ duo, a:t1, b:t0, aTeam:1, seed:sd, maxTime, levelA:1, levelB:1, diffA:hi, diffB:lo, lvTune, aiA, aiB });
  }
  return jobs;
}
export function winRate(rs){
  const dec=rs.filter(r=>r.winner!==null), w=dec.filter(r=>r.aWon).length;
  const [lo,hi]=dec.length ? wilson(w,dec.length) : [0,1];
  return { n:rs.length, dec:dec.length, rate:dec.length ? w/dec.length : null, lo, hi, avgTime:dec.length ? dec.reduce((s,r)=>s+r.time,0)/dec.length : 0 };
}

if(!isMainThread && workerData && workerData.worker){
  parentPort.on('message', ({ i, job })=>{
    try {
      if(job.lvTune) for(const [k,o] of Object.entries(job.lvTune)) Object.assign(LEVEL_PARAMS[+k], o);   // deney: seviye parametrelerini geçici değiştir
      parentPort.postMessage({ i, r:(job.duo ? runMatch2v2 : runMatch)(job) }); } catch(e){ parentPort.postMessage({ error:String(e && e.stack || e) }); }
  });
} else if(isMain(import.meta.url)){
  const o=parseArgs(process.argv.slice(2));
  const pairs=(o.pairs||'medium:easy,hard:medium,expert:hard,expert:easy').split(',').map(p=>p.split(':'));
  const lvTune = o.tune ? JSON.parse(o.tune) : undefined;   // deney: --tune '{"1":{"dodgeW":2}}' (seviye indeksi: 1 Orta, 2 Zor, 3 Uzman)
  const matches=+(o.matches||40), seed=+(o.seed||1), maxTime=+(o.maxTime||2400), duo=!!o.duo, threads=o.threads ? +o.threads : undefined;
  const t0=Date.now(), rows=[];
  for(const [hi,lo] of pairs){
    const rs=await runJobs(levelJobs({ hi, lo, matches, seed, maxTime, duo, lvTune, aiA:o.aiA||'yeni', aiB:o.aiB||'yeni' }), threads), w=winRate(rs);
    rows.push({ hi, lo, ...w });
    console.log(`${hi.padEnd(7)} > ${lo.padEnd(7)} | kazanma ${w.rate===null?'-':(w.rate*100).toFixed(0)+'%'} [${(w.lo*100).toFixed(0)}-${(w.hi*100).toFixed(0)}] | ${w.dec}/${w.n} karar | ort. süre ${(w.avgTime/60).toFixed(1)} dk`);
  }
  console.log(`${duo?'2v2':'1v1'}, ${matches} maç/çift, tohum ${seed}, ${((Date.now()-t0)/1000).toFixed(0)} sn`);
}

/* 2v2 bot maçları (tek koridor): node tools/duo.js --a archer,warrior --b mage,hook --matches 20 [--seed 1] [--maxTime 2400] [--level 1] [--threads 8] [--naiveB 1 | --noCoh 1]  (--diffA/--diffB easy|medium|hard|expert: bot zorluğu; naiveB: B takımı takım oyunu kapalı bot, karşılaştırma için)
   Çıktı: takım A kazanma oranı, ortalama süre, zaman aşımı, K/D/A, birlikte hasar anı, dostlar arası uzaklık. Tarafları dönüşümlü değiştirir. */
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runMatch2v2 } from './match.js';
import { parseArgs, pct } from './pool.js';

const isMain = metaUrl => { try { return process.argv[1] && new URL(metaUrl).href===pathToFileURL(path.resolve(process.argv[1])).href; } catch { return false; } };
const FILE = fileURLToPath(import.meta.url);

/* Birden çok maçı iş parçacıklarında koştur: jobs = runMatch2v2 seçenekleri dizisi, sonuçlar aynı sırada */
export async function runDuoJobs(jobs, threads=Math.max(1, os.availableParallelism()-1)){
  const out=new Array(jobs.length); let next=0;
  await Promise.all(Array.from({ length:Math.min(threads, jobs.length) }, ()=>new Promise((res,rej)=>{
    const w=new Worker(FILE, { workerData:{ worker:true } });
    const feed=()=>{ if(next>=jobs.length){ w.terminate(); res(); return; } const i=next++; w.postMessage({ i, job:jobs[i] }); };
    w.on('message', m=>{ if(m.error){ rej(new Error(m.error)); return; } out[m.i]=m.r; feed(); });
    w.on('error', rej); feed();
  })));
  return out;
}
export function duoJobs({ a, b, matches=20, seed=1, maxTime=2400, level=1, aiA='yeni', aiB='yeni', candAI={}, diffA='easy', diffB='easy', noJungleB=false }){
  return Array.from({ length:matches }, (_,i)=>({ a, b, aTeam:i%2, seed:seed*1000+i, maxTime, levelA:level, levelB:level, aiA, aiB, candAI, diffA, diffB, noJungleB }));
}
export function summarize(rs){
  const n=rs.length, fin=rs.filter(r=>r.winner!==null), avg=(f,xs=rs)=>xs.length ? xs.reduce((s,r)=>s+f(r),0)/xs.length : 0;
  return {
    n, aWin: fin.length ? fin.filter(r=>r.aWon).length/fin.length : null, timeouts:n-fin.length,
    time: avg(r=>r.time), kA:avg(r=>r.killsA), dA:avg(r=>r.deathsA), asA:avg(r=>r.assistsA), kB:avg(r=>r.killsB), dB:avg(r=>r.deathsB), asB:avg(r=>r.assistsB),
    jointA:avg(r=>r.jointA), jointB:avg(r=>r.jointB),
    apart: avg(r=>(r.apartA??0)), near: avg(r=>(r.nearA??0)), nearB: avg(r=>(r.nearB??0))
  };
}

if(!isMainThread && workerData && workerData.worker){
  parentPort.on('message', ({ i, job })=>{
    try { parentPort.postMessage({ i, r:runMatch2v2(job) }); } catch(e){ parentPort.postMessage({ error:String(e && e.stack || e) }); }
  });
} else if(isMain(import.meta.url)){
  const o=parseArgs(process.argv.slice(2));
  const a=(o.a||'archer,warrior').split(','), b=(o.b||'mage,hook').split(',');
  const jobs=duoJobs({ a, b, matches:+(o.matches||20), seed:+(o.seed||1), maxTime:+(o.maxTime||2400), level:+(o.level||1), aiA:o.aiA||'yeni', aiB:o.aiB||'yeni', diffA:o.diffA||'easy', diffB:o.diffB||'easy', noJungleB:!!o.noJungleB, ...(o.naiveB ? { aiB:'cand', candAI:{ team:0 } } : {}), ...(o.noCoh ? { aiB:'cand', candAI:{ cohesion:0 } } : {}) });
  const t0=Date.now(), rs=await runDuoJobs(jobs, o.threads ? +o.threads : undefined), s=summarize(rs);
  console.log(`A [${a}] vs B [${b}] | ${s.n} maç, ${((Date.now()-t0)/1000).toFixed(0)} sn`);
  console.log(`A kazanma ${s.aWin===null?'-':pct(s.aWin)} | ort. süre ${(s.time/60).toFixed(1)} dk | zaman aşımı ${s.timeouts}`);
  console.log(`A K/D/A ${s.kA.toFixed(1)}/${s.dA.toFixed(1)}/${s.asA.toFixed(1)} | B K/D/A ${s.kB.toFixed(1)}/${s.dB.toFixed(1)}/${s.asB.toFixed(1)}`);
  { // orman ölçümleri: kamp temizleme, büyük canavar, ormancı ve koridorcu 10. dakika seviyesi/serveti
    const J=rs.filter(r=>r.jungle); if(J.length){
      const av=f=>J.reduce((t,r)=>t+f(r),0)/J.length;
      const hs=J.flatMap(r=>r.heroes.filter(h=>h.lv10!==null)), m=(role,k)=>{ const x=hs.filter(h=>h.role===role); return x.length ? x.reduce((t,h)=>t+h[k],0)/x.length : 0; };
      console.log(`orman: maç başına kamp ${av(r=>r.jungle.camps[0]+r.jungle.camps[1]).toFixed(1)}, güçlendirme ${av(r=>r.jungle.buffs[0]+r.jungle.buffs[1]).toFixed(1)}, büyük canavar ${av(r=>r.jungle.big[0]+r.jungle.big[1]).toFixed(2)} | ormancı canavar ${av(r=>r.heroes.filter(h=>h.role==='jungle').reduce((t,h)=>t+h.jCamps,0)/2).toFixed(1)}`);
      const all=J.flatMap(r=>r.heroes), sideW=side=>J.length;
      console.log(`hakimiyet: ormancı ${(all.filter(h=>h.role==='jungle').reduce((t,h)=>t+h.jm,0)/Math.max(1,all.filter(h=>h.role==='jungle').length)).toFixed(1)}, koridorcu ${(all.filter(h=>h.role!=='jungle').reduce((t,h)=>t+h.jm,0)/Math.max(1,all.filter(h=>h.role!=='jungle').length)).toFixed(1)} | telafi altını kahraman başına ${(all.reduce((t,h)=>t+h.cuGold,0)/all.length).toFixed(0)}`);
      console.log(`10. dk: ormancı seviye ${m('jungle','lv10').toFixed(2)} servet ${m('jungle','worth10').toFixed(0)} | koridorcu seviye ${m('lane','lv10').toFixed(2)} servet ${m('lane','worth10').toFixed(0)}`);
    } }
  console.log(`birlikte hasar anı A ${s.jointA.toFixed(1)} B ${s.jointB.toFixed(1)} | A dostlar arası ort. ${s.apart.toFixed(0)} birim, 800 içinde %${(s.near*100).toFixed(0)} (B: %${(s.nearB*100).toFixed(0)})`);
}

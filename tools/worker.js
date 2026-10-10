/* simulate.js işçi iş parçacığı: maç gruplarını çalıştırır. */
import { parentPort } from 'node:worker_threads';
import { STATS, HEROES } from '../data.js';
import { runMatch, CAND_AI } from './match.js';
import { runScenario } from './scenario_core.js';
import { AI } from '../ai.js';

const AI0 = { ...AI };   // yeni botun ayarları, --tune ile geçici değişir
const CAND0 = { ...CAND_AI };   // aday botun (cand) ayarları, candTune ile değişir

const pristine = JSON.parse(JSON.stringify(STATS));
const pristineSk = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(HEROES).map(([h,d])=>[h,d.skills]))));

function applyOverrides(list){
  for(const h of Object.keys(STATS)) for(const k of Object.keys(STATS[h])) STATS[h][k] = { ...pristine[h][k] };
  for(const h of Object.keys(HEROES)) for(const k of Object.keys(HEROES[h].skills)) Object.assign(HEROES[h].skills[k], JSON.parse(JSON.stringify(pristineSk[h][k])));
  for(const { hero, stat, field, value } of list){
    if(stat==='skill'){ const [k,f]=field.split('.'); HEROES[hero].skills[k][f]=value; }
    else STATS[hero][stat][field] = value;
  }
}

/* Aynı (seed, maç numarası) her zaman aynı maçı verir */
function matchSeed(seed, i){ return (Math.imul(seed|0, 0x9E3779B1) ^ Math.imul(i+1, 0x85EBCA6B)) >>> 0; }

parentPort.on('message', job => {
  applyOverrides(job.overrides);
  Object.assign(AI, AI0, job.tune||{});
  Object.assign(CAND_AI, CAND0, job.candTune||{});
  const results = [];
  for(let i=job.from; i<job.to; i++){
    if(job.sc){ results.push(runScenario({ a:job.a, b:job.b, aTeam:i%2, seed:matchSeed(job.seed, i), sc:job.sc, aiA:job.aiA, aiB:job.aiB })); continue; }   // kısa senaryo
    results.push(runMatch({ a:job.a, b:job.b, levelA:job.levelA, levelB:job.levelB, aiA:job.aiA, aiB:job.aiB, buildA:job.buildA, buildB:job.buildB, diffA:job.diffA, diffB:job.diffB,
      aTeam:i%2, seed:matchSeed(job.seed, i), maxTime:job.maxTime }));
  }
  parentPort.postMessage({ valIdx:job.valIdx, from:job.from, results });
});

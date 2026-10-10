/* Simülasyon çalıştırıcı: komut satırı (simulate.js) ve arayüz (ui.js) bunu kullanır. */
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import { STATS, HEROES } from '../data.js';

export function checkPath({ hero, stat, field }){
  if(stat==='skill'){
    const [k,f]=field.split('.');
    if(!HEROES[hero] || !HEROES[hero].skills[k] || !(f in HEROES[hero].skills[k])) throw new Error('Geçersiz yetenek: '+hero+'.skill.'+field);
    return;
  }
  if(!STATS[hero] || !STATS[hero][stat] || !(field in STATS[hero][stat]))
    throw new Error('Geçersiz stat: '+hero+'.'+stat+'.'+field);
}

const mean = xs => xs.length ? xs.reduce((s,x)=>s+x,0)/xs.length : NaN;
function wilson(w, n){
  if(n===0) return [NaN,NaN];
  const z=1.96, p=w/n, d=1+z*z/n, c=p+z*z/(2*n), m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));
  return [(c-m)/d, (c+m)/d];
}

/* opts: { a, b, levelA, levelB, matches, seed, maxTime, threads,
           overrides:[{hero,stat,field,value}], sweep:{hero,stat,field,from,to,step}|null, onProgress(done,total) }
   Dönüş: { rows:[{label, aWin, ciLo, ciHi, avgTime, firstTower, firstKill, levelA, levelB, timeouts, decided, team0Win}], seconds } */
export async function runSimulation(opts){
  const { a, b, levelA=1, levelB=1, matches=1000, seed=1, maxTime=1200, overrides=[], sweep=null, onProgress, aiA='yeni', aiB='yeni', tune={}, candTune={}, buildA='default', buildB='default' } = opts;
  const threads = Math.max(1, opts.threads || os.availableParallelism());
  for(const h of [a,b]) if(!STATS[h]) throw new Error('Bilinmeyen kahraman: '+h);
  overrides.forEach(checkPath);

  let rows;
  if(sweep){
    checkPath(sweep);
    const { from, to, step } = sweep;
    if(![from,to,step].every(Number.isFinite) || step<=0 || to<from) throw new Error('Tarama aralığı geçersiz');
    rows = [];
    const n = Math.round((to-from)/step);
    if(n>60) throw new Error('Tarama en fazla 60 adım olabilir');
    for(let i=0;i<=n;i++){
      const value = +(from+i*step).toFixed(10);
      rows.push({ label: sweep.hero+'.'+sweep.stat+'.'+sweep.field+'='+value, overrides:[...overrides, { hero:sweep.hero, stat:sweep.stat, field:sweep.field, value }] });
    }
  } else {
    rows = [{ label: overrides.length ? overrides.map(o=>o.hero+'.'+o.stat+'.'+o.field+'='+o.value).join(' ') : 'varsayılan', overrides }];
  }

  const chunk = Math.max(1, Math.min(2, Math.ceil(matches/(threads*4))));
  const queue = [];
  for(let r=0;r<rows.length;r++) for(let f=0;f<matches;f+=chunk)
    queue.push({ valIdx:r, overrides:rows[r].overrides, tune, candTune, a, b, levelA, levelB, aiA, aiB, buildA, buildB, seed, maxTime, from:f, to:Math.min(matches,f+chunk) });
  const total = queue.length; let done = 0;
  const all = rows.map(()=>new Array(matches));
  const t0 = Date.now();

  await new Promise((resolve, reject)=>{
    let active = 0; const workers = [];
    const finish = err => { workers.forEach(x=>x.terminate()); err ? reject(err) : resolve(); };
    const feed = w => {
      const job = queue.shift();
      if(!job){ if(--active===0) finish(); return; }
      w.postMessage(job);
    };
    for(let i=0;i<Math.min(threads,total);i++){
      const w = new Worker(new URL('./worker.js', import.meta.url));
      workers.push(w); active++;
      w.on('message', m=>{
        m.results.forEach((r,j)=>{ all[m.valIdx][m.from+j]=r; });
        done++; if(onProgress) onProgress(done,total);
        feed(w);
      });
      w.on('error', finish);
      feed(w);
    }
    if(total===0) finish();
  });

  const out = rows.map((row,r)=>{
    const res = all[r], decided = res.filter(x=>x.winner!==null);
    const aw = decided.filter(x=>x.aWon).length, n = decided.length;
    const [lo,hi] = wilson(aw,n);
    return {
      label: row.label,
      aWin: n ? aw/n : null, ciLo: n ? lo : null, ciHi: n ? hi : null,
      avgTime: n ? mean(decided.map(x=>x.time)) : null,
      firstTower: mean(res.filter(x=>x.firstTower!==null).map(x=>x.firstTower)),
      firstKill: mean(res.filter(x=>x.firstKill!==null).map(x=>x.firstKill)),
      levelA: mean(res.map(x=>x.levelA)), levelB: mean(res.map(x=>x.levelB)),
      timeouts: res.length-n, decided: n,
      team0Win: n ? decided.filter(x=>x.winner===0).length/n : null
    };
  }).map(o=>{ for(const k in o) if(typeof o[k]==='number' && !isFinite(o[k])) o[k]=null; return o; });
  return { rows:out, seconds:(Date.now()-t0)/1000, threads };
}

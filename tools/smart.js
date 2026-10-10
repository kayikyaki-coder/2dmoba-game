/* Akıllı simülasyon çekirdeği: uyarlamalı (erken duran) eşleşme ölçümü ve ortak argüman çözümü. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STATS } from '../data.js';
import { checkPath } from './runner.js';
import { Pool, wilson, score, parseOverride } from './pool.js';

export const HEROES = Object.keys(STATS);
export function allPairs(list=HEROES){ const out=[]; for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++) out.push([list[i],list[j]]); return out; }

/* Ortak argümanlar: --sc duel|lane, --level, --items archer=ie,pd;mage=dcap, --minutes, --heroes archer,mage, --seed, --maxTime */
export function jobBase(o){
  const base={ maxTime:+(o.maxTime||2700) };
  if(o.sc){
    const items={};
    if(o.items) for(const part of o.items.split(';')){ const [h,l]=part.split('='); items[h]=l.split(',').filter(Boolean); }
    base.sc={ kind:o.sc, level:+(o.level||6), items, minutes:+(o.minutes||6), limit:+(o.limit||60) };
  }
  return base;
}
export function overridesFrom(list){ const ov=(list||[]).map(parseOverride); ov.forEach(checkPath); return ov; }
export const scLabel = b => b.sc ? (b.sc.kind==='duel' ? `düello, seviye ${b.sc.level}`+(Object.keys(b.sc.items).length?', eşyalar '+JSON.stringify(b.sc.items):'') : `koridor, ilk ${b.sc.minutes} dk`) : 'tam maç';

/* Bir eşleşmeyi gruplar halinde oynat, sonuç belli olunca dur.
   Durma: %95 aralığı tamamen [0.5-clear, 0.5+clear] dışında (açıkça dengesiz) ya da aralığın yarı genişliği <= margin, ya da max maç. */
export async function adaptivePair(pool, job, { min=20, max=120, batch=12, margin=0.06, clear=0.12, onBatch }={}){
  const res=[]; let i=0;
  for(;;){
    const n=Math.min(batch, max-i);
    const part=await Promise.all(Array.from({length:n},(_,k)=>pool.one(job, i+k)));
    res.push(...part); i+=n;
    const w=res.reduce((s,r)=>s+score(r),0), [lo,hi]=wilson(w,res.length);
    if(onBatch) onBatch(res.length, w/res.length);
    if(i>=max) return summarize(res, 'üst sınır');
    if(res.length>=min && (lo>0.5+clear || hi<0.5-clear)) return summarize(res, 'açıkça dengesiz');
    if(res.length>=min && (hi-lo)/2<=margin) return summarize(res, 'yeterli kesinlik');
  }
}
export function summarize(res, why){
  const w=res.reduce((s,r)=>s+score(r),0), [lo,hi]=wilson(w,res.length);
  const done=res.filter(r=>r.aWon!==null);
  return { n:res.length, win:w/res.length, lo, hi, why, timeouts:res.length-done.length,
    avgTime: done.length ? done.reduce((s,r)=>s+r.time,0)/done.length : null, res };
}

/* ---- arayüz ve komut satırı için ortak yardımcılar ---- */
/* Dosya doğrudan `node dosya.js` ile mi çalıştırıldı (içe aktarılmadıysa) */
export const isMain = metaUrl => { try { return process.argv[1] && new URL(metaUrl).href===pathToFileURL(path.resolve(process.argv[1])).href; } catch { return false; } };

/* pool.one çağrılarını sayan ince sarmalayıcı: onProgress(biten, üst sınır) */
export function counted(pool, total, onProgress){
  const c={ done:0, one: async (job,i)=>{ const r=await pool.one(job,i); c.done++; if(onProgress) onProgress(Math.min(c.done,total), total); return r; } };
  return c;
}

/* Maç sonuçlarından arayüz tablosu satırı (runner.js runSimulation satırıyla aynı alanlar) */
export function rowFromRes(label, res){
  const mean=xs=>xs.length ? xs.reduce((s,x)=>s+x,0)/xs.length : null;
  const dec=res.filter(r=>r.winner!==null && r.winner!==undefined), aw=dec.filter(r=>r.aWon).length, n=dec.length;
  const [lo,hi]=n ? wilson(aw,n) : [null,null];
  return { label, n:res.length, aWin:n ? aw/n : null, ciLo:lo, ciHi:hi,
    avgTime: mean(dec.map(r=>r.time)), firstTower: mean(res.filter(r=>r.firstTower!=null).map(r=>r.firstTower)),
    firstKill: mean(res.filter(r=>r.firstKill!=null).map(r=>r.firstKill)),
    levelA: mean(res.map(r=>r.levelA)), levelB: mean(res.map(r=>r.levelB)),
    timeouts:res.length-n, decided:n, team0Win: n ? dec.filter(r=>r.winner===0).length/n : null };
}

/* Tek eşleşme (A vs B), isteğe bağlı tarama; senaryo ve/veya akıllı durdurma ile.
   o: { a,b,levelA,levelB,matches,seed,base(jobBase),overrides,sweep,smart }
   smart kapalıysa tam `matches` maç oynanır, açıksa sonuç belli olunca durur (matches üst sınır). */
export async function runSingle(o, onProgress){
  const { a,b,levelA=1,levelB=1,matches=200,seed=1,base={},overrides=[],sweep=null,smart=false } = o;
  for(const h of [a,b]) if(!STATS[h]) throw new Error('Bilinmeyen kahraman: '+h);
  overrides.forEach(checkPath);
  let rows;
  if(sweep){
    checkPath(sweep);
    const { from,to,step }=sweep;
    if(![from,to,step].every(Number.isFinite) || step<=0 || to<from) throw new Error('Tarama aralığı geçersiz');
    const n=Math.round((to-from)/step); if(n>60) throw new Error('Tarama en fazla 60 adım olabilir');
    rows=[]; for(let i=0;i<=n;i++){ const value=+(from+i*step).toFixed(10);
      rows.push({ label:sweep.hero+'.'+sweep.stat+'.'+sweep.field+'='+value, overrides:[...overrides,{ hero:sweep.hero, stat:sweep.stat, field:sweep.field, value }] }); }
  } else rows=[{ label: overrides.length ? overrides.map(v=>v.hero+'.'+v.stat+'.'+v.field+'='+v.value).join(' ') : 'varsayılan', overrides }];
  const total=rows.length*matches, pool=new Pool(), cp=counted(pool,total,onProgress), t0=Date.now();
  try {
    const opts = smart ? { min:Math.min(20,matches), max:matches, batch:12 } : { min:matches, max:matches, batch:Math.max(8,pool.threads*2) };
    const out=await Promise.all(rows.map(r=>adaptivePair(cp, { ...base, a, b, levelA, levelB, overrides:r.overrides, seed }, opts)));
    return { rows: out.map((r,i)=>({ ...rowFromRes(rows[i].label, r.res), why:r.why })), ran:cp.done, total, seconds:(Date.now()-t0)/1000, threads:pool.threads };
  } finally { pool.close(); }
}

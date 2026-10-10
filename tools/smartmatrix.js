/* Akıllı denge matrisi: her kahraman çifti sonuç belli olunca durur (açıkça dengesiz çiftler erken biter).
   node tools/smartmatrix.js [--override archer.hp.base=430]... [--margin 0.06] [--max 120]
   Kısa senaryo: --sc duel --level 6 [--items "archer=ie,pd;warrior=cleaver"]  ya da  --sc lane --minutes 6
   Arayüz de runSmartMatrix'i kullanır. */
import { Pool, pct, parseArgs } from './pool.js';
import { allPairs, adaptivePair, jobBase, overridesFrom, scLabel, counted, isMain, HEROES } from './smart.js';

/* opts: { base(jobBase), overrides, heroes, seed, min, max, batch, margin, clear }
   Dönüş: { pairs:[{a,b,n,win,lo,hi,why,timeouts,avgTime}], total, ran, seconds } */
export async function runSmartMatrix(opts, onProgress){
  const { base={}, overrides=[], heroes=HEROES, seed=1, min=20, max=120, batch=12, margin=0.06, clear=0.12 } = opts;
  const pairs=allPairs(heroes), total=pairs.length*max, pool=new Pool(), cp=counted(pool,total,onProgress), t0=Date.now();
  try {
    const out=await Promise.all(pairs.map(([a,b],pi)=>adaptivePair(cp, { ...base, a, b, overrides, seed:seed+pi*7919 }, { min, max, batch, margin, clear })));
    return { pairs: pairs.map(([a,b],i)=>{ const { res, ...r }=out[i]; return { a, b, ...r }; }), total, ran:cp.done, seconds:(Date.now()-t0)/1000 };
  } finally { pool.close(); }
}

if(isMain(import.meta.url)){
  const o=parseArgs(process.argv.slice(2)), base=jobBase(o), overrides=overridesFrom(o.override);
  const r=await runSmartMatrix({ base, overrides, heroes:o.heroes ? o.heroes.split(',') : HEROES, seed:+(o.seed||1),
    min:+(o.min||20), max:+(o.max||120), batch:+(o.batch||12), margin:+(o.margin||0.06), clear:+(o.clear||0.12) });
  console.log((overrides.map(v=>v.hero+'.'+v.stat+'.'+v.field+'='+v.value).join(' ')||'varsayılan')+' | '+scLabel(base));
  for(const p of r.pairs)
    console.log(p.a.padEnd(8)+' vs '+p.b.padEnd(8)+' '+pct(p.win)+'  ('+pct(p.lo)+' -'+pct(p.hi)+')  '+String(p.n).padStart(4)+' maç, '+p.why+(p.timeouts?', zaman aşımı '+p.timeouts:''));
  console.log(`toplam ${r.ran} maç, ${r.seconds.toFixed(0)} sn`);
}

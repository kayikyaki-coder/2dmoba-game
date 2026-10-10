/* Eşli karşılaştırma: iki ayarı AYNI maç tohumlarıyla oynatır, farkı ölçer (şans farkı büyük ölçüde silinir).
   node tools/compare.js --variant archer.hp.base=470 [--variant ...] [--base archer.hp.base=430] [--heroes archer,warrior]
   Her çift için: önce/sonra kazanma ve fark (± %95). Fark belli olunca durur. --sc duel/lane ile kısa senaryo da olur.
   Arayüz de runCompare'i kullanır. */
import { Pool, pct, parseArgs, score } from './pool.js';
import { allPairs, jobBase, overridesFrom, scLabel, counted, isMain, HEROES } from './smart.js';

const avg=x=>x.reduce((s,y)=>s+y,0)/x.length;

/* opts: { base(jobBase), ovBase (önce), ovVariant (sonra, önce ayarlarının üstüne eklenir), heroes, seed, min, max, batch, margin }
   Dönüş: { pairs:[{a,b,n,base,variant,diff,ci,why,gain}], ovBase, ovVariantAll, total, ran, seconds } */
export async function runCompare(opts, onProgress){
  const { base={}, ovBase=[], ovVariant=[], heroes=HEROES, seed=1, min=16, max=160, batch=16, margin=0.04 } = opts;
  if(!ovVariant.length) throw new Error('"Sonra" için en az bir stat değişikliği gerekli');
  const ovV=[...ovBase, ...ovVariant], touched=new Set(ovVariant.map(v=>v.hero));
  const pairs=allPairs(heroes).filter(([a,b])=>touched.has(a)||touched.has(b));
  if(!pairs.length) throw new Error('Değişen kahramanları içeren çift yok (kahraman seçimini kontrol et)');
  const total=pairs.length*max*2, pool=new Pool(), cp=counted(pool,total,onProgress), t0=Date.now();
  async function pairRun([a,b], pi){
    const jb={ ...base, a, b, overrides:ovBase, seed:seed+pi*7919 }, jv={ ...jb, overrides:ovV };
    const B=[], V=[]; let i=0;
    for(;;){
      const n=Math.min(batch, max-i), idx=Array.from({length:n},(_,k)=>i+k);
      const [rb, rv]=await Promise.all([Promise.all(idx.map(k=>cp.one(jb,k))), Promise.all(idx.map(k=>cp.one(jv,k)))]);
      B.push(...rb.map(score)); V.push(...rv.map(score)); i+=n;
      const d=V.map((v,k)=>v-B[k]), m=avg(d);
      const sd=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,d.length-1)), se=sd/Math.sqrt(d.length);
      const done = i>=max ? 'üst sınır' : (d.length>=min && se>0 && Math.abs(m)/se>=2.5) ? 'fark belli' : (d.length>=min && 1.96*se<=margin) ? 'yeterli kesinlik' : null;
      if(done){
        // eşlemenin kazancı: bağımsız ölçüme göre kaç kat daha az maç gerekti
        const v1=B.reduce((s,x)=>s+(x-avg(B))**2,0)/B.length, v2=V.reduce((s,x)=>s+(x-avg(V))**2,0)/V.length;
        return { a, b, n:i, base:avg(B), variant:avg(V), diff:m, ci:1.96*se, why:done, gain: sd>0 ? (v1+v2)/(sd*sd) : null };
      }
    }
  }
  try {
    const out=await Promise.all(pairs.map(pairRun));
    return { pairs:out, ovBase, ovVariantAll:ovV, total, ran:cp.done, seconds:(Date.now()-t0)/1000 };
  } finally { pool.close(); }
}

if(isMain(import.meta.url)){
  const o=parseArgs(process.argv.slice(2)), base=jobBase(o);
  if(!o.variant) { console.log('En az bir --variant gerekli. Örnek: --variant archer.hp.base=470'); process.exit(1); }
  const r=await runCompare({ base, ovBase:overridesFrom(o.base), ovVariant:overridesFrom(o.variant), heroes:o.heroes ? o.heroes.split(',') : HEROES,
    seed:+(o.seed||1), min:+(o.min||16), max:+(o.max||160), batch:+(o.batch||16), margin:+(o.margin||0.04) });
  const lbl=l=>l.map(v=>v.hero+'.'+v.stat+'.'+v.field+'='+v.value).join(' ')||'varsayılan';
  console.log(`önce: ${lbl(r.ovBase)}  ->  sonra: ${lbl(r.ovVariantAll)} | ${scLabel(base)}`);
  let total=0;
  for(const p of r.pairs){ total+=p.n*2;
    const sign=p.diff>=0?'+':'';
    console.log(`${p.a.padEnd(8)} vs ${p.b.padEnd(8)} ${pct(p.base)} -> ${pct(p.variant)}   fark ${sign}${(p.diff*100).toFixed(1)} ± ${(p.ci*100).toFixed(1)} puan  (${p.n} eş maç, ${p.why}${p.gain?', eşleme kazancı x'+p.gain.toFixed(1):''})`); }
  console.log(`toplam ${total} maç, ${r.seconds.toFixed(0)} sn`);
}

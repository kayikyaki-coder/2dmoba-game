/* İlerleme ve maç uzunluğu ölçümü (2v2): node tools/pace.js [--matches 48] [--diff medium] [--seed 1] [--threads 4]
   Rastgele dengeli 2v2 kompozisyonlar (4 farklı kahraman), iki takım aynı zorlukta.
   Çıktı: ortalama süre, p10/p50/p90, bitişte seviye, büyük eşya sayısı (maç başına en iyi/en kötü kahraman), 5/10/15/20. dk seviye ve servet. */
import { runDuoJobs } from './duo.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';

const o=parseArgs(process.argv.slice(2));
const n=+(o.matches||48), seed=+(o.seed||1), diff=o.diff||'medium', H=Object.keys(HERO_NAMES);
let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const jobs=[];
for(let i=0;i<n;i++){
  const p=H.slice(); for(let k=p.length-1;k>0;k--){ const j=Math.floor(rnd()*(k+1)); [p[k],p[j]]=[p[j],p[k]]; }
  jobs.push({ a:[p[0],p[1]], b:[p[2],p[3]], aTeam:i%2, seed:seed*1000+i, maxTime:2400, diffA:diff, diffB:diff });
}
const t0=Date.now(), R=await runDuoJobs(jobs, o.threads?+o.threads:undefined);
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:NaN, q=(xs,p)=>{ const s=xs.slice().sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor(p*s.length))]; };
const T=R.map(r=>r.time/60), hs=R.flatMap(r=>r.heroes);
console.log(`${n} maç (${diff}), ${((Date.now()-t0)/1000).toFixed(0)} sn | zaman aşımı ${R.filter(r=>r.winner===null).length}`);
console.log(`ilk kule ort ${(avg(R.map(r=>r.firstTower||r.time))/60).toFixed(1)} dk`); console.log(`süre ort ${avg(T).toFixed(1)} dk | p10 ${q(T,.1).toFixed(1)} p50 ${q(T,.5).toFixed(1)} p90 ${q(T,.9).toFixed(1)} | <10 dk %${Math.round(100*T.filter(t=>t<10).length/n)}, 10-15 %${Math.round(100*T.filter(t=>t>=10&&t<15).length/n)}, >15 %${Math.round(100*T.filter(t=>t>=15).length/n)}`);
console.log(`bitişte seviye ort ${avg(hs.map(h=>h.lvEnd)).toFixed(2)} (en çok ${Math.max(...hs.map(h=>h.lvEnd))}) | büyük eşya ort ${avg(hs.map(h=>h.itemsEnd)).toFixed(2)}, maç içi en iyi ${avg(R.map(r=>Math.max(...r.heroes.map(h=>h.itemsEnd)))).toFixed(2)}, en kötü ${avg(R.map(r=>Math.min(...r.heroes.map(h=>h.itemsEnd)))).toFixed(2)} | servet ort ${avg(hs.map(h=>h.worthEnd)).toFixed(0)}`);
console.log(`ölüm/maç ${(avg(R.map(r=>r.heroes.reduce((a,h)=>a+h.deaths,0)))).toFixed(1)} | kule altında ölüm %${(100*hs.reduce((a,h)=>a+h.towerDeaths,0)/Math.max(1,hs.reduce((a,h)=>a+h.deaths,0))).toFixed(1)}`);
for(const m of [5,10,15,20]){ const x=hs.map(h=>h.snaps&&h.snaps[m]).filter(Boolean); if(x.length) console.log(`${m}. dk (${x.length/4|0} maç sürüyor): seviye ${avg(x.map(s=>s.lv)).toFixed(2)}, servet ${avg(x.map(s=>s.worth)).toFixed(0)}, büyük eşya ${avg(x.map(s=>s.items)).toFixed(2)}`); }
const buckets=[[0,10],[10,15],[15,99]]; for(const [a,b] of buckets){ const rr=R.filter(r=>r.time/60>=a&&r.time/60<b); if(rr.length){ const h2=rr.flatMap(r=>r.heroes); console.log(`  ${a}-${b} dk bitenler (${rr.length}): seviye ${avg(h2.map(h=>h.lvEnd)).toFixed(2)}, eşya ${avg(h2.map(h=>h.itemsEnd)).toFixed(2)} (en iyi ${avg(rr.map(r=>Math.max(...r.heroes.map(h=>h.itemsEnd)))).toFixed(2)}, en kötü ${avg(rr.map(r=>Math.min(...r.heroes.map(h=>h.itemsEnd)))).toFixed(2)})`); } }

/* Otomatik denge araması: verilen parametreleri tek tek değiştirip tüm eşleşmeleri %50'ye en çok yaklaştıran değerleri arar.
   Hedef: her çift için (kazanma-0.5)^2 toplamı + zaman aşımı cezası.
   node tools/tune.js 24 > tune.log */
import { runSimulation } from './runner.js';
import { STATS } from '../data.js';

const M=+(process.argv[2]||24);
/* Parametreler: yol, aday değerler, başlangıç indeksi */
const PARAMS=[
  { p:'mage.spd.base',        vals:[225,230,235], i:2 },
  { p:'mage.hp.base',         vals:[410,440,470], i:2 },
  { p:'mage.skill.s.dmg',     vals:[[160,240],[190,280],[220,320]], i:2 },
  { p:'mage.skill.e.dot',     vals:[[60,85,110,135],[70,98,125,152],[80,110,140,170]], i:2 },
  { p:'archer.hp.base',       vals:[530,560,590], i:0 },
  { p:'warrior.skill.e.spd',  vals:[0.20,0.23], i:0 }
];
const heroes=Object.keys(STATS), cache=new Map();
const ov=()=>PARAMS.map(q=>{ const [hero,stat,...rest]=q.p.split('.'); return { hero, stat, field:rest.join('.'), value:q.vals[q.i] }; });
const label=()=>PARAMS.map(q=>q.p+'='+q.vals[q.i]).join(' ');
async function score(){
  const key=label(); if(cache.has(key)) return cache.get(key);
  let s=0; const parts=[];
  for(let a=0;a<heroes.length;a++) for(let b=a+1;b<heroes.length;b++){
    const r=(await runSimulation({ a:heroes[a], b:heroes[b], matches:M, seed:1, maxTime:2700, overrides:ov() })).rows[0];
    const w=r.aWin===null?0.5:r.aWin; s+=(w-0.5)**2 + 0.15*(r.timeouts/M)**2;
    parts.push(heroes[a]+'-'+heroes[b]+' '+(r.aWin===null?'-':Math.round(r.aWin*100)+'%')+(r.timeouts?' (za '+r.timeouts+')':''));
  }
  const out={ s, txt:parts.join(' | ') }; cache.set(key,out);
  console.log(s.toFixed(4)+'  '+out.txt+'  <=  '+key);
  return out;
}
let best=await score();
for(let round=0; round<3; round++){
  let improved=false;
  for(const q of PARAMS){
    const cur=q.i;
    for(const d of [-1,1]){
      const ni=cur+d; if(ni<0||ni>=q.vals.length) continue;
      q.i=ni; const r=await score();
      if(r.s<best.s-0.002){ best=r; improved=true; break; }
      q.i=cur;
    }
    if(q.i!==cur) continue;
  }
  if(!improved) break;
}
console.log('EN İYİ: '+best.s.toFixed(4)+'  '+best.txt+'  <=  '+label());

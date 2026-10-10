/* Maç süresi ve altın eğrisi: node tools/econ.js archer warrior 12
   Her kahraman için 5, 10, 15, 20, 25, 30. dakikadaki ortalama altın (o ana kadar kazanılan toplam). */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand } from '../ai.js';

const [a='archer', b='warrior', n='12', maxT='2700']=process.argv.slice(2);
const marks=[5,10,15,20,25,30], gold={ [a]:marks.map(()=>[]), [b+(a===b?'_2':'')]:marks.map(()=>[]) };
const times=[]; let timeouts=0;
const key=h=> a===b ? (h.team===0?a:b+'_2') : h.type;
for(let i=0;i<+n;i++){
  resetGame({ types: i%2?[b,a]:[a,b], levels:[1,1], human:null, seed:7000+i, fx:false });
  let mi=0;
  while(!S.over && S.time<+maxT){
    step(TICK, botCommand);
    if(mi<marks.length && S.time>=marks[mi]*60){ for(const h of S.heroes) gold[key(h)][mi].push(h.gold); mi++; }
  }
  if(S.over) times.push(S.time); else timeouts++;
}
const avg=x=>x.length?x.reduce((p,q)=>p+q,0)/x.length:NaN, mmss=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
console.log(`${a} vs ${b}: ${n} maç | biten ${times.length} | ort. süre ${times.length?mmss(avg(times)):'-'} (en kısa ${times.length?mmss(Math.min(...times)):'-'}, en uzun ${times.length?mmss(Math.max(...times)):'-'}) | 45 dk'da bitmeyen ${timeouts}`);
for(const [k,g] of Object.entries(gold)) console.log('  '+k.padEnd(10)+marks.map((m,j)=>m+'dk '+(g[j].length?String(Math.round(avg(g[j]))).padStart(5):'    -')+(g[j].length<+n?'('+g[j].length+')':'')).join('  '));

/* Bot karşılaştırma: aiA botu, aiB botuna karşı bütün kahraman eşleşmelerinde (A ve B her kahramanı oynar).
   node tools/gauntlet.js yeni v2 40   -> yeni botun kazanma oranı, eşleşme eşleşme ve ortalama */
import { runSimulation } from './runner.js';
import { STATS } from '../data.js';
const [A='yeni', B='v2', M='40']=process.argv.slice(2);
const H=Object.keys(STATS); let sum=0, n=0; const rows=[];
for(const a of H) for(const b of H){
  const r=(await runSimulation({ a, b, aiA:A, aiB:B, matches:+M, seed:31, maxTime:2700 })).rows[0];
  rows.push(`${a}(${A}) vs ${b}(${B}): ${r.aWin===null?'-':Math.round(r.aWin*100)+'%'}${r.timeouts?' za '+r.timeouts:''}`);
  if(r.aWin!==null){ sum+=r.aWin; n++; }
}
console.log(rows.join('\n')); console.log(`ORTALAMA ${A} kazanma: ${Math.round(sum/n*100)}%`);

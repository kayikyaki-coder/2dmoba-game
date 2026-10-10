/* Düello testi: minyonsuz, kulesiz alanda iki bot dövüşür (sis kapalı). node tools/duel.js mage warrior 10 40 */
import { TICK } from '../data.js';
import { S, settings, resetGame, step } from '../sim.js';
import { botCommand } from '../ai.js';
const [a='mage', b='warrior', lvl='10', n='40']=process.argv.slice(2);
settings.botMode='duel'; settings.waves=false; settings.fog=false;
let wins=0, tsum=0;
for(let i=0;i<+n;i++){
  const swap=i%2, types=swap?[b,a]:[a,b];
  resetGame({ types, levels:[+lvl,+lvl], human:null, seed:1000+i, fx:false });
  for(const h of S.heroes){ h.x=2500+(h.team?150:-150)*2; h.spawnX=h.x; }   // ortada, kulelerden uzak
  const start=S.time; let k=-1;
  while(S.time-start<60){ step(TICK, botCommand); if(S.heroes.some(h=>h.dead)){ k=S.heroes.findIndex(h=>!h.dead); break; } }
  if(k>=0){ const winnerType=S.heroes[k].type; if(winnerType===a && (a!==b || k===0)) wins++; tsum+=S.time-start; }
}
console.log(a+' vs '+b+' (sev '+lvl+') düello: '+a+' kazanma '+(wins/+n*100).toFixed(0)+'%, ort süre '+(tsum/+n).toFixed(1)+' sn');

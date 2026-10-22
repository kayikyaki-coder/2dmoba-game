/* Titan kullanımı: node tools/titanlog.js --from 0 --to 12 [--seed 3] [--diff expert]
   Titan kampının canlı/ölü geçişleri, öldüren takım, çıkıştan ölüme süre, çukur yakınında (900) bulunan kahraman sayısı. */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand, LEVEL_IDS, LEVEL_PARAMS } from '../ai.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';
const o=parseArgs(process.argv.slice(2));
const seed=+(o.seed||3), diff=o.diff||'expert', H=Object.keys(HERO_NAMES), from=+(o.from||0), to=+(o.to||12);
let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
if(o.tune){ const t=JSON.parse(o.tune); for(const [k,v] of Object.entries(t)) Object.assign(LEVEL_PARAMS[+k], v); }
const jobs=[]; for(let i=0;i<to;i++){ const p=H.slice(); for(let k=p.length-1;k>0;k--){ const j=Math.floor(rnd()*(k+1)); [p[k],p[j]]=[p[j],p[k]]; } jobs.push({ i, teams:[[p[0],p[1]],[p[2],p[3]]], seed:seed*1000+i }); }
let spawns=0, kills=0, waits=[], atPit=[], totalMatches=0, byTeamWin={w:0,l:0}, liveTime=0, matchTime=0;
for(const J of jobs.slice(from,to)){
  resetGame({ types:J.teams, levels:[1,1], human:null, seed:J.seed, fx:false });
  const lv=LEVEL_IDS.indexOf(diff); for(const h of S.heroes) h.botLevel=lv;
  const camp=S.camps.find(c=>c.big); if(!camp){ console.log('Titan kampı yok'); process.exit(1); }
  let was=false, born=0, tick=0, near=0, nearN=0; totalMatches++;
  const prevBig=[0,0];
  while(!S.over && S.time<2400){
    step(TICK,(h,dt)=>botCommand(h,dt)); tick++;
    const alive=!!camp.alive;
    if(alive&&!was){ spawns++; born=S.time; near=0; nearN=0; if(o.v) console.log('  m'+J.i+' doğdu '+(S.time/60).toFixed(1)); }
    if(alive){ liveTime+=TICK; if(tick%60===0){ nearN++; near+=S.heroes.filter(h=>!h.dead&&Math.hypot(h.x-camp.x,h.y-camp.y)<900).length; } }
    if(!alive&&was){ kills++; if(o.v) console.log('  m'+J.i+' öldü '+(S.time/60).toFixed(1)+' büyük '+S.jstats.big.join('/')+' hp?');  waits.push(S.time-born); atPit.push(nearN?near/nearN:0); const t=S.jstats.big[0]>prevBig[0]?0:1; byTeamWin[t===0?'w':'l']++; prevBig[0]=S.jstats.big[0]; prevBig[1]=S.jstats.big[1]; }
    was=alive;
  }
  matchTime+=S.time;
}
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
console.log(`maç ${totalMatches}, ort ${(matchTime/totalMatches/60).toFixed(1)} dk | Titan doğuş ${spawns} (maç başına ${(spawns/totalMatches).toFixed(2)}), öldürülen ${kills} (%${(100*kills/Math.max(1,spawns)).toFixed(0)}) | çıkıştan ölüme ort ${(avg(waits)/60).toFixed(1)} dk | canlıyken çukur yakınında ort ${avg(atPit).toFixed(2)} kahraman | canlı kalma süresi / maç ${(liveTime/totalMatches/60).toFixed(1)} dk`);

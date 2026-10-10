/* Tek maçın zaman çizelgesi (bot hata ayıklama).
   node tools/trace.js --a archer --b warrior --aiA yeni --aiB eski --seed 3 --every 30 --maxTime 1800 */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { BOTS } from './match.js';

const args={}; const argv=process.argv.slice(2);
for(let i=0;i<argv.length;i+=2) args[argv[i].replace(/^--/,'')]=argv[i+1];
const a=args.a||'archer', b=args.b||'warrior', every=+(args.every||30), maxTime=+(args.maxTime||1800);
const ctl=[BOTS[args.aiA||'yeni'], BOTS[args.aiB||'yeni']];
resetGame({ types:[a,b], levels:[+(args.levelA||1), +(args.levelB||1)], human:null, seed:+(args.seed||1), fx:false });

const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const dead=S.structs.map(()=>false), kills=[0,0];
let next=every;
console.log('Takım0: '+a+' ('+(args.aiA||'yeni')+')  Takım1: '+b+' ('+(args.aiB||'yeni')+')');
while(!S.over && S.time<maxTime){
  step(TICK, (h,dt)=>ctl[h.team](h,dt));
  S.structs.forEach((s,i)=>{ if(s.dead && !dead[i]){ dead[i]=true; console.log(mmss(S.time)+'  YIKILDI: takım'+s.team+' '+s.sub+(s.sub==='tower'?' '+s.idx:'')); } });
  if(S.score[0]!==kills[0] || S.score[1]!==kills[1]){ kills[0]=S.score[0]; kills[1]=S.score[1]; }
  if(S.time>=next){
    next+=every;
    const hs=S.heroes.map(h=>h.dead ? 'ölü' : (h.x|0)+' '+Math.round(h.hp/h.maxHp*100)+'% sv'+h.level+(h.ai.v2&&h.ai.v2.recall?' DÖN':'')+(h.ai.v2&&h.ai.v2.fight?' DÖV':'')).join('  |  ');
    const mn=[0,1].map(t=>S.minions.filter(m=>m.team===t).length).join('/');
    const tw=[0,1].map(t=>S.lane[t].map(s=>s.dead?'-':Math.round(s.hp)).join(',')).join('  ');
    console.log(mmss(S.time)+'  '+hs+'  | min '+mn+' | skor '+S.score.join('-')+' | yapılar '+tw);
  }
}
console.log(S.over ? 'KAZANAN: takım'+S.over.winner+' '+mmss(S.time) : 'ZAMAN AŞIMI');

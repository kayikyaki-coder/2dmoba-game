/* 2v2 yapay zeka denetimi: node tools/aiaudit2.js --hero warrior [--matches 12] [--seed 7]
   Kahraman rastgele dost/rakiplerle 2v2 oynar. Ölçer: yetenek kullanım/dk (bekleme dolunca yükselen cd),
   "fırsat" (yetenek hazır + görünen rakip kahraman 450 içinde) süresi ve o sürede kullanma oranı,
   kahramanlara verilen/alınan hasar/dk, dövüş (rakip kahraman 600 içinde) ve ölü zamanı. */
import { TICK } from '../data.js';
import { S, resetGame, step, canSee } from '../sim.js';
import { botCommand } from '../ai.js';
import { HERO_NAMES } from '../names.js';
import { parseArgs } from './pool.js';

const o=parseArgs(process.argv.slice(2)), H=o.hero||'warrior', N=+(o.matches||12), seed=+(o.seed||7);
const others=Object.keys(HERO_NAMES).filter(h=>h!==H);
let rs=seed>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const pick=()=>others.splice(0).length, R={ games:0, wins:0, min:0, dealt:0, taken:0, dead:0, fight:0, k:0, d:0, a:0, cast:{r:0,e:0,s:0}, opp:{r:0,e:0,s:0}, oppUse:{r:0,e:0,s:0} };
for(let g=0; g<N; g++){
  const pool=Object.keys(HERO_NAMES).filter(h=>h!==H), take=()=>pool.splice(Math.floor(rnd()*pool.length),1)[0];
  const ally=take(), f1=take(), f2=take(), side=g%2;
  const tA=[H,ally], tB=[f1,f2];
  resetGame({ types: side===0?[tA,tB]:[tB,tA], human:null, seed:seed*1000+g, fx:false });
  const me=S.heroes.find(h=>h.type===H), myT=me.team;
  S.onDamage=(e,amt,src)=>{ if(e.kind!=='hero'||!src||src.kind!=='hero'||src.team===e.team) return; if(src===me) R.dealt+=amt; if(e===me) R.taken+=amt; };
  const prev={r:0,e:0,s:0}; let oppOpen={r:false,e:false,s:false};
  while(!S.over && S.time<2400){
    step(TICK,(h,dt)=>botCommand(h,dt));
    if(me.dead){ R.dead+=TICK; continue; }
    const foes=S.heroes.filter(x=>x.team!==myT && !x.dead && canSee(myT,x)), nd=Math.min(1e9,...foes.map(x=>Math.hypot(x.x-me.x,x.y-me.y)));
    if(nd<600) R.fight+=TICK;
    for(const k of ['r','e','s']){
      const cd=me.cd[k]||0, up=cd>prev[k]+0.5; if(up){ R.cast[k]++; if(oppOpen[k]) R.oppUse[k]++; }
      const ready=me.rank[k]>0 && cd<=0, op=ready && nd<450;
      if(op && !oppOpen[k]) R.opp[k]++;
      oppOpen[k]=op || (oppOpen[k] && !up && ready);
      prev[k]=cd;
    }
  }
  S.onDamage=null;
  R.games++; if(S.over && S.over.winner===myT) R.wins++; R.min+=S.time/60; R.k+=me.kills; R.d+=me.deaths; R.a+=me.assists;
}
const m=R.min, f=x=>x.toFixed(1);
console.log(`${HERO_NAMES[H]} 2v2: ${R.wins}/${R.games} kazanma | K/D/A ${f(R.k/R.games)}/${f(R.d/R.games)}/${f(R.a/R.games)} | kahramana hasar/dk ${f(R.dealt/m)} aldığı/dk ${f(R.taken/m)}`);
console.log(`zaman: dövüş %${f(R.fight/60/m*100)} ölü %${f(R.dead/60/m*100)}`);
for(const k of ['r','e','s']) console.log(`  ${k}: kullanım/dk ${f(R.cast[k]/m)} | fırsat ${R.opp[k]} kez, fırsatta kullandı %${R.opp[k]?f(R.oppUse[k]/R.opp[k]*100):'-'}`);

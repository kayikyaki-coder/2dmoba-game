/* Bot zaman kullanımı: node tools/timeuse.js --from 0 --to 12 [--diff expert] [--seed 3]
   Her 0,5 sn'de her kahraman için durum: ölü, dönüş (kanal + yürüme), dövüş (M.fight), kule vuruşu, minyon vuruşu, orman (canavar), boşta yürüyüş. Dakika dilimi (0-8, 8-15, 15+) başına yüzde. */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand, LEVEL_IDS } from '../ai.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';
const o=parseArgs(process.argv.slice(2));
const seed=+(o.seed||3), diff=o.diff||'expert', H=Object.keys(HERO_NAMES), from=+(o.from||0), to=+(o.to||12);
let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const jobs=[]; for(let i=0;i<to;i++){ const p=H.slice(); for(let k=p.length-1;k>0;k--){ const j=Math.floor(rnd()*(k+1)); [p[k],p[j]]=[p[j],p[k]]; } jobs.push({ i, teams:[[p[0],p[1]],[p[2],p[3]]], seed:seed*1000+i }); }
const cats=['dead','recall','fight','tower','minion','jungle','walk'], acc={};
const slice=m=>m<8?'0-8':m<15?'8-15':'15+';
for(const J of jobs.slice(from,to)){
  resetGame({ types:J.teams, levels:[1,1], human:null, seed:J.seed, fx:false });
  const lv=LEVEL_IDS.indexOf(diff); for(const h of S.heroes) h.botLevel=lv;
  let tick=0;
  while(!S.over && S.time<2400){
    step(TICK,(h,dt)=>botCommand(h,dt)); tick++;
    if(tick%30) continue;
    const sl=slice(S.time/60); const A=acc[sl]=acc[sl]||Object.fromEntries(cats.map(c=>[c,0]));
    for(const h of S.heroes){
      const M=h.ai&&h.ai.v2||{}; let c;
      if(h.dead) c='dead';
      else if(M.recall||h.recallCh) c='recall';
      else if(M.fight) c='fight';
      else { const t=h.atk&&h.atk.target; if(t&&t.kind==='struct') c='tower'; else if(t&&t.kind==='minion') c='minion'; else if(t&&t.kind==='monster') c='jungle'; else c='walk'; }
      A[c]++;
      if(!h.dead){ const st=S.lane[1-h.team].find(x=>!x.dead); if(st&&!st.prot&&Math.hypot(h.x-st.x,h.y-st.y)<1600){ A.near=(A.near||0)+1; if(c==='tower') A.nearTower=(A.nearTower||0)+1; if(c==='minion') A.nearMin=(A.nearMin||0)+1; if(c==='fight') A.nearFight=(A.nearFight||0)+1; if(c==='recall') A.nearRecall=(A.nearRecall||0)+1; if(c==='walk') A.nearWalk=(A.nearWalk||0)+1; } }
    }
  }
}
for(const sl of Object.keys(acc)){ const A=acc[sl], tot=cats.reduce((s,c)=>s+A[c],0); console.log('   (kule 1600 içinde: %'+(100*(A.near||0)/tot).toFixed(1)+' zaman; bunun içinde kule '+(A.nearTower||0)+' minyon '+(A.nearMin||0)+' dövüş '+(A.nearFight||0)+' dönüş '+(A.nearRecall||0)+' yürüme '+(A.nearWalk||0)+')'); console.log(sl.padEnd(5), cats.map(c=>`${c} ${(100*A[c]/tot).toFixed(0)}%`).join('  ')); }

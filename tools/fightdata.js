/* Dövüş verisi toplama (makine öğrenmesi): node tools/fightdata.js --from 0 --to 20 [--seed 11] [--explore 0.3] [--diff expert] > out.jsonl
   2v2 rastgele kompozisyon, her iki taraf aynı bot. Bot dövüşteyken 0,5 sn'de bir özellik vektörü kaydedilir (ai.js fightFeatures);
   6 sn sonra sonuç: rakip can kaybı - bizim can kaybı + 0,5 x (rakip öldü - biz öldük). Satır: {"f":[...],"y":skor}. */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand, LEVEL_IDS, LEVEL_PARAMS, AI } from '../ai.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';
const o=parseArgs(process.argv.slice(2));
const seed=+(o.seed||11), diff=o.diff||'expert', H=Object.keys(HERO_NAMES), from=+(o.from||0), to=+(o.to||20), explore=+(o.explore??0.3), WIN=6;
const lvIdx=LEVEL_IDS.indexOf(diff); Object.assign(LEVEL_PARAMS[lvIdx], { collect:o.all?2:1, explore });   // --all 1: dövüşmezken de örnek (fg 0), ölüm riski modeli için
let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const jobs=[]; for(let i=0;i<to;i++){ const p=H.slice(); for(let k=p.length-1;k>0;k--){ const j=Math.floor(rnd()*(k+1)); [p[k],p[j]]=[p[j],p[k]]; } jobs.push({ i, teams:[[p[0],p[1]],[p[2],p[3]]], seed:seed*1000+i }); }
let n=0;
for(const J of jobs.slice(from,to)){
  resetGame({ types:J.teams, levels:[1,1], human:null, seed:J.seed, fx:false });
  for(const h of S.heroes) h.botLevel=lvIdx;
  AI.sink=[]; let pend=[];
  while(!S.over && S.time<2400){
    step(TICK,(h,dt)=>botCommand(h,dt));
    if(AI.sink.length){ pend.push(...AI.sink); AI.sink.length=0; }
    while(pend.length && S.time>=pend[0].t+WIN){
      const r=pend.shift(), me=S.heroes.find(h=>h.id===r.id), fo=S.heroes.find(h=>h.id===r.eid);
      const meD=me.deaths>r.dth, foD=fo.deaths>r.edth;
      const dMe=meD?r.hp:Math.max(0,r.hp-me.hp/me.maxHp), dFo=foD?r.ehp:Math.max(0,r.ehp-fo.hp/fo.maxHp);
      console.log(JSON.stringify({ f:r.f.map(v=>+v.toFixed(4)), y:+(dFo-dMe+0.5*((foD?1:0)-(meD?1:0))).toFixed(4), fg:r.fg, dd:meD?1:0 })); n++;
    }
  }
}
process.stderr.write(`örnek ${n}\n`);

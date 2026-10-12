/* Yeni-eski bot teşhisi (1v1): node tools/aivs.js [--n 16] [--diff expert] [--aiB eski2]
   A (yeni) ile B karşılaştırması: 5. ve 10. dk servet/XP farkı, K/D, kule yıkımı, kazanma. Tek iş parçacığı yerine 4 süreç için --part i/4. */
import { TICK, STATS } from '../data.js';
import { S, resetGame, step, heroWorth, totalXP } from '../sim.js';
import { BOTS } from './match.js';
import { LEVEL_IDS, LEVEL_PARAMS } from '../ai.js';
import { parseArgs } from './pool.js';
const o=parseArgs(process.argv.slice(2)), N=+(o.n||16), li=LEVEL_IDS.indexOf(o.diff||'expert'), aiB=o.aiB||'eski2', aiA=o.aiA||'yeni';
if(o.tune) for(const [k,v] of Object.entries(JSON.parse(o.tune))) Object.assign(LEVEL_PARAMS[+k], v);
const [pi,pn]=(o.part||'0/1').split('/').map(Number);
const H=Object.keys(STATS); let rs=(+(o.seed||5))>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const T={ dB:0, dAh:0, dAt:0, dAm:0, dBh:0, dBt:0, dBm:0, g5:0,x5:0,g10:0,x10:0,k:0,d:0,tw:0,twB:0,win:0,n:0 };
for(let i=0;i<N;i++){
  const h1=H[Math.floor(rnd()*H.length)], h2=H[Math.floor(rnd()*H.length)];
  for(const g of [0,1,2,3]){   // her kahraman çifti 4 kez: iki taraf x iki kahraman (kahraman ve taraf etkisi götürülür)
    const aT=g&1, a=g<2?h1:h2, b=g<2?h2:h1;
    if(((i*4+g)%pn)!==pi) continue;
    resetGame({ types: aT===0?[a,b]:[b,a], human:null, seed:7000+i, fx:false });
    for(const h of S.heroes) h.botLevel = (h.team===aT || o.diffB===undefined) ? li : LEVEL_IDS.indexOf(o.diffB);
    const ctl=[aT===0?BOTS[aiA]:BOTS[aiB], aT===0?BOTS[aiB]:BOTS[aiA]];
    const A=S.heroes[aT], B=S.heroes[1-aT];
    S.onDamage=(e,amt,src)=>{ if(e.kind==='struct' && src && src.kind==='hero'){ const w=src===A?'A':'B', o=src===A?B:A; T['st'+w]=(T['st'+w]||0)+amt; if(o.dead) T['sd'+w]=(T['sd'+w]||0)+amt; } if(e.kind!=='hero' || e.hp>0 || !src) return; const w=e===A?'A':'B', c=src.kind==='hero'?'h':src.kind==='struct'?'t':'m'; T['d'+w+c]++; };
    while(!S.over && S.time<2400){
      step(TICK,(h,dt)=>ctl[h.team](h,dt));
      if(B.dead) T.bDeadT=(T.bDeadT||0)+TICK; if(A.dead) T.aDeadT=(T.aDeadT||0)+TICK;
      if(Math.abs(S.time-300)<TICK/2){ T.g5+=heroWorth(A)-heroWorth(B); T.x5+=totalXP(A)-totalXP(B); }
      if(Math.abs(S.time-600)<TICK/2){ T.g10+=heroWorth(A)-heroWorth(B); T.x10+=totalXP(A)-totalXP(B); }
    }
    T.n++; T.bigA=(T.bigA||0)+S.jstats.big[aT]; T.bigB=(T.bigB||0)+S.jstats.big[1-aT]; T.k+=A.kills; T.d+=A.deaths; T.dB+=B.deaths; T.tw+=S.lane[1-aT].filter(s=>s.dead).length; T.twB+=S.lane[aT].filter(s=>s.dead).length;
    if(S.over && S.over.winner===aT) T.win++; else if(S.over) T.loss=(T.loss||0)+1;
  }
}
console.log(JSON.stringify(T));

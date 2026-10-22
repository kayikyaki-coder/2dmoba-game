/* Uzun maç teşhisi: node tools/longdiag.js --from 0 --to 12 [--diff expert] [--seed 1]
   pace.js ile aynı kompozisyon/tohumlar. Dakika başı: yapı durumu, ölü kahraman süresi, yapı hasarı (kahraman/minyon), minyon sayısı. JSON satırı basar. */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand, LEVEL_IDS } from '../ai.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';
const o=parseArgs(process.argv.slice(2));
const seed=+(o.seed||1), diff=o.diff||'expert', H=Object.keys(HERO_NAMES), from=+(o.from||0), to=+(o.to||48);
let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const jobs=[];
for(let i=0;i<to;i++){ const p=H.slice(); for(let k=p.length-1;k>0;k--){ const j=Math.floor(rnd()*(k+1)); [p[k],p[j]]=[p[j],p[k]]; } jobs.push({ i, a:[p[0],p[1]], b:[p[2],p[3]], aTeam:i%2, seed:seed*1000+i }); }
for(const J of jobs.slice(from,to)){
  const teams=J.aTeam===0?[J.a,J.b]:[J.b,J.a];
  resetGame({ types:teams, levels:[1,1], human:null, seed:J.seed, fx:false });
  const lv=LEVEL_IDS.indexOf(diff); for(const h of S.heroes) h.botLevel=lv;
  const mins=[]; let cur=null;
  const fresh=()=>({ sd:[0,0], sdH:[0,0], sdM:[0,0], dead:[0,0], kills:[0,0], hd:[0,0] });
  cur=fresh();
  S.onDamage=(e,a,src)=>{ if(e.kind==='struct'){ const t=1-e.team; cur.sd[t]+=a; if(src&&src.kind==='hero') cur.sdH[t]+=a; else if(src&&src.kind==='minion') cur.sdM[t]+=a; }
    if(e.kind==='hero'&&src&&src.kind==='hero') cur.hd[src.team]+=a; };
  let tick=0, prevDeaths=[0,0];
  while(!S.over && S.time<2400){
    step(TICK,(h,dt)=>botCommand(h,dt)); tick++;
    if(tick%60===0) for(const h of S.heroes) if(h.dead) cur.dead[h.team]++;
    if(tick%3600===0){
      const st=[0,1].map(t=>S.structs.filter(s=>s.team===t).map(s=>s.dead?0:Math.round(100*s.hp/s.maxHp)));
      const mn=[0,1].map(t=>S.minions.filter(m=>m.team===t&&!m.dead).length);
      const mx=[0,1].map(t=>{ const ms=S.minions.filter(m=>m.team===t&&!m.dead); return ms.length?Math.round(t===0?Math.max(...ms.map(m=>m.x)):Math.min(...ms.map(m=>m.x))):null; });
      const dth=[0,1].map(t=>S.heroes.filter(h=>h.team===t).reduce((s,h)=>s+h.deaths,0));
      const lvl=[0,1].map(t=>S.heroes.filter(h=>h.team===t).map(h=>h.level).join('/'));
      mins.push({ m:tick/3600, st, mn, mx, deaths:[dth[0]-prevDeaths[0],dth[1]-prevDeaths[1]], dead:cur.dead, sdH:cur.sdH.map(Math.round), sdM:cur.sdM.map(Math.round), hd:cur.hd.map(Math.round), lvl, buff:[0,1].map(t=>S.teamBuff[t]>S.time?1:0) });
      prevDeaths=dth; cur=fresh();
    }
  }
  console.log(JSON.stringify({ i:J.i, teams, time:+(S.time/60).toFixed(1), winner:S.over?S.over.winner:null, mins }));
}

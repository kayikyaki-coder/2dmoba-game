/* Durum örneği toplama (basit öğrenme için): node tools/mlcollect.js --from 0 --to 40 [--diff expert] [--seed 1] > out.jsonl
   Rastgele 2v2 kompozisyon, iki taraf aynı bot. Her 15 sn'de takım 0 gözüyle özellikler (fark = takım0 - takım1); etiket maç sonunda eklenir (kazanan 0/1, zaman aşımı yazılmaz). */
import { TICK, XP_NEED } from '../data.js';
import { S, resetGame, step, heroWorth, totalXP } from '../sim.js';
import { botCommand, LEVEL_IDS } from '../ai.js';
import { parseArgs } from './pool.js';
import { HERO_NAMES } from '../names.js';
const o=parseArgs(process.argv.slice(2));
const seed=+(o.seed||1), diff=o.diff||'expert', H=Object.keys(HERO_NAMES), from=+(o.from||0), to=+(o.to||40);
let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
const jobs=[]; for(let i=0;i<to;i++){ const p=H.slice(); for(let k=p.length-1;k>0;k--){ const j=Math.floor(rnd()*(k+1)); [p[k],p[j]]=[p[j],p[k]]; } jobs.push({ i, teams:[[p[0],p[1]],[p[2],p[3]]], seed:seed*1000+i }); }
const feat=()=>{
  const T=t=>S.heroes.filter(h=>h.team===t);
  const sum=(t,f)=>T(t).reduce((s,h)=>s+f(h),0);
  const d=f=>sum(0,f)-sum(1,f);
  const lost=t=>S.structs.filter(s=>s.team===t&&s.dead&&s.sub!=='nexus').length;
  const hpS=t=>S.structs.filter(s=>s.team===t&&!s.dead).reduce((s,x)=>s+x.hp,0);
  const mn=t=>S.minions.filter(m=>m.team===t&&!m.dead).length;
  const front=t=>{ const ms=S.minions.filter(m=>m.team===t&&!m.dead); if(!ms.length) return 0; const x=t===0?Math.max(...ms.map(m=>m.x)):Math.min(...ms.map(m=>m.x)); return t===0?x:5200-x; };
  return { t:+(S.time/60).toFixed(2),
    worth:d(h=>heroWorth(h))/1000, xp:d(h=>totalXP(h))/1000, kills:d(h=>h.kills), alive:d(h=>h.dead?0:1),
    deadT:d(h=>h.dead?-h.respawn:0)/10, towers:lost(1)-lost(0), structHp:(hpS(0)-hpS(1))/1000,
    minions:mn(0)-mn(1), push:(front(0)-front(1))/1000, titan:(S.teamBuff[0]>S.time?1:0)-(S.teamBuff[1]>S.time?1:0),
    jm:d(h=>h.jm||0)/10, lvl:d(h=>h.level) };
};
for(const J of jobs.slice(from,to)){
  resetGame({ types:J.teams, levels:[1,1], human:null, seed:J.seed, fx:false });
  const lv=LEVEL_IDS.indexOf(diff); for(const h of S.heroes) h.botLevel=lv;
  const rows=[]; let tick=0;
  while(!S.over && S.time<2400){ step(TICK,(h,dt)=>botCommand(h,dt)); tick++; if(tick%900===0) rows.push(feat()); }
  if(!S.over) continue;
  const w=S.over.winner;
  for(const r of rows) console.log(JSON.stringify({ g:J.i, y:w===0?1:0, T:+(S.time/60).toFixed(1), ...r }));
}

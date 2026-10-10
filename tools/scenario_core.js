/* Kısa senaryo maçları (ön eleme için, tam maçın yerini tutmaz):
   duel: minyonsuz, kulesiz, sissiz açık alanda iki kahraman verilen seviye ve eşyalarla dövüşür, ilk ölen kaybeder.
   lane: normal maç ilk N dakika oynanır; kazanan, değeri (altın + eşya + XP) daha yüksek olan. */
import { TICK, XP_NEED } from '../data.js';
import { S, settings, resetGame, step, computeBonus } from '../sim.js';
import { ITEMS } from '../items.js';
import { BOTS } from './match.js';

const totalXp = h => { let x=h.xp||0; for(let l=1;l<h.level;l++) x+=XP_NEED(l); return x; };
const worth = h => h.gold + h.items.reduce((s,id)=>s+(ITEMS[id]?ITEMS[id].cost:0),0) + totalXp(h);

/* sc: { kind:'duel'|'lane', level, items:{ hero:[eşya id] }, minutes, limit } */
export function runScenario({ a, b, aTeam, seed, sc, aiA='yeni', aiB='yeni' }){
  const types = aTeam===0 ? [a,b] : [b,a], keep={ botMode:settings.botMode, waves:settings.waves, fog:settings.fog };
  const ctl = aTeam===0 ? [BOTS[aiA], BOTS[aiB]] : [BOTS[aiB], BOTS[aiA]];
  const getCmd = (h, dt) => ctl[h.team](h, dt);
  try {
    if(sc.kind==='duel'){
      settings.botMode='duel'; settings.waves=false; settings.fog=false;
      const lv=sc.level||1;
      resetGame({ types, levels:[lv,lv], human:null, seed, fx:false });
      for(const s of S.structs) if(s.sub!=='nexus') s.dead=true;   // kule yok
      for(const h of S.heroes){
        const it=(sc.items && sc.items[h.type]) || [];
        h.items=it.slice(); computeBonus(h); h.hp=h.maxHp;
        h.x=2600+(h.team?1:-1)*320; h.y=270; h.spawnX=h.x; h.spawnY=h.y;
      }
      const lim=sc.limit||60; let k=-1;
      while(S.time<lim){ step(TICK, getCmd); if(S.heroes.some(h=>h.dead)){ k=S.heroes.findIndex(h=>!h.dead); break; } }
      const winner = k>=0 ? S.heroes[k].team : null;
      return { winner, aTeam, aWon: winner===null ? null : winner===aTeam, time:S.time, firstKill:null, firstTower:null, levelA:lv, levelB:lv };
    }
    // lane
    settings.botMode='lane'; settings.waves=true; settings.fog=true;
    resetGame({ types, levels:[1,1], human:null, seed, fx:false });
    const lim=(sc.minutes||6)*60;
    while(!S.over && S.time<lim) step(TICK, getCmd);
    const A=S.heroes[aTeam], B=S.heroes[1-aTeam];
    let aWon = S.over ? S.over.winner===aTeam : worth(A)===worth(B) ? null : worth(A)>worth(B);
    return { winner: aWon===null ? null : aWon ? aTeam : 1-aTeam, aTeam, aWon, time:S.time, diff:worth(A)-worth(B),
      firstKill:S.stats.firstKill, firstTower:S.stats.firstTower, levelA:A.level, levelB:B.level };
  } finally { Object.assign(settings, keep); }
}

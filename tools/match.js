/* Ekransız tek maç: iki bot, sabit tick. Tarayıcıya bağımlı değil. */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand, LEVEL_IDS } from '../ai.js';
import { botCommand as botV1 } from '../ai_v1.js';
import { botCommand as botV2 } from '../ai_v2.js';
import { botCommand as botUtil } from '../ai_util.js';
import * as CAND from '../ai.js?cand';   // ana botun ayrı bir kopyası: ayarları (AI) bağımsız değiştirilebilir (tools/evolve.js)
export const CAND_AI = CAND.AI;

/* Seçilebilir botlar: yeni (ai.js) ve eski (ai_v1.js) */
/* Bot zorluğu: diffA/diffB = 'easy'|'medium'|'hard'|'expert' (varsayılan easy = eski bot); takımdaki bütün kahramanlara uygulanır */
function applyDiff(team, id){ const i = typeof id==='number' ? id : LEVEL_IDS.indexOf(id||'easy'); if(i<0) throw new Error('Bilinmeyen zorluk: '+id); for(const h of S.heroes) if(h.team===team) h.botLevel = i; }

export const BOTS = { yeni: botCommand, eski: botV1, v2: botV2, util: botUtil, cand: CAND.botCommand };

/* a, b: kahraman türleri. aTeam: A'nın takımı (0 veya 1). */
export function runMatch({ a, b, levelA, levelB, aTeam, seed, maxTime, aiA='yeni', aiB='yeni', buildA='default', buildB='default', diffA='easy', diffB='easy' }){
  const types  = aTeam===0 ? [a,b] : [b,a];
  const levels = aTeam===0 ? [levelA,levelB] : [levelB,levelA];
  resetGame({ types, levels, human:null, seed, fx:false, builds: aTeam===0 ? [buildA,buildB] : [buildB,buildA] });
  applyDiff(aTeam, diffA); applyDiff(1-aTeam, diffB);
  const ctl = aTeam===0 ? [BOTS[aiA], BOTS[aiB]] : [BOTS[aiB], BOTS[aiA]];
  if(!ctl[0] || !ctl[1]) throw new Error('Bilinmeyen bot: '+aiA+' / '+aiB);
  const getCmd = (h, dt) => ctl[h.team](h, dt);
  while(!S.over && S.time<maxTime) step(TICK, getCmd);
  const winner = S.over ? S.over.winner : null;
  return {
    winner, aTeam,
    aWon: winner===null ? null : winner===aTeam,
    time: S.time,
    firstKill: S.stats.firstKill, firstTower: S.stats.firstTower,
    levelA: S.heroes[aTeam].level, levelB: S.heroes[1-aTeam].level,
    itemsA: S.heroes[aTeam].items.length, itemsB: S.heroes[1-aTeam].items.length,
    killsA: S.heroes[aTeam].kills, deathsA: S.heroes[aTeam].deaths, killsB: S.heroes[1-aTeam].kills, deathsB: S.heroes[1-aTeam].deaths
  };
}

/* 2v2 bot maçı: takım A = a:[k1,k2], takım B = b:[k1,k2]. aTeam: A'nın takımı (0 veya 1).
   Ölçer: kazanan, süre, K/D/A, birlikte hasar anları (iki dost 2 sn içinde aynı rakip kahramana vurdu; aynı rakip için en fazla 5 sn'de bir sayılır),
   dostlar arası ortalama uzaklık (ikisi de hayattayken) ve 800 içinde kalma oranı. */
export function runMatch2v2({ a, b, levelA=1, levelB=1, aTeam=0, seed=1, maxTime=2400, aiA='yeni', aiB='yeni', buildA='default', buildB='default', candAI={}, diffA='easy', diffB='easy' }){
  Object.assign(CAND_AI, { team:1, cohesion:1 }, candAI);   // 'cand' botunun takım ayarları (ör. { team:0 }: dostu yok sayar; karşılaştırma için)
  const teams = aTeam===0 ? [a,b] : [b,a];
  const levels = aTeam===0 ? [levelA,levelB] : [levelB,levelA];
  resetGame({ types:teams, levels, human:null, seed, fx:false, builds: aTeam===0 ? [buildA,buildB] : [buildB,buildA] });
  applyDiff(aTeam, diffA); applyDiff(1-aTeam, diffB);
  const ctl = aTeam===0 ? [BOTS[aiA], BOTS[aiB]] : [BOTS[aiB], BOTS[aiA]];
  if(!ctl[0] || !ctl[1]) throw new Error('Bilinmeyen bot: '+aiA+' / '+aiB);
  const getCmd = (h, dt) => ctl[h.team](h, dt);
  const last = new Map(), joint=[0,0], jointAt = new Map();
  S.onDamage = (e, amt, src) => {
    if(!src || src.kind!=='hero' || e.kind!=='hero' || src.team===e.team) return;
    last.set(e.id+':'+src.id, S.time);
    for(const m of S.heroes){
      if(m===src || m.team!==src.team) continue;
      const t = last.get(e.id+':'+m.id);
      if(t!==undefined && S.time-t<=2 && S.time-(jointAt.get(e.id)??-99)>=5){ jointAt.set(e.id,S.time); joint[src.team]++; break; }
    }
  };
  const apart=[0,0], near=[0,0], cnt=[0,0];
  const T0 = [S.heroes.filter(h=>h.team===0), S.heroes.filter(h=>h.team===1)];
  let tick=0;
  while(!S.over && S.time<maxTime){
    step(TICK, getCmd); tick++;
    if(tick%30===0) for(const t of [0,1]){
      const [x,y]=T0[t]; if(x && y && !x.dead && !y.dead){ const d=Math.hypot(x.x-y.x,x.y-y.y); apart[t]+=d; cnt[t]++; if(d<800) near[t]++; }
    }
  }
  S.onDamage = null;
  const winner = S.over ? S.over.winner : null, A=aTeam, B=1-aTeam;
  const sum=(t,k)=>T0[t].reduce((s,h)=>s+h[k],0);
  return {
    winner, aTeam, aWon: winner===null ? null : winner===aTeam, time:S.time,
    killsA:sum(A,'kills'), deathsA:sum(A,'deaths'), assistsA:sum(A,'assists'),
    killsB:sum(B,'kills'), deathsB:sum(B,'deaths'), assistsB:sum(B,'assists'),
    jointA:joint[A], jointB:joint[B],
    apartA:cnt[A] ? apart[A]/cnt[A] : null, nearA:cnt[A] ? near[A]/cnt[A] : null,
    apartB:cnt[B] ? apart[B]/cnt[B] : null, nearB:cnt[B] ? near[B]/cnt[B] : null,
    firstKill:S.stats.firstKill, firstTower:S.stats.firstTower,
    heroes:S.heroes.map(h=>({ type:h.type, side:h.team===A?'A':'B', kills:h.kills, deaths:h.deaths, assists:h.assists }))
  };
}

/* Ekransız tek maç: iki bot, sabit tick. Tarayıcıya bağımlı değil. */
import { TICK, XP_NEED, MAX_LEVEL } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { ITEMS, PARTS } from '../items.js';
import { botCommand, LEVEL_IDS } from '../ai.js';
import { botCommand as botV1 } from '../ai_v1.js';
import { botCommand as botV2 } from '../ai_v2.js';
import { botCommand as botUtil } from '../ai_util.js';
import { botCommand as botEski2 } from '../ai_eski.js';   // 12.10.2026 öncesi bot (yeni-eski karşılaştırma)
import * as CAND from '../ai.js?cand';   // ana botun ayrı bir kopyası: ayarları (AI) bağımsız değiştirilebilir (tools/evolve.js)
export const CAND_AI = CAND.AI;

/* Seçilebilir botlar: yeni (ai.js) ve eski (ai_v1.js) */
/* Bot zorluğu: diffA/diffB = 'easy'|'medium'|'hard'|'expert' (varsayılan easy = eski bot); takımdaki bütün kahramanlara uygulanır */
function applyDiff(team, id){ const i = typeof id==='number' ? id : LEVEL_IDS.indexOf(id||'easy'); if(i<0) throw new Error('Bilinmeyen zorluk: '+id); for(const h of S.heroes) if(h.team===team) h.botLevel = i; }

export const BOTS = { yeni: botCommand, eski: botV1, v2: botV2, util: botUtil, cand: CAND.botCommand, eski2: botEski2 };

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
export function runMatch2v2({ a, b, levelA=1, levelB=1, aTeam=0, seed=1, maxTime=2400, aiA='yeni', aiB='yeni', buildA='default', buildB='default', candAI={}, diffA='easy', diffB='easy', earlyStop=false, noJungleB=false }){
  Object.assign(CAND_AI, { team:1, cohesion:1 }, candAI);   // 'cand' botunun takım ayarları (ör. { team:0 }: dostu yok sayar; karşılaştırma için)
  const teams = aTeam===0 ? [a,b] : [b,a];
  const levels = aTeam===0 ? [levelA,levelB] : [levelB,levelA];
  resetGame({ types:teams, levels, human:null, seed, fx:false, builds: aTeam===0 ? [buildA,buildB] : [buildB,buildA], ...(noJungleB ? { noJungle:1-aTeam } : {}) });
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
  const worth=h=>h.gold+(h.items||[]).reduce((t,id)=>t+((ITEMS[id]||PARTS[id]||{}).cost||0),0);
  const at10=new Map(); const snap10=()=>{ for(const h of S.heroes) at10.set(h, { lv:h.level+h.xp/XP_NEED(h.level), worth:worth(h) }); };
  const bigN=h=>(h.items||[]).filter(id=>ITEMS[id]).length;
  const snaps=new Map(); const snapAt=m=>{ for(const h of S.heroes){ if(!snaps.has(h)) snaps.set(h,{}); snaps.get(h)[m]={ lv:h.level+(h.level<MAX_LEVEL?h.xp/XP_NEED(h.level):0), worth:worth(h), items:bigN(h) }; } };   // 5/10/15/20. dk seviye, servet, büyük eşya (tools/pace.js)
  let early=null;   // erken bitirme (earlyStop): kule farkı 2+ ya da rakip 2 kule kaybetti biz hiç (30 maçta %100 doğru; tools/teams2v2.js --fast)
  while(!S.over && S.time<maxTime && !early){
    step(TICK, getCmd); tick++;
    if(tick===36000) snap10();
    if(tick%18000===0) snapAt(tick/3600);   // 10. dakika: seviye ve servet (altın + eşya değeri)
    if(earlyStop && tick%60===0){
      const lost=[0,0]; for(const s of S.structs) if(s.dead && s.sub!=='nexus') lost[s.team]++;
      for(const t of [0,1]) if(lost[1-t]-lost[t]>=2 || (lost[1-t]>=2 && lost[t]===0)) early={ winner:t };
    }
    if(tick%30===0) for(const t of [0,1]){
      const [x,y]=T0[t]; if(x && y && !x.dead && !y.dead){ const d=Math.hypot(x.x-y.x,x.y-y.y); apart[t]+=d; cnt[t]++; if(d<800) near[t]++; }
    }
  }
  S.onDamage = null;
  const winner = S.over ? S.over.winner : early ? early.winner : null, A=aTeam, B=1-aTeam;
  const sum=(t,k)=>T0[t].reduce((s,h)=>s+h[k],0);
  return {
    winner, aTeam, aWon: winner===null ? null : winner===aTeam, time:S.time, early:!!early,
    killsA:sum(A,'kills'), deathsA:sum(A,'deaths'), assistsA:sum(A,'assists'),
    killsB:sum(B,'kills'), deathsB:sum(B,'deaths'), assistsB:sum(B,'assists'),
    jointA:joint[A], jointB:joint[B],
    apartA:cnt[A] ? apart[A]/cnt[A] : null, nearA:cnt[A] ? near[A]/cnt[A] : null,
    apartB:cnt[B] ? apart[B]/cnt[B] : null, nearB:cnt[B] ? near[B]/cnt[B] : null,
    firstKill:S.stats.firstKill, firstTower:S.stats.firstTower,
    heroes:S.heroes.map(h=>({ type:h.type, side:h.team===A?'A':'B', kills:h.kills, deaths:h.deaths, assists:h.assists, role:h.role, level:h.level+h.xp/1000, lv10:(at10.get(h)||{}).lv??null, worth10:(at10.get(h)||{}).worth??null, jCamps:h.jCamps||0, jGold:h.jGold||0, jm:h.jm||0, lvEnd:h.level, itemsEnd:bigN(h), worthEnd:worth(h), snaps:snaps.get(h)||{}, cuGold:h.cuGold||0, gold:h.gold+(h.items||[]).length*0 })),
    jungle:S.jstats ? { camps:S.jstats.camps.slice(), big:S.jstats.big.slice(), buffs:S.jstats.buffs.slice(), aTeam:A } : null
  };
}

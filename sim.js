/* Simülasyon: tarayıcıya bağımlı değil (document, window, canvas yok). */
import { TICK, ULT_LEVELS, RANK_CAP, LEVEL_PER, WORLD, LANE_Y, TEAM_COLORS, TEAM_DARK, MAX_LEVEL, STATS, HEROES, FORMS, TOWER, towerChampHit, towerMinionHit, BASE_TOWER_HP, NEXUS, LAYOUT, FOUNTAIN, MINIONS, WAVE_ORDER, WAVE_FIRST, WAVE_INTERVAL, WAVE_GAP, OFF_TARGET_DMG, MINION_CALL, MINION_CALL_R, MINION_LEASH, respawnTime, RECALL, MINION_SCALE, GOLD, minionGold, XP_NEED, HERO_KILL_XP, STRUCT_XP, XP_RADIUS, VISION, JUNGLE, BUFFS, BIG_BUFF, CATCHUP_XP, CATCHUP_GOLD, JUNGLE_MASTERY, JUNGLE_AVOID } from './data.js';
import { ITEMS, PARTS, SLOTS, START_GOLD, CRIT_MULT, BUILDS, DEF, DEF_CLASS, DEF_POOLS, DMG_PHYS } from './items.js';
import { MAP_W, structPos, SPAWN_OFF, pushOutWalls, pushOutWallsInto, PUSH, wallsFar, inWall, sightBlocked, bushAt, BUSHES, lanePoint, laneProject, laneLength, laneDir } from './map.js';

export const S = { heroes:[], minions:[], monsters:[], camps:[], dots:[], teamBuff:[0,0], jstats:null, structs:[], lane:[[],[]], projs:[], bolts:[], booms:[], zones:[], novas:[], sights:[], fx:[], spawnQ:[],
            score:[0,0], player:null, time:0, waveT:0, over:null, fxOn:true,
            stats:{ firstKill:null, firstTower:null } };
let nextId = 1;

/* Seed'li rastgele sayı üreteci (sim içinde Math.random yok) */
export function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
let rng=mulberry32(1), fxRng=mulberry32(2);
export function rand(){ return rng(); }
export function seedRng(seed){ rng=mulberry32(seed); fxRng=mulberry32((seed^0x9e3779b9)>>>0); }
export function spaceMax(level){ return ULT_LEVELS.filter(l=>level>=l).length; }
const FLAT_KEYS={ dmg:1, hp:1, armor:1, mr:1, ah:1, ap:1, regen:1 };
export function stat(h, k){
  let t=STATS[h.type][k];
  const fs=h.formStats; if(fs && fs[k]) t=fs[k];   // İkili yakın biçim: hareket hızı, zırh, BD, menzil farkları
  let v=t.base + t.per*LEVEL_PER*((h.level||1)-1);
  const F=h.st && h.st.frenzy;   // Avcı Coşkusu: geçici bonus (süre bitince st.frenzy silinir)
  if(F){ if(k==='dmg') v+=F.dmg; else if(k==='spd') v*=1+F.spd; }
  const R=h.st && h.st.fring;   // Alev Halkası: geçici zırh ve büyü direnci
  if(R && (k==='armor' || k==='mr')) v+=R.res;
  const ic=h.ic;
  if(ic && ic.arenaUntil>S.time && k==='dmg'){ const A=arenaOf(h); if(A) v+=A.ad; }   // Gladyatör Arena: alan içindeyken SG
  if(ic && (k==='armor' || k==='mr')){   // Gladyatör Meydan Okuma: çalınan zırh ve BD (kazanan +, kaybeden -)
    if(ic.duelGain && ic.duelGain.until>S.time) v+=ic.duelGain[k];
    if(ic.duelLoss && ic.duelLoss.until>S.time) v-=ic.duelLoss[k];
  }
  if(k==='ah' && h.jb && h.jb.regen>S.time) v+=BUFFS.regen.ah;   // Yenilenme güçlendirmesi
  const B=h.bonus; if(!B) return v;
  if(FLAT_KEYS[k]) v+=B[k]||0;
  if(B.lvlStats && (k==='armor' || k==='mr' || k==='ah' || k==='spd')) v+=h.level||1;   // Yük Taşıyıcı: seviyen kadar zırh, BD, yetenek hızı, hareket hızı
  if(B.scale){ const n=(h.ic && h.ic.scaleN)||0; if(k==='ap') v+=n*B.scale.ap; else if(k==='hp') v+=n*B.scale.hp; }   // Çağ Kitabı
  if(k==='ap'){ v+=(B.hpToAp||0)*(h.maxHp||0); v*=B.apMult||1; }
  else if(k==='dmg'){ if(B.hpToAd) v+=B.hpToAd*(h.maxHp||0); }   // Boğa Gücü
  else if(k==='armor' || k==='mr'){
    v*=B.resistMult||1;
    const L=B.lowHpRes; if(L && L[k] && h.hp<h.maxHp*L.hp) v*=1+L[k];   // Taş Kuşak, Gümüş Zırh: can azalınca direnç
  }
  else if(k==='spd') v*=1+(B.msPct||0);
  return v;
}
/* Eski 'def.attack' yapısını stat tablosundan üretir */
export function atkDef(h){
  // aynı tik içinde, aynı seviye ve eşya paketiyle sonuç değişmez: önbellekten ver
  const c=h._ad;
  if(c && h._adT===S.time && h._adL===h.level && h._adB===h.bonus) return c;
  const r=atkDefCalc(h);
  h._ad=r; h._adT=S.time; h._adL=h.level; h._adB=h.bonus;
  return r;
}
function atkDefCalc(h){
  const a=h.def.attack, T=STATS[h.type], B=h.bonus||{}, proj=a.type==='projectile';
  return { type:a.type, knock:a.knock, range:stat(h,'range')+(proj?(B.rangeRanged||0):(B.rangeMelee||0))+(h.st&&h.st.shell?h.st.shell.range:0),
    slow:stat(h,'atkSlow')*(B.atkSlowMult||1), windupRatio:stat(h,'windup'),
    projSpeed:T.projSpeed?stat(h,'projSpeed'):0, projRadius:T.projRadius?stat(h,'projRadius'):0,
    // not: düz vuruş artık hedefli (koni yok); angle ve eşya angleMult (Uzun Nişan) düz vuruşta etkisiz, yalnız eski veri olarak duruyor
    angle:T.angle?stat(h,'angle')*(B.angleMult||1)*Math.PI/180:0 };
}
const SPAWN_GAP = 96;   // aynı takımdaki doğuş noktaları arası (2v2)
export const settings = {
  playerType:'archer', botType:'auto', botMode:'lane', aimMode:'track', asBonus:0, showHit:false, waves:true, fog:true, jungle:true,
  startLevel:1
};
export function makeHero(type, team, x, y, human){
  const d = HEROES[type];
  return { id:nextId++, kind:'hero', type, def:d, team, human:!!human, x, y, spawnX:x, spawnY:y,
    vx:0, vy:0, kx:0, ky:0, baseR:STATS[type].size.base, r:STATS[type].size.base, mass:STATS[type].mass.base, hp:STATS[type].hp.base, maxHp:STATS[type].hp.base,
    aim: team===0 ? 0 : Math.PI, atk:{ state:'ready', t:0, total:0, aim:0 },
    rank:{ r:0, e:0, s:d.skills.s.fixed?1:0 }, level:1, xp:0, gold:START_GOLD, items:[], bonus:null, ic:{}, stasis:0, build:null, dmgBy:{}, helpBy:{}, kills:0, deaths:0, assists:0, points:0, cd:{ r:0, e:0, s:0 }, cdMax:{ r:1, e:1, s:1 },
    st:{ slow:null, freeze:0, asB:null, shield:null, spd:null, giant:null, burn:null, ignite:null, amp:null, bflame:null, titanSlow:null, shred:null, frenzy:null, fring:null, flow:null, silence:0, curse:null, root:0, shell:null, ball:null },
    cast:null, dash:null, chan:null, pulled:null, dead:false, respawn:0, flash:0,
    // biçim değiştiren kahraman (İkili): biçim, biçime özel stat farkları, diğer biçimin beklemeleri (arka planda akar); diğerlerinde null
    form:d.meleeForm?'ranged':null, formStats:null, offCd:d.meleeForm?{ r:0, e:0 }:null, offMax:d.meleeForm?{ r:1, e:1 }:null,
    // sonradan eklenen alanlar baştan tanımlı: bütün kahramanlar aynı nesne şeklini paylaşsın (hız)
    revealT:0, goldAcc:0, recallCh:null, _bx:NaN, _by:NaN, _bush:-1, _ad:null, _adT:-1, _adL:0, _adB:null };
}

function minionSpawn(team){
  const s = team===0 ? 120 : laneLength()-120, p=lanePoint(s);
  return { x:p.x+(rand()-0.5)*40, y:p.y+(rand()-0.5)*40 };
}
export function makeMinion(type, team, wi){
  const d = MINIONS[type], nx = S.lane[team][3], dir = team===0 ? 1 : -1;
  const min=S.time/60, tb=S.teamBuff[team]>S.time;   // Titan Gücü: takımın yeni minyonları güçlü
  const hpM=Math.min(MINION_SCALE.cap, 1+MINION_SCALE.hpPerMin*min)*(tb?BIG_BUFF.minionHp:1), dmgM=Math.min(MINION_SCALE.cap, 1+MINION_SCALE.dmgPerMin*min)*(tb?BIG_BUFF.minionDmg:1);
  return { id:nextId++, kind:'minion', type, def:d, team, dir, dmgMult:dmgM, wi:wi||0,
    ...minionSpawn(team),
    vx:0, vy:0, kx:0, ky:0, r:d.r, mass:d.mass, hp:d.hp*hpM, maxHp:d.hp*hpM,
    atk:{ state:'ready', t:0, total:0, aim:0, main:null, f:1 },
    st:{ slow:null, freeze:0 }, cast:null, dash:null, pulled:null, dead:false, flash:0,
    revealT:0, leashUntil:-1, _bx:NaN, _by:NaN, _bush:-1 };   // sonradan eklenen alanlar baştan tanımlı (aynı nesne şekli)
}

export function buildStructs(){
  S.structs=[]; S.lane=[[],[]];
  for(const team of [0,1]){
    LAYOUT.forEach((_,i)=>{
      const P=structPos(team,i), sub=P.sub, nex = sub==='nexus';
      const hp = nex ? NEXUS.hp : (sub==='base' ? BASE_TOWER_HP : TOWER.hp);
      const s = { id:nextId++, kind:'struct', sub, idx:i, team, x:P.x, y:P.y,
        r: nex ? NEXUS.r : TOWER.r, hp, maxHp:hp, dead:false, prot:i>0, range: nex ? 0 : TOWER.range,
        cd:0, aggro:null, last:null, stacks:0, tgt:null, flash:0 };
      S.structs.push(s); S.lane[team].push(s);
    });
  }
}

/* opts: { types:[takim0,takim1], levels:[l0,l1], human:kahraman sırası|null, seed, fx }
   2v2 ve daha fazlası: types/levels iç içe dizi olabilir (types:[[a1,a2],[b1,b2]], levels:[[l,l],[l,l]]; ya da düz sayı: takımın hepsine).
   S.heroes sırası: önce takım 0 üyeleri, sonra takım 1 (1v1'de [h0,h1], eskisi gibi). human bu listedeki sıradır (1v1'de takım numarasıyla aynı).
   builds: [takım0 yapısı, takım1 yapısı] (ad). */
/* Senkron kontrolü (online): durumun kısa özeti; iki tarayıcıda aynı tikte aynı çıkmalı */
export function simHash(){
  let a=0x811c9dc5|0;
  const mix=v=>{ v=Math.round(v*64)|0; a=Math.imul(a^v,16777619)^(a>>>13); };
  mix(S.time); mix(S.minions.length); mix(S.monsters.length); mix(S.projs.length); mix(S.score[0]); mix(S.score[1]);
  for(const h of S.heroes){ mix(h.x); mix(h.y); mix(h.hp); mix(h.gold); mix(h.xp); mix(h.level); mix(h.kills); }
  for(const m of S.minions){ mix(m.x); mix(m.hp); }
  for(const t of S.structs) mix(t.hp);
  mix(rng()*1e6);   // rng durumu (yan etki: yalnız doğrulama anında bir sayı tüketir; iki taraf aynı tikte aynı çağırır)
  return a>>>0;
}

export function resetGame(opts){
  opts = opts||{};
  nextId = 1;
  seedRng(opts.seed===undefined ? 1 : opts.seed);
  S.heroes=[]; S.minions=[]; S.projs=[]; S.bolts=[]; S.booms=[]; S.zones=[]; S.novas=[]; S.sights=[]; S.fx=[]; S.spawnQ=[];
  S.score=[0,0]; S.time=0; S.waveT=WAVE_FIRST; S.over=null;
  S.fxOn = opts.fx!==false;
  S.firstBlood = false;
  S.stats = { firstKill:null, firstTower:null, maxLevel:[null,null] };
  buildStructs();
  buildCamps(opts.jungle!==undefined ? !!opts.jungle : settings.jungle);
  const other = settings.botType!=='auto' ? settings.botType : (settings.playerType==='archer' ? 'warrior' : 'archer');
  const types = opts.types || [settings.playerType, other];
  const levels = opts.levels || [settings.startLevel, settings.startLevel];
  const human = opts.human===undefined ? 0 : opts.human;
  // online: birden çok insan (opts.humans = kahraman sıraları); human yerel oyuncunun sırası (S.player). Bot rolü ve otomatik seviye puanı insanlar için kapalı
  const humanSet = new Set(opts.humans || (human===null ? [] : [human]));
  const n0=structPos(0,3), n1=structPos(1,3);
  const bn = opts.builds || [];
  let hi=0; const lvs=[];
  for(const team of [0,1]){
    const list = Array.isArray(types[team]) ? types[team] : [types[team]];
    const nn = team===0 ? n0 : n1, n = list.length;
    list.forEach((type,j)=>{
      const lv = Array.isArray(levels[team]) ? levels[team][j] : levels[team];
      // takım içinde yan yana (koridora dik): 1 kişiyse tam nexus hizasında (eski doğuş noktası)
      const oy = n>1 ? (j-(n-1)/2)*SPAWN_GAP : 0;
      const h = makeHero(type, team, team===0 ? nn.x+SPAWN_OFF : nn.x-SPAWN_OFF, nn.y+oy, humanSet.has(hi));
      h.ai = { strafe:1, strafeT:0, noise:0, retreat:false };
      const B=BUILDS[h.type]||{}; h.build = [...(B[bn[h.team]] || B.default || [])]; computeBonus(h);   // kopya: DEF yuvaları alım anında çözülüp yerine yazılır
      lvs.push(lv); S.heroes.push(h); hi++;
    });
  }
  S.player = human===null ? null : S.heroes[human];
  // roller: 2+ kişilik takımda bir bot ormancı (oyuncu değil; yakın dövüşçü öncelikli, sonra düz vuruş gücü). opts.roles:false kapatır
  for(const h of S.heroes){ h.role='lane'; h.noJungle = opts.noJungle===h.team; h.jm=0; }   // noJungle: o takım ormanı hiç kesmez (kontrol deneyi)
  if(S.camps.length && opts.roles!==false) for(const team of [0,1]){
    if(opts.noJungle===team) continue;
    const T=S.heroes.filter(h=>h.team===team && !h.human);
    if(S.heroes.filter(h=>h.team===team).length<2 || !T.length) continue;
    const jv=h=>(HEROES[h.type].attack.type!=='projectile' ? 1000 : 0)-(JUNGLE_AVOID.includes(h.type) ? 2000 : 0)+STATS[h.type].dmg.base*STATS[h.type].as.base;   // yakın dövüşçü, sonra düz vuruş gücü yüksek olan; JUNGLE_AVOID büyücüleri en son
    let J=T[T.length-1]; for(const h of T) if(jv(h)>jv(J)) J=h;
    J.role='jungle';
  }
  S.heroes.forEach((h,i)=>initLevel(h, lvs[i]));
  initIntel();   // takım bilgisi (savaş sisi): kamp durumları, rakip envanteri
}

/* ---- yardımcılar ---- */
export function angDiff(a,b){ let d=a-b; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d; }
export function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
export function moveMult(h){
  let m=1; if(h.st.slow) m*=1-h.st.slow.amt; if(h.st.spd) m*=1+h.st.spd.amt;
  const F=h.st.flow; if(F) m*=1+F.amt*Math.max(0,F.t)/F.total;   // İkili pasifi Akış: süre boyunca doğrusal azalan hız
  if(h.ic && h.ic.msUntil>S.time) m*=1+h.ic.msAmt;   // eşya hız pasifleri (Kaçak Yayı, Sessiz Bıçak, Rüzgar Yürüyüşü...)
  if(h.ic){
    if(h.ic.stride>0 && h.bonus && h.bonus.stride) m*=1+h.ic.stride*h.bonus.stride.msPer;   // Fırtına Adımı
    if(h.ic.hmsUntil>S.time) m*=1+h.ic.hmsN*h.ic.hmsAmt;                                    // Dikenli Çizme
    if(h.ic.mom>0) m*=1+h.def.skills.p.ms*h.ic.mom/100;                                    // Gülle: Momentum
    if(h.ic.arenaUntil>S.time){ const A=arenaOf(h); if(A) m*=1+A.ms; }                      // Gladyatör Arena
  }
  return m;
}
export function dmgMult(h){ return 1 + (h.st && h.st.giant ? h.st.giant.dmg : 0); }
export function atkDmg(h){ return stat(h,'dmg')*dmgMult(h); }
export function attackSpeed(h){
  const B=h.bonus||{};
  return stat(h,'as') * (1 + (h.human ? settings.asBonus : 0)) * (1 + (h.st.asB ? h.st.asB.amt : 0)) * (1 + (h.st.frenzy ? h.st.frenzy.as : 0)) * (1+(B.asPct||0))
    * (h.st.titanSlow ? 1-h.st.titanSlow.amt : 1) * (h.ic.asUntil>S.time ? 1+h.ic.asAmt : 1)   // Kasırga Baltası
    * (h.ic.asStackUntil>S.time ? 1+h.ic.asStackN*h.ic.asStackAmt : 1)   // Hız Çarkı
    * (h.ic.frzUntil>S.time ? 1+h.ic.frzN*frzAmt(h) : 1)                   // Gladyatör Kızışma
    * (h.ic.arenaUntil>S.time ? 1+arenaAs(h) : 1);                          // Gladyatör Arena
}
export function timings(h){
  const period = 1/attackSpeed(h), wind = stat(h,'windup')*period;
  return { period, wind, rec: period-wind };
}
/* Düz vuruş hedefli (LoL gibi): menzil içindeki, (px,py) noktasına (oyuncuda imleç) en yakın görünen rakip */
export function inAttackRange(h, u){ return dist(u,h)-u.r <= h.r+atkDef(h).range; }
export function attackTarget(h, px, py){
  let best=null, bd=1e9;
  for(const u of S.heroes.concat(S.minions, S.monsters, S.structs)){
    if(u.dead || u.team===h.team || !canSee(h.team,u) || !inAttackRange(h,u)) continue;
    if(u.kind==='struct' && u.prot) continue;
    const d=Math.hypot(u.x-px, u.y-py); if(d<bd){ bd=d; best=u; }
  }
  return best;
}
export const autoAimTarget = attackTarget;   // eski ad
/* Hedefin vuruş anındaki tahmini yerine nişan: kalan hazırlık + mermi uçuş süresi kadar ileri (en fazla 0,8 sn) */
export function autoAimAngle(h, u){
  const at=atkDef(h), vx=(u.vx||0)+(u.kx||0), vy=(u.vy||0)+(u.ky||0);
  const wind = h.atk.state==='windup' ? Math.max(0,h.atk.t) : timings(h).wind;
  let tx=u.x, ty=u.y;
  for(let i=0;i<3;i++){
    let t=wind + (at.type==='projectile' && at.projSpeed ? Math.max(0,Math.hypot(tx-h.x,ty-h.y)-h.r)/at.projSpeed : 0);
    t=Math.min(t,0.8); tx=u.x+vx*t; ty=u.y+vy*t;
  }
  return Math.atan2(ty-h.y, tx-h.x);
}
export function fx(o){ if(!S.fxOn) return; o.t=o.life; S.fx.push(o); }

/* Savaş sisi: görüş menzilleri */
export function visiblePos(team, x, y, r){
  if(!settings.fog) return true;
  r=r||0;
  // menzil içinde ve arada duvar yoksa görülür (duvar arkası görünmez)
  // hypot yerine önce ucuz kutu elemesi (|dx|-r büyükse hypot da büyüktür); kalanlarda eski hesap aynen
  const H=S.heroes, M=S.minions, T=S.structs, vh=VISION.hero+1, vm=VISION.minion+1, vt=VISION.tower+1;
  for(let i=0;i<H.length;i++){ const a=H[i]; if(a.dead || a.team!==team) continue;
    const dx=a.x-x, dy=a.y-y; if((dx<0?-dx:dx)-r>vh || (dy<0?-dy:dy)-r>vh) continue;
    if(Math.hypot(dx,dy)-r<=VISION.hero && !sightBlocked(a.x,a.y,x,y)) return true; }
  for(let i=0;i<M.length;i++){ const a=M[i]; if(a.dead || a.team!==team) continue;
    const dx=a.x-x, dy=a.y-y; if((dx<0?-dx:dx)-r>vm || (dy<0?-dy:dy)-r>vm) continue;
    if(Math.hypot(dx,dy)-r<=VISION.minion && !sightBlocked(a.x,a.y,x,y)) return true; }
  for(let i=0;i<T.length;i++){ const a=T[i]; if(a.dead || a.team!==team) continue;
    const dx=a.x-x, dy=a.y-y; if((dx<0?-dx:dx)-r>vt || (dy<0?-dy:dy)-r>vt) continue;
    if(Math.hypot(dx,dy)-r<=VISION.tower && !sightBlocked(a.x,a.y,x,y)) return true; }
  // geçici görüş kaynakları (Kök Sal atış yeri): duvar engellemez
  const G=S.sights;
  for(let i=0;i<G.length;i++){ const a=G[i]; if(a.team===team && Math.hypot(a.x-x,a.y-y)-r<=a.r) return true; }
  return false;
}
/* Çalı (LoL gibi): çalıdaki birimi dışarıdan göremezsin. Aynı çalıya giren rakip görür.
   Çalıdan saldıran/yetenek kullanan kısa süre (BUSH_REVEAL sn) görünür olur. */
export const BUSH_REVEAL = 1.5;
function bushOf(u){
  if(!BUSHES.length) return -1;
  if(u._bx!==u.x || u._by!==u.y){ u._bx=u.x; u._by=u.y; u._bush=bushAt(u.x,u.y); }
  return u._bush;
}
export function canSee(team, u){
  if(u.team===team) return true;
  if(!settings.fog) return true;
  // Kilitli Yaylım kanallanırken takım hedefi görür (sis ve çalı dahil)
  if(u.kind==='hero') for(let i=0;i<S.heroes.length;i++){ const a=S.heroes[i]; if(a.chan && a.team===team && a.chan.target===u && !a.dead) return true; }
  const b=bushOf(u);
  if(b>=0 && !((u.revealT||0)>S.time)){
    for(const a of S.heroes)  if(!a.dead && a.team===team && bushOf(a)===b) return true;
    for(const a of S.minions) if(!a.dead && a.team===team && bushOf(a)===b) return true;
    return false;
  }
  return visiblePos(team,u.x,u.y,u.r);
}

/* Vurulabilir düşman birimler: kahramanlar, minyonlar, korumasız yapılar */
export function foes(team, withStructs){
  if(withStructs===undefined) withStructs=true;
  const out=[];
  for(const u of S.heroes) if(!u.dead && u.team!==team) out.push(u);
  for(const u of S.minions) if(!u.dead && u.team!==team) out.push(u);
  for(const u of S.monsters) if(!u.dead) out.push(u);
  if(withStructs) for(const u of S.structs) if(!u.dead && u.team!==team && !u.prot) out.push(u);
  return out;
}

export function inCone(from, ang, reach, half, u){
  const dx=u.x-from.x, dy=u.y-from.y, d=Math.hypot(dx,dy)||0.001;
  if(d-u.r>reach) return false;
  const tol = d>u.r ? Math.asin(u.r/d) : Math.PI;
  return Math.abs(angDiff(Math.atan2(dy,dx),ang)) <= half+tol;
}

export function applySlow(e, amt, t, decay){
  if(e.bonus && e.bonus.slowResist) amt*=1-e.bonus.slowResist;   // Çelik Çizme
  if(amt>0) ccHit(e);   // Tanrı Kalkanı
  const c=e.st.slow;
  // decay: süre boyunca oran amt'den 0'a doğrusal azalır (updateHero her tikte günceller)
  if(!c || amt>=c.amt || c.t<=0) e.st.slow = decay ? { amt, t, base:amt, total:t, decay:true } : { amt, t };
}
export function freezeHero(e, t){
  if(e.st && e.st.ball) return;   // Gülle Bilardo: durdurulamaz
  ccHit(e);
  e.st.freeze = Math.max(e.st.freeze, t);
  e.cast=null; e.dash=null; e.chan=null;
  if(e.atk.state==='windup') e.atk.state='ready';
  fx({ type:'ring', owner:e, r0:e.r, r1:e.r+26, color:'#bfeaff', lw:5, life:0.35 });
}
export function passiveSlowAmt(sk,level){ return sk.slowMin + (sk.slowMax-sk.slowMin)*(level-1)/(MAX_LEVEL-1); }
export function passiveText(h){
  const sk=h.def.skills.p;
  if(sk.slowMin!==undefined) return '%'+Math.round(passiveSlowAmt(sk,h.level)*100)+' yavaşlatır';
  if(sk.pct) return '%'+Math.round(sk.pct*100)+' yayılım';
  if(sk.twinPct) return '2 ok, %'+Math.round(sk.twinPct*100)+' hasar';
  if(sk.bouncePct) return 'seker, %'+Math.round(sk.bouncePct*100)+' hasar';
  if(sk.sparkMin!==undefined) return 'patlama '+Math.round(sparkDmg(sk,h.level)+(sk.ap||0)*apOf(h));
  if(sk.killPct) return 'son vuruş %'+Math.round(sk.killPct*100)+' can';
  if(sk.timerMax) return h.ic.focus ? 'Odak hazır' : 'Odak '+Math.max(0,Math.ceil(focusNeed(h)-(h.ic.focusT||0)))+' sn';
  if(sk.oppCd){ const left=(h.ic.oppAt||0)-S.time; return left>0 ? 'Fırsatçı '+Math.ceil(left)+' sn' : 'Fırsatçı hazır'; }
  if(sk.flowMin!==undefined) return '+%'+Math.round(flowAmt(sk,h.level)*100)+' hız, 1 sn';
  if(sk.flowCd!==undefined) return 'vuruş -'+String(sk.flowCd).replace('.',',')+' / -'+String(sk.flowHero).replace('.',',')+' sn';
  if(sk.missPct) return "sn'de eksik canın %"+Math.round(sk.missPct*100)+"'ü";
  if(sk.burnMin!==undefined) return "sn'de "+burnDps(sk,h.level).toFixed(1)+' yakar';
  if(sk.asMin!==undefined) return 'Kızışma '+(h.ic.frzUntil>S.time ? h.ic.frzN : 0)+'/'+sk.stacks+' (yığın %'+(frzAmt(h)*100).toFixed(1).replace('.',',')+')';
  if(sk.gain!==undefined) return 'Momentum '+Math.round(h.ic.mom||0)+' (ek '+Math.round(momDmg(h)*(h.ic.mom||0)/100)+')';
  return '';
}
/* Yetenek gücü (YG): STATS'taki ap (ileride eşyalar ekleyecek) */
export function apOf(h){ return h.kind==='hero' ? Math.max(0, stat(h,'ap')) : 0; }
/* Ek SG: toplam SG eksi kahramanın temel SG'si (seviyeyle gelen dahil); eşyalardan gelen kısım */
export function bonusAd(h){ const t=STATS[h.type].dmg; return Math.max(0, stat(h,'dmg') - (t.base + t.per*LEVEL_PER*((h.level||1)-1))); }
/* Ek can: azami can eksi kahramanın temel canı (seviyeyle gelen dahil); eşyalardan gelen kısım */
export function bonusHp(h){ const t=STATS[h.type].hp; return Math.max(0, h.maxHp - (t.base + t.per*LEVEL_PER*((h.level||1)-1))); }
/* Odak: sayaç süresi seviyeyle timerMax'tan timerMin'e doğrusal iner */
export function focusNeed(h){ const p=h.def.skills.p; return p.timerMax - (p.timerMax-p.timerMin)*((h.level||1)-1)/(MAX_LEVEL-1); }
function focusTick(h, dt){
  const p=h.def.skills.p; if(!p.timerMax || h.ic.focus) return;
  h.ic.focusT=(h.ic.focusT||0)+dt;
  if(h.ic.focusT>=focusNeed(h)){ h.ic.focus=true; h.ic.focusT=0; fx({ type:'ring', owner:h, r0:h.r, r1:h.r+34, color:'#c9a6ff', lw:4, life:0.4 }); }
}
export function flowAmt(sk,level){ return sk.flowMin + (sk.flowMax-sk.flowMin)*(level-1)/(MAX_LEVEL-1); }
export function sparkDmg(sk,level){ return sk.sparkMin + (sk.sparkMax-sk.sparkMin)*(level-1)/(MAX_LEVEL-1); }
export function burnDps(sk,level){ return sk.burnMin + (sk.burnMax-sk.burnMin)*(level-1)/(MAX_LEVEL-1); }
export function passiveSlow(owner, e){
  const sk=owner.def.skills && owner.def.skills.p;
  if(sk && sk.slowMin!==undefined) applySlow(e, passiveSlowAmt(sk,owner.level), sk.dur);
}

/* ---- hasar ---- */
/* Kale koruması: yapının TOWER.ward.r içinde takımın canlı minyonu var mı */
export function waveNear(team, s){
  const R=TOWER.ward.r;
  for(const m of S.minions) if(!m.dead && m.team===team && Math.abs(m.x-s.x)<R && Math.hypot(m.x-s.x,m.y-s.y)<R) return true;
  return false;
}
export function damage(e, amt, src, opts){
  opts = opts||{};
  if(e.dead) return;
  if(src && src.kind!=='struct') src.revealT=S.time+BUSH_REVEAL;   // çalıdan vuran görünür olur
  if(e.kind==='struct' && e.prot) return;
  if(e.stasis>0) return;                                   // Kum Saati: dokunulmaz
  let a = amt;
  const SB = (src && src.kind==='hero' && src.bonus) || {};
  if(SB.siege && e.kind!=='hero'){ amt*=1+SB.siege; a=amt; }
  if(e.kind==='struct' && src && src.team<2 && S.teamBuff[src.team]>S.time){ amt*=BIG_BUFF.structMult; a=amt; }   // Titan Gücü: yapılara ek hasar
  if(e.kind==='struct' && src && src.kind==='minion'){ amt*=TOWER.minionTaken; a=amt; }   // dalga kuşatması güçlü
  if(e.kind==='struct' && src && src.kind==='hero' && !waveNear(src.team, e)){ amt*=TOWER.ward.mult; a=amt; }   // kale koruması: dalgasız kuşatma zayıf
  if(e.kind==='monster' && src && src.kind==='hero'){ e.lastHero=src; e.lastHeroT=S.time; monsterAggro(e, src); amt*=opts.basic ? JUNGLE.basicMult : JUNGLE.skillMult; a=amt; }   // canavarlara kahraman hasarı çarpanı (yetenek ağırlıklı kahramanlar da kesebilsin)   // Kuşatma Çekici: yapılara ve minyonlara ek hasar
  // zırh / büyü direnci (sadece kahramanlarda): hasar * 100/(100+değer); 'true' türü delip geçer. Delme ve azaltmalar burada.
  if(e.kind==='hero'){
    const t=opts.type||'phys';
    if(t==='phys'){
      let ar=stat(e,'armor');
      if(e.st.shred && e.st.shred.t>0) ar*=1-e.st.shred.pct*e.st.shred.n;     // Kara Balta
      if(e.ic.flatDownT>S.time) ar=Math.max(0, ar-e.ic.flatDown);              // Ölüm Haritası: sabit zırh düşüşü
      if(e.ic.sunderT>S.time) ar*=1-e.ic.sunderPct;                            // Zırh Paralayıcı
      let pen=SB.armorPen||0; if(opts.basic && SB.basicArmorPen) pen=Math.max(pen, SB.basicArmorPen);
      if(src && src.kind==='struct') pen=Math.max(pen, TOWER.armorPen);   // kule mermisi zırhın bir kısmını deler (geç oyunda zayıflamasın)
      if(SB.lethal) ar=Math.max(0, ar-SB.lethal);   // sabit zırh delme: yüzdelikten önce
      ar*=1-pen;
      a *= 100/(100+Math.max(0,ar));
      if(opts.basic && e.bonus && e.bonus.basicReduce) a*=1-e.bonus.basicReduce;   // Demir Duvar
    } else if(t==='magic'){
      let mr=stat(e,'mr')-mrAuraOn(e)-(SB.magicPenFlat||0);
      mr*=1-(SB.magicPenPct||0);
      a *= 100/(100+Math.max(0,mr));
      if(e.st.curse) a*=1+e.st.curse.amt;   // Kan Laneti: işaretliyken fazla büyü hasarı
      if(e.bonus && e.bonus.magicReduce) a*=1-e.bonus.magicReduce;   // Büyü Duvarı
    }
    if(SB.execDmg && e.hp<e.maxHp*SB.execDmg.hp) a*=1+SB.execDmg.pct;   // Gölge Hançeri, Hasat Kılıcı, Son Darbe Asası: canı azalmış şampiyona ek hasar
    if(opts.crit && e.bonus && e.bonus.critReduce) a*=1-e.bonus.critReduce;   // Titan Kalkanı
    if(e.bonus){
      if(e.bonus.ccShield && e.ic.drT>S.time) a*=1-e.bonus.ccShield.pct;      // Tanrı Kalkanı: kitle kontrolü sonrası hasar azaltma
      if(e.bonus.carry) a*=1-carryRed(e);                                      // Yük Taşıyıcı: taşınan altına göre hasar azaltma
    }
    if(e.st.shell) a*=1-e.st.shell.dr;   // Gülle Kabuk: hasar azaltma
  }
  if(e.st && e.st.amp) a *= 1+e.st.amp.amt;
  if(e.kind==='hero' && e.recallCh && !opts.tiny) e.recallCh=null;   // hasar üsse dönüşü keser     // içten yanma: aldığı hasar artar
  if(e.kind==='hero' && e.st.shield){
    const s=e.st.shield, ab=Math.min(s.amt,a);
    s.amt-=ab; a-=ab; if(s.amt<=0.01) e.st.shield=null;
  }
  if(e.kind==='hero' && src && src.kind==='hero' && src.team!==e.team){   // rakip kahramanlardan alınan hasarın türü (minyon ve kule sayılmaz)
    const T=e.ic.taken||(e.ic.taken={ phys:0, magic:0 }), ty=opts.type||'phys';
    if(ty==='magic') T.magic+=amt; else if(ty==='phys') T.phys+=amt;
  }
  const hp0 = e.hp;   // Fırsatçı: vuruştan önceki can
  const dealt = Math.max(0, Math.min(a, e.hp));   // gerçekten düşen can (damage dönüş değeri: Kan Oku iyileşmesi için)
  e.hp -= a; e.flash = 0.12;
  if(S.onDamage) S.onDamage(e, a, src, opts);   // ölçüm araçları için (normalde boş)
  if(e.kind==='hero'){
    e.ic.lastHurt=S.time;
    const EB=e.bonus||{};
    if(EB.store && a>0){ e.ic.store=Math.min(EB.store.cap, (e.ic.store||0)+a*EB.store.pct); e.ic.storeT=S.time; }   // Öç Zırhı
    if(EB.hurtMs && a>0 && !opts.dot) hurtSpeed(e, EB.hurtMs.amt, EB.hurtMs.dur);   // Sessiz Bıçak, Rüzgar Pelerini
    if(EB.lowRegen && e.hp>0 && e.hp<e.maxHp*EB.lowRegen.hp && (e.ic.lrCd||0)<=S.time){ e.ic.lrCd=S.time+EB.lowRegen.cd; e.ic.lrUntil=S.time+EB.lowRegen.dur; }   // Muska Çanı
    if(EB.lowShield && !e.dead && e.hp>0 && e.hp<e.maxHp*EB.lowShield.hp && (e.ic.lsCd||0)<=S.time){   // Son Nefes Kalkanı
      e.ic.lsCd=S.time+EB.lowShield.cd; giveShield(e, EB.lowShield.base+EB.lowShield.pct*e.maxHp, EB.lowShield.dur);
    }
    if(opts.basic && !opts.noProc && src && src.kind==='hero' && EB.antiHeal){ src.ic.woundUntil=S.time+EB.antiHeal.dur; src.ic.woundPct=EB.antiHeal.pct; }   // Yara Zırhı
    if(opts.basic && !opts.noProc && src && src.kind!=='struct'){
      if(EB.thorns) damage(src, EB.thorns.base+EB.thorns.armorPct*stat(e,'armor'), e, { type:'magic', noProc:true, noSplash:true });   // Diken Zırhı
      if(EB.attackerAsSlow && src.kind==='hero') src.st.titanSlow={ amt:EB.attackerAsSlow.pct, t:EB.attackerAsSlow.dur };          // Titan Kalkanı
    }
  }
  if(src && src.kind==='hero' && src.bonus){
    if(opts.basic && SB.ls && !opts.noLs){ const hv=a*SB.ls*(SB.lsLow && src.hp<src.maxHp*SB.lsLow.hp ? SB.lsLow.mult : 1); heal(src, hv); if(SB.lsShare) shareHeal(src, hv*SB.lsShare); }   // Kan Bağı: yakın dosta pay   // can çalma (Sekme mermisinde yok); Kanlı Yay can azalınca katlar
    if(opts.skill && SB.spellVamp && !opts.noLs && e.kind!=='struct') heal(src, a*SB.spellVamp*(e.kind==='hero' ? 1 : 0.33));   // Kanlı Pençe, Kan Kasesi (minyonda üçte biri)
    if(opts.skill && e.kind==='hero' && SB.skillSunder){ e.ic.sunderT=S.time+SB.skillSunder.dur; e.ic.sunderPct=SB.skillSunder.pct; }   // Zırh Paralayıcı
    if(opts.basic && opts.crit && SB.critSlow && e.kind!=='struct') applySlow(e, SB.critSlow.amt, SB.critSlow.dur);   // Kristal Hançer
    if(opts.skill && SB.skillAd && !opts.noProc && !opts.dot && e.kind!=='struct' && e.hp>0) damage(e, SB.skillAd*atkDmg(src), src, { type:opts.type||'phys', noProc:true, noSplash:true });   // Hüner Bıçağı
    if(opts.skill && e.kind==='hero' && SB.skillSlow) applySlow(e, SB.skillSlow.amt, SB.skillSlow.dur);   // Buz Asası, Gece Maskesi
    if(opts.skill && e.kind==='hero' && SB.skillBurn) e.st.bflame={ dps:e.maxHp*SB.skillBurn.pct/SB.skillBurn.dur, t:SB.skillBurn.dur, src };   // Kara Alev
    if(opts.skill && e.kind!=='struct' && !opts.noProc){                            // Yankı Asası / Öç Zırhı: sonraki yetenek ek hasarı
      const ic=src.ic;
      if(ic.pendMagic){ const x=ic.pendMagic; ic.pendMagic=0; if(!e.dead) damage(e, x, src, { type:'magic', noProc:true }); }
      if(ic.pendPhys){ const x=ic.pendPhys; ic.pendPhys=0; if(!e.dead) damage(e, x, src, { type:'phys', noProc:true }); }
    }
  }
  // Büyücü pasifi: rakip şampiyona her vuruş yakar (süre yenilenir)
  if(e.kind==='hero' && src.kind==='hero' && !opts.dot){
    const pk=src.def.skills.p;
    if(pk.burnMin!==undefined) e.st.burn={ dps:burnDps(pk,src.level)+(pk.ap||0)*apOf(src), t:pk.dur, src };
  }
  if(opts.basic && src===S.player && e.kind!=='struct') S.shake=Math.max(S.shake||0, opts.crit?5:2.5);   // kendi isabetimizde çok hafif ekran sarsıntısı (yalnız çizim okur)
  if((src.kind==='hero' || e.kind==='hero') && !opts.dot){
    fx({ type:'dmg', x:e.x+(fxRng()-0.5)*14, y:e.y-e.r-10, txt:Math.round(amt), blue:a<0.5, crit:!!opts.crit, life:0.8 });
  }

  // asist kaydı: hangi rakip kahraman ne zaman zarar verdi
  if(e.kind==='hero' && src.kind==='hero' && src.team!==e.team){ e.dmgBy[src.id]=S.time; e.combatT=S.time; src.combatT=S.time; }   // combatT: savaşta mı (Demir Gövde)

  // Kule dikkati: rakip şampiyona vuran şampiyonu kule hedef alır
  if(e.kind==='hero' && src.kind==='hero' && !opts.dot){
    for(const s of S.structs){
      if(!s.dead && s.team===e.team && s.sub!=='nexus' && dist(s,e)<=s.range+e.r){
        s.aggro={ target:src };   // menzilden çıkana dek sürer
      }
    }
  }

  // Savaşçı pasifi: aldığı hasarın bir kısmını çevredeki düşmanlara yayar
  if(e.kind==='hero' && !opts.noSplash){
    const pk=e.def.skills.p;
    if(pk.pct){
      for(const o of foes(e.team,false)){
        if(dist(o,e)-o.r <= pk.radius){
          damage(o, amt*pk.pct, e, { noSplash:true });
          fx({ type:'line', x1:e.x, y1:e.y, x2:o.x, y2:o.y, life:0.25 });
        }
      }
    }
  }
  // Gölge pasifi Fırsatçı: canı (vuruştan önce) %50'nin altındaki rakip KAHRAMANA isabet eden düz vuruş ya da yetenek hasarı ek büyü hasarı verir
  // (kendi bekleme süresi; süreli hasar, ek hasarın kendisi ve vuruş etkileri tetiklemez; minyon ve kuleye yok). Bekleme önce başlar: döngü yok.
  if(e.kind==='hero' && !e.dead && src && src.kind==='hero' && src.team!==e.team && (opts.basic || opts.skill) && !opts.noProc && !opts.dot){
    const op=src.def.skills.p;
    if(op.oppCd!==undefined && hp0<e.maxHp*op.oppHp && (src.ic.oppAt||0)<=S.time){
      src.ic.oppAt=S.time+op.oppCd;
      damage(e, op.oppBase+op.oppMax*e.maxHp+(op.ap||0)*apOf(src), src, { type:'magic', noProc:true, noSplash:true, opp:true });
      fx({ type:'boom', x:e.x, y:e.y, r0:e.r, r1:e.r+34, color:'#9a7bff', life:0.35 });
    }
  }
  // Çöküş Asası: canı (vuruştan önce) eşik altındaki rakip şampiyona büyü hasarı patlama yaratır (bekleme önce başlar, patlama noProc: döngü yok)
  if(e.kind==='hero' && src && src.kind==='hero' && src.team!==e.team && opts.type==='magic' && !opts.noProc && !opts.dot && SB.lowBoom && (src.ic.boomAt||0)<=S.time && hp0<e.maxHp*SB.lowBoom.hp){
    const LB=SB.lowBoom; src.ic.boomAt=S.time+LB.cd;
    const bd=LB.base+LB.ap*apOf(src);
    for(const u of foes(src.team,false)){ if(u.dead || u.hp<=0 || Math.hypot(u.x-e.x,u.y-e.y)-u.r>LB.radius) continue; damage(u, bd, src, { type:'magic', noProc:true, noSplash:true }); }
    fx({ type:'boom', x:e.x, y:e.y, r0:e.r, r1:LB.radius, color:'#b58cff', life:0.4 });
  }
  if(e.hp<=0 && !e.dead) kill(e, src);
  return dealt;
}

/* Yük Taşıyıcı: son alışverişten beri biriken (taşınan) altına göre hasar azaltma oranı */
function carryRed(e){ const c=e.bonus.carry, g=Math.min(c.gold, Math.max(0, e.gold-(e.ic.carryBase||0))); return c.red*g/c.gold; }
/* Kan Bağı: can çalma ile kazanılan canın payı, 700 içindeki en yakın dost kahramana (kendisi hariç) */
function shareHeal(src, x){
  let best=null, bd=700;
  for(const h of S.heroes){ if(h===src || h.dead || h.team!==src.team) continue; const d=dist(h,src); if(d<=bd){ bd=d; best=h; } }
  if(best){ heal(best, x); markHelp(best, src); }
}
/* Tanrı Kalkanı: kitle kontrolü yiyen kahramana kısa hasar azaltma penceresi */
function ccHit(e){ const B=e.bonus; if(B && B.ccShield && e.ic) e.ic.drT=S.time+B.ccShield.dur; }

/* Kan Hasadı: ölen rakip birimden Kan Lordu iyileşmesi (tek yer: kill). Kahramanda killer = creditKiller sonucu, minyonda src son vuran.
   Son vuruş: azami canın killPct'i; rakip kahramana asist ya da nearRange içinde ölen rakip minyon: nearPct. dur sn'ye eşit yayılır. */
function bloodHarvest(e, src, killer){
  for(const h of S.heroes){
    const sp=h.def.skills.p;
    if(sp.killPct===undefined || h.dead || h.team===e.team) continue;
    let pct=0;
    if(e.kind==='hero'){
      if(killer===h) pct=sp.killPct;
      else if(killer && takedownParticipants(e, killer).includes(h)) pct=sp.nearPct;
    } else if(src===h) pct=sp.killPct;
    else if(dist(h,e)<=sp.nearRange) pct=sp.nearPct;
    if(pct>0){ const x=e.maxHp*pct; (h.ic.bleed||(h.ic.bleed=[])).push({ left:x, rate:x/sp.dur }); }
  }
}
/* Kan Hasadı iyileşmeleri (birden çok birikebilir) */
function bloodTick(h, dt){
  const L=h.ic.bleed; if(!L) return;
  for(const b of L){ const x=Math.min(b.left, b.rate*dt); heal(h, x); b.left-=x; }
  h.ic.bleed = L.some(b=>b.left>1e-6) ? L.filter(b=>b.left>1e-6) : null;
}
/* Kan Laneti süresi doldu: işaret kalkar, ölmediyse nerede olursa büyü hasarı, Kan Lordu hasarın heal'i kadar iyileşir */
function curseEnd(h){
  const c=h.st.curse; h.st.curse=null;
  const dealt=damage(h, c.dmg, c.src, { type:'magic', skill:true })||0;
  heal(c.src, dealt*c.heal);
  fx({ type:'boom', x:h.x, y:h.y, r0:h.r, r1:h.r+60, color:'#b3203a', life:0.4 });
}

export function kill(e, src){
  e.hp=0; e.dead=true;
  if(e.kind==='hero'){
    if(S.stats.firstKill===null) S.stats.firstKill=S.time;
    e.respawn=respawnTime(S.time); if(src.team<2) S.score[src.team]++;
    const killer=creditKiller(e, src);
    e.deaths++;
    if(S.structs.some(t=>!t.dead && t.team!==e.team && t.sub!=='nexus' && Math.hypot(t.x-e.x,t.y-e.y)<=t.range+e.r+60)) e.towerDeaths=(e.towerDeaths||0)+1;   // ölçüm: kule altında ölüm
    if(killer && killer.kind==='hero' && killer.team!==e.team){ killer.kills++; for(const a of takedownParticipants(e, killer)) if(a!==killer) a.assists++; }
    bloodHarvest(e, src, killer);
    passBuffs(e, killer);
    e.ic.bleed=null; e.st.curse=null; e.ic.tether=null; e.ic.back=null;
    if(e.ic.duel) duelEnd(e); for(const g of S.heroes) if(g.ic.duel && g.ic.duel.tgt===e) duelEnd(g);   // Gladyatör: Meydan Okuma biter, çalınanlar döner
    if(e.ic.frzN) e.ic.frzN=0; e.ic.heavy=null; e.ic.arenaUntil=0;   // Gölge: bağ ve dönüş noktası da biter   // Kan Hasadı iyileşmesi ve Kan Laneti ölünce biter
    awardHeroKillGold(e, killer);
    if(killer) for(const h of takedownParticipants(e, killer)) if(h.bonus && h.bonus.takedownCd && !h.dead) for(const k of ['r','e']) h.cd[k]*=1-h.bonus.takedownCd;   // Zaman Kumu: sağ tık ve E'nin kalan beklemesi (Boşluk hariç)
    if(killer) for(const h of takedownParticipants(e, killer)) if(h.bonus && h.bonus.takedownHeal && !h.dead){ const T=h.bonus.takedownHeal; h.ic.td={ left:h.maxHp*T.pct, rate:h.maxHp*T.pct/T.dur }; }
    awardXP(src.team, e.x, e.y, HERO_KILL_XP, 1200);
    fx({ type:'death', x:e.x, y:e.y, r:e.r, team:e.team, life:0.5 });
    S.projs = S.projs.filter(p=>p.owner!==e);
    e.cast=null; e.dash=null; e.chan=null;
  } else if(e.kind==='monster'){
    killMonster(e, src);
  } else if(e.kind==='minion'){
    fx({ type:'death', x:e.x, y:e.y, r:e.r, team:e.team, life:0.3 });
    awardXP(1-e.team, e.x, e.y, e.def.xp, XP_RADIUS);
    awardMinionGold(e, src);
    bloodHarvest(e, src, null);
  } else {
    if(e.sub!=='nexus' && S.stats.firstTower===null) S.stats.firstTower=S.time;
    fx({ type:'boom', x:e.x, y:e.y, r0:e.r, r1:e.r+110, color:TEAM_COLORS[e.team], life:0.7 });
    if(e.sub!=='nexus'){
      awardXP(1-e.team, e.x, e.y, STRUCT_XP, 900);
      const team=S.heroes.filter(h=>h.team!==e.team);
      const each=Math.floor(GOLD.towerSplit ? GOLD.tower/Math.max(1,team.length) : GOLD.tower);
      for(const h of team) h.gold+=each;   // ölü olanlar dahil bütün takım
      for(const h of team) h.gold+=catchupGold(h);   // geride olana şahsi ek
    }
    if(e.sub==='nexus' && !S.over) S.over={ winner:src.team };
  }
}

export function applyKnock(e,nx,ny,f){
  if(e.kind==='struct' || unpushable(e)) return;
  e.kx += nx*f/e.mass; e.ky += ny*f/e.mass;
}

export function respawnHero(h){
  Object.assign(h,{ x:h.spawnX, y:h.spawnY, vx:0, vy:0, kx:0, ky:0, hp:h.maxHp, dead:false, flash:0,
    r:h.baseR, cast:null, dash:null, chan:null, recallCh:null, cd:{ r:0, e:0, s:0 },
    st:{ slow:null, freeze:0, asB:null, shield:null, spd:null, giant:null, burn:null, ignite:null, amp:null, bflame:null, titanSlow:null, shred:null, frenzy:null, fring:null, flow:null, silence:0, curse:null, root:0, shell:null, ball:null }, stasis:0, pulled:null });
  h.atk = { state:'ready', t:0, total:0, aim:h.aim };
  if(h.offCd){   // İkili: beklemeler sıfırlanır, uzak biçimde doğar
    h.offCd.r=0; h.offCd.e=0; h.offMax.r=1; h.offMax.e=1;
    if(h.form!=='ranged'){ h.form='ranged'; h.def=FORMS[h.type].ranged; h.formStats=null; h._adT=-1; }
  }
}

/* ---- eşyalar ---- */
/* İyileştirme (Ruh Örtüsü artırır) */
/* Kalkan ver (Koruyucu Muska kalkanları artırır). keep=true: eldeki daha büyük kalkanı bozma (eşya kalkanları) */
export function giveShield(h, amt, dur, keep){
  amt*=1+((h.bonus&&h.bonus.shieldAmp)||0);
  if(keep && h.st.shield && h.st.shield.amt>=amt) return;
  h.st.shield={ amt, max:amt, t:dur };
}
/* Hareket hızı bonusu (eşya pasifleri): en güçlüsü ve en uzunu kalır */
function hurtSpeed(h, amt, dur){
  if(h.ic.msUntil>S.time && h.ic.msAmt>amt) amt=h.ic.msAmt;
  h.ic.msAmt=amt; h.ic.msUntil=Math.max(h.ic.msUntil||0, S.time+dur);
}
export function heal(h, x){ if(x<=0 || h.dead) return; if(h.ic && h.ic.woundUntil>S.time) x*=1-h.ic.woundPct;   // Yara Zırhı: iyileşme azalır
  h.hp=Math.min(h.maxHp, h.hp+x*(1+((h.bonus&&h.bonus.healAmp)||0))); }
/* Envanterden stat ve pasifleri topla */
export function computeBonus(h){
  const B={ dmg:0, hp:0, armor:0, mr:0, ah:0, ap:0, asPct:0, crit:0, ls:0, msPct:0 };
  for(const id of h.items){
    const it=ITEMS[id]||PARTS[id]; if(!it) continue;
    for(const [k,v] of Object.entries(it.stats)) B[k]=(B[k]||0)+v;
    if(ITEMS[id]) for(const [k,v] of Object.entries(it)) if(!['name','cost','parts','stats','desc','cat'].includes(k)) B[k]=v;   // pasifler eşsiz
  }
  B.crit=Math.min(1,B.crit);
  if(B.scale){ if(h.ic.scaleAt===undefined) h.ic.scaleAt=S.time; } else { h.ic.scaleAt=undefined; h.ic.scaleN=0; }   // Çağ Kitabı: satın alma anından itibaren sayılır
  const old=h.maxHp;
  h.bonus=B;
  if(old!==undefined){ h.maxHp=Math.round(stat(h,'hp')); if(!h.dead) h.hp=Math.max(1,Math.min(h.maxHp, h.hp+(h.maxHp-old))); }
}
/* Uçurum Maskesi: e'nin yakınındaki rakip kahramanların büyü direnci düşürmesi */
function mrAuraOn(e){
  let r=0;
  for(const h of S.heroes) if(!h.dead && h.team!==e.team && h.bonus && h.bonus.mrAura && dist(h,e)<=h.bonus.mrAura.range) r=Math.max(r, h.bonus.mrAura.base+h.level);
  return r;
}
/* Yetenek kullanıldı: Tılsımlı Kılıç/Büyü Kılıcı hazırlanır, Yankı ve Öç ek hasarı bekler, Can Pınarı iyileştirir */
export function onCast(h){
  const sp=h.def.skills.p;
  if(sp.flowMin!==undefined) h.st.flow={ amt:flowAmt(sp,h.level), t:sp.dur, total:sp.dur };   // Akış: her yetenek kullanımı (biçim değiştirme dahil) yenilenir
  if(sp.sparkMin!==undefined) h.ic.sparkUntil=S.time+sp.window;   // Kıvılcım: yetenekten sonra window sn içinde ilk düz vuruş patlar
  const B=h.bonus; if(!B) return;
  if(B.spellblade) h.ic.sbUntil=S.time+B.spellblade.window;
  if(B.echo && (h.ic.echoCd||0)<=S.time){ h.ic.echoCd=S.time+B.echo.cd; h.ic.pendMagic=(h.ic.pendMagic||0)+B.echo.base+B.echo.ap*apOf(h); }
  if(B.store && h.ic.store>0){ h.ic.pendPhys=(h.ic.pendPhys||0)+h.ic.store; h.ic.store=0; }
  if(B.castHeal && (h.ic.healCd||0)<=S.time){ h.ic.healCd=S.time+B.castHeal.cd; heal(h, B.castHeal.base+B.castHeal.pctMax*h.maxHp); }
  if(B.castAs){ h.ic.asAmt=B.castAs.amt; h.ic.asUntil=S.time+B.castAs.dur; }                          // Kasırga Baltası
  if(B.castMs) hurtSpeed(h, B.castMs.amt, B.castMs.dur);                                              // Rüzgar Yürüyüşü, Esinti Asası
  if(B.castShield && (h.ic.csCd||0)<=S.time){ h.ic.csCd=S.time+B.castShield.cd; giveShield(h, B.castShield.base+B.castShield.pctMax*h.maxHp, B.castShield.dur, true); }   // Ateş Kalkanı, Kanat Kalkanı
}
/* Düz vuruş isabet etti: vuruşta etkileyen eşya pasifleri */
/* Ruh Akışı: düz vuruş isabeti sağ tık, E ve Boşluk'un kalan beklemesini kısaltır (rakip kahramana isabet daha çok) */
function spiritFlow(src, e){
  const p=src.def.skills.p, x = e.kind==='hero' ? p.flowHero : p.flowCd;
  for(const k of ['r','e','s']) if(src.cd[k]>0) src.cd[k]=Math.max(0, src.cd[k]-x);
}
export function onBasicHit(src, e){
  if(src && src.kind==='hero' && src.def.skills.p.flowCd!==undefined) spiritFlow(src, e);
  if(src && src.kind==='hero' && src.jb && src.jb.burn>S.time && !e.dead) burnHit(src, e);   // Yakıcı güçlendirmesi
  if(!src || src.kind!=='hero' || !src.bonus || e.dead) return;
  const B=src.bonus, P={ noProc:true, noSplash:true };
  if(B.every3){ src.ic.k3=(src.ic.k3||0)+1; if(src.ic.k3>=3){ src.ic.k3=0; damage(e, B.every3, src, { type:'magic', ...P }); } }
  if(B.onHitCurPct && !e.dead){ let x=e.hp*B.onHitCurPct; if(e.kind!=='hero') x=Math.min(x,60); damage(e, x, src, P); }
  if(B.onHitOwnHp && !e.dead) damage(e, src.maxHp*B.onHitOwnHp, src, P);
  if(B.champMaxHp && e.kind==='hero' && !e.dead && (src.ic.spearCd||0)<=S.time){ src.ic.spearCd=S.time+B.champMaxHp.cd; damage(e, e.maxHp*B.champMaxHp.pct, src, P); }
  if(B.spellblade && !e.dead && (src.ic.sbUntil||0)>=S.time && (src.ic.sbCd||0)<=S.time){
    const sb=B.spellblade; src.ic.sbUntil=0; src.ic.sbCd=S.time+sb.cd;
    damage(e, sb.base+(sb.bonusAd||0)*(B.dmg||0)+(sb.apRatio||0)*apOf(src), src, { type:sb.type, ...P });
  }
  if(B.onHitAp && !e.dead) damage(e, B.onHitAp*apOf(src), src, { type:'magic', ...P });
  if(B.onHitAd && !e.dead) damage(e, B.onHitAd*atkDmg(src), src, P);                                  // Gece Avcısı
  if(B.onHitMs) hurtSpeed(src, B.onHitMs.amt, B.onHitMs.dur);                                         // Kaçak Yayı
  if(B.asStack){ const A=B.asStack, ic=src.ic; ic.asStackN = ic.asStackUntil>S.time ? Math.min(A.max, ic.asStackN+1) : 1; ic.asStackUntil=S.time+A.dur; ic.asStackAmt=A.amt; }   // Hız Çarkı
  if(B.coil){ const C=B.coil, ic=src.ic;                                                              // Yük Bobini
    if((ic.coil||0)>=C.max){ ic.coil=0; if(!e.dead) damage(e, C.base+C.ad*atkDmg(src), src, { type:'magic', ...P }); fx({ type:'ring', owner:src, r0:src.r, r1:src.r+26, color:'#7fd8ff', lw:3, life:0.3 }); }
    else ic.coil=Math.min(C.max,(ic.coil||0)+C.perHit); }
  if(B.stride && src.ic.stride>0){ const x=src.ic.stride; src.ic.stride=0; if(!e.dead) damage(e, x, src, { type:'magic', ...P }); }   // Fırtına Adımı
  if(B.quake && (src.ic.quakeCd||0)<=S.time){                                                          // Şok Zırhı
    const Q=B.quake; src.ic.quakeCd=S.time+Q.cd; const x=Q.base+Q.hpPct*src.maxHp;
    for(const u of foes(src.team,false)) if(dist(u,src)-u.r<=Q.radius) damage(u, x, src, { type:'magic', ...P });
    fx({ type:'boom', x:src.x, y:src.y, r0:src.r, r1:Q.radius, color:'#9fd6ff', life:0.3 });
  }
  if(B.hitMsStack && e.kind==='hero'){ const H=B.hitMsStack, ic=src.ic; ic.hmsN = ic.hmsUntil>S.time ? Math.min(H.max, ic.hmsN+1) : 1; ic.hmsUntil=S.time+H.dur; ic.hmsAmt=H.amt; }   // Dikenli Çizme
  if(B.shredFlat && e.kind==='hero'){ e.ic.flatDownT=S.time+B.shredFlat.dur; e.ic.flatDown=B.shredFlat.amt; }   // Ölüm Haritası
  if(B.shred && e.kind==='hero' && !e.dead){ const o=e.st.shred; e.st.shred={ n:Math.min(B.shred.max,(o?o.n:0)+1), t:B.shred.dur, pct:B.shred.pct }; }
}
/* Zamanla işleyen eşya etkileri */
function itemTick(h, dt){
  const B=h.bonus; if(!B) return;
  if(B.store && h.ic.store && S.time-(h.ic.storeT||0)>B.store.decay) h.ic.store=0;
  if(B.scale){                                                                                        // Çağ Kitabı
    const n=Math.min(B.scale.max, Math.floor((S.time-h.ic.scaleAt)/60));
    if(n!==(h.ic.scaleN||0)){ h.ic.scaleN=n; const old=h.maxHp; h.maxHp=Math.round(stat(h,'hp')); h.hp=Math.max(1,Math.min(h.maxHp, h.hp+(h.maxHp-old))); }
  }
  if(B.coil || B.stride){                                                                            // Yük Bobini, Fırtına Adımı: yürünen mesafe yük biriktirir
    const ic=h.ic;
    if(ic.px!==undefined){
      const d=Math.hypot(h.x-ic.px, h.y-ic.py);
      if(d>0 && d<=700*dt){                                                                          // ışınlanma ve atılışlar sayılmaz
        if(B.coil) ic.coil=Math.min(B.coil.max,(ic.coil||0)+d/B.coil.perDist);
        if(B.stride) ic.stride=Math.min(B.stride.max,(ic.stride||0)+d/B.stride.perDist);
      }
    }
    ic.px=h.x; ic.py=h.y;
  }
  if(B.lowRegen && h.ic.lrUntil>S.time) heal(h, h.maxHp*B.lowRegen.pct*dt);                            // Muska Çanı
  if(B.ooc && S.time-(h.ic.lastHurt??-99)>=B.ooc.delay) heal(h, h.maxHp*B.ooc.pctPerSec*dt);          // Ölümsüz Kalp
  if(h.ic.td){ const x=Math.min(h.ic.td.left, h.ic.td.rate*dt); heal(h,x); h.ic.td.left-=x; if(h.ic.td.left<=0) h.ic.td=null; }   // Zafer Zırhı
  if(B.burnAura){                                                                                     // Güneş Ateşi
    h.ic.sunT=(h.ic.sunT||0)-dt;
    if(h.ic.sunT<=0){
      h.ic.sunT=1;
      const x=B.burnAura.base+B.burnAura.pctMax*h.maxHp;
      for(const u of foes(h.team,false)) if(dist(u,h)-u.r<=B.burnAura.range) damage(u, x, h, { type:'magic', dot:true, noProc:true, noSplash:true });
    }
  }
}
/* Eşyanın kalan bedeli (LoL gibi: tam fiyat eksi eldeki parçalar) */
export function itemCostFor(h, id){
  if(PARTS[id]) return PARTS[id].cost;
  const inv=[...h.items]; let cost=ITEMS[id].cost;
  for(const p of ITEMS[id].parts){ const i=inv.indexOf(p); if(i>=0){ cost-=PARTS[p].cost; inv.splice(i,1); } }
  return cost;
}
export function canShop(h){ const n=S.lane[h.team][3]; return !n.dead && (h.dead || dist(h,n)<=FOUNTAIN.radius); }   // üste ya da ölüyken alışveriş
/* Satın al (sadece üste). Büyük eşya alınınca elindeki parçaları kullanır. */
export function buy(h, id){
  if(!canShop(h)) return false;
  const cost=itemCostFor(h,id); if(h.gold<cost) return false;
  if(PARTS[id]){ if(h.items.length>=SLOTS) return false; h.items.push(id); }
  else {
    const inv=[...h.items];
    for(const p of ITEMS[id].parts){ const i=inv.indexOf(p); if(i>=0) inv.splice(i,1); }
    if(inv.length>=SLOTS) return false;
    inv.push(id); h.items=inv;
  }
  h.gold-=cost; computeBonus(h); h.ic.carryBase=h.gold;   // Yük Taşıyıcı: alışverişte taşınan altın sıfırlanır
  return true;
}
/* Büyük eşyayı al; alınamıyorsa eksik parçalarından alınabilenleri pahalıdan ucuza doğru al */
export function buySmart(h, id){
  if(buy(h,id) || PARTS[id]) return;
  const inv=[...h.items], miss=[];
  for(const p of ITEMS[id].parts){ const i=inv.indexOf(p); if(i>=0) inv.splice(i,1); else miss.push(p); }
  miss.sort((a,b)=>PARTS[b].cost-PARTS[a].cost);
  for(const p of miss) if(h.gold>=PARTS[p].cost) buy(h,p);
}
/* Eşya sat (sadece üste): tam bedelin %70'i iade (aşağı yuvarlanır). Dönüş: iade edilen altın ya da -1 (satılamadı) */
export const SELL_RATE = 0.7;
export function sellValue(id){ const it=ITEMS[id]||PARTS[id]; return it ? Math.floor(it.cost*SELL_RATE) : 0; }
export function sell(h, idx){
  if(!canShop(h)) return -1;
  const id=h.items[idx]; if(!id) return -1;
  const back=sellValue(id);
  h.items.splice(idx,1); h.gold+=back; computeBonus(h); h.ic.carryBase=h.gold;
  return back;
}
/* Rakip takımın verdiği hasarın tahmini fiziksel oranı (0..1). Maç içinde bu kahramanın rakip kahramanlardan ALDIĞI
   hasar (minyon ve kule sayılmaz) türe göre toplanır (damage içinde e.ic.taken). Maçın başında veri yokken rakip
   kahramanların türünden tahmin (items.js DMG_PHYS) kullanılır: tahmin PRIOR_DMG kadar hasar ağırlığındadır, ölçüm arttıkça öne geçer. */
const PRIOR_DMG = 300;
export function foePhysShare(h){
  const foes=S.heroes.filter(x=>x.team!==h.team);
  if(!foes.length) return 0.5;
  let guess=0; for(const f of foes) guess+=DMG_PHYS[f.type]??0.5; guess/=foes.length;
  const T=h.ic.taken||{ phys:0, magic:0 };
  return (T.phys + guess*PRIOR_DMG) / (T.phys + T.magic + PRIOR_DMG);
}
/* Esnek savunma yuvası (DEF): oranın > %60'ında zırh, < %40'ında BD, arada karışık (yoksa elde az olan direnç) eşyası. Dönüş: eşya id ya da null */
export function defPick(h){
  const pool=DEF_POOLS[DEF_CLASS[h.type]||'caster'], p=foePhysShare(h);
  const have=id=>h.items.includes(id);
  const free=l=>l.filter(id=>!have(id));
  let order;
  if(p>0.6) order=['armor','mix','mr'];
  else if(p<0.4) order=['mr','mix','armor'];
  else {
    const B=h.bonus||{}, needArmor=(B.armor||0)<=(B.mr||0);   // karışık kalmadıysa elde az olan direnç
    order=['mix', needArmor?'armor':'mr', needArmor?'mr':'armor'];
  }
  for(const k of order){ const l=free(pool[k]); if(l.length) return l[0]; }
  return null;
}
/* Botun sıradaki alım yuvası: { id, slot } (DEF yuvası alım anındaki profile göre çözülür). Yoksa null */
function nextBuildSlot(h){
  const done=h.items.filter(id=>ITEMS[id]).length;
  if(done>=SLOTS) return null;                                   // yuvalar dolu
  const B=h.build||[];
  for(let i=0;i<B.length;i++){
    const id = B[i]===DEF ? defPick(h) : B[i];
    if(id && !h.items.includes(id)) return { id, slot:i };
  }
  return null;
}
/* Botun sıradaki büyük eşyası (yoksa null) */
export function nextBuild(h){ const n=nextBuildSlot(h); return n ? n.id : null; }
/* Bot alışverişi: sıradaki büyük eşyayı alabiliyorsa al, alamıyorsa eksik parçalarından alabildiğini al.
   DEF yuvası, ilk alım hareketinde (eşya ya da parça) çözülüp build listesine yazılır: parçalar boşa gitmesin. */
export function botShop(h){
  for(let guard=0; guard<12; guard++){
    const n=nextBuildSlot(h); if(!n) return;
    const id=n.id, commit=()=>{ if(h.build[n.slot]===DEF) h.build[n.slot]=id; };
    if(h.gold>=itemCostFor(h,id) && buy(h,id)){ commit(); continue; }
    const inv=[...h.items]; let bought=false;
    for(const p of ITEMS[id].parts){
      const i=inv.indexOf(p); if(i>=0){ inv.splice(i,1); continue; }
      if(h.gold>=PARTS[p].cost && buy(h,p)){ bought=true; commit(); break; }
      break;   // parçaları sırayla al
    }
    if(!bought) return;
  }
}

/* ---- altın ---- */
export function awardMinionGold(m, src){
  const g=minionGold(S.time);
  // son vuruşu yapan kahraman tam altın alır; yakındaki diğerleri son vuruş yokmuş gibi kendi sayılarına göre paylaşır
  const last = src && src.kind==='hero' && src.team!==m.team ? src : null;
  if(last) last.gold+=Math.floor(g);
  const near=S.heroes.filter(h=>h!==last && !h.dead && h.team!==m.team && Math.hypot(h.x-m.x,h.y-m.y)<=XP_RADIUS);
  if(!near.length) return;
  const k=GOLD.share[Math.min(near.length, GOLD.share.length)-1];
  for(const h of near) h.gold+=Math.floor(g*k);
}
/* Kahraman öldürme: öldürene ilk kan 200 / sonra 100. Asist: öldürenin dostlarından son 10 sn'de kurbana zarar veren
   ya da öldürene yarar (iyileştirme, kalkan vb.) sağlayan. Asist havuzu öldürme altınının %30'u, eşit bölünür, aşağı yuvarlanır. */
export function awardHeroKillGold(victim, killer){
  if(!killer || killer.kind!=='hero' || killer.team===victim.team) return;
  const base = S.firstBlood ? GOLD.heroKill : GOLD.firstBlood;
  S.firstBlood = true;
  killer.gold += Math.floor(base) + catchupGold(killer);
  const assists = takedownParticipants(victim, killer).filter(h=>h!==killer);
  if(assists.length){ const each=Math.floor(base*GOLD.assistPct/assists.length); for(const h of assists) h.gold+=each+Math.floor(catchupGold(h)*CATCHUP_GOLD.assistPct); }
}
/* Öldüren + asist yapanlar (son 10 sn'de kurbana zarar ya da öldürene yarar) */
export function takedownParticipants(victim, killer){
  const t0 = S.time - GOLD.assistWindow;
  return [killer, ...S.heroes.filter(h => h!==killer && h.team===killer.team &&
    ((victim.dmgBy[h.id] ?? -1e9) >= t0 || (killer.helpBy[h.id] ?? -1e9) >= t0))];
}
/* Kule/minyon öldürdüyse: son 10 sn'de kurbana en son vuran rakip kahraman öldüren sayılır; yoksa kimse */
export function creditKiller(victim, src){
  if(src && src.kind==='hero' && src.team!==victim.team) return src;
  let best=null, bt=S.time-GOLD.assistWindow;
  for(const h of S.heroes){
    if(h.team===victim.team) continue;
    const t=victim.dmgBy[h.id];
    if(t!==undefined && t>=bt){ bt=t; best=h; }
  }
  return best;
}
/* Dost bir kahramana yarar sağlandığında çağrılır (iyileştirme, kalkan, hızlandırma); asist için kayıt */
export function markHelp(target, helper){ if(target!==helper && target.team===helper.team) target.helpBy[helper.id]=S.time; }

/* ---- seviye ve XP ---- */
/* XP paylaşımı (LoL gibi): yakında n kahraman varsa her biri XP_SHARE[n-1] katını alır (1v1'de hep tam) */
const XP_SHARE=[1, 0.65, 0.45, 0.35, 0.28];
export function awardXP(team, x, y, amt, radius, mult){
  const near=S.heroes.filter(h=>!h.dead && h.team===team && Math.hypot(h.x-x,h.y-y)<=radius);
  const k=XP_SHARE[Math.min(near.length,XP_SHARE.length)-1]||1;
  for(const h of near) gainXP(h, amt*k*(1+catchupXP(h))*(mult ? mult(h) : 1));
  return near;
}
/* ---- geri kalma telafisi (data.js CATCHUP_XP / CATCHUP_GOLD) ---- */
export function totalXP(h){ let t=h.xp; for(let l=1;l<h.level;l++) t+=XP_NEED(l); return t; }
export function itemsValue(items){ return (items||[]).reduce((t,id)=>t+((ITEMS[id]||PARTS[id]||{}).cost||0),0); }
export function heroWorth(h){ return h.gold+(h.items||[]).reduce((t,id)=>t+((ITEMS[id]||PARTS[id]||{}).cost||0),0); }
function foeAvg(h, f){ const F=S.heroes.filter(u=>u.team!==h.team && u.team<2); return F.length ? F.reduce((t,u)=>t+f(u),0)/F.length : 0; }
function behind(h, f){ const a=foeAvg(h,f); return a>0 ? 1-f(h)/a : 0; }
export function catchupXP(h){ const g=behind(h,totalXP); for(const r of CATCHUP_XP) if(g>=r.gap) return r.bonus; return 0; }
export function catchupGold(h){ const g=behind(h,heroWorth); for(const r of CATCHUP_GOLD.steps) if(g>=r.gap){ h.cuGold=(h.cuGold||0)+r.gold; return r.gold; } return 0; }
export const jmMult = h => 1+JUNGLE_MASTERY.per*Math.min(JUNGLE_MASTERY.max, h.jm||0);
export function gainXP(h, amt){
  if(h.level>=MAX_LEVEL) return;
  h.xp+=amt;
  while(h.level<MAX_LEVEL && h.xp>=XP_NEED(h.level)){ h.xp-=XP_NEED(h.level); levelUp(h); }
  if(h.level>=MAX_LEVEL) h.xp=0;
}
export function applyLevelStats(h){
  const old=h.maxHp;
  h.baseR=stat(h,'size'); h.maxHp=Math.round(stat(h,'hp'));
  h.hp=Math.min(h.maxHp, h.hp+(h.maxHp-old));
}
export function levelUp(h){
  h.level++; h.points++; applyLevelStats(h);
  if(h.level===MAX_LEVEL && S.stats.maxLevel[h.team]===null) S.stats.maxLevel[h.team]=S.time;
  fx({ type:'ring', owner:h, r0:h.r, r1:h.r+50, color:'#ffd24d', lw:5, life:0.6 });
  fx({ type:'dmg', x:h.x, y:h.y-h.r-34, txt:'Seviye '+h.level, blue:false, life:1.2 });
  if(!h.human) autoLearn(h);
}
export function canLearn(h, k){
  if(h.points<=0) return false;
  if(h.def.skills[k].fixed) return false;   // İkili Biçim Değiştir: baştan açık, kademe almaz
  if(k==='s') return h.rank.s < spaceMax(h.level);
  return h.rank[k] < h.def.skills[k].max && h.rank[k] < RANK_CAP(h.level);
}
export function learnSkill(h, k){
  if(!canLearn(h,k)) return;
  h.rank[k]++; h.points--;
  fx({ type:'ring', owner:h, r0:h.r, r1:h.r+22, color:'#ffffff', lw:3, life:0.3 });
}
export function autoLearn(h){
  while(h.points>0){
    let k=null;
    // seviye 15 (14.10.2026): Boşluk önce; E'ye 2. seviyede 1 puan; sonra sağ tık doldurulur (kademe sınırı izin verdikçe), kalan E'ye
    if(canLearn(h,'s')) k='s';
    else if(h.rank.e===0 && canLearn(h,'e') && h.rank.r>0) k='e';
    else if(canLearn(h,'r')) k='r';
    else if(canLearn(h,'e')) k='e';
    if(!k) break;
    learnSkill(h,k);
  }
}
export function initLevel(h, level){
  h.level=level; h.xp=0; h.points=level;
  h.baseR=stat(h,'size'); h.maxHp=Math.round(stat(h,'hp')); h.hp=h.maxHp;
  if(!h.human) autoLearn(h);
}

/* ---- yetenekler ---- */
export function canAct(h){ return h.st.freeze<=0 && !h.cast && !h.dash; }

/* Hedef noktası: komutta yoksa nişan yönünde menzil kadar ileri */
function targetPoint(h, cmd, range){
  if(cmd && cmd.tx!==undefined && isFinite(cmd.tx)) return { x:cmd.tx, y:cmd.ty };
  const a=cmd ? cmd.aim : h.aim;
  return { x:h.x+Math.cos(a)*range, y:h.y+Math.sin(a)*range };
}
export function tryCast(h, k, aim, cmd){
  const sk=h.def.skills[k], rk=h.rank[k];
  if(h.chan && h.chan.art){ if(k==='s') artilleryShot(h, cmd); return; }   // Kök Sal kanallanırken: Boşluk her basışta atış, sağ tık ve E yok
  // Gölge Adımı dönüşü: pencere içinde aynı tuşa tekrar basmak başladığı yere döndürür (bekleme ve rank'ten bağımsız, kullanım sayılmaz)
  const bk=h.ic.back && h.ic.back[k];
  if(bk){
    if(S.time<=bk.until){ if(canAct(h) && !(h.st.silence>0)) blinkReturn(h, k); return; }
    h.ic.back[k]=null;
  }
  if(!sk.type || rk<=0 || h.cd[k]>0) return;
  // Arınma sersemken de kullanılır (tek istisna); Kum Saati dokunulmazlığında zaten updateHero buraya gelmez
  if(sk.type==='cleanse' ? (h.cast || h.dash) : !canAct(h)) return;
  if(h.st.silence>0 && sk.type!=='cleanse') return;   // susturulan yetenek kullanamaz (Arınma istisna: susturmayı kaldıran o)
  if(h.st.root>0 && (sk.type==='dash' || sk.type==='tumble' || sk.type==='flameleap' || sk.type==='leapslam' || sk.type==='roll' || sk.type==='duel')) return;   // köklüyken atılış ve sıçrama yok (ışınlanma serbest)
  if(sk.type==='mimic' && !h.ic.last) return;   // Taklit: henüz tekrarlanacak yetenek yok
  let tgt=null;
  if(sk.type==='ignite' || sk.type==='bloodbolt'){
    // menzildeki rakip şampiyon ve minyonlardan imlece en yakını (kule hedef alınamaz); yoksa yetenek harcanmaz
    const p=targetPoint(h, cmd, sk.range); let bd=1e9;
    for(const u of foes(h.team,false)){
      if(dist(u,h)-u.r>sk.range) continue;
      if(sk.type==='bloodbolt' && !canSee(h.team,u)) continue;   // Kan Oku yalnız görünen hedefe
      const dd=Math.hypot(u.x-p.x,u.y-p.y); if(dd<bd){ bd=dd; tgt=u; }
    }
    if(!tgt) return;
  } else if(sk.type==='lockvolley'){
    // menzildeki görünen rakip kahramanlardan imlece en yakını; yoksa yetenek harcanmaz
    const p=targetPoint(h, cmd, sk.range); let bd=1e9;
    for(const u of S.heroes){
      if(u.dead || u.team===h.team || !canSee(h.team,u) || dist(u,h)-u.r>sk.range) continue;
      const dd=Math.hypot(u.x-p.x,u.y-p.y); if(dd<bd){ bd=dd; tgt=u; }
    }
    if(!tgt) return;
  } else if(sk.type==='duel'){
    // Meydan Okuma: menzildeki görünen rakip KAHRAMANLARDAN imlece en yakını; yoksa yetenek harcanmaz
    const p=targetPoint(h, cmd, sk.range); let bd=1e9;
    for(const u of S.heroes){
      if(u.dead || u.team===h.team || !canSee(h.team,u) || dist(u,h)-u.r>sk.range) continue;
      const dd=Math.hypot(u.x-p.x,u.y-p.y); if(dd<bd){ bd=dd; tgt=u; }
    }
    if(!tgt) return;
  } else if(sk.type==='heavy'){
    // Ağır Darbe: düz vuruş menzilindeki görünen rakiplerden (kahraman, minyon, kule) imlece en yakını; yoksa yetenek harcanmaz
    const p=targetPoint(h, cmd, 9999); tgt=attackTarget(h, p.x, p.y);
    if(!tgt) return;
  } else if(sk.type==='leapslam' || sk.type==='knockblow'){
    // menzildeki görünen rakip kahraman ve minyonlardan (kule değil) imlece en yakını; yoksa yetenek harcanmaz
    const p=targetPoint(h, cmd, sk.range); let bd=1e9;
    for(const u of foes(h.team,false)){
      if(dist(u,h)-u.r>sk.range || !canSee(h.team,u)) continue;
      const dd=Math.hypot(u.x-p.x,u.y-p.y); if(dd<bd){ bd=dd; tgt=u; }
    }
    if(!tgt) return;
  }
  if(h.atk.state==='windup') h.atk.state='ready';
  h.chan=null;   // başka bir yetenek kullanmak Kilitli Yaylım kanallamasını bitirir
  let cdv = sk.cd[rk-1] * 100/(100+Math.max(0,stat(h,'ah')));   // yetenek hızı (bekleme baştan harcanır)
  if(k!=='s' && h.ic.focus){ cdv*=1-h.def.skills.p.cut; h.ic.focus=false; h.ic.focusT=0; fx({ type:'ring', owner:h, r0:h.r, r1:h.r+24, color:'#c9a6ff', lw:3, life:0.3 }); }   // Odak: bu kullanımın beklemesi kısalır
  h.cd[k] = h.cdMax[k] = cdv;
  onCast(h);
  // Güçlendir: 6 sn içindeki ilk Ruh Patlaması ya da Ruh Kalkanı güçlenir (kullanılınca ya da süre dolunca biter)
  let emp=false;
  if(sk.type==='spiritburst' || sk.type==='spiritshield'){ const m=h.ic.mantra; emp = !!m && S.time<=m.until; h.ic.mantra=null; }
  if(sk.type==='tether' || sk.type==='blink') h.ic.last=k;   // Taklit'in tekrarlayacağı son yetenek (Gölge Adımı dönüşü sayılmaz)
  if(sk.type==='mimic'){   // Taklit: son yeteneği bir kez daha, hasarı bonus kadar fazla; o yeteneğin beklemesine dokunmaz
    const mk=h.ic.last, ms=h.def.skills[mk], mult=1+sk.bonus[rk-1];
    if(ms.cast) h.cast = { k:mk, t:ms.cast, total:ms.cast, aim, slow:ms.castSlow, mult };
    else instantSkill(h, mk, aim, cmd, null, { mult, retKey:k });
    return;
  }
  if(sk.type==='lockvolley'){
    h.chan = { k, i:rk-1, target:tgt, t:0, shots:0 };
    h.vx=0; h.vy=0;
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+30, color:'#ff6a5c', lw:4, life:0.4 });
    return;
  }
  if(sk.type==='artillery'){   // Kök Sal: yerinde kanallama, ilk basış aynı zamanda ilk atış
    h.chan = { k, i:rk-1, t:0, shots:0, art:true };
    h.vx=0; h.vy=0;
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+30, color:'#b58cff', lw:4, life:0.4 });
    artilleryShot(h, cmd);
    return;
  }
  if(sk.cast){
    h.cast = { k, t:sk.cast, total:sk.cast, aim, slow:sk.castSlow, emp };
  } else {
    instantSkill(h, k, aim, cmd, tgt, { emp });
  }
}

/* Kök Sal atışı: imlece (range'e kırpılır, görünmeyen yer de olur) topçu mermisi; delay sn sonra radius yarıçapta büyü hasarı.
   Atış yeri takıma delay + sight sn görünür (S.sights). Üçüncü atış kanallamayı bitirir. */
function artilleryShot(h, cmd){
  const c=h.chan; if(!c || !c.art) return;
  const sk=h.def.skills[c.k]; if(c.shots>=sk.shots) return;
  let p=targetPoint(h, cmd, sk.range);
  const dx=p.x-h.x, dy=p.y-h.y, l=Math.hypot(dx,dy);
  if(l>sk.range) p={ x:h.x+dx/l*sk.range, y:h.y+dy/l*sk.range };
  S.zones.push({ x:p.x, y:p.y, r:sk.radius, t:sk.delay, total:sk.delay, dmg:sk.dmg[c.i]+(sk.ap||0)*apOf(h), owner:h, team:h.team, kind:'shell' });
  S.sights.push({ x:p.x, y:p.y, r:sk.sightR, team:h.team, t:sk.delay+sk.sight });
  fx({ type:'muzzle', x:h.x, y:h.y-h.r, life:0.2 });
  c.shots++;
  if(c.shots>=sk.shots) h.chan=null;
}

/* Gölge Adımı iniş noktası: dünya sınırı, duvar ve yapılardan (kule, nexus) taşan yer en yakın boş noktaya itilir */
function blinkLanding(h, x, y){
  let p={ x, y };
  for(let it=0; it<3; it++){
    p.x=Math.max(h.r, Math.min(WORLD.w-h.r, p.x)); p.y=Math.max(h.r, Math.min(WORLD.h-h.r, p.y));
    if(inWall(p.x,p.y,h.r)) p=pushOutWalls(p.x,p.y,h.r);
    for(const st of S.structs){
      if(st.dead) continue;
      const dx=p.x-st.x, dy=p.y-st.y, dd=Math.hypot(dx,dy)||1, min=h.r+st.r;
      if(dd<min){ p.x=st.x+dx/dd*min; p.y=st.y+dy/dd*min; }
    }
  }
  return p;
}
/* Gölge Adımı dönüşü: başladığı yere ışınlanır, hasar yok, bekleme etkilenmez */
function blinkReturn(h, k){
  const bk=h.ic.back[k]; h.ic.back[k]=null;
  if(h.atk.state==='windup') h.atk.state='ready';
  fx({ type:'ghost', x:h.x, y:h.y, r:h.r, team:h.team, life:0.4 });
  h.x=bk.x; h.y=bk.y; h.vx=0; h.vy=0; h.kx=0; h.ky=0;
  fx({ type:'ring', owner:h, r0:h.r, r1:h.r+34, color:'#9a7bff', lw:4, life:0.35 });
}
/* Ruh Patlaması: (x,y) merkezinde s.radius yarıçapta rakip birimlere (kule hariç) büyü hasarı + yavaşlatma; güçlüyse yerde alan kalır */
function spiritBlast(p, x, y){
  const s=p.spirit, o=p.owner;
  for(const u of foes(p.team,false)){
    if(Math.hypot(u.x-x,u.y-y)>s.radius+u.r) continue;
    damage(u, s.dmg, o, { type:'magic', skill:true });
    if(!u.dead && u.st) applySlow(u, s.slow, s.slowDur);
    fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
  }
  fx({ type:'boom', x, y, r0:20, r1:s.radius, color:'#5fe0c8', life:0.45 });
  if(s.field) S.zones.push({ x, y, r:s.radius, t:s.field.t, total:s.field.t, dmg:s.dmg*s.field.again, owner:o, team:p.team, kind:'spirit', slow:s.field.slow });
}
export function instantSkill(h, k, aim, cmd, tgt, opt){
  const sk=h.def.skills[k], rk=h.rank[k], i=rk-1;
  if(sk.type==='transform'){ switchForm(h); return; }   // İkili Biçim Değiştir
  if(sk.type==='leapslam'){   // Sıçrayış Darbesi: seçilen rakibin yanına sıçrar (duvarda ya da yapıda durursa orada iner), inişte updateHero leapSlam
    const dx=tgt.x-h.x, dy=tgt.y-h.y, l=Math.hypot(dx,dy)||1;
    h.dash = { dx:dx/l, dy:dy/l, left:Math.max(0,l-h.r-tgt.r), sk, rk, noHit:true, slam:true };
    return;
  }
  if(sk.type==='knockblow'){   // Darbe: fiziksel hasar (+ hedefin azami canının %8'i), 300 birim geri itme; duvara çarparsa sersemletme (shoveStep)
    damage(tgt, sk.dmg[i]+sk.hpPct*tgt.maxHp, h, { type:'phys', skill:true });
    fx({ type:'hit', x:tgt.x, y:tgt.y, big:true, life:0.2 });
    if(!tgt.dead && !(tgt.stasis>0)){
      const dx=tgt.x-h.x, dy=tgt.y-h.y, l=Math.hypot(dx,dy)||1;
      shoveStart(tgt, h, dx/l, dy/l, sk);
    }
    return;
  }
  if(sk.type==='mantra'){   // Güçlendir: window sn içindeki sonraki Ruh Patlaması ya da Ruh Kalkanı güçlenir
    h.ic.mantra={ until:S.time+sk.window, total:sk.window };
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+44, color:'#7ff5dc', lw:5, life:0.5 });
    return;
  }
  if(sk.type==='spiritshield'){   // Ruh Kalkanı: kalkan + dur sn hareket hızı (kalkan kırılsa da sürer); güçlüyse büyük kalkan ve yavaşlatma temizler
    const emp=opt && opt.emp, ms=h.def.skills.s, amt=(sk.shield[i]+(sk.ap||0)*apOf(h))*(emp ? ms.shieldMult : 1);
    giveShield(h, amt, sk.dur);
    h.st.spd = { amt:sk.spd, t:sk.dur };
    if(emp){
      h.st.slow=null; h.st.titanSlow=null;   // yavaşlatmalar kalkar; sersemletme, kök ve susturmaya dokunulmaz
      // güçlü kalkan yakındaki yaşayan dostlara da (2v2): aynı kalkan, hız ve yavaşlatma temizliği
      for(const a of S.heroes){
        if(a===h || a.dead || a.team!==h.team || dist(a,h)>ms.allyR) continue;
        giveShield(a, amt, sk.dur); a.st.spd = { amt:sk.spd, t:sk.dur }; a.st.slow=null; a.st.titanSlow=null; markHelp(a, h);
        fx({ type:'ring', owner:a, r0:a.r, r1:a.r+40, color:'#7ff5dc', lw:5, life:0.45 });
      }
    }
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+(emp?44:30), color:emp?'#7ff5dc':'#5fe0c8', lw:emp?6:4, life:0.45 });
    return;
  }
  if(sk.type==='blink'){   // Gölge Adımı: imlece (menzile kırpılır) ışınlan, indiği yerde büyü patlaması; dönüş penceresi açılır
    const mult=(opt && opt.mult) || 1, rkey=(opt && opt.retKey) || k;
    let p=targetPoint(h, cmd, sk.range);
    const dx=p.x-h.x, dy=p.y-h.y, l=Math.hypot(dx,dy);
    if(l>sk.range) p={ x:h.x+dx/l*sk.range, y:h.y+dy/l*sk.range };
    p=blinkLanding(h, p.x, p.y);
    const ox=h.x, oy=h.y;
    fx({ type:'ghost', x:ox, y:oy, r:h.r, team:h.team, life:0.5 });
    h.x=p.x; h.y=p.y; h.vx=0; h.vy=0; h.kx=0; h.ky=0;
    (h.ic.back || (h.ic.back={}))[rkey]={ x:ox, y:oy, until:S.time+sk.back, total:sk.back };
    const dm=(sk.dmg[i]+(sk.ap||0)*apOf(h))*mult;
    for(const u of foes(h.team,false)){
      if(Math.hypot(u.x-p.x,u.y-p.y)>sk.radius+u.r) continue;
      damage(u, dm, h, { type:'magic', skill:true });
      fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
    }
    fx({ type:'boom', x:p.x, y:p.y, r0:20, r1:sk.radius, color:'#9a7bff', life:0.45 });
    return;
  }
  if(sk.type==='ignite'){
    S.bolts.push({ x:h.x, y:h.y, target:tgt, dmg:0, team:h.team, src:h, speed:sk.speed, stacks:2, fire:true,
      ignite:{ dps:(sk.dot[i]+(sk.ap||0)*apOf(h))/sk.dur, t:sk.dur, amp:sk.amp[i] }, skill:true });
    return;
  }
  if(sk.type==='bloodbolt'){   // Kan Oku: güdümlü, büyü hasarı; uygulanan hasarın bir kısmı iyileştirir (updateBolts)
    S.bolts.push({ x:h.x, y:h.y, target:tgt, dmg:sk.dmg[i]+(sk.ap||0)*apOf(h), team:h.team, src:h, speed:sk.speed, stacks:0, skill:true, blood:sk.heal });
    return;
  }
  if(sk.type==='bloodnova'){   // Kan Patlaması: canın pct'ini harca (hasar değil, en az 1 can kalır), 360 derece eşit aralıkla toplar
    const spent=Math.max(0, Math.min(h.hp*sk.pct, h.hp-1));
    h.hp-=spent;
    const dm=sk.dmg[i]+spent+(sk.ap||0)*apOf(h);
    S.novas.push({ x:h.x, y:h.y, r:h.r, max:sk.range, speed:sk.speed, dmg:dm, owner:h, team:h.team, hit:new Set() });   // büyüyen kan halkası
    return;
  }
  if(sk.type==='bloodcurse'){   // Kan Laneti: noktadaki rakip kahramanlar işaretlenir (3 sn sonra curseEnd)
    let p=targetPoint(h, cmd, sk.range);
    const dx=p.x-h.x, dy=p.y-h.y, l=Math.hypot(dx,dy);
    if(l>sk.range) p={ x:h.x+dx/l*sk.range, y:h.y+dy/l*sk.range };
    const dm=sk.dmg[i]+(sk.ap||0)*apOf(h);
    for(const u of S.heroes){
      if(u.dead || u.team===h.team || u.stasis>0 || Math.hypot(u.x-p.x,u.y-p.y)>sk.radius+u.r) continue;
      u.st.curse={ t:sk.delay, total:sk.delay, amt:sk.amp[i], dmg:dm, heal:sk.heal, src:h };
    }
    fx({ type:'boom', x:p.x, y:p.y, r0:30, r1:sk.radius, color:'#b3203a', life:0.5 });
    return;
  }
  if(sk.type==='meteor'){
    let p=targetPoint(h, cmd, sk.range);
    const dx=p.x-h.x, dy=p.y-h.y, l=Math.hypot(dx,dy);
    if(l>sk.range) p={ x:h.x+dx/l*sk.range, y:h.y+dy/l*sk.range };
    S.zones.push({ x:p.x, y:p.y, r:sk.radius, t:sk.delay, total:sk.delay, dmg:sk.dmg[i]+(sk.ap||0)*apOf(h), owner:h, team:h.team });
    return;
  }
  if(sk.type==='bomb'){   // Şok Bombası: imlece (menzile kırpılır), gecikmeli patlar
    let p=targetPoint(h, cmd, sk.range);
    const dx=p.x-h.x, dy=p.y-h.y, l=Math.hypot(dx,dy);
    if(l>sk.range) p={ x:h.x+dx/l*sk.range, y:h.y+dy/l*sk.range };
    S.zones.push({ x:p.x, y:p.y, r:sk.radius, t:sk.delay, total:sk.delay, dmg:sk.dmg[i]+(sk.ad||0)*bonusAd(h)+(sk.ap||0)*apOf(h), owner:h, team:h.team, kind:'bomb', stun:sk.stun, ox:h.x, oy:h.y });
    return;
  }
  if(sk.type==='shockwave'){   // Şok Dalgası: yalnız rakip kahramanlar; büyü hasarı, susturma, azalan yavaşlatma
    const dm=sk.dmg[i]+(sk.ap||0)*apOf(h)+(sk.hpPct||0)*bonusHp(h);
    for(const u of S.heroes){
      if(u.dead || u.team===h.team || u.stasis>0 || dist(u,h)-u.r>sk.radius) continue;
      damage(u, dm, h, { type:'magic', skill:true });
      if(u.dead) continue;
      u.st.silence=Math.max(u.st.silence||0, sk.silence[i]); ccHit(u);
      applySlow(u, sk.slow, sk.slowDur, true);
    }
    fx({ type:'boom', x:h.x, y:h.y, r0:h.r, r1:sk.radius, color:'#b58cff', life:0.5 });
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+40, color:'#d9c2ff', lw:6, life:0.4 });
  } else if(sk.type==='haste'){
    h.st.asB = { amt:sk.as[i], t:sk.dur };
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+30, color:'#ffb347', lw:4, life:0.4 });
  } else if(sk.type==='cleanse'){   // Arınma: kitle kontrol etkileri kalkar (süreli hasarlara dokunulmaz), kısa hız artışı
    const st=h.st;
    st.freeze=0; st.slow=null; st.titanSlow=null;
    st.silence=0; st.root=0;   // susturma ve kök de kalkar
    st.spd = { amt:sk.spd[i], t:sk.dur };
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+36, color:'#8cf08c', lw:5, life:0.45 });
  } else if(sk.type==='frenzy'){   // Avcı Coşkusu: Bumerang ve Arınma hazır olur, geçici güçlenme
    h.st.frenzy = { t:sk.dur, spd:sk.spd[i], dmg:sk.ad[i], as:sk.as[i] };
    h.cd.r=0; h.cd.e=0;
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+60, color:'#ff9a3d', lw:6, life:0.6 });
  } else if(sk.type==='shield'){
    giveShield(h, h.maxHp*sk.shield[i], sk.dur);
    h.st.spd = { amt:sk.spd, t:sk.dur };
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+30, color:'#6fc3ff', lw:4, life:0.4 });
  } else if(sk.type==='giant'){
    h.st.giant = { size:sk.size[i], dmg:sk.dmg[i], t:sk.dur[i] };
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+60, color:'#ffd24d', lw:6, life:0.5 });
  } else if(sk.type==='dash'){
    h.dash = { dx:Math.cos(aim), dy:Math.sin(aim), left:sk.dist, sk, rk };
  } else if(sk.type==='flameleap'){   // Alevli Sıçrayış: birimlerin üstünden geçer, duvarda durur; bitince başlangıçtan ateş şeridi (updateHero)
    h.dash = { dx:Math.cos(aim), dy:Math.sin(aim), left:sk.dist, sk, rk, noHit:true, leap:true, ox:h.x, oy:h.y };
  } else if(sk.type==='firering'){   // Alev Halkası: kahramanla hareket eden halka, süre boyunca zırh ve büyü direnci
    h.st.fring = { t:sk.dur, total:sk.dur, radius:sk.radius, dps:sk.dps[i]+(sk.ap||0)*apOf(h), slow:sk.slow, res:sk.res+(sk.resAp||0)*apOf(h) };
    fx({ type:'ring', owner:h, r0:h.r, r1:sk.radius, color:'#ff8a3d', lw:6, life:0.45 });
  } else if(sk.type==='heavy'){   // Gladyatör Ağır Darbe: düz vuruş beklemesi sıfırlanır, sonraki vuruş güçlü (gladHit)
    // Ağır Darbe (11.10.2026): hedefli anında vuruş (eskiden sonraki düz vuruşu güçlendiriyordu). Menzil düz vuruşunki, hasar aynı:
    // düz vuruş hasarı + ek hasar; Kızışma yığını, vuruş etkileri, azalan yavaşlatma ve iyileşme gladHit içinde
    if(tgt && !tgt.dead){
      h.ic.heavy={ until:S.time+1, dmg:sk.dmg[i]+sk.ad*bonusAd(h), slow:sk.slow, slowDur:sk.slowDur, heal:sk.healFlat[i], healPct:sk.healPct };
      damage(tgt, atkDmg(h), h, { basic:true });
      if(!tgt.dead) onBasicHit(h, tgt);
      gladHit(h, tgt);
      fx({ type:'slash', owner:h, tgt, ang:Math.atan2(tgt.y-h.y,tgt.x-h.x), crit:true, life:0.25 });
    }
  } else if(sk.type==='arena'){   // Gladyatör Arena: kendi konumunda alan (engel değil); Gladyatör içindeyken güçlenir (stat/attackSpeed/moveMult)
    const p={ x:h.x, y:h.y };
    for(const z of S.zones) if(z.kind==='arena' && z.owner===h) z.dead=true;   // önceki arena kalkar
    S.zones.push({ x:p.x, y:p.y, r:sk.radius, t:sk.dur, total:sk.dur, owner:h, team:h.team, kind:'arena', ad:sk.adFlat[i], as:sk.as[i], ms:sk.ms[i] });
    h.ic.arenaUntil=S.time+sk.dur;
    fx({ type:'boom', x:p.x, y:p.y, r0:30, r1:sk.radius, color:'#ffb070', life:0.45 });
  } else if(sk.type==='duel'){   // Gladyatör Meydan Okuma: hedefe yapışan atılış, değince duelHit
    const dx=tgt.x-h.x, dy=tgt.y-h.y, l=Math.hypot(dx,dy)||1;
    h.dash = { dx:dx/l, dy:dy/l, left:Math.max(0,l-h.r-tgt.r), sk, rk, noHit:true, duel:tgt, tmax:0.9 };
  } else if(sk.type==='roll'){   // Gülle Yuvarlan: basılı tutma süresine (bot: imleç noktasına) göre mesafe, inişte rollLand
    let L;
    if(cmd && cmd.hold!==undefined) L=sk.dMin+(sk.dMax-sk.dMin)*Math.min(1, cmd.hold/sk.charge);
    else if(cmd && cmd.tx!==undefined && isFinite(cmd.tx)) L=Math.max(sk.dMin, Math.min(sk.dMax, Math.hypot(cmd.tx-h.x, cmd.ty-h.y)));
    else L=sk.dMax;
    h.dash = { dx:Math.cos(aim), dy:Math.sin(aim), left:L, sk, rk, noHit:true, roll:true };
  } else if(sk.type==='shell'){   // Gülle Kabuk
    h.st.shell = { t:sk.dur, total:sk.dur, dr:sk.dr[i], range:sk.range, dmg:sk.dmg[i]+sk.hpPct*bonusHp(h), slow:sk.slow, slowDur:sk.slowDur, mass:sk.massMult };
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+30, color:'#e8d9a0', lw:6, life:0.4 });
  } else if(sk.type==='billiard'){   // Gülle Bilardo: durdurulamaz top (updateHero ballStep)
    h.st.ball = { t:sk.dur, total:sk.dur, dx:Math.cos(aim), dy:Math.sin(aim), sk, dmg:sk.dmg[i]+sk.hpPct*bonusHp(h), hit:new Map() };
    h.st.freeze=0; h.atk.state='ready';
    fx({ type:'ring', owner:h, r0:h.r, r1:h.r+50, color:'#ffe08a', lw:6, life:0.5 });
  } else if(sk.type==='tumble'){   // Yan Atılış: hasarsız kısa kayış, window sn içindeki ilk düz vuruş 3 ok atar
    h.dash = { dx:Math.cos(aim), dy:Math.sin(aim), left:sk.dist, sk, rk, noHit:true };
    h.ic.tripleUntil = S.time+sk.window;
  }
}

export function fireCast(h, c){
  const sk=h.def.skills[c.k], rk=h.rank[c.k], i=rk-1;
  const ang=c.aim, base=atkDmg(h);
  if(sk.type==='volley'){
    const n=sk.count[i], group={ hit:new Set(), repeat:sk.repeat };
    for(let j=0;j<n;j++){
      const a = ang + (n>1 ? sk.spread*(j/(n-1)-0.5) : 0), cx=Math.cos(a), cy=Math.sin(a);
      S.projs.push({ x:h.x+cx*(h.r+4), y:h.y+cy*(h.r+4), vx:cx*sk.speed, vy:cy*sk.speed, ang:a, dist:0,
        max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:base*sk.ratio, knock:0, passive:true, freeze:0, group, skill:true });
    }
    fx({ type:'muzzle', x:h.x+Math.cos(ang)*(h.r+4), y:h.y+Math.sin(ang)*(h.r+4), life:0.15 });
  } else if(sk.type==='fireball'){
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:sk.dmg[i]+(sk.ap||0)*apOf(h), knock:0, passive:false, freeze:0, fire:true, dtype:'magic', skill:true });
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='bigarrow'){
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:base*sk.ratio+(sk.ap||0)*apOf(h), knock:0, passive:false, freeze:sk.freeze, dtype:'magic', skill:true, noMinion:true });   // Kalın Ok büyü hasarı, minyonlardan geçer
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='groworb'){   // Enerji Küresi: ilerledikçe büyür, hızlanır, hasarı artar; ilk rakip birimde ya da menzil sonunda patlar (updateProjectiles)
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:0, knock:0, passive:false, freeze:0, dtype:'phys', skill:true, noStruct:true,
      grow:{ dmg:sk.dmg[i]+(sk.ad||0)*bonusAd(h), r0:sk.radius, r1:sk.radiusEnd, v0:sk.speed, v1:sk.speedEnd, m1:sk.multEnd, b0:sk.blast, b1:sk.blastEnd } });
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='spiritburst'){   // Ruh Patlaması: ilk değdiği rakip birimde (kule değil) ya da menzil sonunda patlayan küre (updateProjectiles)
    const cx=Math.cos(ang), cy=Math.sin(ang), ms=h.def.skills.s, emp=!!c.emp;
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:0, knock:0, passive:false, freeze:0, dtype:'magic', skill:true, noStruct:true,
      spirit:{ dmg:sk.dmg[i]+(sk.ap||0)*apOf(h), radius:emp ? ms.burstRadius : sk.blast, slow:sk.slow, slowDur:sk.slowDur,
        field:emp ? { t:ms.field, slow:ms.fieldSlow, again:ms.again } : null } });
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='beam'){   // Uzun Işın: imleç yönünde range x (2 x radius) şerit, anında; rakip birimlere (kule hariç) büyü hasarı
    const ux=Math.cos(ang), uy=Math.sin(ang), dm=sk.dmg[i]+(sk.ap||0)*apOf(h);
    for(const u of foes(h.team,false)){
      const rx=u.x-h.x, ry=u.y-h.y, along=rx*ux+ry*uy, side=Math.abs(-rx*uy+ry*ux);
      if(along<-u.r || along>sk.range+u.r || side>sk.radius+u.r) continue;
      damage(u, dm, h, { type:'magic', skill:true });
      fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
    }
    fx({ type:'strip', x1:h.x, y1:h.y, x2:h.x+ux*sk.range, y2:h.y+uy*sk.range, w:sk.radius*2, fill:'#a07bff', line:'#efe6ff', life:0.35 });
  } else if(sk.type==='stunorb'){   // Ağır Küre: ilk değdiği rakip birimde durur (kule değil); sersemletme gidilen mesafeyle artar (updateProjectiles)
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:sk.dmg[i]+(sk.ap||0)*apOf(h), knock:0, passive:false, freeze:0, dtype:'magic', skill:true,
      noStruct:true, orb:true, stun:{ min:sk.stunMin, max:sk.stunMax, range:sk.range } });
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='tether'){   // Zincir: minyon durdurur (hasarsız), kule geçilir; ilk kahramana değince hasar ve bağ (updateProjectiles)
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:(sk.dmg[i]+(sk.ap||0)*apOf(h))*(c.mult||1), knock:0, passive:false, freeze:0, dtype:'magic', skill:true,
      noStruct:true, tether:{ bind:sk.bind, root:sk.root, range:sk.range } });
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='hook'){   // Kanca: ince mermi; updateProjectiles ilk değdiği birimi yakalar ve çeker
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.projs.push({ x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0,
      max:sk.range, r:sk.radius, team:h.team, owner:h, dmg:sk.dmg[i]+(sk.ap||0)*apOf(h), knock:0, passive:false, freeze:0, dtype:'magic', skill:true,
      hook:{ freeze:sk.freeze, pull:sk.pull, gap:sk.gap } });
    fx({ type:'muzzle', x:h.x+cx*(h.r+6), y:h.y+cy*(h.r+6), life:0.2 });
  } else if(sk.type==='slam'){   // Ezici Darbe: önde koni, fiziksel hasar + yavaşlatma; minyonlara da değer, kuleye değmez
    const reach=h.r+sk.range, half=sk.angle*Math.PI/360, dm=sk.dmg[i]+(sk.ad||0)*bonusAd(h)+(sk.hpPct||0)*bonusHp(h);
    fx({ type:'cone', owner:h, ang, reach, half, life:0.25 });
    for(const u of foes(h.team,false)){
      if(!inCone(h, ang, reach, half, u)) continue;
      damage(u, dm, h, { type:'phys', skill:true });
      if(!u.dead && u.st) applySlow(u, sk.slow[i], sk.slowDur);
      fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
    }
  } else if(sk.type==='breath'){   // Alev Üfleme: önde koni, büyü hasarı; minyonlara da değer, kuleye değmez
    const reach=h.r+sk.range, half=sk.angle*Math.PI/360, dm=sk.dmg[i]+(sk.ap||0)*apOf(h);
    fx({ type:'cone', owner:h, ang, reach, half, life:0.3, color:'255,130,40' });
    for(const u of foes(h.team,false)){
      if(!inCone(h, ang, reach, half, u)) continue;
      damage(u, dm, h, { type:'magic', skill:true });
      fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
    }
  } else if(sk.type==='boomerang'){   // Bumerang: gider, döner, sahibini takip ederek geri gelir (updateBooms)
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.booms.push({ x:h.x+cx*(h.r+4), y:h.y+cy*(h.r+4), vx:cx*sk.speed, vy:cy*sk.speed, ang, dist:0, max:sk.range, r:sk.radius, speed:sk.speed,
      team:h.team, owner:h, dmg:sk.dmg[i]+(sk.ad||0)*stat(h,'dmg'), mult:1, decay:sk.decay, minMult:sk.minMult,
      back:false, hitOut:new Set(), hitBack:new Set(), spin:0 });
    fx({ type:'muzzle', x:h.x+cx*(h.r+4), y:h.y+cy*(h.r+4), life:0.2 });
  }
}

/* Kilitli Yaylım: kanallama sırasında kilitli hedefe güdümlü bir mermi */
function fireLockShot(h, c, sk){
  const T=c.target, ang=Math.atan2(T.y-h.y, T.x-h.x), sx=h.x+Math.cos(ang)*(h.r+4), sy=h.y+Math.sin(ang)*(h.r+4);
  S.bolts.push({ x:sx, y:sy, target:T, dmg:sk.dmg[c.i]+(sk.ad||0)*bonusAd(h), team:h.team, src:h, speed:sk.speed, stacks:0,
    lock:true, radius:sk.radius, missing:sk.missing, skill:true, ang });
  fx({ type:'muzzle', x:sx, y:sy, life:0.15 });
}

export function releaseAttack(h){
  const at=atkDef(h), ang=h.atk.aim, cx=Math.cos(ang), cy=Math.sin(ang), B=h.bonus||{};
  const cs=B.critStack ? (h.ic.critStk||0) : 0, cch=B.critStack ? Math.min(1,(B.crit||0)+cs) : B.crit;   // Talih Kılıcı: kritik vurulmadıkça biriken ilave şans
  const crit = cch>0 && rand()<cch;
  if(B.critStack) h.ic.critStk = crit ? 0 : Math.min(B.critStack.max, cs+B.critStack.step);
  const dmg=atkDmg(h)*(crit ? (B.critMult||CRIT_MULT) : 1);
  if(at.type==='projectile'){
    // güdümlü: hedefe gider, yoldakiler engelleyemez, ıskalamaz
    const sx=h.x+cx*(h.r+4), sy=h.y+cy*(h.r+4), u=h.atk.target, tw=h.def.skills.p.twinPct, bp=h.def.skills.p.bouncePct;
    if(u && !u.dead && bp){   // Sekme: güdümlü mermi; hedefe değince zincirle seker (sayı Avcı Coşkusu'nda 3), her sekme ilk vuruşun bp'si
      const p=h.def.skills.p, chain={ hit:new Set(), left:h.st.frenzy ? h.def.skills.s.bounceCount : p.bounceCount, dmg:dmg*bp, crit, range:p.bounceRange };
      S.bolts.push({ x:sx, y:sy, target:u, dmg, team:h.team, src:h, speed:at.projSpeed, stacks:0, basic:true, crit, knock:at.knock, ang, chain });
    } else if(u && !u.dead){
      if(tw){   // İkiz Ok: arka arkaya oklar, her biri %40 hasar, vuruş etkileri her okta; kritik vuruş başına bir kez belirlendi
        const n = (h.ic.tripleUntil && h.ic.tripleUntil>=S.time) ? 3 : 2; h.ic.tripleUntil=0;
        for(let j=0;j<n;j++) S.bolts.push({ x:sx, y:sy, target:u, dmg:dmg*tw, team:h.team, src:h, speed:at.projSpeed, stacks:0, basic:true, crit, knock:at.knock, ang, delay:j*h.def.skills.p.gap, idx:j });
      } else S.bolts.push({ x:sx, y:sy, target:u, dmg, team:h.team, src:h, speed:at.projSpeed, stacks:0, basic:true, crit, knock:at.knock, ang });
    }
    fx({ type:'muzzle', x:sx, y:sy, ang, crit, life:0.14 });
  } else {
    // yakın dövüş düz vuruşu LoL gibi: alan yok, yalnızca hedeflenen birime vurur (menzil kontrolü inAttackRange)
    // (koni açısı eşyaları, ör. Uzun Nişan angleMult, düz vuruş için artık etkisiz; yalnız yetenek konileri koni kullanır)
    const hits=[], e=h.atk.target;
    if(e && !e.dead && !(e.kind==='struct' && e.prot) && inAttackRange(h, e)){
      if(at.knock>0){ const dx=e.x-h.x, dy=e.y-h.y, d=Math.hypot(dx,dy)||1; applyKnock(e,dx/d,dy/d,at.knock); }
      fx({ type:'slash', owner:h, tgt:e, ang, crit, life:0.2 });
      damage(e, dmg, h, { basic:true, crit });
      onBasicHit(h, e);
      if(h.st.shell && !e.dead && e.kind!=='struct'){ damage(e, h.st.shell.dmg, h, { type:'phys', noProc:true, noSplash:true }); if(!e.dead && e.st) applySlow(e, h.st.shell.slow, h.st.shell.slowDur); }   // Gülle Kabuk
      if(h.ic.mom>0){ momHit(h, e); h.ic.mom=0; }   // Gülle Momentum: isabet harcar
      if(h.def.skills.p.asMin!==undefined) gladHit(h, e);   // Gladyatör: Kızışma yığını, Ağır Darbe
      if(B.cleave){   // Kesici Vuruş: yalnız yakın dövüşte; hedefin arkasındaki koniye yayılır (eşya istisnası: normalde tek hedef)
        for(const u of foes(h.team,false)){
          if(u===e || u.dead || !inCone(e, ang, B.cleave.reach, B.cleave.half, u)) continue;
          damage(u, dmg*B.cleave.pct, h, { basic:true, crit, noProc:true, noSplash:true, noLs:true });
        }
      }
      fx({ type:'impact', tgt:e, x:e.x, y:e.y, ang, crit, life:0.2 });
      hits.push(e);
    }
    // Kıvılcım: yetenekten sonraki pencere içindeki ilk düz vuruş isabeti, hedefin konumunda büyü patlaması (kule hariç)
    const sp=h.def.skills.p;
    if(sp.sparkMin!==undefined && hits.length && (h.ic.sparkUntil||0)>=S.time){
      h.ic.sparkUntil=0;
      const c=hits.includes(h.atk.target) ? h.atk.target : hits[0], px=c.x, py=c.y, dm=sparkDmg(sp,h.level)+(sp.ap||0)*apOf(h);
      for(const u of foes(h.team,false)) if(Math.hypot(u.x-px,u.y-py)-u.r<=sp.sparkR) damage(u, dm, h, { type:'magic', noProc:true, noSplash:true });
      fx({ type:'boom', x:px, y:py, r0:14, r1:sp.sparkR, color:'#ff8a3d', life:0.4 });
    }
  }
}

/* ---- kahraman güncelleme ---- */
export function updateHero(h, cmd, dt){
  if(h.autoBuy && canShop(h)) botShop(h);   // oyuncunun otomatik alımı: h.build sırasıyla, altın yettikçe (botlarla aynı kural)
  if(h.dead){ h.respawn-=dt; if(h.respawn<=0) respawnHero(h); return; }
  const st=h.st, a=h.atk, at=atkDef(h);

  h.flash=Math.max(0,h.flash-dt);
  if(st.fring) ringTick(h, dt);   // Alev Halkası: süreli hasar ve yavaşlatma (süre aşağıda düşer)
  for(const k of ['slow','asB','shield','spd','giant','amp','titanSlow','shred','frenzy','fring','flow','shell']){ if(st[k]){ st[k].t-=dt; if(st[k].t<=0) st[k]=null; } }
  if(st.slow && st.slow.decay) st.slow.amt=st.slow.base*st.slow.t/st.slow.total;   // Şok Dalgası: yavaşlatma doğrusal azalır
  if(st.silence>0) st.silence-=dt;
  if(st.root>0) st.root-=dt;
  if(h.ic.tether) tetherTick(h, dt);   // Gölge: Zincir bağı
  if(h.ic.duel){ duelTick(h, dt); if(h.dead) return; }   // Gladyatör: Meydan Okuma
  if(st.curse){ st.curse.t-=dt; if(st.curse.t<=0){ curseEnd(h); if(h.dead) return; } }   // Kan Laneti
  // Süreli hasarlar (yanma, içten yanma, Kara Alev)
  for(const k of ['burn','ignite','bflame']){
    const b=st[k]; if(!b) continue;
    b.t-=dt; damage(h, b.dps*dt, b.src, { dot:true, noSplash:true, type:'magic' });
    if(h.dead) return;
    if(b.t<=0) st[k]=null;
  }
  if(st.freeze>0) st.freeze-=dt;
  for(const k of ['r','e','s']) h.cd[k]=Math.max(0,h.cd[k]-dt);
  if(h.offCd){ h.offCd.r=Math.max(0,h.offCd.r-dt); h.offCd.e=Math.max(0,h.offCd.e-dt); }   // İkili: diğer biçimin beklemesi arka planda akar
  { // Demir Gövde: saniyede eksik canın missPct'i; son combatT sn içinde kahramanla hasar alışverişi varsa combatMult katı
    const pp=h.def.skills.p; let ex=0;
    if(pp.missPct) ex=(h.maxHp-h.hp)*pp.missPct*((S.time-(h.combatT??-1e9))<=pp.combatT ? pp.combatMult : 1)*dt;
    if(h.jb && h.jb.regen>S.time) ex+=h.maxHp*BUFFS.regen.regenPct/5*dt;   // Yenilenme güçlendirmesi
    heal(h, stat(h,'regen')/5*dt + ex); }
  bloodTick(h, dt);   // Kan Hasadı
  focusTick(h, dt);   // Odak sayacı
  itemTick(h, dt);
  if(h.dead) return;
  // Kum Saati aktifi: 2 sn dokunulmaz ve hareketsiz
  if(cmd.item && h.bonus && h.bonus.stasis && (h.ic.stasisCd||0)<=S.time && h.st.freeze<=0){
    h.stasis=h.bonus.stasis.dur; h.ic.stasisCd=S.time+h.bonus.stasis.cd; h.cast=null; h.dash=null; h.chan=null; h.recallCh=null;
    if(h.atk.state==='windup') h.atk.state='ready';
  }
  if(h.stasis>0){ h.stasis-=dt; h.vx=0; h.vy=0; return; }

  const tr=h.baseR*(1+(st.giant?st.giant.size:0));
  h.r += (tr-h.r)*Math.min(1,12*dt);
  h.mass = stat(h,'mass')*Math.pow(h.r/h.baseR,2)*(st.shell ? st.shell.mass : 1)*(st.ball ? 10 : 1);   // Gülle: Kabuk 3 kat, top çok ağır
  h.aim = cmd.aim;

  if(st.freeze>0){ if(a.state==='windup') a.state='ready'; h.cast=null; h.dash=null; h.chan=null; }

  // Kanca ile çekiliyor: hareket, saldırı ve yetenek yok (zorla yer değiştirme)
  if(h.pulled){ pullStep(h, dt); return; }
  if(st.ball){ ballStep(h, cmd, dt); return; }   // Gülle Bilardo: durdurulamaz top

  // Atılış (savaşçı sağ tık)
  if(h.dash){
    const d=h.dash, sk=d.sk;
    if(d.duel){   // Meydan Okuma: hedefe yapışır (yön ve kalan mesafe her tik yenilenir)
      const T=d.duel, dx=T.x-h.x, dy=T.y-h.y, l=Math.hypot(dx,dy)||1;
      d.dx=dx/l; d.dy=dy/l; d.left=Math.max(0,l-h.r-T.r); d.tmax-=dt;
      if(T.dead || d.tmax<=0) d.left=0;
    }
    const len=Math.min(d.left, sk.speed*dt);
    const ox=h.x, oy=h.y;
    h.x+=d.dx*len; h.y+=d.dy*len; d.left-=len;
    fx({ type:'ghost', x:ox, y:oy, r:h.r, team:h.team, life:0.25 });
    let stop=false;
    if(inWall(h.x,h.y,h.r)){ const p=pushOutWalls(h.x,h.y,h.r); h.x=p.x; h.y=p.y; stop=true; }
    if(h.x<h.r){h.x=h.r;stop=true;} if(h.x>WORLD.w-h.r){h.x=WORLD.w-h.r;stop=true;}
    if(h.y<h.r){h.y=h.r;stop=true;} if(h.y>WORLD.h-h.r){h.y=WORLD.h-h.r;stop=true;}
    // yapılar (kendi ve rakip kule, nexus) atılışı durdurur, hasar almaz; dost birimlerden geçilir
    for(const st of S.structs){
      if(st.dead) continue;
      const dx=h.x-st.x, dy=h.y-st.y, dd=Math.hypot(dx,dy)||1, min=h.r+st.r;
      if(dd<min){ h.x=st.x+dx/dd*min; h.y=st.y+dy/dd*min; stop=true; }
    }
    if(!d.noHit && !stop) for(const e of foes(h.team, false)){
      if(dist(e,h) <= h.r+e.r+2){
        const dx=e.x-h.x, dy=e.y-h.y, dd=Math.hypot(dx,dy)||1;
        applyKnock(e, dx/dd, dy/dd, sk.knock);
        damage(e, atkDmg(h)*sk.ratio[d.rk-1], h, { skill:true });
        if(!e.dead && e.st) applySlow(e, sk.slow, sk.slowDur);
        fx({ type:'hit', x:e.x-dx/dd*e.r, y:e.y-dy/dd*e.r, life:0.2 });
        stop=true; break;
      }
    }
    if(stop || d.left<=0.01){ h.dash=null; h.vx=d.dx*40; h.vy=d.dy*40; if(d.leap) leapStrip(h, d); if(d.slam) leapSlam(h, d); if(d.roll) rollLand(h, d); if(d.duel) duelHit(h, d); }
    const kd=Math.exp(-6*dt); h.kx*=kd; h.ky*=kd;
    return;
  }

  // Yetenek hazırlığı (okçu sağ tık ve boşluk)
  if(h.cast){
    if(settings.aimMode==='track') h.cast.aim=cmd.aim;
    h.cast.t-=dt;
    if(h.cast.t<=0){ const c=h.cast; h.cast=null; fireCast(h,c); }
  }

  // Kilitli Yaylım kanallaması: hareket komutu, sersemleme, hedefin ölmesi ya da leash'ten uzaklaşması bitirir
  // (düz vuruş ve başka yetenek kullanmak da bitirir: tryCast ve düz vuruş başlangıcı)
  if(h.chan && h.chan.art){   // Kök Sal: hareket komutu, sersemleme, susturma ya da süre dolması bitirir (atışlar tryCast'te)
    const c=h.chan;
    if(st.freeze>0 || st.silence>0 || cmd.mx || cmd.my || cmd.recall) h.chan=null;
    else { c.t+=dt; if(c.t>=h.def.skills[c.k].dur) h.chan=null; }
  } else if(h.chan){
    const c=h.chan, sk=h.def.skills[c.k], T=c.target;
    if(st.freeze>0 || cmd.mx || cmd.my || cmd.recall || T.dead || dist(h,T)>sk.leash) h.chan=null;
    else {
      c.t+=dt;
      while(c.shots<sk.count && c.t>=(c.shots+1)*sk.gap-1e-6){ fireLockShot(h,c,sk); c.shots++; }
      if(c.shots>=sk.count) h.chan=null;
    }
  }

  // Üsse dönüş: başlat, kanallanırken hareket/saldırı/yetenek keser, bitince doğuş noktasına ışınla
  if(cmd.recall && !h.recallCh && canAct(h)){
    const t=RECALL.time;   // sabit 8 sn (her yerden)
    h.recallCh={ t, total:t };
  }
  if(h.recallCh){
    if(cmd.mx || cmd.my || cmd.attack || cmd.e || cmd.rmb || cmd.space || st.freeze>0) h.recallCh=null;
    else {
      h.recallCh.t-=dt;
      if(h.recallCh.t<=0){
        h.recallCh=null;
        fx({ type:'ghost', x:h.x, y:h.y, r:h.r, team:h.team, life:0.5 });
        Object.assign(h,{ x:h.spawnX, y:h.spawnY, vx:0, vy:0, kx:0, ky:0 });
        fx({ type:'ring', owner:h, r0:h.r, r1:h.r+40, color:'#9fd6ff', lw:4, life:0.5 });
      }
      return;
    }
  }

  // Yetenek komutları
  if(cmd.e)     tryCast(h,'e',cmd.aim,cmd);
  if(cmd.rmb)   tryCast(h,'r',cmd.aim,cmd);
  if(cmd.space) tryCast(h,'s',cmd.aim,cmd);

  // Düz vuruş: hazır, hazırlık, vuruş, bekleme
  const tm=timings(h);
  if(a.state==='windup'){
    const u=a.target;
    if(u && (u.dead || !canSee(h.team,u) || (u.kind==='struct' && u.prot))){ a.state='ready'; a.target=null; }   // hedef öldü ya da görünmez oldu: iptal
    else if(u) a.aim=Math.atan2(u.y-h.y, u.x-h.x);
    else if(settings.aimMode==='track') a.aim=cmd.aim;
  }
  if(a.state==='windup'){
    a.t-=dt;
    if(a.t<=0){ releaseAttack(h); a.state='recovery'; a.t+=tm.rec; a.total=tm.rec; }
  } else if(a.state==='recovery'){
    a.t-=dt; if(a.t<=0) a.state='ready';
  }
  if(a.state==='ready' && cmd.attack && canAct(h) && !(h.chan && h.chan.art)){   // Kök Sal kanallanırken düz vuruş yok
    const u=cmd.target;   // hedefli: menzildeki görünen bir rakip gerekir
    if(u && !u.dead && u.team!==h.team && canSee(h.team,u) && inAttackRange(h,u) && !(u.kind==='struct' && u.prot)){
      h.chan=null;   // düz vuruş kanallamayı bitirir
      a.state='windup'; a.t=tm.wind; a.total=tm.wind; a.target=u; a.aim=Math.atan2(u.y-h.y, u.x-h.x);
    }
  }

  // Hareket
  let mx=cmd.mx, my=cmd.my; const l=Math.hypot(mx,my); if(l>0){mx/=l;my/=l;}
  const slowF=(a.state==='windup'?1-at.slow:1)*(h.cast?1-h.cast.slow:1);
  const ms = (st.freeze>0 || st.root>0 || h.chan) ? 0 : stat(h,'spd')*slowF*moveMult(h), k=Math.min(1,10*dt);
  h.vx+=(mx*ms-h.vx)*k; h.vy+=(my*ms-h.vy)*k;
  const kd=Math.exp(-6*dt); h.kx*=kd; h.ky*=kd;
  h.x+=(h.vx+h.kx)*dt; h.y+=(h.vy+h.ky)*dt;
  clampToWorld(h);
  if(h.def.skills.p.gain!==undefined) momTick(h, mx, my, l>0 && ms>0, dt);   // Gülle: Momentum
}

/* Biçim değiştir (İkili): h.def, stat farkları ve r/e beklemeleri takas edilir (diğer biçimin beklemesi arka planda aktı, burada geri gelir) */
export function switchForm(h){
  const F=FORMS[h.type]; if(!F) return;
  const to = h.form==='ranged' ? 'melee' : 'ranged';
  for(const k of ['r','e']){
    const c=h.cd[k], m=h.cdMax[k];
    h.cd[k]=h.offCd[k]; h.cdMax[k]=h.offMax[k]; h.offCd[k]=c; h.offMax[k]=m;
  }
  h.form=to; h.def=F[to]; h.formStats = to==='melee' ? F.meleeStats : null;
  h._adT=-1;   // düz vuruş tanımı önbelleği geçersiz
  fx({ type:'ring', owner:h, r0:h.r, r1:h.r+38, color:to==='melee'?'#ff9a4d':'#6fe6ff', lw:5, life:0.4 });
}
/* Sıçrayış Darbesi inişi: iniş noktasında radius yarıçapta rakip birimlere (kule hariç) fiziksel hasar + yavaşlatma */
function leapSlam(h, d){
  const sk=d.sk, dm=sk.dmg[d.rk-1]+(sk.ad||0)*bonusAd(h);
  for(const u of foes(h.team,false)){
    if(Math.hypot(u.x-h.x,u.y-h.y)>sk.radius+u.r) continue;
    damage(u, dm, h, { type:'phys', skill:true });
    if(!u.dead && u.st && !(u.stasis>0)) applySlow(u, sk.slow, sk.slowDur);
    fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
  }
  fx({ type:'boom', x:h.x, y:h.y, r0:20, r1:sk.radius, color:'#ff9a4d', life:0.4 });
}
/* Darbe itmesi: u, (dx,dy) yönünde sk.push birimi sk.pushT sn'de kayar (zorla yer değiştirme: o sürede hareket, saldırı ve yetenek yok) */
function shoveStart(u, src, dx, dy, sk){
  if(unpushable(u)) return;   // Gülle Kabuk / Bilardo: itilemez
  ccHit(u);
  if(u.kind==='hero') u.recallCh=null;
  u.cast=null; u.dash=null; u.chan=null;
  if(u.atk.state==='windup') u.atk.state='ready';
  u.pulled={ shove:true, src, dx, dy, left:sk.push, speed:sk.push/sk.pushT, t:sk.pushT, total:sk.pushT, stun:sk.stun };
}
function shoveStep(u, dt){
  const pl=u.pulled, len=Math.min(pl.left, pl.speed*dt);
  const nx=u.x+pl.dx*len, ny=u.y+pl.dy*len;
  u.vx=0; u.vy=0; u.kx=0; u.ky=0;
  if(inWall(nx,ny,u.r)){   // duvara (ya da harita sınırına) çarptı: itme biter, sersemler
    u.pulled=null;
    if(!(u.stasis>0) && pl.stun>0) freezeHero(u, pl.stun);
    fx({ type:'boom', x:u.x+pl.dx*u.r, y:u.y+pl.dy*u.r, r0:8, r1:u.r+22, color:'#ffe9b0', life:0.3 });
    return;
  }
  u.x=nx; u.y=ny; pl.left-=len; pl.t-=dt;
  if(pl.left<=1e-6 || pl.t<=0) u.pulled=null;
}
/* Enerji Küresi patlaması: (x,y) merkezinde, gidilen mesafeyle büyüyen yarıçapta rakip birimlere (kule hariç) çarpanlı fiziksel hasar */
function growBlast(p, x, y){
  const g=p.grow, f=Math.min(1,p.dist/p.max), rad=g.b0+(g.b1-g.b0)*f, dm=g.dmg*(1+(g.m1-1)*f);
  for(const u of foes(p.team,false)){
    if(Math.hypot(u.x-x,u.y-y)>rad+u.r) continue;
    damage(u, dm, p.owner, { type:'phys', skill:true });
    fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
  }
  fx({ type:'boom', x, y, r0:p.r, r1:rad, color:'#6fe6ff', life:0.4 });
}
/* Alevli Sıçrayış şeridi: başladığı yerden sıçrama yönünde, gerçek gidilen mesafenin mult katı uzunlukta (duvarda erken durursa kısalır);
   şeritteki rakiplere (kule hariç) bir kez büyü hasarı ve yavaşlatma */
function leapStrip(h, d){
  const sk=d.sk, i=d.rk-1, trav=Math.hypot(h.x-d.ox, h.y-d.oy), len=trav*sk.mult, hw=sk.width/2;
  if(trav<1) return;
  const dm=sk.dmg[i]+(sk.ap||0)*apOf(h);
  for(const u of foes(h.team,false)){
    const rx=u.x-d.ox, ry=u.y-d.oy, along=rx*d.dx+ry*d.dy, side=Math.abs(-rx*d.dy+ry*d.dx);
    if(along<-u.r || along>len+u.r || side>hw+u.r) continue;
    damage(u, dm, h, { type:'magic', skill:true });
    if(!u.dead && u.st && !(u.stasis>0)) applySlow(u, sk.slow, sk.slowDur);
    fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
  }
  fx({ type:'strip', x1:d.ox, y1:d.oy, x2:d.ox+d.dx*len, y2:d.oy+d.dy*len, w:sk.width, life:0.7 });
}
/* Zincir bağı: hedef ölürse ya da aradaki mesafe range'i geçerse kopar; süre dolunca (bağ sağlamsa) aynı hasar bir kez daha ve kök */
function tetherTick(h, dt){
  const T=h.ic.tether, u=T.target;
  if(u.dead || dist(h,u)>T.range){
    h.ic.tether=null;
    if(!u.dead) fx({ type:'ring', owner:h, r0:h.r, r1:h.r+20, color:'#aaa', lw:3, life:0.25 });
    return;
  }
  T.t-=dt;
  if(T.t>1e-9) return;
  h.ic.tether=null;
  damage(u, T.dmg, h, { type:'magic', skill:true });
  if(!u.dead && !(u.stasis>0)){
    u.st.root=Math.max(u.st.root||0, T.root); ccHit(u);
    fx({ type:'ring', owner:u, r0:u.r, r1:u.r+30, color:'#9a7bff', lw:5, life:0.4 });
  }
}
/* Alev Halkası: her tikte halka içindeki rakiplere dt'ye bölünmüş büyü hasarı, kısa yenilenen yavaşlatma */
function ringTick(h, dt){
  const R=h.st.fring;
  for(const u of foes(h.team,false)){
    if(u.stasis>0 || dist(u,h)-u.r>R.radius) continue;
    damage(u, R.dps*dt, h, { dot:true, noSplash:true, type:'magic' });
    if(!u.dead && u.st) applySlow(u, R.slow, 0.3);
  }
}

/* Kanca çekmesi: birim, çeken kişinin önüne (iki yarıçap + gap) pl.t sn'de sabit hızla gelir; çeken hareket ederse hedef noktası ona göre güncellenir.
   Bitince duvarın içindeyse dışarı itilir. */
function pullStep(u, dt){
  if(u.pulled.shove){ shoveStep(u, dt); return; }   // Darbe itmesi
  const pl=u.pulled, o=pl.src;
  if(!o.dead){ pl.ox=o.x; pl.oy=o.y; pl.or=o.r; }
  const dx=u.x-pl.ox, dy=u.y-pl.oy, d=Math.hypot(dx,dy)||1, want=pl.or+u.r+pl.gap;
  const tx=d>want ? pl.ox+dx/d*want : u.x, ty=d>want ? pl.oy+dy/d*want : u.y;
  const f = dt>=pl.t ? 1 : dt/pl.t;
  u.x+=(tx-u.x)*f; u.y+=(ty-u.y)*f; pl.t-=dt;
  u.vx=0; u.vy=0; u.kx=0; u.ky=0;
  if(pl.t<=0){
    u.pulled=null;
    if(inWall(u.x,u.y,u.r)){ const p=pushOutWalls(u.x,u.y,u.r); u.x=p.x; u.y=p.y; }
  }
}
/* Kanca hedefe değdi: kahramansa sersemler, her iki durumda çekilme başlar */
function hookPull(p, hit){
  const hk=p.hook, o=p.owner;
  if(unpushable(hit)) return;   // Gülle Kabuk / Bilardo: çekilemez
  if(hit.kind==='hero'){
    if(hit.stasis>0) return;
    freezeHero(hit, hk.freeze); hit.recallCh=null;
  } else { hit.cast=null; if(hit.atk.state==='windup') hit.atk.state='ready'; }
  hit.dash=null;
  hit.pulled={ src:o, t:hk.pull, total:hk.pull, gap:hk.gap, ox:o.x, oy:o.y, or:o.r };
}

/* ---- Gladyatör ---- */
/* Kızışma: yığın başına saldırı hızı (seviyeyle asMin -> asMax) */
export function frzAmt(h){ const p=h.def.skills.p; return p.asMin+(p.asMax-p.asMin)*((h.level||1)-1)/(MAX_LEVEL-1); }
/* Gladyatör'ün içinde durduğu kendi arenası (yoksa null) */
export function arenaOf(h){
  for(const z of S.zones) if(z.kind==='arena' && z.owner===h && !z.dead && Math.hypot(h.x-z.x,h.y-z.y)<=z.r) return z;
  return null;
}
function arenaAs(h){ const A=arenaOf(h); return A ? A.as : 0; }
/* Düz vuruş isabeti: Kızışma yığını (süre yenilenir), bekleyen Ağır Darbe varsa ek hasar + azalan yavaşlatma + iyileşme */
function gladHit(h, e){
  const p=h.def.skills.p, ic=h.ic;
  ic.frzN = ic.frzUntil>S.time ? Math.min(p.stacks, (ic.frzN||0)+1) : 1; ic.frzUntil=S.time+p.dur;
  const H=ic.heavy;
  if(H && H.until>=S.time && !e.dead){
    ic.heavy=null;
    const dealt=damage(e, H.dmg, h, { type:'phys', skill:true, noSplash:true })||0;
    if(!e.dead && e.st && e.kind!=='struct') applySlow(e, H.slow, H.slowDur, true);
    heal(h, H.heal+H.healPct*dealt);
    fx({ type:'boom', x:e.x, y:e.y, r0:e.r*0.6, r1:e.r+30, color:'#ff9a5a', life:0.3 });
  }
}
/* Meydan Okuma isabeti: hedef menzilde ise dur sn çalma + süreli büyü hasarı başlar */
function duelHit(h, d){
  const T=d.duel, sk=d.sk, i=d.rk-1;
  if(T.dead || dist(h,T)>h.r+T.r+30 || T.stasis>0) return;
  if(h.ic.duel) duelEnd(h);
  const ar=stat(T,'armor')*sk.steal[i], mr=stat(T,'mr')*sk.steal[i], until=S.time+sk.dur;
  h.ic.duel={ tgt:T, t:sk.dur, dps:T.maxHp*sk.hpPct[i]/sk.dur, healPct:sk.healPct };
  h.ic.duelGain={ armor:ar, mr, until };
  T.ic.duelLoss={ armor:ar, mr, until, src:h };
  ccHit(T);
  fx({ type:'ring', owner:T, r0:T.r, r1:T.r+40, color:'#ff7a4a', lw:5, life:0.45 });
}
/* Meydan Okuma süresi: hedefe saniye saniye büyü hasarı, hasarın healPct'i kadar iyileşme; süre ya da hedef bitince sona erer */
function duelTick(h, dt){
  const D=h.ic.duel, T=D.tgt;
  if(T.dead){ duelEnd(h); return; }
  const x=Math.min(dt, D.t);
  const dealt=damage(T, D.dps*x, h, { type:'magic', dot:true, noSplash:true })||0;
  heal(h, dealt*D.healPct);
  D.t-=dt;
  if(D.t<=0) duelEnd(h);
}
function duelEnd(h){
  const D=h.ic.duel; h.ic.duel=null; h.ic.duelGain=null;
  if(D && D.tgt.ic.duelLoss && D.tgt.ic.duelLoss.src===h) D.tgt.ic.duelLoss=null;
}

/* ---- Gülle ---- */
/* Kabuk ya da Bilardo: itilemez, çekilemez (yalnız Gülle'de dolu) */
export function unpushable(u){ return !!(u.st && (u.st.shell || u.st.ball)); }
/* Momentum: aynı yönde yürüdükçe artar; yön sapması derece başına düşürür, ani dönüş sıfırlar; yürümüyorsa söner */
function momTick(h, mx, my, moving, dt){
  const p=h.def.skills.p, ic=h.ic; let m=ic.mom||0;
  if(!moving) m-=p.decay*dt;
  else {
    if(ic.mhx!==undefined && m>0){
      const c=Math.max(-1, Math.min(1, mx*ic.mhx+my*ic.mhy)), deg=Math.acos(c)*180/Math.PI;
      if(deg>=p.breakDeg) m=0; else m-=deg*p.turnLoss;
    }
    m+=p.gain*dt; ic.mhx=mx; ic.mhy=my;
  }
  ic.mom=Math.max(0, Math.min(100, m));
}
export function momDmg(h){ const p=h.def.skills.p; return p.dmgMin+(p.dmgMax-p.dmgMin)*((h.level||1)-1)/(MAX_LEVEL-1)+p.ad*bonusAd(h); }
/* Momentum isabeti: ek fiziksel hasar (momentumla orantılı), eşik üstündeyse gidiş yönünde itme. Harcamayı çağıran yapar. */
function momHit(h, u){
  const p=h.def.skills.p, m=h.ic.mom||0;
  if(m<=1 || u.dead || u.kind==='struct') return;
  damage(u, momDmg(h)*m/100, h, { type:'phys', noProc:true, noSplash:true });
  if(m>=p.pushAt && !u.dead && !(u.stasis>0) && !u.pulled){
    let dx=h.ic.mhx, dy=h.ic.mhy;
    if(dx===undefined){ const ddx=u.x-h.x, ddy=u.y-h.y, l=Math.hypot(ddx,ddy)||1; dx=ddx/l; dy=ddy/l; }
    shoveStart(u, h, dx, dy, { push:p.push, pushT:p.pushT, stun:0 });
  }
  fx({ type:'ring', owner:u, r0:u.r, r1:u.r+22, color:'#ffd27a', lw:4, life:0.3 });
}
/* Yuvarlan inişi: radius yarıçapta rakiplere (kule hariç) fiziksel hasar + sersemletme, momentum isabeti (gidiş yönünde) */
function rollLand(h, d){
  const sk=d.sk, i=d.rk-1, dm=sk.dmg[i]+sk.hpPct*bonusHp(h);
  h.ic.mhx=d.dx; h.ic.mhy=d.dy;
  let any=false;
  for(const u of foes(h.team,false)){
    if(Math.hypot(u.x-h.x,u.y-h.y)>sk.radius+u.r) continue;
    damage(u, dm, h, { type:'phys', skill:true });
    if(!u.dead && u.st && !(u.stasis>0)) freezeHero(u, sk.stun[i]);
    if(h.ic.mom>0) momHit(h, u);
    any=true;
    fx({ type:'hit', x:u.x, y:u.y, big:true, life:0.2 });
  }
  if(any) h.ic.mom=0;
  fx({ type:'boom', x:h.x, y:h.y, r0:20, r1:sk.radius, color:'#ffd27a', life:0.4 });
}
/* Bilardo: sürekli ileri giden top; imlece yavaşça döner, duvar/sınır/yapıdan seker, değdiği rakibi iter ve vurur */
function ballStep(h, cmd, dt){
  const B=h.st.ball, sk=B.sk;
  const cur=Math.atan2(B.dy,B.dx), mt=sk.turn*dt, da=Math.max(-mt, Math.min(mt, angDiff(cmd.aim, cur))), a=cur+da;
  B.dx=Math.cos(a); B.dy=Math.sin(a);
  const ox=h.x, oy=h.y, len=sk.speed*dt;
  let nx=h.x+B.dx*len, ny=h.y+B.dy*len, bounced=false;
  if(nx<h.r || nx>WORLD.w-h.r){ B.dx=-B.dx; nx=Math.max(h.r, Math.min(WORLD.w-h.r, nx)); bounced=true; }
  if(ny<h.r || ny>WORLD.h-h.r){ B.dy=-B.dy; ny=Math.max(h.r, Math.min(WORLD.h-h.r, ny)); bounced=true; }
  const refl=(qx,qy)=>{ const l=Math.hypot(qx,qy); if(l<1e-9) return; qx/=l; qy/=l; const dot=B.dx*qx+B.dy*qy; if(dot<0){ B.dx-=2*dot*qx; B.dy-=2*dot*qy; bounced=true; } };
  if(inWall(nx,ny,h.r)){ const p=pushOutWalls(nx,ny,h.r); refl(p.x-nx, p.y-ny); nx=p.x; ny=p.y; }
  for(const s of S.structs){
    if(s.dead) continue;
    const dx=nx-s.x, dy=ny-s.y, dd=Math.hypot(dx,dy)||1, min=h.r+s.r;
    if(dd<min){ refl(dx,dy); nx=s.x+dx/dd*min; ny=s.y+dy/dd*min; }
  }
  if(bounced) fx({ type:'boom', x:nx, y:ny, r0:h.r*0.6, r1:h.r+26, color:'#ffe08a', life:0.25 });
  h.x=nx; h.y=ny; h.vx=B.dx*sk.speed; h.vy=B.dy*sk.speed; h.kx=0; h.ky=0;
  fx({ type:'ghost', x:ox, y:oy, r:h.r, team:h.team, life:0.2 });
  for(const u of foes(h.team,false)){
    if(u.dead || dist(u,h)>h.r+u.r+sk.hitR) continue;
    const last=B.hit.get(u.id); if(last!==undefined && S.time-last<sk.rehit) continue;
    B.hit.set(u.id, S.time);
    damage(u, B.dmg, h, { type:'phys', skill:true });
    if(!u.dead && !(u.stasis>0) && !u.pulled){
      let dx=u.x-h.x, dy=u.y-h.y; const l=Math.hypot(dx,dy)||1; dx=dx/l+B.dx*0.5; dy=dy/l+B.dy*0.5; const l2=Math.hypot(dx,dy)||1;
      shoveStart(u, h, dx/l2, dy/l2, sk);
    }
    fx({ type:'hit', x:u.x, y:u.y, big:true, life:0.2 });
  }
  B.t-=dt;
  if(B.t<=0){ h.st.ball=null; h.ic.mom=100; h.ic.mhx=B.dx; h.ic.mhy=B.dy; h.vx=B.dx*stat(h,'spd'); h.vy=B.dy*stat(h,'spd'); }
}

export function clampToWorld(h){
  if(h.x<h.r){h.x=h.r; if(h.kx<0)h.kx*=-0.5;} if(h.x>WORLD.w-h.r){h.x=WORLD.w-h.r; if(h.kx>0)h.kx*=-0.5;}
  if(h.y<h.r){h.y=h.r; if(h.ky<0)h.ky*=-0.5;} if(h.y>WORLD.h-h.r){h.y=WORLD.h-h.r; if(h.ky>0)h.ky*=-0.5;}
  // duvarlar: içine girdiyse dışarı it, duvara doğru hızı sıfırla
  if(wallsFar(h.x,h.y,h.r)) return;   // hiçbir duvara yakın değil: itme yok
  pushOutWallsInto(h.x,h.y,h.r);
  const px=PUSH.x, py=PUSH.y;
  if(px!==h.x || py!==h.y){
    const nx=px-h.x, ny=py-h.y, l=Math.hypot(nx,ny)||1, ux=nx/l, uy=ny/l;
    const vn=h.vx*ux+h.vy*uy; if(vn<0){ h.vx-=vn*ux; h.vy-=vn*uy; }
    const kn=h.kx*ux+h.ky*uy; if(kn<0){ h.kx-=kn*ux*1.5; h.ky-=kn*uy*1.5; }
    h.x=px; h.y=py;
  }
}

/* ---- minyonlar ---- */
/* Dalga Şarkısı: 600 içinde eşyayı taşıyan dost kahraman varsa minyonun saldırı süreleri kısalır (birden çok taşıyıcı birikmez) */
function minionAsF(m){
  let best=0;
  for(const h of S.heroes) if(!h.dead && h.team===m.team && h.bonus && h.bonus.minionAs>best && Math.hypot(h.x-m.x,h.y-m.y)<=600) best=h.bonus.minionAs;
  return best>0 ? 1/(1+best) : 1;
}
export function updateMinion(m, dt){
  if(m.dead) return;
  const st=m.st, d=m.def, a=m.atk;
  m.flash=Math.max(0,m.flash-dt);
  if(st.slow){ st.slow.t-=dt; if(st.slow.t<=0) st.slow=null; }
  if(st.amp){ st.amp.t-=dt; if(st.amp.t<=0) st.amp=null; }
  if(st.ignite){ st.ignite.t-=dt; damage(m, st.ignite.dps*dt, st.ignite.src, { dot:true, type:'magic' }); if(m.dead) return; if(st.ignite.t<=0) st.ignite=null; }
  if(st.freeze>0){ st.freeze-=dt; if(a.state==='windup') a.state='ready'; }
  if(m.pulled){ pullStep(m, dt); return; }   // Kanca ile çekiliyor

  // Hedef seçimi (LoL gibi): önce en yakın rakip minyon/yapı. Rakip kahraman yalnız (a) yakındaki bir dost kahramana
  // son MINION_CALL sn içinde hasar verdiyse ("çağrı": ona odaklanır) ya da (b) etrafta rakip minyon/yapı yoksa hedeflenir.
  // Kahramanın minyona vurması minyonları ona döndürmez.
  const reachD = d.kind==='cone' ? d.reach : d.range;
  let best=null, bd=1e9, champ=null, cdist=1e9;
  // foes() dizisi kurmadan aynı sırayla gez (kahramanlar, minyonlar, korumasız yapılar); gövdede ölüm olmaz
  for(let pi=0; pi<3; pi++){
    const L = pi===0 ? S.heroes : pi===1 ? S.minions : S.structs;
    for(let ui=0; ui<L.length; ui++){
      const u=L[ui];
      if(u.dead || u.team===m.team || (pi===2 && u.prot)) continue;
      const ex=u.x-m.x, ey=u.y-m.y, rs=u.r+m.r+d.aggro+1;
      if((ex<0?-ex:ex)>rs || (ey<0?-ey:ey)>rs) continue;   // ucuz kutu elemesi: kesin menzil dışı
      const dd=Math.hypot(ex, ey)-u.r-m.r;
      if(dd>d.aggro || !canSee(m.team,u)) continue;   // göremediğine (çalı, duvar arkası) saldırmaz
      if(u.kind==='hero'){ if(dd<cdist){ cdist=dd; champ=u; } }
      else if(dd<bd){ bd=dd; best=u; }
    }
  }
  let tgt=best || champ;
  // çağrı: yakındaki (MINION_CALL_R) bir dost kahramana yakın zamanda zarar veren görünür rakip kahraman
  let call=null, callD=1e9;
  for(let hi=0; hi<S.heroes.length; hi++){
    const v=S.heroes[hi];
    if(v.dead || v.team!==m.team || Math.hypot(v.x-m.x,v.y-m.y)>MINION_CALL_R) continue;
    for(let hj=0; hj<S.heroes.length; hj++){
      const h=S.heroes[hj];
      if(h.dead || h.team===m.team || (v.dmgBy[h.id] ?? -1e9) < S.time-MINION_CALL) continue;
      const dd=Math.hypot(h.x-m.x,h.y-m.y)-h.r-m.r;
      if(dd<=d.aggro+120 && dd<callD && canSee(m.team,h)){ callD=dd; call=h; }   // çağrı: saldırgan minyonun yakınındaysa (uzağa kovalamaz)
    }
  }
  if(call) tgt=call;
  // tasma: kahraman kovalarken yoldan çok uzaklaştıysa kahramanı bırak, yola dön (sürüklenip koridor dışına çekilemez)
  if(tgt && tgt.kind==='hero'){
    const off=laneProject(m.x,m.y).d;
    if(off>MINION_LEASH.lane) m.leashUntil=S.time+MINION_LEASH.ignore;
    if(m.leashUntil>S.time || (m.leashUntil>0 && off>MINION_LEASH.back && S.time-m.leashUntil<MINION_LEASH.ignore)) tgt=best;
  }

  // Saldırı döngüsü
  if(a.state==='windup'){
    a.t-=dt;
    if(a.t<=0){ minionRelease(m); a.state='recovery'; a.t+=(d.period-d.wind)*a.f; a.total=(d.period-d.wind)*a.f; }
  } else if(a.state==='recovery'){
    a.t-=dt; if(a.t<=0) a.state='ready';
  }
  if(a.state==='ready' && tgt && st.freeze<=0){
    const edge=dist(tgt,m)-tgt.r-m.r;
    if(edge<=reachD){
      a.f=minionAsF(m); a.state='windup'; a.t=d.wind*a.f; a.total=d.wind*a.f; a.main=tgt;
      a.aim=Math.atan2(tgt.y-m.y,tgt.x-m.x);
    }
  }

  // Hareket
  let mx=0, my=0;
  if(tgt){
    const dx=tgt.x-m.x, dy=tgt.y-m.y, dd=Math.hypot(dx,dy)||1, edge=dd-tgt.r-m.r;
    if(edge>reachD*0.85){ mx=dx/dd; my=dy/dd; }
  } else {
    // Koridor yolunu izle: yolda biraz ilerideki noktaya git; kendi yapısının yanından dolan
    const pr=laneProject(m.x,m.y), ld=laneDir(m.team), p=lanePoint(pr.s+ld*160);
    let side=0;
    for(const s of S.structs){
      if(s.dead || s.team!==m.team) continue;
      const sdx=p.x-s.x, sdy=p.y-s.y, sl=s.r+m.r+61;
      if((sdx<0?-sdx:sdx)>sl || (sdy<0?-sdy:sdy)>sl) continue;   // ucuz eleme
      const ds=Math.hypot(sdx,sdy);
      if(ds < s.r+m.r+60) side=((m.wi||0)%2 ? 1 : -1)*(s.r+m.r+24);   // dalgadaki sıraya göre (iki takımda aynı)
    }
    const gx=p.x - p.ty*side, gy=p.y + p.tx*side, dx=gx-m.x, dy=gy-m.y, dl=Math.hypot(dx,dy)||1;
    mx=dx/dl; my=dy/dl;
  }
  const ms = (st.freeze>0 || a.state==='windup') ? 0 : d.speed*moveMult(m), k=Math.min(1,10*dt);
  m.vx+=(mx*ms-m.vx)*k; m.vy+=(my*ms-m.vy)*k;
  const kd=Math.exp(-6*dt); m.kx*=kd; m.ky*=kd;
  m.x+=(m.vx+m.kx)*dt; m.y+=(m.vy+m.ky)*dt;
  clampToWorld(m);
}

export function minionRelease(m){
  const d=m.def, a=m.atk;
  let main=a.main;
  if(!main || main.dead || (main.kind==='struct' && main.prot)) main=null;
  const ang = main ? Math.atan2(main.y-m.y, main.x-m.x) : a.aim;
  if(d.kind==='cone'){
    // yakın dövüş minyonu da tek hedefe vurur (koni yok): ana hedef erişimde değilse boşa gider
    if(!main || dist(main,m)-main.r > m.r+d.reach) return;
    fx({ type:'slash', owner:m, tgt:main, ang, life:0.18 });
    damage(main, d.dmg*m.dmgMult, m);
    fx({ type:'impact', tgt:main, x:main.x, y:main.y, ang, life:0.18 });
  } else {
    // menzilli minyon: güdümlü normal vuruş (hedefe gider, ıskalamaz, yoldakiler engellemez)
    if(!main) return;
    const cx=Math.cos(ang), cy=Math.sin(ang);
    S.bolts.push({ x:m.x+cx*(m.r+3), y:m.y+cy*(m.r+3), target:main, dmg:d.dmg*m.dmgMult, team:m.team, src:m, speed:d.projSpeed, stacks:0, mini:true, ang });
  }
}

/* ---- orman (kamplar, canavarlar, güçlendirmeler) ----
   Kamplar data.js JUNGLE (takım 0 tarafında tanımlı, 'both' aynalanır). Canavar kind:'monster', team:2 (iki takımın da rakibi),
   S.monsters içinde. Kule ve minyonlar canavarlara vurmaz (yalnız S.heroes/S.minions/S.structs tararlar); kahraman düz vuruşu
   (attackTarget), yetenekler (foes) ve mermiler (updateProjectiles) canavarları da vurur. Canavar yalnız kendine vuran kahramana karşılık verir. */
export function campPos(c, side){ return side===1 ? { x:MAP_W-c.x, y:c.y } : { x:c.x, y:c.y }; }
export function buildCamps(on){
  S.camps=[]; S.monsters=[]; S.dots=[]; S.teamBuff=[0,0]; S.jstats={ camps:[0,0], big:[0,0], buffs:[0,0] };
  if(!on) return;
  for(const c of JUNGLE.camps){
    const sides = c.side==='both' ? [0,1] : [-1];
    for(const side of sides){
      const p=campPos(c, side===1 ? 1 : 0);
      S.camps.push({ id:c.id+(side<0?'':'_'+side), key:c.id, def:c, side, x:p.x, y:p.y, alive:false, spawnAt:c.first, mobs:[], big:c.mobs.some(t=>JUNGLE.monsters[t].big), buff:JUNGLE.monsters[c.mobs[0]].buff||null });
    }
  }
}
/* ---- Takım bilgisi (savaş sisi, 15.10.2026) ----
   S.intel[team].camps[id] = { state:'alive'|'dead'|'unknown', until }: kamp yalnız takımdan biri yerini görünce güncellenir.
   Ölü görülünce sayaç: ölümü gördüysek gerçek doğuş anı, yoksa gördüğümüz andan itibaren tam bekleme (def.respawn).
   Sayaç bitince görmeden 'canlı' denmez: 'unknown'. İlk doğuş herkesçe bilinir (dead, until=first, sonra alive).
   S.intel[team].heroes[id] = { items, value, t }: rakip kahramanın son görülen envanteri (görmediğimiz alışverişi bilmeyiz). */
export function initIntel(){
  S.intel=[0,1].map(()=>({ camps:{}, heroes:{} })); S.intelT=0;
  for(const I of S.intel){
    for(const c of S.camps) I.camps[c.id]={ state:'dead', until:c.spawnAt, first:true };   // ilk doğuş herkesçe bilinir
    for(const h of S.heroes||[]) I.heroes[h.id]={ items:(h.items||[]).slice(), value:itemsValue(h.items), t:0 };
  }
}
export const INTEL_DT = 0.1;   // takım bilgisi güncelleme aralığı (sn)
export function updateIntel(){
  if(!S.intel) return;
  if(S.time<(S.intelT||0)) return;
  S.intelT=S.time+INTEL_DT;
  for(let team=0; team<2; team++){
    const I=S.intel[team];
    for(const c of S.camps){
      let k=I.camps[c.id]; if(!k) k=I.camps[c.id]={ state:'unknown', until:0 };
      if(visiblePos(team, c.x, c.y, 40)){
        k.first=false;
        if(c.alive && c.mobs.some(m=>!m.dead)){ k.state='alive'; k.until=0; }
        else if(k.state!=='dead' || k.until<S.time){   // yeni öğrenilen ölüm: ölümü az önce gördüysek gerçek süre, yoksa tam bekleme
          k.state='dead'; k.until = (c.spawnAt-c.def.respawn>=S.time-1.5) ? c.spawnAt : S.time+c.def.respawn;
        }
      } else if(k.state==='dead' && S.time>=k.until) k.state = k.first ? 'alive' : 'unknown';
    }
    for(const h of S.heroes){
      if(h.team===team) continue;
      if(canSee(team,h)){ let k=I.heroes[h.id]; if(!k) k=I.heroes[h.id]={};
        k.items=h.items.slice(); k.value=itemsValue(h.items); k.t=S.time; }
    }
  }
}
/* Takımın bildiği kamp durumu (ai ve çizim): 'alive' | 'dead' | 'unknown' ve sayaç */
export function campIntel(team, c){
  const k=S.intel && S.intel[team] && S.intel[team].camps[c.id];
  if(!k) return { state:c.alive?'alive':'dead', until:c.spawnAt };
  return k;
}
/* Takımın gördüğü envanter: kendi takımı gerçek, rakip son görülen */
export function seenItems(team, h){
  if(h.team===team || !S.intel) return h.items;
  const k=S.intel[team].heroes[h.id]; return k ? k.items : [];
}
const MOB_OFF=[[0,0],[-46,40],[46,40],[0,-50]];
function makeMonster(type, camp, i){
  const d=JUNGLE.monsters[type], min=S.time/60, sc=JUNGLE.scale;
  const hpM=Math.min(sc.cap, 1+sc.hpPerMin*min), dmgM=Math.min(sc.cap, 1+sc.dmgPerMin*min);
  const o=camp.def.mobs.length>1 ? MOB_OFF[i%MOB_OFF.length] : [0,0], x=camp.x+o[0], y=camp.y+o[1];
  const rewM=Math.min(sc.rewardCap, 1+sc.rewardPerMin*min);   // ödül (altın, XP) doğuş dakikasına göre
  return { id:nextId++, kind:'monster', type, def:d, team:2, camp, hx:x, hy:y, x, y, dmgMult:dmgM, rewM,
    vx:0, vy:0, kx:0, ky:0, r:d.r, mass:d.mass, hp:d.hp*hpM, maxHp:d.hp*hpM,
    atk:{ state:'ready', t:0, total:0, aim:0, main:null, f:1 },
    st:{ slow:null, freeze:0, amp:null, ignite:null }, cast:null, dash:null, chan:null, pulled:null, dead:false, flash:0,
    aggro:null, aggroT:-1e9, returning:false, lastHero:null, lastHeroT:-1e9, revealT:0, _bx:NaN, _by:NaN, _bush:-1 };
}
function spawnCamp(c){
  c.alive=true; c.mobs=c.def.mobs.map((t,i)=>makeMonster(t,c,i));
  for(const m of c.mobs) S.monsters.push(m);
}
/* Kampa vuran kahraman: kamptaki boşta canavarlar ona döner */
function monsterAggro(m, h){
  m.aggroT=S.time;
  if(m.returning) return;
  if(!m.aggro || m.aggro.dead) m.aggro=h;
  for(const o of m.camp.mobs) if(!o.dead && !o.returning && (!o.aggro || o.aggro.dead)){ o.aggro=h; o.aggroT=S.time; }
}
export function updateJungle(dt){
  for(const c of S.camps){
    if(!c.alive){ if(S.time>=c.spawnAt) spawnCamp(c); continue; }
    if(c.mobs.every(m=>m.dead)){ c.alive=false; c.mobs=[]; c.spawnAt=S.time+c.def.respawn; }
  }
  updateIntel();
  for(let i=0;i<S.monsters.length;i++) updateMonster(S.monsters[i], dt);
  if(S.dots.length){
    for(const d of S.dots){
      d.t-=dt;
      if(d.tgt.dead){ d.t=0; continue; }
      damage(d.tgt, d.dps*dt, d.src, { dot:true, noSplash:true, type:'magic' });
    }
    S.dots=S.dots.filter(d=>d.t>0 && !d.tgt.dead);
  }
  if(S.monsters.length) S.monsters=S.monsters.filter(m=>!m.dead);
}
export function updateMonster(m, dt){
  if(m.dead) return;
  const st=m.st, d=m.def, a=m.atk, c=m.camp;
  m.flash=Math.max(0,m.flash-dt);
  if(st.slow){ st.slow.t-=dt; if(st.slow.t<=0) st.slow=null; }
  if(st.amp){ st.amp.t-=dt; if(st.amp.t<=0) st.amp=null; }
  if(st.ignite){ st.ignite.t-=dt; damage(m, st.ignite.dps*dt, st.ignite.src, { dot:true, type:'magic' }); if(m.dead) return; if(st.ignite.t<=0) st.ignite=null; }
  if(st.freeze>0){ st.freeze-=dt; if(a.state==='windup') a.state='ready'; }
  if(m.pulled){ pullStep(m, dt); return; }
  let t=m.aggro;
  const homeD=Math.hypot(m.x-c.x, m.y-c.y);
  if(t){
    // bırakma: hedef öldü, kamptan çok uzaklaştı ya da aggroT sn'dir vurmuyor ve erişimde değil
    const far=Math.hypot(t.x-c.x, t.y-c.y)>JUNGLE.leash+120, idle=S.time-m.aggroT>JUNGLE.aggroT && dist(t,m)-t.r-m.r>d.reach+40;
    if(t.dead || far || idle || homeD>JUNGLE.leash){ t=null; m.aggro=null; m.returning=true; }
  }
  if(m.returning){
    heal(m, m.maxHp*JUNGLE.returnHeal*dt);
    if(Math.hypot(m.x-m.hx, m.y-m.hy)<30){ m.returning=false; m.hp=m.maxHp; }
  } else if(!t && m.hp<m.maxHp) heal(m, m.maxHp*JUNGLE.returnHeal*dt);
  // saldırı döngüsü
  if(a.state==='windup'){
    a.t-=dt;
    if(a.t<=0){ monsterRelease(m); a.state='recovery'; a.t+=d.period-d.wind; a.total=d.period-d.wind; }
  } else if(a.state==='recovery'){ a.t-=dt; if(a.t<=0) a.state='ready'; }
  if(a.state==='ready' && t && st.freeze<=0 && !m.returning && dist(t,m)-t.r-m.r<=d.reach){
    a.state='windup'; a.t=d.wind; a.total=d.wind; a.main=t; a.aim=Math.atan2(t.y-m.y,t.x-m.x);
  }
  // hareket: hedefe, yoksa yuvasına
  let mx=0, my=0;
  if(t && !m.returning){
    const dx=t.x-m.x, dy=t.y-m.y, dd=Math.hypot(dx,dy)||1;
    if(dd-t.r-m.r>d.reach*0.8){ mx=dx/dd; my=dy/dd; }
  } else {
    const dx=m.hx-m.x, dy=m.hy-m.y, dd=Math.hypot(dx,dy);
    if(dd>6){ mx=dx/dd; my=dy/dd; }
  }
  const ms=(st.freeze>0 || a.state==='windup') ? 0 : d.speed*(m.returning?1.4:1)*moveMult(m), k=Math.min(1,10*dt);
  m.vx+=(mx*ms-m.vx)*k; m.vy+=(my*ms-m.vy)*k;
  const kd=Math.exp(-6*dt); m.kx*=kd; m.ky*=kd;
  m.x+=(m.vx+m.kx)*dt; m.y+=(m.vy+m.ky)*dt;
  clampToWorld(m);
}
function monsterRelease(m){
  const d=m.def, t=m.atk.main;
  if(!t || t.dead || t.team===2 || dist(t,m)-t.r-m.r>d.reach+20) return;
  const ang=Math.atan2(t.y-m.y, t.x-m.x);
  fx({ type:'slash', owner:m, tgt:t, ang, life:0.2 });
  damage(t, d.dmg*m.dmgMult, m, { type:'phys' });
  if(d.cleave) for(const h of S.heroes){   // büyük canavar: hedefin çevresindeki kahramanlara da %60
    if(h===t || h.dead || Math.hypot(h.x-t.x,h.y-t.y)-h.r>d.cleave) continue;
    damage(h, d.dmg*m.dmgMult*0.6, m, { type:'phys' });
  }
  fx({ type:'impact', tgt:t, x:t.x, y:t.y, ang, life:0.2 });
}
/* Canavar öldü: son vuran kahramana altın (yoksa son 10 sn'de vuran son kahraman), yakındaki dostlarına XP, güçlendirme */
function killMonster(e, src){
  fx({ type:'death', x:e.x, y:e.y, r:e.r, team:2, life:0.4 });
  let k = src && src.kind==='hero' ? src : null;
  if(!k && e.lastHero && S.time-e.lastHeroT<=GOLD.assistWindow) k=e.lastHero;
  bloodHarvest(e, src, null);
  if(!k) return;
  const d=e.def;
  const near=awardXP(k.team, e.x, e.y, d.xp*JUNGLE.xpMult*(e.rewM||1), XP_RADIUS, jmMult);
  k.jCamps=(k.jCamps||0)+1;
  if(e.camp.mobs.every(m=>m.dead || m===e)) for(const h of new Set([k, ...near])) h.jm=(h.jm||0)+1;   // orman hakimiyeti: kamp temizliği
  if(d.big){
    S.teamBuff[k.team]=S.time+BIG_BUFF.dur; S.jstats.big[k.team]++;
    for(const h of S.heroes) if(h.team===k.team){ const g=BIG_BUFF.gold+catchupGold(h); h.gold+=g; h.jGold=(h.jGold||0)+g; }
    fx({ type:'boom', x:e.x, y:e.y, r0:e.r, r1:e.r+200, color:BIG_BUFF.color, life:0.9 });
  } else {
    const g=Math.floor(d.gold*JUNGLE.goldMult*(e.rewM||1)*jmMult(k)); k.gold+=g; k.jGold=(k.jGold||0)+g;
    if(e.camp.mobs.every(m=>m.dead || m===e)) S.jstats.camps[k.team]++;
  }
  if(d.buff){ giveBuff(k, d.buff, BUFFS[d.buff].dur); S.jstats.buffs[k.team]++; }
}
export function giveBuff(h, key, dur){
  const jb=h.jb||(h.jb={});
  jb[key]=Math.max(jb[key]||0, S.time+dur);
  fx({ type:'ring', owner:h, r0:h.r, r1:h.r+40, color:BUFFS[key].color, lw:4, life:0.6 });
}
export function hasBuff(h, key){ return !!(h.jb && h.jb[key]>S.time); }
/* Ölen kahramanın güçlendirmeleri onu öldüren rakip kahramana geçer (kalan süreyle); ölünce kaybolur */
function passBuffs(e, killer){
  if(!e.jb) return;
  for(const key of Object.keys(e.jb)){
    const left=e.jb[key]-S.time;
    if(left>0 && killer && killer.kind==='hero' && killer.team!==e.team) giveBuff(killer, key, left);
  }
  e.jb=null;
}
/* Yakıcı: düz vuruş isabetinde yavaşlatma + süreli büyü hasarı (yenilenir) */
function burnHit(src, e){
  const B=BUFFS.burn;
  if(e.st && e.kind!=='struct') applySlow(e, B.slow, B.slowDur);
  if(e.kind==='struct') return;
  const dps=B.dpsBase+B.dpsPer*((src.level||1)-1);
  const o=S.dots.find(x=>x.tgt===e && x.src===src);
  if(o){ o.t=B.dotDur; o.dps=dps; } else S.dots.push({ tgt:e, src, dps, t:B.dotDur });
}

/* ---- kule ve yapılar ---- */
export function updateProtection(){
  for(const team of [0,1]){
    const l=S.lane[team];
    for(let i=0;i<l.length;i++) l[i].prot = i>0 && !l[i-1].dead;
  }
}

export function updateTower(s, dt){
  s.flash=Math.max(0,s.flash-dt);
  if(s.dead || s.sub==='nexus') return;
  s.cd=Math.max(0,s.cd-dt);
  if(s.aggro){
    const u=s.aggro.target;
    if(u.dead || dist(s,u)>s.range+u.r || !canSee(s.team,u)) s.aggro=null;
  }
  let tgt=null;
  if(s.aggro){ const u=s.aggro.target; if(dist(s,u)<=s.range+u.r) tgt=u; }
  if(!tgt){
    let bd=1e9;
    for(let pi=0; pi<2; pi++){   // foes(team,false) ile aynı sıra: kahramanlar, minyonlar
      const L = pi===0 ? S.heroes : S.minions;
      for(let ui=0; ui<L.length; ui++){
        const u=L[ui];
        if(u.dead || u.team===s.team) continue;
        const ex=s.x-u.x, ey=s.y-u.y, rs=s.range+u.r+1;
        if((ex<0?-ex:ex)>rs || (ey<0?-ey:ey)>rs) continue;   // ucuz kutu elemesi
        const dd=Math.hypot(ex, ey)-u.r;
        if(dd<=s.range && dd<bd && canSee(s.team,u)){ bd=dd; tgt=u; }
      }
    }
  }
  s.tgt=tgt;
  if(!tgt){ s.stacks=0; s.last=null; return; }
  if(s.cd<=0){
    if(s.last===tgt) s.stacks=Math.min(s.stacks+1,TOWER.maxStack); else { s.stacks=0; s.last=tgt; }
    let dmg;
    if(tgt.kind==='minion') dmg=towerMinionHit(tgt);
    else dmg=towerChampHit(s.stacks, S.time);
    S.bolts.push({ x:s.x, y:s.y, target:tgt, dmg, team:s.team, src:s, speed:TOWER.boltSpeed, stacks:s.stacks });
    s.cd=TOWER.interval;
  }
}

/* Gecikmeli alan hasarı (meteor) */
export function updateZones(dt){
  for(const z of S.zones){
    z.t-=dt;
    if(z.kind==='arena'){ if(z.t<=0 || z.owner.dead) z.dead=true; continue; }   // Gladyatör Arena: yalnız sahibini güçlendirir (stat/attackSpeed/moveMult)
    if(z.kind==='spirit' && z.t>0){   // güçlü Ruh Patlaması alanı: içindekiler sürekli yenilenen yavaşlatma alır
      for(const u of foes(z.team,false)) if(u.st && Math.hypot(u.x-z.x,u.y-z.y)<=z.r+u.r) applySlow(u, z.slow, 0.15);
      continue;
    }
    if(z.t<=0){
      if(z.kind==='spirit'){   // süre sonunda alan bir kez daha patlar (hasar yalnız)
        for(const u of foes(z.team,false)) if(Math.hypot(u.x-z.x,u.y-z.y)<=z.r+u.r){
          damage(u, z.dmg, z.owner, { type:'magic', skill:true });
          fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
        }
        fx({ type:'boom', x:z.x, y:z.y, r0:20, r1:z.r, color:'#5fe0c8', life:0.5 });
      } else if(z.kind==='bomb'){   // Şok Bombası: fiziksel hasar + sersemletme, minyonlara da
        for(const u of foes(z.team,false)) if(Math.hypot(u.x-z.x,u.y-z.y)<=z.r+u.r){
          damage(u, z.dmg, z.owner, { type:'phys', skill:true });
          if(!u.dead && u.st && z.stun>0) freezeHero(u, z.stun);
        }
        fx({ type:'boom', x:z.x, y:z.y, r0:20, r1:z.r, color:'#ffe27a', life:0.4 });
      } else {
        for(const u of foes(z.team,false)) if(Math.hypot(u.x-z.x,u.y-z.y)<=z.r+u.r) damage(u, z.dmg, z.owner, { type:'magic', skill:true });
        fx({ type:'boom', x:z.x, y:z.y, r0:20, r1:z.r, color:z.kind==='shell'?'#b58cff':'#ff8a3d', life:0.5 });
      }
      z.dead=true;
    }
  }
  S.zones=S.zones.filter(z=>!z.dead);
}

/* Kilitli Yaylım mermisi bu adımda hedefe varmadan başka bir rakip kahramana ya da yapıya değer mi? (minyon ve duvar engellemez) */
function lockBlocker(b, ex, ey){
  const sx=ex-b.x, sy=ey-b.y, l2=sx*sx+sy*sy;
  let best=null, bt=2;
  for(let pi=0; pi<2; pi++){
    const L = pi===0 ? S.heroes : S.structs;
    for(let ui=0; ui<L.length; ui++){
      const u=L[ui];
      if(u.dead || u.team===b.team || u===b.target) continue;
      let tt = l2>0 ? ((u.x-b.x)*sx+(u.y-b.y)*sy)/l2 : 0; tt = tt<0 ? 0 : tt>1 ? 1 : tt;
      if(Math.hypot(u.x-(b.x+sx*tt), u.y-(b.y+sy*tt)) <= u.r+b.radius && tt<bt){ bt=tt; best=u; }
    }
  }
  return best;
}
function lockImpact(b, v){
  let dm=b.dmg;
  if(v.kind==='hero') dm*=1+b.missing*(1-v.hp/v.maxHp);   // hedefin eksik canına göre en fazla +%20
  damage(v, dm, b.src, { type:'phys', skill:true });
  fx({ type:'hit', x:v.x, y:v.y, life:0.15 });
  b.dead=true;
}

/* Sekme hedefi: v'nin range'i içindeki görünen rakipler (kahraman ya da minyon; yapı değil, v hariç).
   Önce zincirde henüz değmediği rakipler, hepsine değdiyse daha önce değdiği olan; her grupta en yakın (kahraman önceliği yok). */
function bounceTarget(team, v, range, hit){
  let best=null, bk=1e9;
  for(let pi=0; pi<2; pi++){
    const L = pi===0 ? S.heroes : S.minions;
    for(let ui=0; ui<L.length; ui++){
      const u=L[ui];
      if(u.dead || u.team===team || u===v) continue;
      const d=Math.hypot(u.x-v.x, u.y-v.y);
      if(d-u.r>range || !canSee(team,u)) continue;
      const key=(hit.has(u.id)?2000:0)+d;
      if(key<bk){ bk=key; best=u; }
    }
  }
  return best;
}
/* b zincirinde v'ye değdi: sıradaki sekmeyi (varsa) v'den başlat */
function bounceOn(b, v){
  const c=b.chain; c.hit.add(v.id);
  if(c.left<=0) return;
  const nt=bounceTarget(b.team, v, c.range, c.hit); if(!nt) return;
  c.left--;
  S.bolts.push({ x:v.x, y:v.y, target:nt, dmg:c.dmg, team:b.team, src:b.src, speed:b.speed, stacks:0, basic:true, crit:c.crit, bounce:true, chain:c,
    ang:Math.atan2(nt.y-v.y, nt.x-v.x) });
}

/* Bumerang: önce ileri gider, range'de döner, sahibinin o anki konumuna yönelir; gidiş ve dönüş ayrı vurur.
   Birimlerden ve duvardan geçer, yapılara vurmaz. Her değdiği rakipten sonra hasar çarpanı decay ile çarpılır (en az minMult). */
export function updateBooms(dt){
  const L=S.booms; if(!L.length) return;
  for(const b of L){
    const o=b.owner;
    if(o.dead){ b.dead=true; continue; }
    const step=b.speed*dt;
    if(b.back){
      const dx=o.x-b.x, dy=o.y-b.y, d=Math.hypot(dx,dy)||1;
      b.vx=dx/d*b.speed; b.vy=dy/d*b.speed; b.ang=Math.atan2(dy,dx);
    }
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.spin+=dt*14;
    if(!b.back){ b.dist+=step; if(b.dist>=b.max) b.back=true; }
    const set=b.back ? b.hitBack : b.hitOut, cand=[];
    for(const u of foes(b.team,false)){
      if(set.has(u.id)) continue;
      const dd=Math.hypot(u.x-b.x,u.y-b.y);
      if(dd<=u.r+b.r) cand.push([dd,u]);
    }
    cand.sort((x,y)=>x[0]-y[0]);
    for(const [,u] of cand){
      if(u.dead) continue;
      set.add(u.id);
      damage(u, b.dmg*b.mult, o, { type:'phys', skill:true });
      fx({ type:'hit', x:u.x, y:u.y, life:0.15 });
      b.mult=Math.max(b.minMult, b.mult*b.decay);
    }
    if(b.back && Math.hypot(o.x-b.x,o.y-b.y)<=o.r+b.r) b.dead=true;   // sahibine ulaştı
  }
  S.booms=L.filter(b=>!b.dead);
}

export function updateBolts(dt){
  for(const b of S.bolts){
    const t=b.target;
    if(t.dead){ b.dead=true; continue; }
    if(b.delay>0){   // İkiz Ok: gecikmeli ok, atan kişiyle beraber bekler
      b.delay-=dt;
      if(b.src.dead){ b.dead=true; continue; }
      b.ang=Math.atan2(t.y-b.src.y, t.x-b.src.x);
      b.x=b.src.x+Math.cos(b.ang)*(b.src.r+4); b.y=b.src.y+Math.sin(b.ang)*(b.src.r+4);
      if(b.delay<=0) fx({ type:'muzzle', x:b.x, y:b.y, life:0.12 });
      continue;
    }
    const dx=t.x-b.x, dy=t.y-b.y, d=Math.hypot(dx,dy), step=b.speed*dt;
    b.ang=Math.atan2(dy,dx);
    if(b.lock){
      const mv=Math.min(step,d), hit=lockBlocker(b, b.x+dx/(d||1)*mv, b.y+dy/(d||1)*mv);
      if(hit){ lockImpact(b, hit); continue; }
      if(d<=step+t.r*0.6){ lockImpact(b, t); continue; }
    }
    if(d<=step+t.r*0.6){
      if(b.bounce){   // seken mermi: kritik uygular, vuruş etkisi ve can çalma yok
        damage(t, b.dmg, b.src, { basic:true, crit:b.crit, noLs:true });
        bounceOn(b, t);
      } else if(b.basic){
        if(b.knock>0) applyKnock(t, dx/(d||1), dy/(d||1), b.knock);
        damage(t, b.dmg, b.src, { basic:true, crit:b.crit });
        if(!b.src.dead) onBasicHit(b.src, t);
        if(!t.dead && t.st) passiveSlow(b.src, t);
        if(b.chain) bounceOn(b, t);
      } else if(b.blood){   // Kan Oku: büyü hasarı, uygulanan hasarın bir kısmı anında iyileşir
        const dealt=damage(t, b.dmg, b.src, { type:'magic', skill:true })||0;
        heal(b.src, dealt*b.blood);
      } else if(b.dmg>0) damage(t, b.dmg, b.src);
      if(b.ignite && !t.dead && t.st){
        t.st.ignite={ dps:b.ignite.dps, t:b.ignite.t, src:b.src };
        t.st.amp={ amt:b.ignite.amp, t:b.ignite.t };
        damage(t, 0.01, b.src, { type:'magic', skill:!!b.skill });   // pasif yakmayı ve kule dikkatini tetikler
      }
      if(b.basic) fx({ type:'impact', tgt:t, x:t.x, y:t.y, ang:b.ang, crit:b.crit, ranged:true, life:0.2 });
      else fx({ type:'hit', x:t.x, y:t.y, life:0.15 });
      b.dead=true;
    } else { b.x+=dx/d*step; b.y+=dy/d*step; }
  }
  S.bolts=S.bolts.filter(b=>!b.dead);
}

export function healAtFountain(dt){
  for(const h of S.heroes){
    if(h.dead) continue;
    const nx=S.lane[h.team][3];
    if(!nx.dead && dist(h,nx)<=FOUNTAIN.radius) heal(h, h.maxHp*FOUNTAIN.healPct*dt);
  }
}

export function updateWaves(dt){
  if(settings.waves){
    S.waveT-=dt;
    if(S.waveT<=0){
      S.waveT=WAVE_INTERVAL;
      for(const team of [0,1]) WAVE_ORDER.forEach((type,i)=>S.spawnQ.push({ t:i*WAVE_GAP, team, type, i }));
    }
  }
  for(const q of S.spawnQ) q.t-=dt;
  S.spawnQ=S.spawnQ.filter(q=>{
    if(q.t<=0){ S.minions.push(makeMinion(q.type,q.team,q.i)); return false; }
    return true;
  });
}

/* ---- çarpışmalar ---- */
const MOB=[], CX=[], CY=[], CR=[], SX=[], SY=[], SR=[];
export function collideUnits(){
  // kahraman + minyon (ölmemiş), yeniden kullanılan diziler
  const mob=MOB; let n=0;
  for(const u of S.heroes) if(!u.dead) mob[n++]=u;
  for(const u of S.minions) if(!u.dead) mob[n++]=u;
  for(const u of S.monsters) if(!u.dead) mob[n++]=u;
  mob.length=n;
  let ns=0;   // canlı yapılar (konum ve yarıçap değişmez)
  for(const s of S.structs) if(!s.dead){ SX[ns]=s.x; SY[ns]=s.y; SR[ns]=s.r; ns++; }
  for(let i=0;i<n;i++) CR[i]=mob[i].r;
  for(let pass=0;pass<3;pass++){
    // konumlar düz dizilerde: ikili tarama hızlı olsun, sonra nesnelere yazılır
    for(let i=0;i<n;i++){ CX[i]=mob[i].x; CY[i]=mob[i].y; }
    for(let i=0;i<n;i++){
      const a=mob[i], ar=CR[i];
      for(let j=i+1;j<n;j++){
        const dx=CX[j]-CX[i], dy=CY[j]-CY[i], min=ar+CR[j], d2=dx*dx+dy*dy;
        if(d2>=min*min||d2===0) continue;
        const b=mob[j];
        if(a.dash||b.dash||a.pulled||b.pulled) continue;
        if(a.team===b.team && ((a.kind==='hero' && b.kind==='minion' && a.bonus && a.bonus.ghost) || (b.kind==='hero' && a.kind==='minion' && b.bonus && b.bonus.ghost))) continue;
        const d=Math.sqrt(d2);
        // Kahraman minyona karşı ağır sayılır: minyonu itip içinden geçemez
        const ma=(a.kind==='minion' && b.kind==='hero') ? a.mass*6 : a.mass;
        const mb=(b.kind==='minion' && a.kind==='hero') ? b.mass*6 : b.mass;
        const nx=dx/d, ny=dy/d, ov=min-d, tm=ma+mb;
        CX[i]-=nx*ov*(mb/tm); CY[i]-=ny*ov*(mb/tm);
        CX[j]+=nx*ov*(ma/tm); CY[j]+=ny*ov*(ma/tm);
        const rv=(b.vx+b.kx-a.vx-a.kx)*nx+(b.vy+b.ky-a.vy-a.ky)*ny;
        if(rv<0){
          const j2=-(1+0.3)*rv/(1/ma+1/mb);
          a.kx-=nx*j2/ma; a.ky-=ny*j2/ma; b.kx+=nx*j2/mb; b.ky+=ny*j2/mb;
        }
      }
    }
    for(let i=0;i<n;i++){ const u=mob[i]; u.x=CX[i]; u.y=CY[i]; if(!u.pulled) clampToWorld(u); }   // duvarlar (çekilen duvarın üstünden geçer, bitince pullStep dışarı iter)
    // Tüm yapılar (kendi kulemiz dahil) katıdır
    for(let i=0;i<n;i++){
      const u=mob[i], ur=CR[i];
      for(let k=0;k<ns;k++){
        const sx=SX[k], sy=SY[k], min=ur+SR[k];
        const dx=u.x-sx, dy=u.y-sy;
        if((dx<0?-dx:dx)>=min+1 || (dy<0?-dy:dy)>=min+1) continue;   // ucuz eleme (hypot >= |dx|)
        const d=Math.hypot(dx,dy)||0.001;
        if(d<min){
          const nx=dx/d, ny=dy/d;
          u.x=sx+nx*min; u.y=sy+ny*min;
          const vn=u.vx*nx+u.vy*ny; if(vn<0){ u.vx-=vn*nx; u.vy-=vn*ny; }
        }
      }
    }
  }
}

export function updateProjectiles(dt){
  for(const p of S.projs){
    if(p.grow){ const g=p.grow, f=Math.min(1,p.dist/p.max), sp=g.v0+(g.v1-g.v0)*f; p.vx=Math.cos(p.ang)*sp; p.vy=Math.sin(p.ang)*sp; p.r=g.r0+(g.r1-g.r0)*f; }   // Enerji Küresi: büyür ve hızlanır
    const stepLen=Math.hypot(p.vx,p.vy)*dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.dist+=stepLen;
    let hit=null, hd=1e9;
    for(let pi=0; pi<4; pi++){
      const L = pi===0 ? S.heroes : pi===1 ? S.minions : pi===2 ? S.structs : S.monsters;
      for(let ui=0; ui<L.length; ui++){
        const e=L[ui];
        if(e.dead || e.team===p.team || (pi===3 && p.noMinion) || (pi===2 && (e.prot || p.hook || p.noStruct)) || (pi===1 && p.noMinion)) continue;   // noMinion: Kalın Ok minyonlardan geçer   // Kanca ve Kan Patlaması topları yapılara değmez
        const dd=Math.hypot(e.x-p.x,e.y-p.y);
        if(dd<=e.r+p.r && dd<hd){ hit=e; hd=dd; }
      }
    }
    if(hit){
      if(p.grow){ growBlast(p, p.x, p.y); p.dead=true; continue; }   // Enerji Küresi: değdiği yerde patlar
      if(p.spirit){   // Ruh Patlaması: değdiği birimin konumunda patlar
        spiritBlast(p, hit.x, hit.y);
        p.dead=true;
        continue;
      }
      if(p.tether){   // Zincir: minyon durdurur (hasar ve bağ yok); kahramana hasar + bağ (dokunulmaz hedefe bağ yok)
        if(hit.kind==='hero' && !(hit.stasis>0) && !p.owner.dead){
          damage(hit, p.dmg, p.owner, { type:'magic', skill:true });
          if(!hit.dead && !p.owner.dead) p.owner.ic.tether={ target:hit, t:p.tether.bind, total:p.tether.bind, range:p.tether.range, dmg:p.dmg, root:p.tether.root };
        }
        p.dead=true; fx({ type:'hit', x:p.x, y:p.y, life:0.15 });
        continue;
      }
      if(p.knock>0) applyKnock(hit,Math.cos(p.ang),Math.sin(p.ang),p.knock);
      let pd=p.dmg;
      if(p.group){
        // Aynı hedefe ikinci ve sonraki oklar azalan hasar verir, farklı hedefler tam alır
        if(p.group.hit.has(hit.id)){ if(p.group.once) pd=-1; else pd*=p.group.repeat; } else p.group.hit.add(hit.id);   // once: ikinci top hasar vermez, yine durur
      }
      if(pd>=0) damage(hit,pd,p.owner,{ type:p.dtype||'phys', basic:p.basic, crit:p.crit, skill:p.skill });
      if(p.basic) onBasicHit(p.owner, hit);
      if(p.hook && !hit.dead) hookPull(p, hit);
      if(!hit.dead && hit.st){
        if(p.passive) passiveSlow(p.owner,hit);
        if(p.freeze>0) freezeHero(hit,p.freeze);
        if(p.stun && !(hit.stasis>0)) freezeHero(hit, p.stun.min+(p.stun.max-p.stun.min)*Math.min(1,p.dist/p.stun.range));   // Ağır Küre: gidilen mesafeyle artan sersemletme
      }
      p.dead=true;
      fx({ type:'hit', x:p.x, y:p.y, big:p.freeze>0, life:0.15 });
    } else if(p.dist>=p.max||p.x<0||p.y<0||p.x>WORLD.w||p.y>WORLD.h){
      if(p.grow) growBlast(p, Math.max(0,Math.min(WORLD.w,p.x)), Math.max(0,Math.min(WORLD.h,p.y)));   // menzil sonunda patlar
      if(p.spirit) spiritBlast(p, Math.max(0,Math.min(WORLD.w,p.x)), Math.max(0,Math.min(WORLD.h,p.y)));   // hiçbir şeye değmezse menzil sonunda patlar
      p.dead=true; fx({ type:'fizzle', x:p.x, y:p.y, ang:p.ang, life:0.25 });
    }
  }
  S.projs=S.projs.filter(p=>!p.dead);
}

export function updateFx(dt){
  for(const f of S.fx){ f.t-=dt; if(f.type==='dmg') f.y-=45*dt; }
  S.fx=S.fx.filter(f=>f.t>0);
}


/* getCmd(hero, dt) her kahraman için komut nesnesi döndürür (oyuncu, bot veya ağ) */
/* Kan Patlaması halkası: büyür, değdiği her rakip birime (kule hariç) bir kez büyü hasarı */
function updateNovas(dt){
  for(const n of S.novas){
    n.r=Math.min(n.max, n.r+n.speed*dt);
    for(const u of foes(n.team,false)){
      if(n.hit.has(u.id) || Math.hypot(u.x-n.x,u.y-n.y)-u.r>n.r) continue;
      n.hit.add(u.id); damage(u, n.dmg, n.owner, { type:'magic', skill:true });
    }
    if(n.r>=n.max) n.dead=true;
  }
  if(S.novas.length) S.novas=S.novas.filter(n=>!n.dead);
}
export function step(dt, getCmd){
  if(S.over){ updateFx(dt); return; }
  S.time+=dt;
  updateProtection();
  updateWaves(dt);
  for(const h of S.heroes){ h.goldAcc=(h.goldAcc||0)+GOLD.passive*dt; const g=Math.floor(h.goldAcc); if(g>0){ h.gold+=g; h.goldAcc-=g; } }   // pasif altın
  // önce bütün komutlar aynı durumdan alınır, sonra uygulanır (güncelleme sırası kimseye avantaj vermesin)
  const HS=S.heroes, cmds=[];
  for(let i=0;i<HS.length;i++) cmds.push(getCmd(HS[i], dt));
  for(let i=0;i<HS.length;i++) updateHero(HS[i], cmds[i], dt);
  for(let i=0;i<S.minions.length;i++) updateMinion(S.minions[i], dt);
  for(let i=0;i<S.structs.length;i++) updateTower(S.structs[i], dt);
  updateJungle(dt);
  collideUnits();
  updateProjectiles(dt);
  updateBolts(dt);
  updateBooms(dt);
  updateZones(dt);
  updateNovas(dt);
  for(const g of S.sights) g.t-=dt;
  if(S.sights.length) S.sights=S.sights.filter(g=>g.t>0);
  healAtFountain(dt);
  S.minions=S.minions.filter(m=>!m.dead);
  updateFx(dt);
}

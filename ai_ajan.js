/* Ajan botu (deney, 16.11.2026): sıfırdan yazıldı, yalnız sim.js ve data.js okunarak.
   Oyuncuyla aynı komut kanalı: { mx, my, aim, attack, target, rmb, e, space, tx, ty, recall }.
   Bilgi dürüstlüğü: rakip birimler yalnız canSee(takım, birim) doğruysa kullanılır.
   Strateji: iki kahraman da koridorda, dalganın arkasında; son vuruş, güvenli dürtme,
   üstünlükte dövüş, kule menzilinde yalnız dost minyon varken; can azsa geri çekil ya da üsse dön. */
import { TOWER, FOUNTAIN } from './data.js';
import { S, canSee, dist, stat, atkDef, inAttackRange } from './sim.js';
import { lanePoint, laneProject, laneDir, laneLength, inWall } from './map.js';

/* ayarlar (deneyde turdan tura değişir) */
export const AJ = {
  engage: 1.5,       // dövüşe girme üstünlüğü
  stay: 1.0,         // dövüşte kalma
  flee: 0.85,
  fleeHold: 1.5,     // kaçış kararı en az bu kadar sürer
  hiddenT: 12, hiddenW: 0.5, deepS: 400,   // görünmeyen rakip: son 12 sn içinde görüldüyse, koridorun ortasına 400 kala ötesinde yarım say
  safeGap: 120,      // rakip kahramana karşı üstünlük zayıfken saldırı menzili + bu kadar uzak dur         // dövüşü bırakma üstünlüğü
  lowHp: 0.30,       // geri çekilme/üsse dönme canı
  recallGold: 1300,  // bu altına ulaşınca güvenliyse üsse dön
  towerSafeN: 2,     // rakip kule menzilinde en az bu kadar dost minyon varsa girilebilir
  backR: 150, backM: 60,   // dalga önünün ne kadar arkasında durulur (menzilli / yakın)
  skillMinions: 0,   // 1: rakip kahraman yokken hasar yeteneklerini minyonlara at
};

const MEM = new Map(); let memT = -1;
function mem(h){
  if(S.time < memT) MEM.clear(); memT = S.time;
  let m = MEM.get(h.id);
  if(!m){ m = { lastHp:h.hp, hurtT:-99, mode:'lane', modeT:0, stuckT:0, lx:h.x, ly:h.y, side:0 }; MEM.set(h.id, m); }
  return m;
}

/* yetenek türü sınıfları */
const AIMED = new Set(['volley','bigarrow','fireball','ignite','meteor','boomerang','hook','slam','breath','bloodbolt','bloodnova','bloodcurse','beam','stunorb','tether','spiritburst','groworb','bomb','lockvolley','duel','heavy','knockblow','leapslam']);
const SELF  = new Set(['haste','shield','giant','frenzy','shell','arena','firering','mimic','spiritshield','mantra']);
const MOVE  = new Set(['dash','tumble','flameleap','blink','roll']);
const NEAR_SELF = { firering:240, shockwave:420, arena:260, shell:200 };   // kendi çevresine etki: rakip bu kadar yakınsa
const SKIP  = new Set(['transform','artillery','cleanse','billiard']);

const sRange = (sk) => sk.range || sk.dist || 500;
const myTowers = (t) => S.structs.filter(s=>s.team===t && !s.dead);

function laneS(u){ return laneProject(u.x, u.y).s; }

/* dalga önü (koridor parametresi): takım t'nin en ilerideki canlı minyonu */
function waveFront(t, dir){
  let best = null;
  for(const m of S.minions){ if(m.dead || m.team!==t) continue; const s = laneS(m)*dir; if(best===null || s>best) best=s; }
  return best===null ? null : best*dir;
}

/* bir rakip kulenin güvenli olup olmadığı: menzilinde en az n dost minyon */
function towerSafe(tw, team){
  let n = 0;
  for(const m of S.minions) if(!m.dead && m.team===team && dist(m,tw)-m.r <= tw.range-10) n++;
  return n >= AJ.towerSafeN;
}

/* duvara göre basit yön düzeltme */
function steer(h, dx, dy){
  const l = Math.hypot(dx,dy); if(l<1) return [0,0];
  let ax = dx/l, ay = dy/l;
  const look = h.r + 26;
  if(!inWall(h.x+ax*look, h.y+ay*look, h.r*0.6)) return [ax, ay];
  for(const da of [0.5,-0.5,1.0,-1.0,1.5,-1.5]){
    const a = Math.atan2(ay,ax)+da, bx=Math.cos(a), by=Math.sin(a);
    if(!inWall(h.x+bx*look, h.y+by*look, h.r*0.6)) return [bx, by];
  }
  return [ax, ay];
}

/* koridor üzerinde s noktasına git (koridordan uzaksa önce koridora) */
function laneGoal(h, s, side){
  const L = laneLength(); s = Math.max(60, Math.min(L-60, s));
  const p = lanePoint(s), q = lanePoint(Math.min(L, s+10));
  const tx = q.x-p.x, ty = q.y-p.y, tl = Math.hypot(tx,ty)||1;
  return { x: p.x - ty/tl*side, y: p.y + tx/tl*side };
}

/* güç tahmini: etkin can (zırh/BD ortalaması) x (düz vuruş + hazır yetenek payı); seviye dolaylı (stat zaten seviyeye göre) */
function ehp(u){ const r=(stat(u,'armor')+stat(u,'mr'))/2; return (u.hp+((u.st&&u.st.shield)?u.st.shield.amt||0:0))*(1+Math.max(0,r)/100); }
function dps(u){
  let d = stat(u,'dmg')*Math.max(0.5, stat(u,'as')||1);
  let ready = 0; for(const k of ['r','e','s']){ const sk=u.def.skills[k]; if(sk && sk.type && u.rank[k]>0 && u.cd[k]<=1) ready += k==='s' ? 2 : 1; }
  return d + ready*(12+6*(u.level||1)) + 2*(stat(u,'ap')||0);
}
function power(list){ let hp=0, d=0; for(const u of list){ hp+=ehp(u); d+=dps(u); } return { hp, d }; }

/* rakip konum tahmini (mermi hızına göre öne nişan) */
function lead(h, u, speed){
  if(!speed) return { x:u.x, y:u.y };
  const t = Math.min(0.8, dist(h,u)/speed);
  return { x:u.x+(u.vx||0)*t, y:u.y+(u.vy||0)*t };
}

function aimAt(cmd, h, p){ cmd.aim = Math.atan2(p.y-h.y, p.x-h.x); cmd.tx = p.x; cmd.ty = p.y; }

/* yetenek kullanımı: tgt rakip kahraman (ya da null), fight: dövüş içinde mi, flee: kaçış */
function useSkills(h, cmd, tgt, fight, flee, homeP, foesNear){
  if(h.cast || h.dash || h.st.freeze>0) return;
  for(const k of ['s','r','e']){
    const sk = h.def.skills[k]; if(!sk || !sk.type || h.rank[k]<=0 || h.cd[k]>0) continue;
    const ty = sk.type; if(SKIP.has(ty)) continue;
    const key = k==='r' ? 'rmb' : k==='e' ? 'e' : 'space';
    if(flee){
      if(MOVE.has(ty) && ty!=='roll'){ aimAt(cmd, h, homeP); cmd[key]=true; return; }
      if(ty==='shield' || ty==='spiritshield' || ty==='shell'){ cmd[key]=true; return; }
      if(tgt && ty==='stunorb' && dist(h,tgt)<sRange(sk)){ aimAt(cmd,h,lead(h,tgt,sk.speed)); cmd[key]=true; return; }
      continue;
    }
    if(!tgt) continue;
    const d = dist(h,tgt);
    if(AIMED.has(ty)){
      let r = sRange(sk); if(ty==='bigarrow') r = 1100; if(ty==='heavy') r = atkDef(h).range+tgt.r+h.r;
      if(ty==='hook' && !fight) continue;
      if(d <= r*0.92 + (ty==='heavy'?0:tgt.r)){ aimAt(cmd, h, lead(h,tgt,sk.speed)); cmd[key]=true; return; }
    } else if(SELF.has(ty) || NEAR_SELF[ty]){
      const need = NEAR_SELF[ty] || (atkDef(h).range+h.r+tgt.r+120);
      if(fight && d <= need){ if(ty==='mimic' && !h.ic.last) continue; aimAt(cmd,h,tgt); cmd[key]=true; return; }
    } else if(ty==='shockwave'){
      if(fight && d <= 400){ cmd[key]=true; return; }
    } else if(MOVE.has(ty)){
      const reach = (sk.dist||sk.range||300) + atkDef(h).range;
      if(fight && d > atkDef(h).range+h.r+tgt.r+20 && d < reach){ aimAt(cmd,h,tgt); cmd[key]=true; return; }
    }
  }
}

export function botCommand(h){
  const cmd = { mx:0, my:0, aim:h.aim||0, attack:false, target:null, rmb:false, e:false, space:false };
  if(h.dead) return cmd;
  const m = mem(h), team = h.team, dir = laneDir(team);
  if(h.hp < m.lastHp - 1) m.hurtT = S.time; m.lastHp = h.hp;
  const ally = S.heroes.filter(u=>u.team===team && u!==h && !u.dead);
  const foesV = S.heroes.filter(u=>u.team!==team && !u.dead && canSee(team,u));
  const near = foesV.filter(u=>dist(u,h) < 1000);
  const enemyStructs = myTowers(1-team), myStructs = myTowers(team);
  const nex = myStructs.find(s=>s.sub==='nexus') || S.lane[team][3];
  const home = { x:h.spawnX, y:h.spawnY };
  const hpR = h.hp/h.maxHp;
  const range = atkDef(h).range, melee = range < 200;
  const mySide = (S.heroes.filter(u=>u.team===team).indexOf(h)===0 ? -1 : 1) * 40;

  // üsse dönüş sürüyorsa: tehlike yoksa bekle
  if(h.recallCh){ if(!near.length || near.every(u=>dist(u,h)>800)) return cmd; }

  // çeşmede: can dolana kadar bekle
  const atBase = dist(h, nex) < FOUNTAIN.radius+80;
  if(atBase && hpR < 0.92 && !near.length) return cmd;

  // en yakın rakip kule (önde olan)
  let eTower = null, eTowerS = null;
  for(const s of enemyStructs){ if(s.sub==='nexus') continue; const v = laneS(s)*dir; if(eTowerS===null || v<eTowerS){ eTowerS=v; eTower=s; } }
  const eNexus = enemyStructs.find(s=>s.sub==='nexus');
  const inTowerZone = (p, extra=0) => enemyStructs.some(s=>s.sub!=='nexus' && dist(p,s) < s.range + h.r + extra && !towerSafe(s, team));
  const beingShot = enemyStructs.some(s=>s.tgt===h);

  // üstünlük: 1100 içindeki dostlar ve görünen rakipler
  const mine = [h, ...ally.filter(u=>dist(u,h)<1100)];
  const theirs = foesV.filter(u=>dist(u,h)<1300);
  // görünmeyen rakipler (son görülme hafızası): kendi yarımızın ötesindeyken yarı ağırlıkla sayılır
  if(!m.seen) m.seen = {};
  for(const u of foesV) m.seen[u.id] = S.time;
  const hidden = S.heroes.filter(u=>u.team!==team && !u.dead && !canSee(team,u) && S.time-(m.seen[u.id]??-99) < AJ.hiddenT);
  const deep = (laneS(h)-laneLength()/2)*dir > -AJ.deepS;
  let adv = 99;
  if(theirs.length){
    const A = power(mine), B = power(theirs);
    if(deep && hidden.length){ const H = power(hidden); B.hp += H.hp*AJ.hiddenW; B.d += H.d*AJ.hiddenW; }
    adv = (A.hp*A.d)/Math.max(1, B.hp*B.d);
    const myT = myStructs.find(s=>s.sub!=='nexus' && dist(s,h) < s.range+200);
    if(myT) adv *= 1.5;
    if(inTowerZone(h, 150)) adv *= 0.5;
  }

  // üsse dönüş kararı
  const safe = !near.length;
  const wantRecall = (hpR < AJ.lowHp || h.gold >= AJ.recallGold) && !atBase;
  if(wantRecall && safe && !beingShot){ cmd.recall = true; return cmd; }

  // hedef rakip kahraman: en düşük canlı görünen
  let tgt = null;
  for(const u of theirs){ if(!tgt || u.hp < tgt.hp) tgt = u; }

  // mod
  let mode = 'lane';
  if(tgt){
    const inFight = m.mode==='fight' && S.time-m.modeT < 6;
    const inFlee = m.mode==='flee' && S.time-m.modeT < AJ.fleeHold;
    if(hpR < AJ.lowHp || adv < AJ.flee) mode = 'flee';
    else if(inFlee && adv < AJ.engage*1.2) mode = 'flee';
    else if((adv >= AJ.engage || (inFight && adv >= AJ.stay)) && !inTowerZone(tgt, 0)) mode = 'fight';
  }
  if(beingShot && !towerSafeAny(enemyStructs, h, team)) mode = 'flee';
  if(wantRecall && mode!=='fight') mode = 'flee';
  if(mode!==m.mode) m.modeT = S.time;
  m.mode = mode; m.adv = adv; m.nf = theirs.length; m.tgtHp = tgt ? tgt.hp/tgt.maxHp : null;

  const homeP = laneGoal(h, laneS(nex) + dir*200, 0);

  if(mode==='flee'){
    useSkills(h, cmd, tgt, false, true, homeP, near);
    const [mx,my] = steer(h, homeP.x-h.x, homeP.y-h.y); cmd.mx=mx; cmd.my=my;
    if(!cmd.tx) cmd.aim = Math.atan2(my,mx);
    // kaçarken menzildeki rakibe vurmak yavaşlatır: yalnız ölmek üzereyse
    return cmd;
  }

  if(mode==='fight'){
    useSkills(h, cmd, tgt, true, false, homeP, near);
    if(inAttackRange(h, tgt)){
      cmd.attack = true; cmd.target = tgt; if(cmd.tx===undefined) cmd.aim = Math.atan2(tgt.y-h.y, tgt.x-h.x);
    } else {
      const [mx,my] = steer(h, tgt.x-h.x, tgt.y-h.y); cmd.mx=mx; cmd.my=my;
      if(cmd.tx===undefined) cmd.aim = Math.atan2(tgt.y-h.y, tgt.x-h.x);
    }
    return cmd;
  }

  // koridor: hedef konum
  const wf = waveFront(team, dir);
  const myFront = myStructs.filter(s=>s.sub!=='nexus').reduce((b,s)=>{ const v=laneS(s)*dir; return b===null||v>b ? v : b; }, null);
  const back = melee ? AJ.backM : AJ.backR;
  let goalS;
  if(wf!==null) goalS = wf - dir*back;
  else goalS = (myFront!==null ? myFront*dir : laneS(nex)*dir) * dir + dir*120;
  // rakip kule menziline (güvensizse) girme
  if(eTower && !towerSafe(eTower, team)){
    const lim = (eTowerS - (eTower.range + h.r + 40)) ;
    if(goalS*dir > lim) goalS = lim*dir;
  }
  if(eNexus && !eTower){ /* bütün kuleler yıkıldı: nexus'a git */ }
  // rakip kahraman görünürken üstünlük zayıfsa onun menzilinin dışında kal (koridor ekseninde geri)
  if(tgt && adv < AJ.engage){
    let worst = null;
    for(const u of theirs){ const r = atkDef(u).range + u.r + h.r + AJ.safeGap; const v = laneS(u)*dir - r; if(worst===null || v<worst) worst = v; }
    if(worst!==null && goalS*dir > worst) goalS = worst*dir;
  }
  const goal = laneGoal(h, goalS, mySide);

  // vuruş hedefi
  let at = null;
  const dmg = stat(h,'dmg');
  // 1) son vuruş
  for(const u of S.minions){
    if(u.dead || u.team===team || !canSee(team,u) || !inAttackRange(h,u)) continue;
    if(inTowerZone(h, 0) && !towerSafeAny(enemyStructs,h,team)) continue;
    if(u.hp <= dmg*0.95 && (!at || u.hp < at.hp)) at = u;
  }
  // 2) rakip kahraman dürtme (kule dışında, üstünlük kötü değilse)
  if(!at && tgt && inAttackRange(h,tgt) && adv >= AJ.stay && !inTowerZone(h,0)) at = tgt;
  // 3) yapı
  if(!at) for(const s of enemyStructs){ if(!s.prot && inAttackRange(h,s) && (s.sub==='nexus' || towerSafe(s,team))) { at = s; break; } }
  // 4) minyon itme (en düşük can)
  if(!at) for(const u of S.minions){
    if(u.dead || u.team===team || !canSee(team,u) || !inAttackRange(h,u)) continue;
    if(!at || u.hp < at.hp) at = u;
  }
  if(tgt && adv >= 0.9) useSkills(h, cmd, tgt, false, false, homeP, near);
  else if(AJ.skillMinions && !tgt) minionSkills(h, cmd);

  if(at && !(at.kind==='struct' && at.prot)){
    cmd.attack = true; cmd.target = at; if(cmd.tx===undefined) cmd.aim = Math.atan2(at.y-h.y, at.x-h.x);
    // yakın dövüşçü hedefe yaklaşsın (hedef menzilde zaten); menzilli dursun
    return cmd;
  }
  // menzilde hedef yoksa: yakındaki rakip minyona yaklaş (yakın dövüşçü), değilse hedef konuma git
  let mv = goal;
  if(melee){
    let best=null, bd=1e9;
    for(const u of S.minions){ if(u.dead||u.team===team||!canSee(team,u)) continue; const d=dist(u,h); if(d<bd && d<400 && !inTowerZone(u,0)){ bd=d; best=u; } }
    if(best) mv = best;
  }
  const dx = mv.x-h.x, dy = mv.y-h.y;
  if(Math.hypot(dx,dy) > 12){ const [mx,my] = steer(h,dx,dy); cmd.mx=mx; cmd.my=my; if(cmd.tx===undefined) cmd.aim=Math.atan2(my,mx); }
  return cmd;
}

function towerSafeAny(structs, h, team){
  for(const s of structs){ if(s.sub==='nexus') continue; if(dist(h,s) < s.range+h.r+20 && !towerSafe(s,team)) return false; }
  return true;
}

function minionSkills(h, cmd){
  if(h.cast || h.dash) return;
  for(const k of ['r','e']){
    const sk = h.def.skills[k]; if(!sk || h.rank[k]<=0 || h.cd[k]>0 || !AIMED.has(sk.type)) continue;
    if(['hook','duel','lockvolley','tether','stunorb','bigarrow','heavy','knockblow','leapslam','bloodcurse'].includes(sk.type)) continue;
    let best=null, bn=0;
    for(const u of S.minions){
      if(u.dead || u.team===h.team || !canSee(h.team,u) || dist(u,h) > sRange(sk)*0.9) continue;
      let n=0; for(const v of S.minions) if(!v.dead && v.team!==h.team && dist(u,v)<160) n++;
      if(n>bn){ bn=n; best=u; }
    }
    if(best && bn>=3){ aimAt(cmd,h,best); cmd[k==='r'?'rmb':'e']=true; return; }
  }
}
export { MEM };

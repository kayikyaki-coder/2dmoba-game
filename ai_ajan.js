/* Ajan botu (deney, 16.11.2026): sıfırdan yazıldı, yalnız sim.js ve data.js okunarak.
   Oyuncuyla aynı komut kanalı: { mx, my, aim, attack, target, rmb, e, space, tx, ty, recall }.
   Bilgi dürüstlüğü: rakip birimler yalnız canSee(takım, birim) doğruysa kullanılır.
   Strateji: iki kahraman da koridorda, dalganın arkasında; son vuruş, güvenli dürtme,
   üstünlükte dövüş, kule menzilinde yalnız dost minyon varken; can azsa geri çekil ya da üsse dön. */
import { TOWER, FOUNTAIN, WORLD, STATS } from './data.js';
import { S, canSee, dist, stat, atkDef, inAttackRange, timings } from './sim.js';
import { lanePoint, laneProject, laneDir, laneLength, inWall } from './map.js';

/* ayarlar (deneyde turdan tura değişir) */
export const AJ = {
  engage: 1.5,       // dövüşe girme üstünlüğü
  stay: 1.0,         // dövüşte kalma
  defEngage: 1.05,
  siege: 1, siegeHp: 0.4, siegeAdv: 1.2,   // kuşatma: can bu oranın üstünde, yakın rakip varsa üstünlük en az bu
  push: 1, pushR: 900,   // yakında (pushR) görünen rakip kahraman yokken dalgayı beklemeden it
  groupDef: 0, groupR: 1500,   // ön kulemize groupR içinde 2+ rakip: ormancı koridora
  jgSiege: 1,
  net: null,         // nöroevrim ağı (tools/neuro.js); null = kurallar
  netDt: 0.25,       // ağ kararı aralığı (sn)
  shiftMax: 300,     // ağın koridor konumu kayması (ileri/geri)
  sink: null,        // taklit verisi toplama: (özellikler, kural niyeti) => void        // ormancı dostun kuşatmasına katılır   // rakip kulemizin menzilindeyken girme eşiği
  flee: 0.85,
  fleeHold: 1.5,     // kaçış kararı en az bu kadar sürer
  memT: 5, memSpd: 150,   // son memT sn içinde görülen rakip: son konumu (sn'de memSpd genişleyen) 1300 içindeyse tam sayılır
  hiddenW: 0.5, deepS: 400,   // yeri bilinmeyen rakip: koridorun ortasına 400 kala ötesinde yarım sayılır
  allyR: 750,
  xpR: 520,          // rakip minyona en fazla bu kadar uzak dur (XP yarıçapı 600)        // dövüş gücüne katılan dost uzaklığı
  safeGap: 120,
  kiteGap: 90,       // menzilli: yakın dövüşçünün menzili + bu kadar içindeyken geri adım      // rakip kahramana karşı üstünlük zayıfken saldırı menzili + bu kadar uzak dur         // dövüşü bırakma üstünlüğü
  lowHp: 0.30,
  holdHp: 0.45, holdAdv: 0.5,      // kendi kule menzilinde bu canın üstündeyse kaçma, dalgayı temizle
  towerDps: 170,     // kendi kulemizin rakip kahramana saniyelik hasar tahmini       // geri çekilme/üsse dönme canı
  recallGold: 1100,
  healHp: 0.45,      // görünen rakip yokken bu canın altında üsse dön
  killK: 0.8,        // öldürme hesabı güvenlik payı  // bu altına ulaşınca güvenliyse üsse dön
  towerSafeN: 2,     // rakip kule menzilinde en az bu kadar dost minyon varsa girilebilir
  backR: 150, backM: 60,   // dalga önünün ne kadar arkasında durulur (menzilli / yakın)
  skillMinions: 1,   // 1: rakip kahraman yokken hasar yeteneklerini minyonlara at
  holdK: 1.6,        // bu kadar vuruşluk canı kalan minyon yakında ölecek sayılır
  defR: 150, defBack: 60,   // ön kulenin menzili + bu kadar içinde rakip kahraman varsa ormancı savunmaya döner, kulenin bu kadar gerisinde dur
  towerBack: 100,    // kendi ön kulemizin en fazla bu kadar gerisine çekil (koridor modunda)
  jungle: 1,         // sim'in atadığı ormancı rolünü oyna (h.role==='jungle')
  jgLow: 0.35,       // ormancı bu canın altında kampa girmez
  helpR: 2600,       // ormancı dost dövüşüne bu uzaklıktan koşar
};

const MEM = new Map(); let memT = -1; let SEEN_T = [{},{}];
function seenOf(t){ return SEEN_T[t]; }
function mem(h){
  if(S.time < memT){ MEM.clear(); SEEN_T=[{},{}]; } memT = S.time;
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
  const mine = [h, ...ally.filter(u=>dist(u,h)<AJ.allyR)];
  const theirs = foesV.filter(u=>dist(u,h)<1300);
  // görünmeyen rakipler (takım ortak hafızası: son görülen konum ve an)
  const SEEN = seenOf(team);
  for(const u of foesV) SEEN[u.id] = { t:S.time, x:u.x, y:u.y };
  const deep = (laneS(h)-laneLength()/2)*dir > -AJ.deepS;
  const memNear = [], hidden = [];
  for(const u of S.heroes){
    if(u.team===team || u.dead || canSee(team,u)) continue;
    const q = SEEN[u.id];
    if(q && S.time-q.t < AJ.memT){ if(Math.hypot(q.x-h.x,q.y-h.y) < 1300+AJ.memSpd*(S.time-q.t)) memNear.push(u); }
    else if(deep) hidden.push(u);
  }
  let adv = 99;
  if(theirs.length){
    const A = power(mine), B = power(theirs);
    if(memNear.length){ const H = power(memNear); B.hp += H.hp; B.d += H.d; }
    if(hidden.length){ const H = power(hidden); B.hp += H.hp*AJ.hiddenW; B.d += H.d*AJ.hiddenW; }
    adv = (A.hp*A.d)/Math.max(1, B.hp*B.d);
    // kendi kulemiz: menzilinde rakip minyon yoksa menzildeki rakip kahramana vurur, gücüne kule hasarı eklenir
    const myT = myStructs.find(s=>s.sub!=='nexus' && dist(s,h) < s.range+200);
    if(myT){
      const busy = S.minions.some(u=>!u.dead && u.team!==team && dist(u,myT)-u.r <= myT.range);
      if(!busy && theirs.some(u=>dist(u,myT)-u.r <= myT.range+60)){ const A2 = power(mine); A2.d += AJ.towerDps; adv = (A2.hp*A2.d)/Math.max(1, (adv>0 ? (A.hp*A.d)/adv : 1)); }
      else adv *= 1.15;
    }
    if(inTowerZone(h, 150)) adv *= 0.5;
  }

  // üsse dönüş kararı
  const safe = !near.length;
  const quiet = !foesV.some(u=>dist(u,h) < 1300);
  const wantRecall = (hpR < AJ.lowHp || (hpR < AJ.healHp && quiet) || h.gold >= AJ.recallGold) && !atBase;
  // hedef rakip kahraman: en düşük canlı görünen
  let tgt = null;
  for(const u of theirs){ if(!tgt || u.hp < tgt.hp) tgt = u; }

  // ---- sinir ağı (nöroevrim): özellikler ve niyet ----
  const front0 = myStructs.filter(s=>s.sub!=='nexus' && !s.prot)[0] || myStructs.find(s=>s.sub!=='nexus');
  const sT0 = eTower || (eNexus && !eNexus.prot ? eNexus : null);
  let F = null;
  if(AJ.net || AJ.sink) F = features(h, { hpR, adv, theirs, memNear, hidden, tgt, mine, ally, eTower, sT0, front0, enemyStructs, myStructs, beingShot, inTowerZone, dir, foesV });
  let intent = null;
  if(AJ.net){
    if(S.time >= (m.netT||0)){ m.netT = S.time + AJ.netDt; const o = netForward(AJ.net, F); m.netOut = o; }
    const o = m.netOut; let bi = 0; for(let i=1;i<NI;i++) if(o[i] > o[bi]) bi = i;
    intent = INTENTS[bi]; m.shift = Math.tanh(o[NI])*AJ.shiftMax;
    if(intent==='FIGHT' && !tgt) intent = 'LANE';
    if(intent==='SIEGE' && !sT0) intent = 'LANE';
    if(intent==='RECALL'){ if(atBase) intent = 'LANE'; else if(safe && !beingShot){ m.intent = intent; cmd.recall = true; return cmd; } else intent = 'FLEE'; }
    m.intent = intent;
  } else if(wantRecall && safe && !beingShot){ label(m, F, 'RECALL'); cmd.recall = true; return cmd; }

  // mod
  let mode = 'lane';
  if(tgt){
    const inFight = m.mode==='fight' && S.time-m.modeT < 6;
    const inFlee = m.mode==='flee' && S.time-m.modeT < AJ.fleeHold;
    const underMine = myStructs.some(s=>s.sub!=='nexus' && dist(s,h) < s.range-40);
    if(hpR < AJ.lowHp || (adv < AJ.flee && !(underMine && hpR > AJ.holdHp && adv >= AJ.holdAdv))) mode = 'flee';
    else if(inFlee && adv < AJ.engage*1.2) mode = 'flee';
    else {
      // kulemizi döven rakip: daha düşük eşikle karşılık ver
      const sieging = myStructs.some(s=>s.sub!=='nexus' && dist(s,tgt) < s.range+80);
      const eng = sieging ? AJ.defEngage : AJ.engage;
      if((adv >= eng || (inFight && adv >= AJ.stay) || killable(h, mine, tgt)) && !inTowerZone(tgt, 0)) mode = 'fight';
    }
  }
  if(beingShot && !towerSafeAny(enemyStructs, h, team)) mode = 'flee';
  if(wantRecall && mode!=='fight') mode = 'flee';
  if(intent) mode = intent==='FIGHT' ? 'fight' : intent==='FLEE' ? 'flee' : 'lane';
  if(mode!==m.mode) m.modeT = S.time;
  m.mode = mode; m.adv = adv; m.nf = theirs.length; m.tgtHp = tgt ? tgt.hp/tgt.maxHp : null;

  const homeP = laneGoal(h, laneS(nex) + dir*200, 0);

  if(mode==='flee'){
    label(m, F, 'FLEE');
    useSkills(h, cmd, tgt, false, true, homeP, near);
    moveTo(cmd, h, homeP.x, homeP.y);
    // kaçarken menzildeki rakibe vurmak yavaşlatır: yalnız ölmek üzereyse
    return cmd;
  }

  if(mode==='fight'){
    label(m, F, 'FIGHT');
    useSkills(h, cmd, tgt, true, false, homeP, near);
    if(inAttackRange(h, tgt)){
      cmd.attack = true; cmd.target = tgt; if(cmd.tx===undefined) cmd.aim = Math.atan2(tgt.y-h.y, tgt.x-h.x);
      // menzilli, yakın dövüşçüye karşı: vuruş hazırlığı dışında geri adım (kite)
      const tr = atkDef(tgt).range;
      if(!melee && tr < 200 && h.atk.state!=='windup' && dist(h,tgt) < tr + h.r + tgt.r + AJ.kiteGap){
        const ax = h.x-tgt.x, ay = h.y-tgt.y, l = Math.hypot(ax,ay)||1;
        const bp = { x:h.x+ax/l*120, y:h.y+ay/l*120 };
        if(!inWall(bp.x,bp.y,h.r)){ const [mx,my] = steer(h, ax, ay); cmd.mx=mx; cmd.my=my; }
        else moveTo(cmd, h, homeP.x, homeP.y);
      }
    } else {
      moveTo(cmd, h, tgt.x, tgt.y);
    }
    return cmd;
  }

  // savunma: ön kulemize rakip kahraman yaklaştıysa oraya git (kule altında güç x1,5)
  const front = myStructs.filter(s=>s.sub!=='nexus' && !s.prot)[0] || myStructs.find(s=>s.sub!=='nexus');
  const threat = front ? foesV.filter(u=>dist(u,front) < front.range + AJ.defR) : [];
  // grup savunması: ön kulemizin yakınında (görünen ya da son 5 sn'de görülen) 2+ rakip varsa ormancı da gelir
  let near2 = 0;
  if(front) for(const u of S.heroes){ if(u.team===team || u.dead) continue; const q = SEEN[u.id]; const p = canSee(team,u) ? u : (q && S.time-q.t < AJ.memT ? q : null); if(p && Math.hypot(p.x-front.x,p.y-front.y) < AJ.groupR) near2++; }
  const groupDef = AJ.groupDef && near2 >= 2;
  if(intent==='GROUP'){
    // dosta (canlıysa) ya da ön kulemize git, oradaysan koridor oyunu
    const A = ally[0]; const gp = A && dist(A,h) > 500 ? A : (!A && front ? laneGoal(h, laneS(front) - dir*AJ.defBack, mySide) : null);
    if(gp && dist(h,gp) > 200){ moveTo(cmd, h, gp.x, gp.y); if(tgt && adv>=AJ.stay) useSkills(h,cmd,tgt,false,false,homeP,near); return cmd; }
  } else if(!intent && h.role==='jungle' && AJ.jungle && front && (threat.length || groupDef) && hpR > AJ.lowHp+0.1 && !(tgt && mode==='fight')){
    const sp = laneGoal(h, laneS(front) - dir*AJ.defBack, mySide);
    if(dist(h, sp) > 120){ label(m, F, 'GROUP'); moveTo(cmd, h, sp.x, sp.y); if(tgt && adv>=AJ.stay) useSkills(h,cmd,tgt,false,false,homeP,near); return cmd; }
  }
  // kuşatma: dalgamız rakip ön yapının menzilindeyse ve yakında üstün rakip yoksa yapıya vur
  const sTgt = eTower || (eNexus && !eNexus.prot ? eNexus : null);
  let siege = null;
  if(intent==='SIEGE') siege = sTgt;
  else if(!intent && AJ.siege && sTgt && !sTgt.prot && hpR > AJ.siegeHp){
    const ok = sTgt.sub==='nexus' || towerSafe(sTgt, team);
    const foesAt = foesV.filter(u=>dist(u,sTgt) < sTgt.range+400);
    if(ok && (!foesAt.length || adv >= AJ.siegeAdv)) siege = sTgt;
  }
  m.siege = !!siege;
  if(siege){
    label(m, F, 'SIEGE');
    if(inAttackRange(h, siege)){ cmd.attack = true; cmd.target = siege; cmd.aim = Math.atan2(siege.y-h.y, siege.x-h.x); if(tgt && adv>=AJ.stay) useSkills(h,cmd,tgt,false,false,homeP,near); return cmd; }
    const ax = h.x-siege.x, ay = h.y-siege.y, l = Math.hypot(ax,ay)||1, rr = siege.r + h.r + range - 15;
    moveTo(cmd, h, siege.x+ax/l*rr, siege.y+ay/l*rr); return cmd;
  }
  // ormancı: dost dövüşüne yardım, yoksa kamp
  if(intent==='JUNGLE'){ if(jungleCmd(h, cmd, m)) return cmd; }
  else if(!intent && AJ.jungle && h.role==='jungle' && !(tgt && adv >= AJ.stay)){
    const busy = ally.find(u=>{ const q=MEM.get(u.id); return q && (q.mode==='fight' || (AJ.jgSiege && q.siege)) && dist(u,h)<AJ.helpR; });
    if(busy){ label(m, F, 'GROUP'); moveTo(cmd, h, busy.x, busy.y); return cmd; }
    if(hpR >= AJ.jgLow && jungleCmd(h, cmd, m)){ label(m, F, 'JUNGLE'); return cmd; }
  }
  label(m, F, 'LANE');
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
  // XP menzili: canımız iyiyse en yakın rakip minyonun XP yarıçapından (600) geri düşme
  if(hpR > 0.5){
    let ns = null; for(const u of S.minions){ if(u.dead || u.team===team || !canSee(team,u)) continue; const v = laneS(u)*dir; if(ns===null || v<ns) ns = v; }
    if(ns!==null && goalS*dir < ns - AJ.xpR) goalS = (ns - AJ.xpR)*dir;
  }
  // kendi ön kulemizin gerisine çekilme (kule bizi korur; kaçış ayrı mod)
  if(myFront!==null && goalS*dir < myFront - AJ.towerBack) goalS = (myFront - AJ.towerBack)*dir;
  if(intent && m.shift) goalS += dir*m.shift;
  const goal = laneGoal(h, goalS, mySide);

  // vuruş hedefi
  let at = null;
  const dmg = stat(h,'dmg');
  // 1) son vuruş: vuruş anındaki can tahmini (dost minyonların ona vuruşu hesaba katılır)
  const inc = incoming(team);
  const wind = timings(h).wind, pspd = (STATS[h.type] && STATS[h.type].projSpeed && atkDef(h).range>200) ? stat(h,'projSpeed') : 0;
  let hold = false;
  for(const u of S.minions){
    if(u.dead || u.team===team || !canSee(team,u) || !inAttackRange(h,u)) continue;
    if(inTowerZone(h, 0) && !towerSafeAny(enemyStructs,h,team)) continue;
    const tHit = wind + (pspd ? dist(h,u)/pspd : 0), di = inc.get(u.id)||0;
    const pred = u.hp - di*tHit;
    if(pred <= dmg*0.97 && pred > -dmg*0.3 && (!at || u.hp < at.hp)) at = u;
    else if(u.hp - di*(tHit+1.2) <= dmg*AJ.holdK) hold = true;   // yakında ölecek: başka minyona vurup kaçırma
  }
  // 1b) kulemizin menzilindeki rakip minyonlar: beklemeden temizle (dalga kuleyi vurmasın)
  if(!at && front) for(const u of S.minions){
    if(u.dead || u.team===team || !canSee(team,u) || !inAttackRange(h,u) || dist(u,front) > front.range+150) continue;
    if(!at || u.hp < at.hp) at = u;
  }
  // 2) rakip kahraman dürtme (kule dışında, üstünlük kötü değilse)
  if(!at && tgt && inAttackRange(h,tgt) && adv >= AJ.stay && !inTowerZone(h,0)) at = tgt;
  // 3) yapı
  if(!at) for(const s of enemyStructs){ if(!s.prot && inAttackRange(h,s) && (s.sub==='nexus' || towerSafe(s,team))) { at = s; break; } }
  // 4) minyon itme: yakında rakip kahraman yoksa beklemeden en düşük canlıya (dalgayı hızla it), varsa son vuruşu bozmadan en çok canlıya
  const pushing = AJ.push && !foesV.some(u=>dist(u,h) < AJ.pushR);
  if(!at && (pushing || !hold)) for(const u of S.minions){
    if(u.dead || u.team===team || !canSee(team,u) || !inAttackRange(h,u)) continue;
    if(!at || (pushing ? u.hp < at.hp : u.hp > at.hp)) at = u;
  }
  if(tgt && adv >= 0.9) useSkills(h, cmd, tgt, false, false, homeP, near);
  else if(AJ.skillMinions && !tgt) minionSkills(h, cmd, pushing ? 2 : 3);

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
  if(Math.hypot(dx,dy) > 12) moveTo(cmd, h, mv.x, mv.y);
  return cmd;
}

/* minyonlara gelen saniyelik hasar (dost minyonların hedefi) */
function incoming(team){
  const M = new Map();
  for(const m of S.minions){ if(m.dead || m.team!==team || !m.atk || !m.atk.main) continue; const d=m.def.dmg*(m.dmgMult||1)/m.def.period; M.set(m.atk.main.id, (M.get(m.atk.main.id)||0)+d); }
  return M;
}
/* öldürülebilir mi: hedefin etkin canı, yakındaki dostlarımızın ~2,5 sn'lik hasarından az */
function killable(h, mine, tgt){
  let d = 0; for(const u of mine) if(dist(u,tgt) < 700) d += dps(u)*2.5;
  return ehp(tgt) < d*AJ.killK;
}
function towerSafeAny(structs, h, team){
  for(const s of structs){ if(s.sub==='nexus') continue; if(dist(h,s) < s.range+h.r+20 && !towerSafe(s,team)) return false; }
  return true;
}

function minionSkills(h, cmd, need=3){
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
    if(best && bn>=need){ aimAt(cmd,h,best); cmd[k==='r'?'rmb':'e']=true; return; }
  }
}
export { MEM };

/* ---- yol bulma: 40'lık ızgarada hedefe uzaklık alanı (BFS), önbellekli ---- */
const CELL = 40; let GRID = null, GW = 0, GH = 0; const FLOW = new Map();
function grid(){
  if(GRID) return GRID;
  GW = Math.ceil(WORLD.w/CELL); GH = Math.ceil(WORLD.h/CELL); GRID = new Uint8Array(GW*GH);
  for(let j=0;j<GH;j++) for(let i=0;i<GW;i++) GRID[j*GW+i] = inWall((i+0.5)*CELL, (j+0.5)*CELL, 22) ? 0 : 1;
  return GRID;
}
function cellOf(x,y){ return [Math.max(0,Math.min(GW-1,Math.floor(x/CELL))), Math.max(0,Math.min(GH-1,Math.floor(y/CELL)))]; }
function flowTo(x, y){
  const G = grid(); const [gi,gj] = cellOf(x,y); const key = gj*GW+gi;
  let F = FLOW.get(key); if(F) return F;
  F = new Float32Array(GW*GH).fill(1e9); const q = new Int32Array(GW*GH); let qh=0, qt=0;
  F[key]=0; q[qt++]=key;
  while(qh<qt){ const c=q[qh++], ci=c%GW, cj=(c-ci)/GW, d=F[c]+1;
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const ni=ci+di, nj=cj+dj; if(ni<0||nj<0||ni>=GW||nj>=GH) continue; const n=nj*GW+ni; if(!G[n] || F[n]<=d) continue; F[n]=d; q[qt++]=n; } }
  if(FLOW.size>400) FLOW.clear(); FLOW.set(key, F); return F;
}
/* hedefe yürüme yönü: doğrudan görüş yoksa uzaklık alanında birkaç adım ileri bak */
function navDir(h, x, y){
  const dx=x-h.x, dy=y-h.y, L=Math.hypot(dx,dy); if(L<8) return [0,0];
  // kısa ve açık yol: doğrudan
  let clear = true; const n=Math.ceil(L/30);
  for(let k=1;k<=n && clear;k++){ const t=k/n; if(inWall(h.x+dx*t, h.y+dy*t, h.r*0.8)) clear=false; }
  if(clear) return steer(h, dx, dy);
  const F = flowTo(x,y); let [ci,cj] = cellOf(h.x,h.y);
  if(!GRID[cj*GW+ci]){ return steer(h, dx, dy); }
  for(let k=0;k<3;k++){ let best=cj*GW+ci, bv=F[best];
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){ const ni=ci+di, nj=cj+dj; if(ni<0||nj<0||ni>=GW||nj>=GH) continue; const c=nj*GW+ni; if(F[c]<bv && GRID[c]){ bv=F[c]; best=c; } }
    ci=best%GW; cj=(best-ci)/GW; }
  return steer(h, (ci+0.5)*CELL-h.x, (cj+0.5)*CELL-h.y);
}
export function moveTo(cmd, h, x, y){ const [mx,my]=navDir(h,x,y); cmd.mx=mx; cmd.my=my; if(cmd.tx===undefined && (mx||my)) cmd.aim=Math.atan2(my,mx); }

/* ---- orman ---- */
function campInfo(team, c){ const I = S.intel && S.intel[team] && S.intel[team].camps[c.id]; return I || { state:'unknown', until:0 }; }
export function jungleCmd(h, cmd, m){
  const team=h.team;
  // canavar savaşı: menzildeki/yakındaki görünen canavar (hedef kamp)
  const mons = S.monsters.filter(u=>!u.dead && canSee(team,u));
  let camp = m.camp ? S.camps.find(c=>c.id===m.camp) : null;
  const campMons = camp ? mons.filter(u=>u.camp===camp || Math.hypot(u.x-camp.x,u.y-camp.y)<500) : [];
  if(camp && !campMons.length && dist(h,camp)<250 && !camp.alive) { m.camp=null; camp=null; }
  if(!camp){
    let best=null, bv=1e9;
    for(const c of S.camps){
      if(c.big) continue;
      if(c.side!==team) continue;   // önce kendi ormanımız
      const I = campInfo(team,c);
      const wait = I.state==='alive' ? 0 : I.state==='dead' ? Math.max(0,(I.until||0)-S.time) : 8;
      const v = dist(h,c)/ (h.def ? 250 : 250) + wait*1.0;
      if(wait < 20 && v < bv){ bv=v; best=c; }
    }
    if(best){ m.camp=best.id; camp=best; }
  }
  if(!camp) return false;
  const near = campMons.filter(u=>dist(u,h)<600);
  if(near.length){
    let t=near[0]; for(const u of near) if(u.hp<t.hp) t=u;
    // yeteneklerle de vur (hasar ve kendine güç)
    if(!h.cast && !h.dash) for(const k of ['r','e']){
      const sk=h.def.skills[k]; if(!sk||!sk.type||h.rank[k]<=0||h.cd[k]>0||SKIP.has(sk.type)) continue;
      if(['hook','duel','lockvolley','tether','bigarrow','bloodcurse','blink','mimic','mantra','spiritshield','cleanse','tumble','roll','dash','flameleap','meteor','artillery'].includes(sk.type)) continue;
      const r = sk.type==='heavy' ? atkDef(h).range+h.r+t.r : (NEAR_SELF[sk.type]||sRange(sk));
      if(dist(h,t) <= r*0.9 + t.r){ aimAt(cmd,h,t); cmd[k==='r'?'rmb':'e']=true; break; }
    }
    if(inAttackRange(h,t)){ cmd.attack=true; cmd.target=t; if(cmd.tx===undefined) cmd.aim=Math.atan2(t.y-h.y,t.x-h.x); }
    else moveTo(cmd, h, t.x, t.y);
    return true;
  }
  // kampa git (doğmasını bekle)
  if(dist(h,camp) > 120) moveTo(cmd, h, camp.x, camp.y);
  return true;
}

/* ---- nöroevrim ağı ----
   Girdi: features() (NF sayı). Gizli katman NH tanh. Çıktı: NI niyet puanı + 1 koridor kayması.
   Ağırlıklar düz dizi: [W1 (NH x NF), b1 (NH), W2 ((NI+1) x NH), b2 (NI+1)]. */
export const INTENTS = ['LANE','FIGHT','FLEE','SIEGE','RECALL','JUNGLE','GROUP'];
export const NI = INTENTS.length, NF = 28, NH = 14;
export const NW = NH*NF + NH + (NI+1)*NH + (NI+1);
export function netForward(w, x){
  const hdn = new Float64Array(NH); let k = 0;
  for(let i=0;i<NH;i++){ let a=0; for(let j=0;j<NF;j++) a += w[k++]*x[j]; hdn[i]=a; }
  for(let i=0;i<NH;i++) hdn[i] = Math.tanh(hdn[i] + w[k++]);
  const o = new Float64Array(NI+1);
  for(let i=0;i<=NI;i++){ let a=0; for(let j=0;j<NH;j++) a += w[k++]*hdn[j]; o[i]=a; }
  for(let i=0;i<=NI;i++) o[i] += w[k++];
  return o;
}
function label(m, F, it){ if(AJ.sink && F && S.time >= (m.labT||0)){ m.labT = S.time + AJ.netDt; AJ.sink(F, INTENTS.indexOf(it)); } }
const cl = (v,a=-2,b=2) => Math.max(a, Math.min(b, v));
function features(h, c){
  const { hpR, adv, theirs, memNear, hidden, tgt, mine, ally, eTower, sT0, front0, enemyStructs, myStructs, beingShot, inTowerZone, dir, foesV } = c;
  const team = h.team, me = laneS(h)*dir, L = laneLength();
  const wf = waveFront(team, dir), wfE = waveFront(1-team, dir);
  let ourAtE = 0, enAtOurs = 0;
  for(const u of S.minions){ if(u.dead) continue;
    if(u.team===team && eTower && dist(u,eTower)-u.r <= eTower.range) ourAtE++;
    if(u.team!==team && front0 && dist(u,front0)-u.r <= front0.range && canSee(team,u)) enAtOurs++; }
  const A = ally[0];
  const eLv = foesV.length ? foesV.reduce((t,u)=>t+u.level,0)/foesV.length : h.level;
  let ready = 0, ult = 0; for(const k of ['r','e','s']){ const sk=h.def.skills[k]; if(sk && sk.type && h.rank[k]>0 && h.cd[k]<=0){ ready++; if(k==='s') ult=1; } }
  let camps = 0; if(S.intel) for(const cp of S.camps){ if(cp.side!==team || cp.big) continue; const I=S.intel[team].camps[cp.id]; if(I && (I.state==='alive' || (I.state==='dead' && I.until<=S.time+5))) camps++; }
  const underMine = myStructs.some(s=>s.sub!=='nexus' && dist(s,h) < s.range-40) ? 1 : 0;
  return [
    hpR, cl(Math.log(adv>50 ? 8 : Math.max(adv,0.05))/2), theirs.length/2, memNear.length/2, hidden.length/2,
    tgt ? tgt.hp/tgt.maxHp : 1, tgt ? Math.min(1, dist(h,tgt)/1300) : 1, underMine, inTowerZone(h,0) ? 1 : 0, beingShot ? 1 : 0,
    tgt && killable(h, mine, tgt) ? 1 : 0, wf===null ? -1 : cl((wf*dir - me)/1000), wfE===null ? -1 : cl((wfE*dir - me)/1000),
    ourAtE/5, enAtOurs/5, Math.min(2, h.gold/1500), h.level/15, cl((eLv-h.level)/3), Math.min(2, S.time/1200),
    h.role==='jungle' ? 1 : 0, A ? A.hp/A.maxHp : 0, A ? Math.min(1, dist(A,h)/2500) : 1, ult, ready/3,
    sT0 ? 1 : 0, eTower && towerSafe(eTower, team) ? 1 : 0, me/L, camps/5
  ];
}

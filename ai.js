/* Bot yapay zekası (v2): tarayıcıya bağımlı değil, iki takımı da oynayabilir.
   Akış: algı -> karar (geri çekil / dövüş / koridor) -> hareket (konum + kaçınma + kule güvenliği) -> saldırı ve yetenekler.
   Eski bot karşılaştırma için ai_v1.js içinde. */
import { HEROES, JUNGLE, WORLD, LANE_Y, TOWER, towerChampHit, towerScale, towerMinionHit, FOUNTAIN, respawnTime, RECALL } from './data.js';
import { S, settings, rand, dist, atkDef, atkDmg, attackSpeed, timings, canSee, canAct, stat, burnDps, apOf, canShop, botShop, nextBuild, itemCostFor, attackTarget, inAttackRange, bonusAd, bonusHp, inCone, waveNear, campIntel } from "./sim.js";
import { CRIT_MULT } from './items.js';
import { lanePoint, laneProject, laneDir, inWall, BUSHES, bushAt } from './map.js';
import { navDir, slideDir } from './nav.js';
import { FIGHT_MODEL } from './ai_model.js';

/* Ayarlanabilir sabitler */
export const AI = {
  react:[0.15, 0.30],   // görülen mermiye / hazırlığa tepki süresi (sn)
  aimNoise:0.05,        // nişan sapması (radyan, ±)
  recallHp:0.22,        // can bu oranın altına inince üsse dön
  recallOut:0.85,       // üste bu orana kadar iyileş
  engageAdv:1.15,       // dövüşe girmek için gereken üstünlük (ölme süresi / öldürme süresi)
  stayAdv:0.85,         // dövüşteyken bu orana kadar kal
  fleeAdv:0.85,         // bunun altında rakipten uzak dur
  homeBias:0.8,
  diveAdv:0.55,         // yakın dövüşçü atılış hazırken menzilliye bu üstünlükte bile dalar
  diveGap:80, diveShieldGap:120, diveHpGap:0.15,   // dalış mesafe payları, can farkı toleransı
  commitTime:3,         // daldıktan sonra bu kadar sn dövüşü bırakma
  lhSoon:1.5,
  lhPushGuard:0,        // itme vuruşu, bu kadar saldırı süresi içinde son vuruş geliyorsa yapılmaz           // son vuruş: bu kadar saldırı süresi içinde öldürülebilecekse bekle
  defendAdv:0.6,        // rakip kahraman yapımıza vururken bu üstünlükte bile savun (kule yardım eder)
  pokeAdv:0.9,          // menzilli kahraman bu üstünlükte rakibi dürter
  towerMargin:40,       // kule menzili güvenlik payı
  tankMargin:35,        // tank minyon kuleye bizden en az bu kadar yakın olmalı
  tankHp:60,            // bundan az canlı minyon tank sayılmaz
  keepMelee:60,         // okçunun yakın dövüşçüyle arasında bıraktığı ek pay
  recallDist:1300,      // çeşmeye bundan uzaksa, can azken dönmek yerine dikkatli oyna (ölüm ucuz, yol uzun)
  diveEnemyDist:900,    // rakip kahraman kuleye bundan yakınsa tanksız dalma
  cheapDeath:8,         // yeniden doğma bundan kısaysa ölüm ucuz sayılır
  diveStart:0.6,        // tanksız dalışa en az bu canla başla
  diveFloor:0.25,       // dalışta can bu orana inince bırak
  diveMinDmg:250,       // dalışta en az bu kadar hasar verebileceksek dal
  // İnsansılık (0 kapatır): botun kusursuz robot gibi görünmemesi için küçük hatalar
  human:1,
  humanErr:35,          // varış noktası bu kadar birim kayık (1-3 sn'de bir değişir), beklerken yerinde dolanır
  humanRange:45,        // menzilli kahramanın rakiple tuttuğu mesafe ± bu kadar şaşar
  humanAtkDelay:0.12,   // düz vuruş hazırken basmadan önce 0 ile bu kadar sn arası gecikme
  humanMoveHold:[0.07,0.18]   // hareket yönü en sık bu aralıkta bir güncellenir (insan tıklama hızı)
};
const KEY = { r:'rmb', e:'e', s:'space' };

/* ---- Bot zorluk seviyeleri ----
   0 Kolay (AI aynen), 1 Orta, 2 Zor, 3 Uzman. Seviye kahramanın h.botLevel alanında (setBotLevel); yoksa Kolay.
   Kolay AI nesnesinin kendisi; diğerleri AI'dan türer (AI.js sabitleri değişince ya da --tune ile yansır) ve yalnız farklarını taşır. */
export const LEVEL_IDS = ['easy','medium','hard','expert'];
AI.lvl=0; AI.artHp=0.4; AI.dodgeW=1; AI.dodgeNeed=0; AI.dodgeT=1e9; AI.look=0; AI.towerGate=0;
/* Karar katmanı (12.10.2026): misjudge = öldürme/dövüş tahmininde rastgele yanılma payı (±), pokeP = dürtme fırsatını değerlendirme olasılığı,
   killSense = öldürme penceresini fark etme olasılığı, bushP = beklerken çalıya girme olasılığı, lead = nişanda hareket tahmininin ne kadarını kullandığı */
AI.blinkGate=0; AI.blinkAdv=1.3; AI.numAdv=0; AI.noLimbo=0; AI.limboT=1.2; AI.limboAdv=0.95; AI.titanAdv=0; AI.kwHit=0; AI.prio=0; AI.prioW=90; AI.prioD=1.2; AI.deadRecall=0; AI.deadRecallT=10; AI.persOn=1; AI.titan=0; AI.siege=1; AI.selfKw=1; AI.kwOn=1; AI.pokeOn=1; AI.bushOn=1; AI.misjudge=0.3; AI.pokeP=0.45; AI.killSense=0.6; AI.bushP=0.25; AI.lead=0.7;
const MED = { lvl:1, win:1, cmb:1, recallHp:0.3,   /* bot C2: üsse dönüş canı 0.22 idi (Orta yeni-eski %68 ve %61, 160 maç) */   /* bot C1: Orta'ya bekleme penceresi ve kombo (Orta>Kolay %58->%66, 160 maç) */ misjudge:0.12, pokeP:0.7, killSense:0.95,   /* bot C3: misjudge 0.18, killSense 0.85 idi (yeni-eski Orta %57, 160 maç; Orta>Kolay %79, Zor>Orta %71) */ bushP:0.45, lead:0.85, react:[0.07,0.14], aimNoise:0.03, humanErr:22, humanRange:28, humanAtkDelay:0.07, humanMoveHold:[0.05,0.12], lhSoon:1.5, dodgeW:2, dodgeNeed:14 };
const HARD = { lvl:2, win:1, cmb:1, bait:1, wave:1, misjudge:0.1, pokeP:0.85, killSense:0.95, bushP:0.55, lead:0.95,   // karar katmanı bayrakları (Zor): bekleme penceresi, kombo/öldürme, kule çekme, dalga dönüşü
  react:[0.04,0.09], aimNoise:0.02, humanErr:5, humanRange:6, humanAtkDelay:0.015, humanMoveHold:[0.025,0.06] };
export const LEVEL_PARAMS = [];   // araçlar için (tools/levels.js deney ayarı)
const LV = [AI,
  Object.assign(Object.create(AI), MED),
  Object.assign(Object.create(AI), MED, HARD),
  Object.assign(Object.create(AI), MED, HARD, { lvl:3, mlW:0.6, blinkGate:1, numAdv:1, kwHit:1, noLimbo:1, selfKw:0, misjudge:0.05, pokeP:0.9, killSense:1, lead:1, dng:1, chain:1, focus:1, react:[0.03,0.08], aimNoise:0.015, humanErr:0, humanRange:0, humanAtkDelay:0, humanMoveHold:[0.02,0.04],
    dodgeW:2.4, dodgeNeed:16, dodgeT:0.6, foeMemory:4, look:2, towerGate:0 })];
LV.forEach((o,i)=>{ LEVEL_PARAMS[i]=o; });
const LVP = b => LV[b.botLevel|0] || AI;
export function setBotLevel(h, id){ const i = typeof id==='number' ? id : LEVEL_IDS.indexOf(id); h.botLevel = i>0 ? i : 0; }

function mem(b){
  if(b.ai.v2) return b.ai.v2;
  // Kişilik (maç başına, sim rng'si ile): aggr dövüşe girme isteği, risk öldürme denemesinde karşı hasarı ne kadar göze aldığı,
  // roam baskın/rakip ormana girme eğilimi, poke dürtme sıklığı, bush çalı sevgisi
  const pers={ aggr:0.85+rand()*0.3, risk:0.8+rand()*0.45, roam:rand(), poke:0.75+rand()*0.5, bush:rand() };
  return (b.ai.v2 = { recall:false, fight:false, seen:new WeakMap(), juke:1, jukeT:0, noise:0, noiseT:0, threatRef:null, threatAt:0, pers });
}

/* ---- yardımcılar ---- */
const hyp = Math.hypot;
const ranged = h => atkDef(h).type==='projectile';
const hitMult = h => { const p=h.def.skills.p; return p.twinPct ? 2*p.twinPct : 1; };   // İkiz Ok: vuruş başına 2 ok x %40
const dps = h => { const B=h.bonus||{}; return atkDmg(h)*hitMult(h)*attackSpeed(h)*(1+(B.crit||0)*((B.critMult||CRIT_MULT)-1)); };
function reachTo(h, u){
  const at=atkDef(h);
  return at.type==='projectile' ? h.r+4+at.range*0.94+u.r+at.projRadius : h.r+at.range+u.r*0.8;
}
const rdy = (h,k) => h.rank[k]>0 && h.cd[k]<=0;
function skillKey(h, type){ for(const k of ['r','e','s']) if(h.def.skills[k].type===type) return k; return null; }
function inFountain(h){ const n=S.lane[h.team][3]; return !n.dead && dist(h,n)<=FOUNTAIN.radius; }
function standPoint(b, u, want){
  const d=dist(b,u)||1;
  if(d<=want) return { x:b.x, y:b.y };
  const k=(d-want)/d;
  return { x:b.x+(u.x-b.x)*k, y:b.y+(u.y-b.y)*k };
}
/* u'ya want mesafeden vurulabilecek, kuleden güvenli ve bize en yakın nokta (yoksa null) */
const STAND_OFF=[0,0.45,-0.45,0.9,-0.9,1.35,-1.35,1.8,-1.8,2.5,-2.5,Math.PI];
function findStand(b, u, want){
  const d=dist(b,u);
  if(d<=want && !unsafeAt(b,b.x,b.y)) return { x:b.x, y:b.y };
  const a0=Math.atan2(b.y-u.y, b.x-u.x);
  let best=null, bd=1e9;
  for(const o of STAND_OFF){
    const x=u.x+Math.cos(a0+o)*want, y=u.y+Math.sin(a0+o)*want;
    if(y<b.r+10 || y>WORLD.h-b.r-10 || x<b.r || x>WORLD.w-b.r) continue;
    if(unsafeAt(b,x,y)) continue;
    const dd=hyp(x-b.x,y-b.y);
    if(dd<bd){ bd=dd; best={ x, y }; }
    if(o===0) break;   // en doğrudan nokta güvenliyse yeterli
  }
  return best;
}

/* Tehdit menzili: rakibin bize vurabileceği mesafe (hazır atılış dahil) */
function threatR(e, b){
  const k=skillKey(e,'dash'), lk=skillKey(e,'leapslam'), rl=skillKey(e,'roll'), dk=skillKey(e,'duel');
  return reachTo(e,b) + (k && rdy(e,k) ? e.def.skills[k].dist : lk && rdy(e,lk) ? e.def.skills[lk].range*0.8 : rl && rdy(e,rl) ? e.def.skills[rl].dMax*0.6 : dk && rdy(e,dk) ? e.def.skills[dk].range*0.8 : 0) + 30;   // Gladyatör Meydan Okuma da tehdit   // Gülle Yuvarlan da tehdit   // İkili'nin Sıçrayış Darbesi hazırsa o da tehdit
}

/* Kule s, b pos noktasındayken b'ye vurur mu? Kule en yakın birime vurur, şampiyona saldırana döner. */
function towerHits(s, b, px, py, margin){
  if(s.dead || s.sub==='nexus') return false;
  const rr=s.range+margin+1, ddx=s.x-px, ddy=s.y-py;   // ucuz kutu elemesi (hypot >= |dx|)
  if((ddx<0?-ddx:ddx)-b.r>rr || (ddy<0?-ddy:ddy)-b.r>rr) return false;
  const myD=hyp(ddx, ddy)-b.r;
  if(myD > s.range+margin) return false;
  // kule menzilindeki rakip (bizim tarafın) minyonu önce hedefler (sim.js updateTower: minyon önceliği): tank varsa kahramana vurmaz
  for(const u of S.minions){
    if(u.dead || u.team!==b.team || u.hp<AI.tankHp) continue;
    const ex=s.x-u.x, ey=s.y-u.y, rs=s.range+u.r+1;
    if((ex<0?-ex:ex)>rs || (ey<0?-ey:ey)>rs) continue;   // ucuz kutu elemesi: menzil dışı
    if(hyp(ex,ey)-u.r<=s.range) return false;
  }
  if(s.aggro && s.aggro.target===b) return true;
  for(const h of S.heroes){
    if(h===b || h.dead || h.team!==b.team) continue;
    const ex=s.x-h.x, ey=s.y-h.y, rs=s.range+h.r+1;
    if((ex<0?-ex:ex)>rs || (ey<0?-ey:ey)>rs) continue;
    const d=hyp(ex,ey)-h.r;
    if(d<=s.range && d<myD-AI.tankMargin) return false;
  }
  return true;
}
function unsafeAt(b, px, py, margin=AI.towerMargin){
  for(const s of S.lane[1-b.team]) if(towerHits(s,b,px,py,margin)) return s;
  return null;
}
/* Rakip kahramana pos noktasından vurmak güvenli mi? (rakip kendi kulesinin menzilindeyse kule bize döner) */
function heroHitSafe(b, e, px, py){
  for(const s of S.lane[e.team]){
    if(s.dead || s.sub==='nexus') continue;
    if(hyp(s.x-px,s.y-py)-b.r > s.range+AI.towerMargin) continue;
    if(dist(s,e)<=s.range+e.r) return false;
    if(towerHits(s,b,px,py,AI.towerMargin)) return false;
  }
  return true;
}

/* Kule T saniyede tek hedefe ne kadar vurur (yığılan hasar dahil) */
function towerDmgOver(T){
  let sum=0; const n=Math.ceil(T/TOWER.interval);
  for(let i=0;i<n;i++) sum+=towerChampHit(i, S.time);
  return sum;
}
/* Tanksız kule dalışı değer mi? Rakip kahraman uzaktaysa ve ölmeden önce verebileceğimiz hasar yeterliyse dal.
   (Yeniden doğma kısa olduğu için ölüm ucuz: kuleye ciddi hasar vermek çoğu zaman ölmeye değer.) */
function canDive(b, st, e, M){
  if(st.sub==='nexus') return true;
  if(e && !e.dead && dist(e,st)<LVP(b).diveEnemyDist) return false;
  // ölüm ucuzsa (yeniden doğma kısa) ölene kadar vur, pahalıysa canı koru
  const cheap=respawnTime(S.time)<=LVP(b).cheapDeath;
  let floor=b.maxHp*(cheap?0:LVP(b).diveFloor), start=cheap?0.2:LVP(b).diveStart;
  if(M.foesDown && LVP(b).siege){ floor=Math.min(floor, b.maxHp*0.12); start=Math.min(start, 0.3); }   // rakip ölü: daha cesur kuşatma
  if(b.hp < (M.dive ? floor : b.maxHp*start)) return false;
  let myD=dps(b)*0.95*(waveNear(b.team,st)?1:TOWER.ward.mult);   // kale koruması (15.10.2026): dalgasız kuleye hasar yarım
  for(const m of S.minions) if(!m.dead && m.team===b.team && dist(m,st)<300) myD+=m.def.dmg/m.def.period;
  const live=(b.hp-floor)/(towerChampHit(3, S.time)/TOWER.interval);
  return myD*live >= Math.min(st.hp, LVP(b).diveMinDmg);
}

/* Hazır yeteneklerin ham katkısı, türüne göre (ağırlıklar FE.w içinde) */
function burstRaw(h, look=0){
  const out={}, base=atkDmg(h);
  let f=1;   // Uzman: look sn içinde hazır olacak yetenek kısmen sayılır
  const add=(k,v)=>{ out[k]=(out[k]||0)+v*f; };
  for(const k of ['r','e','s']){
    f=1;
    if(!rdy(h,k)){ if(look>0 && h.rank[k]>0 && h.cd[k]<look) f=0.6*(1-h.cd[k]/look); else continue; }
    const sk=h.def.skills[k], i=h.rank[k]-1;
    if(sk.type==='volley') add('volley', base*sk.ratio*(1+sk.repeat*(sk.count[i]-1)));
    else if(sk.type==='bigarrow') add('bigarrow', base*sk.ratio+(sk.ap||0)*apOf(h));
    else if(sk.type==='dash') add('dash', base*sk.ratio[i]);
    else if(sk.type==='haste') add('haste', sk.as[i]);
    else if(sk.type==='giant') add('giant', sk.dmg[i]);
    else if(sk.type==='shield') add('shield', h.maxHp*sk.shield[i]);
    else if(sk.type==='fireball') add('fireball', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='ignite'){ add('ignite', sk.dot[i]+(sk.ap||0)*apOf(h)); add('igniteAmp', sk.amp[i]); }
    else if(sk.type==='meteor') add('meteor', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='bomb') add('bomb', sk.dmg[i]+(sk.ad||0)*bonusAd(h)+(sk.ap||0)*apOf(h));
    else if(sk.type==='lockvolley') add('lock', (sk.dmg[i]+(sk.ad||0)*bonusAd(h))*sk.count);
    else if(sk.type==='boomerang') add('boomerang', sk.dmg[i]+(sk.ad||0)*stat(h,'dmg'));
    else if(sk.type==='frenzy') add('frenzy', sk.as[i]);
    else if(sk.type==='hook') add('hook', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='slam') add('slam', sk.dmg[i]+(sk.ad||0)*bonusAd(h)+(sk.hpPct||0)*bonusHp(h));
    else if(sk.type==='breath') add('breath', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='flameleap') add('leap', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='firering') add('ring', (sk.dps[i]+(sk.ap||0)*apOf(h))*sk.dur);
    else if(sk.type==='bloodbolt') add('bloodbolt', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='bloodnova') add('bloodnova', sk.dmg[i]+h.hp*sk.pct+(sk.ap||0)*apOf(h));
    else if(sk.type==='bloodcurse') add('bloodcurse', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='beam') add('beam', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='stunorb') add('orb', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='artillery') add('art', (sk.dmg[i]+(sk.ap||0)*apOf(h))*sk.shots);
    else if(sk.type==='shockwave') add('shock', sk.dmg[i]+(sk.ap||0)*apOf(h)+(sk.hpPct||0)*bonusHp(h));
    else if(sk.type==='tether') add('tether', (sk.dmg[i]+(sk.ap||0)*apOf(h))*1.5);   // bağ sağlam kalırsa ikinci hasar da gelir
    else if(sk.type==='blink') add('blink', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='groworb') add('gorb', (sk.dmg[i]+(sk.ad||0)*bonusAd(h))*1.25);   // yolun ortası: çarpan ~1,25
    else if(sk.type==='leapslam') add('lslam', sk.dmg[i]+(sk.ad||0)*bonusAd(h));
    else if(sk.type==='knockblow') add('kblow', sk.dmg[i]+sk.hpPct*(S.heroes.find(u=>u.team!==h.team)||{ maxHp:0 }).maxHp);
    else if(sk.type==='spiritburst') add('sburst', sk.dmg[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='spiritshield') add('sshield', sk.shield[i]+(sk.ap||0)*apOf(h));
    else if(sk.type==='roll') add('roll', sk.dmg[i]+sk.hpPct*bonusHp(h));                       // Gülle
    else if(sk.type==='shell') add('rshell', h.maxHp*sk.dr[i]*0.5+(sk.dmg[i]+sk.hpPct*bonusHp(h))*2);
    else if(sk.type==='billiard') add('ball', (sk.dmg[i]+sk.hpPct*bonusHp(h))*1.5);
    else if(sk.type==='heavy') add('heavy', sk.dmg[i]+sk.ad*bonusAd(h)+sk.healFlat[i]);                 // Gladyatör
    else if(sk.type==='arena') add('arena', sk.as[i]);
    else if(sk.type==='duel'){ const fo=S.heroes.find(u=>u.team!==h.team)||{ maxHp:0 }; add('duel', fo.maxHp*sk.hpPct[i]*1.4); }   // süreli hasar + iyileşme + çalınan direnç
    else if(sk.type==='mimic' && h.ic.last){   // Taklit: son yeteneğin hasarı, bonus kadar fazla
      const ms=h.def.skills[h.ic.last], mi=h.rank[h.ic.last]-1;
      if(mi>=0) add(ms.type, (ms.dmg[mi]+(ms.ap||0)*apOf(h))*(ms.type==='tether'?1.5:1)*(1+sk.bonus[i]));
    }
  }
  return out;
}
/* Dövüş tahmini ağırlıkları. tools/calib.js gerçek maç dövüşlerinden bunları uydurur. */
export const FE = {
  hitRR:0.085, hitRM:0.988, hitMR:0.181, hitMM:0.433,   // isabet: R=menzilli, M=yakın (saldıran, savunan)
  towerW:0.197, minionW:0.178, k:1.329,
  w:{volley:0.104, bigarrow:0.275, dash:0.23, haste:0.595, giant:0.327, shield:2.344, fireball:0.344, ignite:0.407, igniteAmp:0.5, meteor:0.582, bomb:0.4, lock:0.3, boomerang:0.3, frenzy:0.4, hook:0.3, slam:0.34, shock:0.46, breath:0.322, leap:0.3, ring:0.4, bloodbolt:0.46, bloodnova:0.3, bloodcurse:0.4, beam:0.46, orb:0.45, art:0.17, tether:0.4, blink:0.35, sburst:0.391, sshield:0.425, gorb:0.34, lslam:0.37, kblow:0.35, roll:0.4, rshell:0.6, ball:0.4, heavy:0.5, arena:0.6, duel:0.45}
};
const BONUS_T={ haste:1, giant:1, igniteAmp:1, frenzy:1, arena:1 }, EHP_T={ shield:1, sshield:1, rshell:1 };
/* Hazır hasar yeteneklerinin en uzun menzili (yoksa 0) */
function skillReach(h){
  let r=0;
  for(const k of ['r','e','s']){
    const sk=h.def.skills[k];
    if(rdy(h,k) && sk.range && ['fireball','ignite','meteor','volley','bigarrow','bomb','hook','bloodbolt','beam','stunorb','tether','spiritburst','groworb'].includes(sk.type)) r=Math.max(r, sk.range);
  }
  return r;
}
const hpNow = h => h.hp/h.maxHp;
/* Kendi üssümüzün yönü (x ekseninde) */
const homeDir = b => b.team===0 ? -1 : 1;
/* Pasif yakma: saniye başı ek hasar */
function burnOf(h){ const p=h.def.skills.p; return p.burnMin!==undefined ? burnDps(p,h.level)+(p.ap||0)*apOf(h) : 0; }
/* Bir tarafın ham dövüş bileşenleri (b'nin e'ye karşı) */
function sideComps(b, e, lv=AI){
  const tw=towerChampHit(2, S.time)/TOWER.interval;
  let tower=0, minion=0;
  for(const s of S.structs){
    if(s.dead || s.sub==='nexus') continue;
    if(s.team===b.team && dist(s,e)-e.r<=s.range+60 && (!lv.towerGate || towerHits(s,e,e.x,e.y,0))) tower+=tw;   // Uzman: kule yalnız gerçekten e'ye vuracaksa sayılır
  }
  for(const m of S.minions) if(!m.dead && m.team===b.team && dist(m,e)<300) minion+=m.def.dmg*(m.dmgMult||1)/m.def.period;
  return { dps:dps(b), burn:burnOf(b), cat:(ranged(b)?'R':'M')+(ranged(e)?'R':'M'), burst:burstRaw(b, lv.look),
    hp:b.hp+(b.st.shield?b.st.shield.amt:0), heal:inFountain(b)?b.maxHp*FOUNTAIN.healPct:0, tower, minion };
}
export function fightComps(b, e, lv=AI){ return { me:sideComps(b,e,lv), en:sideComps(e,b,lv) }; }
/* Bileşenlerden üstünlük: adv = (bizim ölme süremiz) / (rakibi öldürme süremiz). 1'den büyükse biz önde. */
function sideVal(x, P){
  let dmg=0, ehp=0, bonus=0;
  for(const [t,v] of Object.entries(x.burst)){ const w=P.w[t]||0; if(BONUS_T[t]) bonus+=v*w; else if(EHP_T[t]) ehp+=v*w; else dmg+=v*w; }
  return { D:x.dps*(1+bonus)*P['hit'+x.cat]+x.burn+x.tower*P.towerW+x.minion*0.7*P.minionW, dmg, ehp };
}
export function advFrom(c, P=FE){
  const one=(x)=>sideVal(x,P);
  const m=one(c.me), n=one(c.en);
  const myD=Math.max(1, m.D-c.en.heal), enD=Math.max(1, n.D-c.me.heal);
  const tKill=Math.max(0.2, c.en.hp+n.ehp-m.dmg)/myD, tDie=Math.max(0.2, c.me.hp+m.ehp-n.dmg)/enD;
  return { adv:Math.pow(tDie/tKill, P.k), tKill, tDie };
}
function fightEval(b, e){ return advFrom(fightComps(b,e,LVP(b))); }

/* ---- 2v2 / takım oyunu ---- */
AI.teamR = 1000;          // dövüşe katılan sayılma uzaklığı (dost: rakibe, rakip: rakibe ya da bize)
AI.foeMemory = 5;         // görünmeyen rakip kahraman son görüldüğü yerde bu kadar sn dövüşte sayılır
AI.team = 1;              // 0: takım oyunu kapalı (her bot tek rakip/ilk rakip, dostu yok sayar; karşılaştırma için)
AI.cohesion = 1;          // beklerken dostumuzdan en fazla cohesionGap kadar öne geçme (dalgayı birlikte bekle)
AI.cohesionGap = 650;
AI.syncFlee = 0;          // kaçış senkronu (bot D1): dost geri çekilirken üstünlük syncAdv altındaysa dövüşü bırak
AI.syncAdv = 1.4;
AI.syncR = 900;
AI.jgTrack = 0;           // rakip ormancı takibi (bot D2)
AI.jgMissT = 8;
AI.jgAhead = 1500;
AI.invade = 0;            // rakip ormancı ölüyken rakip ormanını kes (bot D3)
AI.invadeT = 12;
AI.hurtFlee = 0;          // erken kaçış (bot D4)
AI.hurtK = 0.6;
AI.hurtAdv = 1.2;
AI.shotWait = 0;          // isabet zamanlaması (bot D6)
AI.shotHoldT = 0.8;
AI.jukeUp = 0;            // aktif yan adım (bot D6)
AI.mageCombo = 0;         // Ateş Büyücüsü: İç Ateş önce, Meteor dalgaya değil (bot D5)
AI.helpRange = 450;
AI.helpRun = 1900;        // dostumuz saldırı altındaysa ve dövüş bizim lehimizeyse en fazla bu uzaklıktan yardıma koşarız       // dostumuz dövüşteyse dövüşe girme menzili bu kadar genişler
/* Rakip kahraman seçimi: görünenlerden en kolay/tehlikesiz hedef (yakın, canı az, kulenin altında değil, dostuma vuran, aynı hedefte ısrar).
   Tek rakip varsa (1v1) eskisi gibi doğrudan o. */
function pickFoe(b, M, mode){
  let first=null, n=0;
  for(const u of S.heroes) if(u.team!==b.team){ if(!first) first=u; n++; }
  if(n<=1 || !AI.team) return first;
  const seen=M.foeSeen||(M.foeSeen={});
  const myS=S.lane[b.team].find(s=>!s.dead);
  let best=null, bc=1e18, lastU=null, lt=-1e18;
  for(const u of S.heroes){
    if(u.team===b.team) continue;
    const vis=!u.dead && (mode==='duel' || canSee(b.team,u));
    if(vis){
      seen[u.id]={ x:u.x, y:u.y, t:S.time };
      let c=dist(b,u) + (LVP(b).prio ? Math.min(900, (u.hp+(u.st.shield?u.st.shield.amt:0))/(resF(u)*Math.max(1,dps(b)+burstSum(b)/3))*AI.prioW) - Math.min(300, dps(u)*AI.prioD) : u.hp/u.maxHp*500) + (u.id===M.foeId ? -150 : 0);   // Uzman: öldürme süresi kısa ve hasarı yüksek rakip önce
      if(!heroHitSafe(b,u,u.x,u.y)) c+=300;
      if(myS && dist(u,myS)<900) c-=200;
      const xp=LVP(b).focus;   // Uzman: dostun vurduğu / seçtiği hedefe odak
      for(const a of S.heroes) if(a!==b && a.team===b.team && !a.dead && (a.dmgBy[u.id] ?? -1e9) >= S.time-3) { c-=xp ? 380 : 200; break; }
      if(xp) for(const a of S.heroes) if(a!==b && a.team===b.team && !a.dead && a.ai && a.ai.v2 && a.ai.v2.foeId===u.id) { c-=220; break; }
      if(c<bc){ bc=c; best=u; }
    } else if(!u.dead){
      const t=seen[u.id] ? seen[u.id].t : -1e9;
      if(t>lt){ lt=t; lastU=u; }
    }
  }
  const e = best || lastU || first;
  M.foeId=e.id;
  return e;
}
/* Dövüş değerlendirmesi (takım): e'ye yakın dostlar ve rakipler katılır. Tek tek ise eski tek-rakip hesabı aynen. */
function teamEval(b, e, M){
  if(!AI.team) return fightEval(b,e);
  let allies=null, others=null;
  for(const u of S.heroes){
    if(u===b || u===e || u.dead) continue;
    if(u.team===b.team){ if(dist(u,e)<AI.teamR || dist(u,b)<AI.teamR*0.6) (allies||(allies=[])).push(u); }
    else {
      let near;
      if(canSee(b.team,u)) near = dist(u,e)<AI.teamR || dist(u,b)<AI.teamR;
      else { const sn=M.foeSeen && M.foeSeen[u.id]; near = !!sn && S.time-sn.t<LVP(b).foeMemory && hyp(sn.x-e.x,sn.y-e.y)<AI.teamR*1.3; }
      if(near) (others||(others=[])).push(u);
    }
  }
  if(!allies && !others) return fightEval(b,e);
  const P=FE, mine=[b], theirs=[e];
  if(allies) for(const a of allies) mine.push(a);
  if(others) for(const f of others) theirs.push(f);
  const side=(list, vs)=>{
    let D=0, dmg=0, ehp=0, hp=0, heal=0;
    list.forEach((u,i)=>{
      const x=sideComps(u, vs, LVP(b));
      if(i>0){ x.tower=0; x.minion=0; }   // kule ve minyon katkısı bir kez sayılır
      const v=sideVal(x,P); D+=v.D; dmg+=v.dmg; ehp+=v.ehp; hp+=x.hp; heal+=x.heal;
    });
    return { D, dmg, ehp, hp, heal };
  };
  const m=side(mine, e), n=side(theirs, b);
  const myD=Math.max(1, m.D-n.heal), enD=Math.max(1, n.D-m.heal);
  const tKill=Math.max(0.2, n.hp+n.ehp-m.dmg)/myD, tDie=Math.max(0.2, m.hp+m.ehp-n.dmg)/enD;
  return { adv:Math.pow(tDie/tKill, P.k), tKill, tDie };
}

/* ---- Öğrenilmiş dövüş modeli (makine öğrenmesi, 22.10.2026) ----
   fightFeatures: botun e rakibine karşı dövüş durumu (sabit uzunlukta sayı dizisi). tools/fightdata.js bu özelliklerle veri toplar,
   tools/mltrain.js küçük bir sinir ağı eğitir (hedef: 6 sn dövüş sonunda net sonuç = rakip can kaybı - bizim can kaybımız + ölüm payı),
   ai_model.js'e yazar. mlBlend: ağın tahmini ev.adv ile log uzayında karıştırılır (LP.mlW ağırlığı; 0 kapalı). */
AI.mlW=0; AI.explore=0; AI.collect=0; AI.sink=null;
const HERO_IDS=Object.keys(HEROES);
function readyN(h){ let n=0; for(const k of ['r','e','s']) if(h.rank[k]>0 && rdy(h,k)) n++; return n; }
/* İlk 17 özellik v1 modelle aynı (model W1 genişliği kadarı okunur); 17'den sonrası v2: mutlak can, yakın can oranları, hız farkı, kontrol/kalkan, dalga, rakip kule, kahraman türleri (one-hot b, e) */
export function fightFeatures(b, e, ev, d){
  let al=0, fo=0, alHp=0, foHp=0;
  for(const u of S.heroes){ if(u===b||u===e||u.dead) continue; if(u.team===b.team){ if(dist(u,e)<AI.teamR || dist(u,b)<AI.teamR*0.6){ al++; alHp+=hpNow(u); } } else if(dist(u,e)<AI.teamR || dist(u,b)<AI.teamR){ fo++; foHp+=hpNow(u); } }
  const ft=frontTower(b.team), em=S.lane[e.team].find(s=>!s.dead);
  let om=0, fm=0; for(const m of S.minions){ if(m.dead) continue; const dd=dist(m,b); if(dd<650){ if(m.team===b.team) om++; else fm++; } }
  const f=[
    Math.log(Math.min(10,Math.max(0.1,ev.adv))), Math.min(15,ev.tKill)/5, Math.min(15,ev.tDie)/5,
    hpNow(b), hpNow(e), Math.min(2500,d)/1000, al, fo, (b.level-e.level)/5,
    ranged(b)?1:0, ranged(e)?1:0, unsafeAt(b,b.x,b.y)?1:0, (ft && dist(b,ft)<TOWER.range+150)?1:0,
    readyN(b)/3, readyN(e)/3, S.time-(b.dmgBy[e.id]??-99)<2?1:0, Math.min(2,S.time/1200),
    b.maxHp/1000, e.maxHp/1000, al?alHp/al:0, fo?foHp/fo:0, (stat(b,'spd')-stat(e,'spd'))/100,
    (b.st.freeze>0||b.st.root||b.st.silence)?1:0, (e.st.freeze>0||e.st.root||e.st.silence)?1:0, b.st.shield?Math.min(1,b.st.shield.amt/b.maxHp):0, e.st.shield?Math.min(1,e.st.shield.amt/e.maxHp):0,
    Math.min(8,om)/4, Math.min(8,fm)/4, em?Math.min(3000,dist(e,em))/1000:3, em&&dist(e,em)<em.range+e.r+60?1:0
  ];
  for(const t of HERO_IDS) f.push(b.type===t?1:0);
  for(const t of HERO_IDS) f.push(e.type===t?1:0);
  return f;
}
export function mlPredict(f){
  const M=FIGHT_MODEL; if(!M) return 0;
  const H=M.b1.length, N=M.W1[0].length, h=new Array(H);
  for(let j=0;j<H;j++){ let z=M.b1[j]; const w=M.W1[j]; for(let i=0;i<N;i++) z+=w[i]*f[i]; h[j]=Math.tanh(z); }
  let o=M.b2; for(let j=0;j<H;j++) o+=M.W2[j]*h[j];
  return o;
}
function mlBlend(b, e, ev, d, w){
  const p=mlPredict(fightFeatures(b,e,ev,d));
  return { ...ev, adv: Math.exp((1-w)*Math.log(Math.max(0.05,ev.adv)) + w*FIGHT_MODEL.k*p), ml:p };
}
/* Dostumuz (canlı) rakiple dövüşte mi? (o dostun botu M.fight tuttu ve rakip yakında) */
function allyFighting(b, e){
  if(!AI.team) return null;
  for(const a of S.heroes){
    if(a===b || a.dead || a.team!==b.team || !a.ai || !a.ai.v2 || !a.ai.v2.fight) continue;
    if(dist(a,e)<AI.teamR) return a;
  }
  return null;
}
/* Dostumuz e tarafından (son 3 sn) saldırı altında mı? */
function allyUnderAttack(b, e){
  if(!AI.team) return false;
  for(const a of S.heroes){
    if(a===b || a.dead || a.team!==b.team) continue;
    if(S.time-(a.dmgBy[e.id] ?? -1e9)<3 && dist(a,e)<AI.teamR) return true;
  }
  return false;
}
/* En yakın canlı dost (kaçarken ona doğru) */
function nearestAlly(b){
  if(!AI.team) return null;
  let best=null, bd=1e9;
  for(const a of S.heroes){ if(a===b || a.dead || a.team!==b.team) continue; const d=dist(a,b); if(d<bd){ bd=d; best=a; } }
  return best;
}
/* Yakındaki dost sıkıştı mı? (Ruh Rehberi'nin güçlü kalkanı için) */
function allyDanger(b){
  if(!AI.team) return false;
  const R=b.def.skills.s.allyR||0;
  for(const a of S.heroes){
    if(a===b || a.dead || a.team!==b.team || dist(a,b)>R-60) continue;
    if(S.time-(a.ic.lastHurt ?? -99)<1.2 && (a.hp/a.maxHp<0.65 || a.st.slow)) return true;
  }
  return false;
}
/* Takım içi sıra (yan yana beklerken ayrı dursunlar): aynı takımdaki daha küçük id'li dost sayısı */
function teamRank(b){ if(!AI.team) return 0; let r=0; for(const a of S.heroes) if(a!==b && a.team===b.team && a.id<b.id) r++; return r; }

/* ---- Zor / Uzman karar katmanları ---- */
const CC_TYPES = new Set(['hook','stunorb','shockwave','tether','slam','bomb','spiritburst','knockblow','roll']);   // kontrol yetenekleri
const INIT_TYPES = new Set(['dash','flameleap','leapslam','blink','tumble','roll','billiard','duel']);                               // dövüşe giriş yetenekleri
const ESC_TYPES = new Set(['dash','tumble','flameleap','blink','cleanse','shield','leapslam','roll']);              // kaçış yetenekleri
/* e kontrol altında mı (sersem, kök, çekiliyor)? */
const isCC = e => e.st.freeze>0.2 || e.st.root>0.2 || !!e.pulled;
/* Rakibin kaçış ve kontrol yetenekleri beklemede mi? (Zor: şimdi hazır değilse; Uzman: 1 sn içinde hazır olacaksa hazır sayar) Dönüş: adv çarpanı */
function skillWindow(e, soon){
  let esc=0, escRdy=0, cc=0, ccRdy=0;
  const lim = soon ? 1 : 0.3;
  for(const k of ['r','e','s']){
    if(e.rank[k]<=0) continue;
    const ty=e.def.skills[k].type, rd=e.cd[k]<=lim;
    if(ESC_TYPES.has(ty)){ esc++; if(rd) escRdy++; }
    if(CC_TYPES.has(ty)){ cc++; if(rd) ccRdy++; }
  }
  let m=1;
  if(esc>0 && escRdy===0) m*=1.08;   // kaçamaz: kovalamak ve bitirmek kolay
  if(cc>0 && ccRdy===0) m*=1.06;      // yakalanma riski yok
  else if(ccRdy>0) m*=0.96;
  return m;
}
/* Hazır tehlikeli yeteneğin (kanca, ışın, meteor, topçu) menzili; kanca yoldaki minyonla engelleniyorsa sayılmaz. Yoksa 0. */
function dangerR(e, b){
  let r=0;
  for(const k of ['r','e','s']){
    if(e.rank[k]<=0 || e.cd[k]>0.3) continue;
    const sk=e.def.skills[k];
    if(sk.type==='hook'){ if(!blocker(e, Math.atan2(b.y-e.y,b.x-e.x), b, sk.radius||40)) r=Math.max(r, sk.range+60); }
    else if(sk.type==='beam' || sk.type==='meteor' || sk.type==='artillery') r=Math.max(r, sk.range+40);
  }
  return r;
}
/* Zor ve Uzman: dövüş üstünlüğünü rakibin yetenek bekleme penceresine göre ayarla */
function adjustEv(b, e, ev, d, LP){
  let m=LP.win ? skillWindow(e, LP.look>0) : 1;
  if(LP.dng){ const dr=dangerR(e,b); if(dr>0 && d<dr) m*=0.88; }   // Uzman: tehlikeli yetenek hazırken dövüşü ertele
  return { adv:ev.adv*m, tKill:ev.tKill, tDie:ev.tDie };
}
/* Zor ve Uzman: ek dövüşe girme nedenleri. Kombo (rakip kontrol altında), öldürme fırsatı (canı az), rakip kendi kulemize dalmış. */
function hardFight(b, e, ev, d, engR){
  if(hpNow(b)<AI.recallHp*1.4) return false;
  if(isCC(e) && ev.adv>=0.8 && d<engR+350) return true;
  if(ev.tKill<1.8 && ev.adv>=0.8 && d<engR+300) return true;
  for(const s of S.lane[b.team]) if(!s.dead && s.sub!=='nexus' && dist(s,e)<=s.range+e.r+40){ return ev.adv>=0.7 && d<engR+250; }
  return false;
}
/* Bir tikte birden çok yetenek istenirse sırala: rakip kontrol altındaysa hasar önce, değilse kontrol/giriş önce (Güçlendir en başta) */
function pickSkill(cands, ccWin){
  const pri = c => c.type==='mantra' ? 0 : c.type==='transform' ? 3 : (CC_TYPES.has(c.type) || INIT_TYPES.has(c.type)) ? (ccWin?2:1) : (ccWin?1:2);
  let best=cands[0];
  for(const c of cands) if(pri(c)<pri(best)) best=c;
  return best;
}

/* Mermi nişanı: hedefin hızına göre önden nişan alır (hazırlık + uçuş süresi) */
function leadAim(b, u, wind, speed, M){
  const lf=u.kind==='hero' ? LVP(b).lead : 1, vx=((u.vx||0)+(u.kx||0))*lf, vy=((u.vy||0)+(u.ky||0))*lf;   // seviye: hareket tahmininin ne kadarı kullanılır
  let tx=u.x, ty=u.y;
  for(let i=0;i<3;i++){
    const tt=wind+Math.max(0,hyp(tx-b.x,ty-b.y)-b.r)/speed;
    tx=u.x+vx*tt; ty=u.y+vy*tt;
  }
  return Math.atan2(ty-b.y, tx-b.x) + (u.kind==='hero' ? M.noise : 0);
}
function aimAt(b, u, M){
  const at=atkDef(b);
  if(at.type!=='projectile'){
    const vx=(u.vx||0)+(u.kx||0), vy=(u.vy||0)+(u.ky||0);
    return Math.atan2(u.y+vy*0.08-b.y, u.x+vx*0.08-b.x);
  }
  const wind = b.atk.state==='windup' ? Math.max(0,b.atk.t) : timings(b).wind;
  return leadAim(b, u, wind, at.projSpeed, M);
}
/* b'den ang yönünde, hedefe varmadan önce yoldaki ilk düşman birimi (mermi ilk değdiğine çarpar) */
function blocker(b, ang, target, width){
  const ux=Math.cos(ang), uy=Math.sin(ang), tD=target ? dist(b,target) : 1e9;
  let best=null, bd=1e9;
  for(const u of S.minions){
    if(u.dead || u.team===b.team || u===target) continue;
    const rx=u.x-b.x, ry=u.y-b.y, along=rx*ux+ry*uy;
    if(along<=0 || along>=tD) continue;
    if(Math.abs(rx*-uy+ry*ux) < u.r+width && along<bd){ bd=along; best=u; }
  }
  return best;
}

/* Kaçınma: uçan mermilerden ve bize nişan alan hazırlıklardan yana çekil (tepki gecikmesiyle) */
function dodgeVec(b, e, eVis, M){
  let vx=0, vy=0;
  const LP=LVP(b), RC=LP.react;
  const side=(ux,uy,rx,ry,need,w,tt)=>{
    if(tt!==undefined && tt>LP.dodgeT) return;   // Uzman: yan adımı son anda atar
    need+=LP.dodgeNeed; w*=LP.dodgeW;
    const perp=rx*-uy+ry*ux;
    if(Math.abs(perp)>=need) return;
    let s=perp>=0?1:-1;
    const ny=b.y+ux*s*60;
    if(ny<b.r+30 || ny>WORLD.h-b.r-30) s=-s;      // duvara doğru kaçma
    const k=((need-Math.abs(perp))/need+0.5)*w;
    vx+=-uy*s*k; vy+=ux*s*k;
  };
  for(const p of S.projs){
    if(p.team===b.team || !p.owner || p.owner.kind!=='hero' || !isFinite(p.x)) continue;
    let t0=M.seen.get(p);
    if(t0===undefined){ t0=S.time+RC[0]+rand()*(RC[1]-RC[0]); M.seen.set(p,t0); }
    if(S.time<t0) continue;
    const sp=hyp(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, rx=b.x-p.x, ry=b.y-p.y, along=rx*ux+ry*uy;
    if(along<0 || along>p.max-p.dist+b.r) continue;
    side(ux,uy,rx,ry,b.r+p.r+8,2,along/sp);
  }
  // Düşman alan saldırısının (meteor) içindeysek dışarı çık
  for(const z of S.zones||[]){
    if(z.kind==='arena'){   // Gladyatör Arena zarar vermez: rakip kaçmaz; sahibi dışındaysa ve rakip yakındaysa merkeze çekilir
      if(z.owner===b && !z.dead && eVis && hyp(e.x-z.x,e.y-z.y)<z.r+220){ const rx=z.x-b.x, ry=z.y-b.y, l=hyp(rx,ry)||1; if(l>z.r*0.7){ vx+=rx/l*1.5; vy+=ry/l*1.5; } }
      continue;
    }
    if(z.team===b.team) continue;
    let t0=M.seen.get(z);
    if(t0===undefined){ t0=S.time+RC[0]+rand()*(RC[1]-RC[0]); M.seen.set(z,t0); }
    if(S.time<t0) continue;
    const rx=b.x-z.x, ry=b.y-z.y, l=hyp(rx,ry)||1;
    if(l<z.r+b.r+10){ vx+=rx/l*2.5; vy+=ry/l*2.5; }
  }
  // Rakip kahraman bize nişan alıyor (yetenek hazırlığı ya da okçu düz vuruş hazırlığı)
  if(eVis){
    let ang=null, width=0, len=0;
    // LoL gibi: rakibin hazırlığını yalnız oyuncuya da görünen istisnalar için okur (Uzun Işın hazırlığı); diğerlerinde
    // yalnız havadaki mermiye tepki verir (üstteki projs döngüsü). Meteor/Şok Bombası/Kök Sal alanları S.zones, Yaylım/Lanet ayrı.
    if(e.cast && e.def.skills[e.cast.k].type==='beam'){
      const sk=e.def.skills[e.cast.k];
      ang=e.cast.aim; len=sk.range+e.r+40; width=sk.radius;
    }
    if(e.cast && e.cast.wind && e.def.skills[e.cast.k].type==='shockwave'){   // Şok Dalgası hazırlığı: halkanın dışına çık (tepki gecikmesiyle)
      const sk=e.def.skills[e.cast.k], rx=b.x-e.x, ry=b.y-e.y, l=hyp(rx,ry)||1;
      if(e.cast!==M.swRef){ M.swRef=e.cast; M.swAt=S.time+RC[0]+rand()*(RC[1]-RC[0]); }
      if(S.time>=M.swAt && l<sk.radius+b.r+30){ vx+=rx/l*3; vy+=ry/l*3; }
    }
    const ref=ang!==null ? e.cast : null;
    if(ref && ref!==M.threatRef){ M.threatRef=ref; M.threatAt=S.time+RC[0]+rand()*(RC[1]-RC[0]); }
    if(ang!==null && S.time>=M.threatAt){
      const ux=Math.cos(ang), uy=Math.sin(ang), rx=b.x-e.x, ry=b.y-e.y, along=rx*ux+ry*uy;
      if(along>0 && along<len) side(ux,uy,rx,ry,width+b.r+8,1.6);
    }
  }
  return { x:vx, y:vy };
}

/* ---- öldürme penceresi, dürtme, çalı (12.10.2026) ---- */
/* Hasar türü yetenek değerlerinin toplamı (bonus ve kalkan türleri hariç) */
function burstSum(h){ let s=0; for(const [t,v] of Object.entries(burstRaw(h,0))) if(!BONUS_T[t] && !EHP_T[t]) s+=v; return s; }
const resF = (u) => 100/(100+Math.max(0,(stat(u,'armor')+stat(u,'mr'))/2));
/* Rakibi şimdi öldürebilir miyiz? myDmg: hazır yetenekler + birkaç düz vuruş (direnç sonrası), ehp: rakibin canı + kalkanı,
   eDmg: aynı sürede bize gelecek hasar (rakip ve yakınındaki dostlarının patlaması + 2 sn düz vuruş, gerekirse kule) */
/* Beceri atışlarının öldürme hesabındaki isabet payı (kaçılabilir; Uzman/Zor kwHit). Hedefli ve alan dışı yetenekler 1. */
const SHOT_TYPES=new Set(['fireball','hook','tether','beam','stunorb','spiritburst','groworb','boomerang','bomb','bigarrow']);   // kaçılabilir beceri atışları (bot D6)
const SHOT_HIT={ fireball:0.6, meteor:0.55, beam:0.6, orb:0.6, sburst:0.6, gorb:0.6, bomb:0.6, hook:0.55, tether:0.6, art:0.35, bigarrow:0.6, boomerang:0.7, bloodnova:0.7, roll:0.7, ball:0.6 };
function burstHit(h){ let s=0; for(const [t,v] of Object.entries(burstRaw(h,0))) if(!BONUS_T[t] && !EHP_T[t]) s+=v*(SHOT_HIT[t]??1); return s; }
function killCalc(b, e){
  const autos = ranged(b) ? 2 : 2.5;
  const myDmg=((LVP(b).kwHit ? burstHit(b) : burstSum(b))+atkDmg(b)*hitMult(b)*autos)*resF(e)+burnOf(b)*2;
  let ehp=e.hp+(e.st.shield?e.st.shield.amt:0);
  const Z=e.bonus && e.bonus.stasis; if(Z && (e.ic.stasisCd||0)<=S.time) ehp+=e.maxHp*Z.hp;   // Kum Saati hazır: ölümcül vuruştan sonra heykel ve küçük canla kalkış
  let eDmg=0;
  for(const u of S.heroes) if(u.team!==b.team && !u.dead && (u===e || (canSee(b.team,u) && dist(u,e)<700))) eDmg+=(burstSum(u)+dps(u)*2)*resF(b);
  if(!heroHitSafe(b,e,e.x,e.y)) eDmg+=towerChampHit(0, S.time)+towerChampHit(1, S.time);
  return { myDmg, ehp, eDmg };
}
/* Öldürme penceresi: rakip erişimde (düz vuruş, yetenek ya da atılış menzili) ve hasarımız canını götürüyor, karşı hasar canımızı geçmiyor.
   Olasılıklı ve hatalı: pencereyi fark etme (killSense) ve hasar tahmini (misjudge) her ~1,5 sn yeniden çekilir; kişilik risk payını belirler.
   Kendi can eşiğimizden önce gelir (çekilme kararını ezer). */
function killWindow(b, e, d, M){
  if(!e || e.dead || e.stasis>0) return false;
  const LP=LVP(b), P=M.pers;
  if(S.time>=(M.kwT||0)){ M.kwT=S.time+1.2+rand()*0.6; M.kwRoll=rand(); M.kwMis=1+(rand()*2-1)*LP.misjudge; }
  if(!LP.kwOn || M.kwRoll>LP.killSense) return false;
  let mob=0;
  for(const k of ['r','e','s']){ const sk=b.def.skills[k]; if(rdy(b,k) && INIT_TYPES.has(sk.type)) mob=Math.max(mob, sk.dist||sk.dMax||sk.range||0); }
  const reach=Math.max(reachTo(b,e), skillReach(b), reachTo(b,e)+mob)+60;
  if(d>reach) return false;
  const k=killCalc(b,e);
  if(k.myDmg*M.kwMis < k.ehp) return false;
  const margin=b.hp+(b.st.shield?b.st.shield.amt:0);
  // rakip kulesinin altında: yalnız kesin ve hızlı öldürme (kule ölümlerini azaltır)
  if(!heroHitSafe(b,e,e.x,e.y) && (k.myDmg*M.kwMis < k.ehp*1.25 || hpNow(b)<0.4 || k.eDmg > margin*0.8)) return false;
  return k.eDmg < margin*P.risk || k.myDmg*M.kwMis > k.ehp*1.6;
}
/* Dürtme yetenekleri (uzaktan hasar) */
const POKE_T = new Set(['fireball','ignite','beam','groworb','spiritburst','tether','bloodbolt','boomerang','bigarrow','volley','hook','stunorb','bomb','meteor','blink']);
/* Dürtme planı: hazır dürtme yeteneği varsa onun menziline (rakibe göre) yaklaşacağımız nokta; güvenli değilse null.
   Kullanınca (tradeBack) kısa süre geri çekiliriz (alışveriş: vur ve çekil). */
function pokePlan(b, e, d, ev, M){
  if(S.time<(M.tradeBack||0) || hpNow(b)<0.35) return null;
  const LP=LVP(b), P=M.pers;
  if(S.time>=(M.pokeT||0)){ M.pokeT=S.time+2+rand()*2; M.pokeRoll=rand()<Math.min(0.97, LP.pokeP*P.poke); }
  if(!M.pokeRoll || !LP.pokeOn) return null;
  let best=null;
  for(const k of ['r','e','s']){
    const sk=b.def.skills[k];
    if(!rdy(b,k) || !POKE_T.has(sk.type) || !sk.range) continue;
    if(k==='s' && sk.type!=='bigarrow') continue;   // büyük yetenek dürtmeye harcanmaz
    let r=sk.range;
    if(sk.type==='groworb') r=sk.range*0.92; else if(sk.type==='bigarrow') r=Math.min(sk.range, 950); else if(sk.type==='blink') r=sk.range+(sk.radius||0)*0.5;
    if(!best || r>best.r) best={ k, r, type:sk.type };
  }
  if(!best) return null;
  const want=best.r-35+e.r*0.5;
  if(d>want+420) return null;   // çok uzak: önce koridor
  // yakın dövüşçü rakibe karşı tehdit menziline (atılış dahil) çok girmeyelim; üstün değilsek
  if(!ranged(e) && want<threatR(e,b)-30 && !(ev && ev.adv>=1.05)) return null;
  if(ev && ev.adv<0.55) return null;
  const sp=standPoint(b, e, want);
  if(!heroHitSafe(b,e,sp.x,sp.y) || unsafeAt(b,sp.x,sp.y) || inWall(sp.x,sp.y,b.r+4)) return null;
  return { x:sp.x, y:sp.y, k:best.k };
}
/* Çalı merkezleri (bekleme ve kaçış için) */
const BUSH_PTS = BUSHES.map(bu=>{
  if(bu.c) return { x:bu.c[0], y:bu.c[1] };
  if(bu.poly){ let x=0, y=0; for(const q of bu.poly){ x+=q[0]; y+=q[1]; } x/=bu.poly.length; y/=bu.poly.length; if(bushAt(x,y)===null || bushAt(x,y)<0){ y-=20; } return { x, y }; }
  return { x:bu.x+bu.w/2, y:bu.y+bu.h/2 };
}).filter(p=>{ const i=bushAt(p.x,p.y); return i!==null && i>=0; });
function bushNear(x, y, R, b){
  let best=null, bd=R;
  for(const p of BUSH_PTS){ const dd=hyp(p.x-x,p.y-y); if(dd<bd && !unsafeAt(b,p.x,p.y)){ bd=dd; best=p; } }
  return best;
}

/* ---- karar katmanları ---- */

/* Dövüş hareketi: okçu mesafe korur, yakın dövüşçü üstüne gider; ikisi de nişandan kaçmak için yön değiştirir */
function foeShotReady(e, d){ for(const k of ['r','e','s']){ const sk=e.def.skills[k]; if(sk && SHOT_TYPES.has(sk.type) && rdy(e,k) && d<(sk.range||600)+60) return true; } return false; }
function fightMove(b, e, M, ev){
  const dx=e.x-b.x, dy=e.y-b.y, d=hyp(dx,dy)||1, nx=dx/d, ny=dy/d, px=-ny, py=nx;
  const eR=ranged(e);
  let radial, side;
  if(ranged(b)){
    const my=reachTo(b,e);
    // yakın dövüşçüye karşı: düz vuruş menzili kısa ama hazır yetenek menzili uzunsa, yetenek menzilinden oyna
    const safeD=threatR(e,b)+LVP(b).keepMelee, sr=skillReach(b);
    // yakın dövüşçünün tehdit menziline (atılış dahil) girme; düz vuruş yetişmiyorsa yeteneklerle oyna
    let keep = eR ? my-25 : (my-20>=safeD ? my-20 : (sr>safeD ? safeD+20 : safeD));
    if(ev.adv>2.5) keep=Math.min(keep, my-20);
    if(AI.human) keep+=M.rangeErr||0;   // insansı: mesafeyi kusursuz tutmaz
    radial = d>keep+25 ? 1 : d<keep-25 ? -1 : 0;
    side = M.juke*(eR?0.7:0.35);
    if(LVP(b).jukeUp && eR && foeShotReady(e,d)) side = M.juke*1.1;   // aktif yan adım (bot D6): rakibin kaçılabilir atışı hazır ve menzildeyken
  } else {
    radial=1;
    side = eR ? M.juke*(d>250?0.55:0.2) : M.juke*0.15;
  }
  // (düz vuruş güdümlü: yoldaki minyon engellemez, yana kaymaya gerek yok)
  let mx=nx*radial+px*side, my=ny*radial+py*side;
  // geri çekilirken kendi üssümüze doğru kaç (rakip arkamıza geçtiyse düşman tarafına koşma)
  if(radial<0){ mx+=homeDir(b)*LVP(b).homeBias; }
  return { x:mx, y:my };
}

/* Koridor: yapı (tank varken) > düşman minyonu > dalganın arkasında bekle */
/* Son vuruş: vuruşumuz varana kadar minyonun canı ne olur? (dost minyon ve kule hasarı tahmini) */
function incomingDps(m){
  let d=0;
  for(const u of S.minions) if(!u.dead && u.team!==m.team && u.atk.main===m) d+=u.def.dmg*(u.dmgMult||1)/u.def.period;
  for(const s of S.structs) if(!s.dead && s.team!==m.team && s.tgt===m) d+=towerMinionHit(m)/TOWER.interval;
  return d;
}
/* m'ye önümüzdeki T saniyede inecek hasar olayları (zaman, miktar): minyon vuruşları, kule atışları, havadaki mermiler */
function hitEvents(m, T){
  const ev=[];
  for(const u of S.minions){
    if(u.dead || u.team===m.team || u.atk.main!==m) continue;
    const d=u.def, per=d.period, dmg=d.dmg*(u.dmgMult||1);
    const fly = d.kind==='proj' ? Math.max(0,dist(u,m)-u.r-m.r)/d.projSpeed : 0;
    let t1 = u.atk.state==='windup' ? Math.max(0,u.atk.t)+fly : u.atk.state==='recovery' ? Math.max(0,u.atk.t)+d.wind+fly : d.wind+fly;
    if(d.kind==='proj' && u.atk.state==='recovery') t1=Math.max(0,u.atk.t)+d.wind+fly;   // önceki mermi aşağıda sayılır
    for(let t=t1; t<=T; t+=per) ev.push([t,dmg]);
  }
  for(const p of S.projs){
    if(p.team===m.team || !p.owner || p.owner.kind!=='minion') continue;
    const dx=m.x-p.x, dy=m.y-p.y, dd=hyp(dx,dy), sp=hyp(p.vx,p.vy)||1;
    if((dx*p.vx+dy*p.vy)/(dd*sp)>0.97) ev.push([dd/sp, p.dmg]);
  }
  for(const s of S.structs){
    if(s.dead || s.team===m.team || s.tgt!==m) continue;
    const fly=dist(s,m)/TOWER.boltSpeed, dmg=towerMinionHit(m);
    for(let t=Math.max(0,s.cd)+fly; t<=T; t+=TOWER.interval) ev.push([t,dmg]);
  }
  for(const bo of S.bolts) if(bo.target===m && bo.team!==m.team) ev.push([dist(bo,m)/bo.speed+(bo.delay>0?bo.delay:0), bo.dmg]);
  return ev.sort((x,y)=>x[0]-y[0]);
}
function lastHitInfo(b, m){
  const at=atkDef(b), tm=timings(b);
  const wind = b.atk.state==='windup' ? Math.max(0,b.atk.t) : tm.wind;
  const lead = wind + (at.type==='projectile' ? Math.max(0,dist(b,m)-b.r)/at.projSpeed : 0);   // vuruşumuzun inme süresi
  const LP=LVP(b), myD=atkDmg(b)*hitMult(b)*0.97, horizon=lead+tm.period*LP.lhPushGuard+0.5;
  const ev=hitEvents(m, horizon);
  let hp=m.hp, hpAtLead=m.hp, dieBefore=false, tUntil=hp<=myD?0:1e9;
  for(const [t,dmg] of ev){
    hp-=dmg;
    if(t<lead){ hpAtLead=hp; if(hp<=0) dieBefore=true; }
    if(tUntil===1e9 && hp<=myD && hp>0) tUntil=Math.max(0,t-lead);
    if(hp<=0) break;
  }
  const now = !dieBefore && hpAtLead>0 && hpAtLead<=myD;
  return { now, soon: !now && tUntil<=tm.period*LP.lhSoon, tUntil: now?0:tUntil, pred:hpAtLead };
}

function laneMove(b, e, eVis, M, ev){
  const dir=b.team===0?1:-1;
  let tgt=null, stand=null;
  const st=S.lane[1-b.team].find(s=>!s.dead);
  let dive=false;
  const outn=outnumbered(b), ownT=frontTower(b.team);
  if(outn) M.outn=S.time;
  // rakiplerin hepsi ölüyse (en az birkaç sn) kuleye yürü ve vur: öldürmeyi yapıya çevir
  let foesDown=true; for(const u of S.heroes) if(u.team!==b.team && !(u.dead && u.respawn>3)) { foesDown=false; break; }
  M.foesDown=foesDown;
  const pushAdv = !foesDown && ((LVP(b).numAdv && numEdge(b)>0) || (LVP(b).lateSiege && S.time/60>=LVP(b).lateSiege && numEdge(b)>=0)) && alliesAround(b,b.x,b.y,LVP(b).numAllyR)>0;   // sayı üstünlüğü: dostla birlikte kuleye
  M.pushAdv=pushAdv;
  if(st && !st.prot && dist(b,st)<((foesDown || pushAdv) && LVP(b).siege ? 4200 : 1600) && !outn){
    const sp=findStand(b, st, reachTo(b,st)-15);
    if(sp){ tgt=st; stand=sp; }
    else if(canDive(b,st,e,M)){ tgt=st; stand=standPoint(b, st, reachTo(b,st)-15); dive=true; }
  }
  let hold=false;
  {
    let best=1e9, bestInfo=null, mTgt=null, mStand=null, soonest=1e9;
    const meleeThreat = eVis && ranged(b) && !ranged(e) && !(ev && ev.adv>=LVP(b).engageAdv);
    for(const m of S.minions){
      if(m.dead || m.team===b.team || !canSee(b.team,m)) continue;
      const dd=dist(b,m); if(dd>950) continue;
      if(outn && ownT && dist(m,ownT)>TOWER.range+60) continue;   // sayıca azken yalnız kule altındaki dalgayı temizle
      const sp=findStand(b, m, reachTo(b,m)-12);
      if(!sp) continue;
      // menzilli: yakın dövüşçünün tehdit menzilinde minyon kesme (uzakta durup yetenekle kes)
      if(meleeThreat && hyp(sp.x-e.x,sp.y-e.y) < threatR(e,b)+LVP(b).keepMelee) continue;
      // son vuruş önceliği: şimdi öldürebileceğimiz minyon en önde, en kısa sürede son vuruşluk olacak ikinci
      const li=lastHitInfo(b,m);
      if(dd<reachTo(b,m)+150) soonest=Math.min(soonest, li.tUntil);
      const sc = li.now ? -5000+li.pred : li.soon ? -2500+li.tUntil*100+dd*0.5 : dd+m.hp*0.6;
      if(sc<best){ best=sc; mTgt=m; mStand=sp; bestInfo=li; }
    }
    // yapıya vuruyorsak bile menzildeki son vuruşu kaçırma
    const inReach = mTgt && dist(b,mTgt)<=reachTo(b,mTgt);
    if(mTgt && (!tgt || (bestInfo.now && inReach)) && !(foesDown && LVP(b).siege && tgt && tgt.kind==='struct' && !bestInfo.now)){
      tgt=mTgt; stand=mStand; dive=false;
      // son vuruş yakınsa bekle: canı dolu minyona vurup ritmi bozma (dost minyon vuruyorsa)
      if(!bestInfo.now && bestInfo.soon && incomingDps(mTgt)>0) hold=true;
      // dalgayı itmek için vurmak, yakında gelecek bir son vuruşu kaçırtacaksa vurma
      if(!bestInfo.now && !bestInfo.soon && soonest<=timings(b).period*LVP(b).lhPushGuard) hold=true;
    }
  }
  let mv;
  if(!tgt && S.camps.length){ const jc=laneCamp(b, eVis); if(jc){ tgt=jc.tgt; stand={ x:b.x+jc.mv.x, y:b.y+jc.mv.y }; } }
  if(tgt){
    const dx=stand.x-b.x, dy=stand.y-b.y;
    mv = hyp(dx,dy)<10 ? { x:0, y:0 } : { x:dx, y:dy };
  } else {
    // dalganın biraz arkasında, yoksa kendi en öndeki kulemizin önünde bekle
    // koridor üzerindeki ilerlemeyle: en öndeki dost minyonun biraz gerisi, yoksa en öndeki kulemizin önü
    const ld=laneDir(b.team);
    let fs_=null;
    for(const m of S.minions) if(!m.dead && m.team===b.team){ const s=laneProject(m.x,m.y).s; if(fs_===null || s*ld>fs_*ld) fs_=s; }
    const own=S.lane[b.team].find(s=>!s.dead && s.sub!=='nexus') || S.lane[b.team][3];
    let gs = fs_!==null ? fs_-ld*(ranged(b)?190:80) : laneProject(own.x,own.y).s+ld*130;
    if(outn){ const ts=laneProject(own.x,own.y).s-ld*120; if(gs*ld>ts*ld) gs=ts; }   // sayıca azken kulenin arkasında bekle
    if(AI.team && AI.cohesion){   // 2v2: dostumuzdan çok öne geçip tek başına beklemeyiz
      const al=nearestAlly(b);
      if(al && al.role!=='jungle' && !(al.ai.v2 && al.ai.v2.recall)){ const as=laneProject(al.x,al.y).s, lim=as+ld*LVP(b).cohesionGap; if(lim*ld<gs*ld) gs=lim; }
    }
    let gp=lanePoint(gs), side=b.team===0?70:-70;
    if(teamRank(b)===1) side=-side;   // 2v2: iki dost yan yana dursun, üst üste binmesin
    let gx=gp.x-gp.ty*side, gy=gp.y+gp.tx*side;
    for(let i=0;i<40 && unsafeAt(b,gx,gy);i++){ gs-=ld*40; gp=lanePoint(gs); gx=gp.x-gp.ty*side; gy=gp.y+gp.tx*side; }
    // Çalı: beklerken yakında çalı varsa bazen içinde bekle (yakın dövüşçüler daha çok: pusu)
    if(S.time>=(M.bushT||0)){ M.bushT=S.time+5+rand()*5; M.bushGo = rand() < LVP(b).bushP*(ranged(b)?0.5:1.2)*(0.5+M.pers.bush); }
    if(M.bushGo && !outn && LVP(b).bushOn){ const bp=bushNear(gx,gy,450,b); if(bp){ gx=bp.x; gy=bp.y; } }
    const dx=gx-b.x, dy=gy-b.y;
    mv = hyp(dx,dy)<20 ? { x:0, y:0 } : { x:dx, y:dy };
  }
  // Güçlü rakipten uzak dur (eşit güçteyse dalgayla oynamaya devam)
  const LPl=LVP(b), dgr = LPl.dng && eVis ? dangerR(e,b) : 0;   // Uzman: hazır tehlikeli yeteneğin menzilinden uzak dur
  const kd = !!M.inDanger;   // rakibin öldürme penceresindeyiz: menzilinden çık
  if(eVis && ev && (ev.adv<LVP(b).fleeAdv || (dgr>0 && ev.adv<1.3) || kd)){
    const d=dist(b,e), tr = kd ? Math.max(threatR(e,b), skillReach(e))+120 : ev.adv<LVP(b).fleeAdv ? threatR(e,b) : Math.max(threatR(e,b), dgr);
    if(d<tr){
      const l=hyp(mv.x,mv.y)||1, w=(tr-d)/tr*2.5+0.6;
      mv={ x:mv.x/l+(b.x-e.x)/d*w+homeDir(b)*LVP(b).homeBias*w, y:mv.y/l+(b.y-e.y)/d*w };
      // kaçarken canımız azsa yakındaki çalıya (rakipten uzak tarafta) gir: görüşü kır
      if(hpNow(b)<0.5){ const bp=bushNear(b.x,b.y,380,b); if(bp && hyp(bp.x-e.x,bp.y-e.y)>d){ const bl=hyp(bp.x-b.x,bp.y-b.y)||1; mv.x+=(bp.x-b.x)/bl*w*0.8; mv.y+=(bp.y-b.y)/bl*w*0.8; } }
      // 2v2: kaçarken yakın dosta doğru çekil (birlikte dövüşmek için)
      const al=nearestAlly(b);
      if(al && dist(al,e)>d*0.8){ const ad=dist(al,b)||1; if(ad>200 && ad<1800){ mv.x+=(al.x-b.x)/ad*w*0.6; mv.y+=(al.y-b.y)/ad*w*0.6; } }
      // Zor: kaçarken kendi kulemizin altına çek (kovalayan rakip kuleye girer, kule ve minyonlar yardım eder)
      if(LPl.bait){
        const ot=S.lane[b.team].find(s=>!s.dead && s.sub!=='nexus'), od=ot ? dist(b,ot) : 0;
        if(ot && od>120 && dist(ot,e)>od-100){ mv.x+=(ot.x-b.x)/od*w*0.9; mv.y+=(ot.y-b.y)/od*w*0.9; }
      }
    }
  }
  M.dive=dive;
  return { mv, tgt, dive, hold };
}

/* Yan Atılış yönü: yakın dövüşçü tehdit menzilindeyse rakipten uzağa, değilse ve vuruş hazırsa yana (menzili koruyarak).
   Duvara ya da rakip kule menziline inmez. Uygun yön yoksa null. */
function tumbleAim(b, e, sk, M, d){
  const away=Math.atan2(b.y-e.y, b.x-e.x), toward=away+Math.PI, cands=[];
  const flee = !ranged(e) && d<threatR(e,b);
  if(flee){ for(const o of [0,0.5,-0.5,1,-1]) cands.push(away+o); }
  else if(b.atk.state==='ready' && inAttackRange(b,e)){ for(const s of [M.juke,-M.juke]) cands.push(toward+s*Math.PI/2, toward+s*(Math.PI/2-0.5)); }
  else return null;
  const keep=reachTo(b,e)-15;
  for(const a of cands){
    const c=Math.cos(a), s=Math.sin(a), lx=b.x+c*sk.dist, ly=b.y+s*sk.dist, mx=b.x+c*sk.dist/2, my=b.y+s*sk.dist/2;
    if(inWall(lx,ly,b.r+4) || inWall(mx,my,b.r+4) || unsafeAt(b,lx,ly)) continue;
    const nd=hyp(lx-e.x, ly-e.y);
    if(flee){ if(nd<=d+30) continue; }
    else if(nd>keep || nd<b.r+e.r+60) continue;
    return a;
  }
  return null;
}
/* Alevli Sıçrayış a yönüne güvenli mi? Yol ve iniş duvarda değil, iniş rakip kule menzilinde değil. */
function leapOK(b, a, dist){
  const c=Math.cos(a), s=Math.sin(a);
  for(const f of [0.5,1]) if(inWall(b.x+c*dist*f, b.y+s*dist*f, b.r+4)) return false;
  return !unsafeAt(b, b.x+c*dist, b.y+s*dist);
}
/* b'den e'ye çizgi üstünde rakip yapı var mı? (Kilitli Yaylım mermisini yapı alır) */
function structOnLine(b, e, w){
  const sx=e.x-b.x, sy=e.y-b.y, l2=sx*sx+sy*sy||1;
  for(const s of S.structs){
    if(s.dead || s.team===b.team) continue;
    const t=Math.max(0, Math.min(1, ((s.x-b.x)*sx+(s.y-b.y)*sy)/l2));
    if(hyp(s.x-(b.x+sx*t), s.y-(b.y+sy*t)) <= s.r+w+4) return true;
  }
  return false;
}
/* Zincir atılabilir mi: görünen rakip menzilde (bağ için pay bırakarak), yolda rakip minyon yok, kendimiz güvendeyiz; dövüşte ya da dürterken.
   Dönüş: nişan açısı ya da null. */
function tetherPlan(b, e, eVis, d, fight, M, sk, ev){
  if(!eVis || M.recall || b.ic.tether || e.stasis>0 || e.pulled || d-e.r>=sk.range-80) return null;
  if(!(fight || M.poking || (ev && ev.adv>=LVP(b).pokeAdv))) return null;
  const ang=leadAim(b,e,sk.cast,sk.speed,M);
  if(!heroHitSafe(b,e,b.x,b.y) || unsafeAt(b,b.x,b.y) || blocker(b,ang,e,sk.radius)) return null;
  return ang;
}
/* Gölge Adımı hedefi: { x, y, esc }. Kaçış: canı düşük ve rakip üstündeyse üsse doğru (rakipten uzaklaşan, duvarsız, kule dışı bir nokta).
   Giriş/kombo: dövüşte, patlama alanı rakibe değecek yere (rakipten ~130 geride iner), güvenliyse. */
function blinkPlan(b, e, eVis, d, fight, M, sk, ev){
  if(!eVis || e.stasis>0) return null;
  if(hpNow(b)<AI.recallHp*1.8 && d<threatR(e,b)+120){
    const home=Math.atan2(b.spawnY-b.y, b.spawnX-b.x);
    for(const o of [0,0.5,-0.5,1,-1]){
      const a=home+o, nx=b.x+Math.cos(a)*sk.range, ny=b.y+Math.sin(a)*sk.range;
      if(!inWall(nx,ny,b.r+4) && !unsafeAt(b,nx,ny) && hyp(nx-e.x,ny-e.y)>d+80) return { x:nx, y:ny, esc:true };
    }
    return null;
  }
  // bot T4 (Uzman, blinkGate): içeri giriş yalnız öldürme penceresi, rakip köklü/sersem/çekilmiş ya da açık üstünlükte (Gölge dibe inip ölüyordu)
  if(LVP(b).blinkGate && !(M.kw || e.st.root>0.2 || e.st.freeze>0.2 || e.pulled || (ev && ev.adv>=LVP(b).blinkAdv))) return null;
  if((fight || M.poking) && !M.recall && hpNow(b)>=0.45 && d>200 && d<sk.range+sk.radius-30){
    const t=Math.min(sk.range, d-130), ux=(e.x-b.x)/d, uy=(e.y-b.y)/d, px=b.x+ux*t, py=b.y+uy*t;
    if(inWall(px,py,b.r+4) || unsafeAt(b,px,py) || !heroHitSafe(b,e,px,py)) return null;
    if(hyp(px-e.x,py-e.y)-e.r>sk.radius-15) return null;
    return { x:px, y:py, esc:false };
  }
  return null;
}

/* Kilitli Yaylım kanallanırken: hareket komutu kanallamayı iptal eder, o yüzden iptal sebebi yoksa durdur */
function holdChannel(b, cmd){
  const e=mem(b).foe || S.heroes.find(u=>u.team!==b.team); if(!e) return;
  const d=dist(b,e), tr=threatR(e,b);
  const melee = !ranged(e) && d<tr+20;                                   // yakın dövüşçü üstüne geldi
  const danger = (hpNow(b)<AI.recallHp && d<tr+60) || !!unsafeAt(b,b.x,b.y);   // canımız azaldı ya da kule menziline girdik
  if(melee || danger){   // iptal: normal hareket gider, hareket yoksa kaçış yönü ver
    if(!cmd.mx && !cmd.my){ const dx=b.x-e.x, dy=b.y-e.y, l=hyp(dx,dy)||1; cmd.mx=dx/l; cmd.my=dy/l; }
    return;
  }
  cmd.mx=0; cmd.my=0; cmd.attack=false; cmd.rmb=false; cmd.e=false; cmd.space=false; cmd.recall=false;
  cmd.aim=Math.atan2(e.y-b.y, e.x-b.x);
}

/* Kök Sal güvenli mi? Yakında yakın dövüşçü rakip, rakip kule menzili, rakip minyon ya da yaklaşan tehdit yok */
function artSafe(b, e, eVis, dd){
  if(unsafeAt(b,b.x,b.y,120)) return false;
  for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<380) return false;
  if(eVis){
    const tr=threatR(e,b);
    if(!ranged(e) ? dd<tr+420 : dd<reachTo(e,b)+160) return false;
  } else if(dd<700) return false;
  return true;
}
/* Kök Sal atış noktası: rakibin 0,6 sn sonraki tahmini yeri (sersemse yerinde); görünmüyorsa son görülen yer + hız */
function artAim(b, e, eVis, L, sk){
  if(eVis){
    const kk=e.st.freeze>0 ? 0 : 1;
    return { x:e.x+((e.vx||0)+(e.kx||0))*sk.delay*kk, y:e.y+((e.vy||0)+(e.ky||0))*sk.delay*kk };
  }
  return { x:L.x+(L.vx||0)*sk.delay, y:L.y+(L.vy||0)*sk.delay };
}
/* Kök Sal kanallanırken: hareket komutu kanallamayı iptal eder, o yüzden iptal sebebi yoksa durdur. Atışlar ~1,6 sn arayla. */
function artChannel(b, cmd){
  const M=mem(b), c=b.chan, sk=b.def.skills[c.k];
  const e=M.foe || S.heroes.find(u=>u.team!==b.team); if(!e){ return; }
  const eVis=!e.dead && canSee(b.team,e), d=dist(b,e);
  if(M.artC!==c){ M.artC=c; M.artT=S.time+1.6; }   // ilk atış başlarken yapıldı
  const tr=threatR(e,b);
  const melee = eVis && !ranged(e) && d<tr+60;                                  // yakın dövüşçü yetişti
  const danger = hpNow(b)<AI.recallHp || !!unsafeAt(b,b.x,b.y) || (eVis && ranged(e) && d<reachTo(e,b)+40 && hpNow(b)<0.5);
  if(melee || danger){   // iptal: normal hareket gider, hareket yoksa kaçış yönü ver
    if(!cmd.mx && !cmd.my){ const dx=b.x-e.x, dy=b.y-e.y, l=hyp(dx,dy)||1; cmd.mx=dx/l; cmd.my=dy/l; }
    return;
  }
  cmd.mx=0; cmd.my=0; cmd.attack=false; cmd.rmb=false; cmd.e=false; cmd.space=false; cmd.recall=false;
  const L=M.eLast;
  if(L && S.time>=M.artT){
    const q=artAim(b,e,eVis,L,sk);
    cmd.space=true; cmd.tx=q.x; cmd.ty=q.y; M.artT=S.time+1.6;
  }
  if(L) cmd.aim=Math.atan2((eVis?e.y:L.y)-b.y, (eVis?e.x:L.x)-b.x);
}

/* Ruh Rehberi: Ruh Patlaması nişan açısı (yoksa null). Dövüşte rakip menzildeyken: yolda minyon yoksa ya da yoldaki minyon rakibe yakınsa
   (alan yine rakibe yetişir); fightOnly değilse ve sakinken 3+ minyon kümesine. Güçlendirilmişse alan 250. */
function burstPlan(b, e, eVis, d, fight, M, sk, tgt, quiet, fightOnly){
  const rad = (b.ic.mantra && S.time<=b.ic.mantra.until) ? b.def.skills.s.burstRadius : sk.blast;
  if(fight && eVis && !(e.stasis>0) && d-e.r<sk.range+40){
    const ang=leadAim(b,e,sk.cast,sk.speed,M), blk=blocker(b,ang,e,sk.radius);
    if(!blk || dist(blk,e)<rad+e.r-20) return ang;
    return null;
  }
  if(!fightOnly && quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster') && dist(b,tgt)<sk.range-20){
    const a=Math.atan2(tgt.y-b.y,tgt.x-b.x), first=blocker(b,a,tgt,sk.radius)||tgt;
    let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,first)<rad-10) n++;
    if(n>=3) return a;
  }
  return null;
}
/* Ruh Rehberi: yavaşlatılmışız ve rakipten kaçıyoruz (üsse dönüyoruz ya da dövüşmeden rakip yakınımızda) */
function slowedFlee(b, e, eVis, d, fight, M){
  return !!b.st.slow && b.st.slow.amt>=0.15 && eVis && d<threatR(e,b)+300 && (!fight || !!M.recall);
}

/* İkili: Enerji Küresi'nin D mesafede ortalama hızı (hız mesafeyle 900'den 1600'e doğrusal; nişan önden almak için) */
function orbSpeed(sk, D){
  const f=Math.min(1, D/sk.range), v1=sk.speed+(sk.speedEnd-sk.speed)*f;
  if(D<1 || v1-sk.speed<1) return sk.speed;
  const t=sk.range/(sk.speedEnd-sk.speed)*Math.log(v1/sk.speed);
  return t>0 ? D/t : sk.speed;
}
/* İkili: Enerji Küresi nişan açısı (yoksa null). Yolda minyon yoksa ya da yoldaki minyon rakibe patlama yarıçapı içindeyse (alan yine yetişir) */
function orbPlan(b, e, sk, M){
  const D=Math.max(0, dist(b,e)-b.r);
  const ang=leadAim(b,e,sk.cast,orbSpeed(sk,D),M), blk=blocker(b,ang,e,sk.radius+10);
  if(!blk) return ang;
  const f=Math.min(1, dist(b,blk)/sk.range), rad=sk.blast+(sk.blastEnd-sk.blast)*f;
  return dist(blk,e) < rad+e.r-15 ? ang : null;
}
/* İkili: Darbe itmesi iyi mi? Rakip itme yolunda duvara çarpacaksa (sersemler) ya da kendi kulemizin menziline girecekse; rakibin kulesine itmek kötü */
function pushGood(b, e, sk){
  const d=dist(b,e)||1, ux=(e.x-b.x)/d, uy=(e.y-b.y)/d;
  for(const f of [0.34,0.67,1]) if(inWall(e.x+ux*sk.push*f, e.y+uy*sk.push*f, e.r)) return true;
  const ex=e.x+ux*sk.push, ey=e.y+uy*sk.push;
  for(const s of S.lane[1-b.team]) if(!s.dead && s.sub!=='nexus' && hyp(s.x-ex,s.y-ey)<s.range && dist(s,e)>=s.range) return false;
  for(const s of S.lane[b.team]) if(!s.dead && s.sub!=='nexus' && hyp(s.x-ex,s.y-ey)<s.range-30) return true;
  return false;
}
/* İkili: hangi biçimde olmalı? Rakip uzak ya da güvenli dürtme fırsatı: uzak. Rakip yakın (sıçrayış yetişir) ya da canı düşük ve yetişebiliyoruz ve
   yakın biçim yeteneği hazır: yakın. Canımız azsa uzak biçimde kaç. Yakın biçimde dövüş sürdükçe ve yakın yetenek ya da rakip dibimizdeyken kal. */
function formWant(b, e, eVis, d, fight, M){
  const mel=b.form==='melee', rd=c=>(b.rank.r>0 && c.r<=0.8 ? 1 : 0)+(b.rank.e>0 && c.e<=0.8 ? 1 : 0);
  const mR = mel ? rd(b.cd) : rd(b.offCd), rR = mel ? rd(b.offCd) : rd(b.cd);   // hazır yakın / uzak yetenek sayısı
  if(!eVis || M.recall || hpNow(b)<AI.recallHp*1.8) return 'ranged';
  const reach = d-e.r<570;   // Sıçrayış Darbesi menzili (550) + pay
  if(mel) return fight && (mR>0 || d<260) ? 'melee' : 'ranged';
  if(fight && mR>0 && reach && (rR===0 || d<450 || hpNow(e)<0.45 || !ranged(e))) return 'melee';
  return 'ranged';
}

/* Yetenek kullanımı */
function useSkills(b, e, eVis, tgt, fight, M, cmd, ev){
  if(b.chan) return;
  const LP=LVP(b), cands=LP.cmb ? [] : null;
  const acting=canAct(b);
  if(!acting && b.st.freeze<=0) return;   // sersemken yalnız Arınma türü denenir (aşağıda)
  const d=eVis ? dist(b,e) : 1e9, quiet=!eVis || d>900;
  const fp = fight || !!M.poking;                            // dürtme: uzak hasar yetenekleri dövüş gibi kullanılır
  const pz = fp || !!(ev && ev.adv>=LVP(b).pokeAdv);
  const near=(r)=>{ let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<r) n++; return n; };
  // Gölge Adımı dönüşü (bekleme süresinden bağımsız): canımız düşükse ve rakip üstümüzdeyse ya da indiğimiz yer kule menzilindeyse başladığımız yere dön.
  // Kaçış için atılan adımda ve ilk 0,35 sn içinde dönmez.
  if(acting && b.st.silence<=0 && S.time>=(M.noBack||0)){
    for(const kk of ['e','s']){
      const bk=b.ic.back && b.ic.back[kk];
      if(!bk || S.time>bk.until || S.time-(bk.until-bk.total)<0.35) continue;
      const danger=(eVis && hpNow(b)<0.4 && d<threatR(e,b)+250 && !M.kw) || (eVis && hpNow(b)<hpNow(e)-0.25 && d<threatR(e,b)+150 && !M.kw) || !!unsafeAt(b,b.x,b.y);
      const pokeBack = M.blinkPoke && S.time>=M.blinkPoke && !fight;   // dürtme adımı: patlattıktan sonra geri dön
      if(danger || pokeBack){ M.blinkPoke=0; cmd[KEY[kk]]=true; return; }
    }
  }
  // Güçlendir (Ruh Rehberi): dövüşte Ruh Patlaması hazırken ya da yavaşlatılıp kaçarken Ruh Kalkanı hazırken; önce Güçlendir, sonra güçlenen yetenek
  let mantraGo=false;
  { const mk=skillKey(b,'mantra'), mAct=b.ic.mantra && S.time<=b.ic.mantra.until;
    if(mk && rdy(b,mk) && acting && b.st.silence<=0 && !mAct){
      const bk=skillKey(b,'spiritburst'), shk=skillKey(b,'spiritshield');
      if(bk && rdy(b,bk) && burstPlan(b,e,eVis,d,fight,M,b.def.skills[bk],tgt,quiet,true)!==null) mantraGo=true;
      else if(shk && rdy(b,shk) && (slowedFlee(b,e,eVis,d,fight,M) || allyDanger(b))) mantraGo=true;
    } }
  for(const k of ['r','e','s']){
    if(!rdy(b,k)) continue;
    const sk=b.def.skills[k];
    if(!acting && sk.type!=='cleanse') continue;
    if(b.st.root>0 && (sk.type==='dash' || sk.type==='tumble' || sk.type==='flameleap' || sk.type==='leapslam' || sk.type==='roll' || sk.type==='duel')) continue;   // köklüyken atılış denenmez
    if(b.st.silence>0 && sk.type!=='cleanse') continue;   // susturulmuşken yetenek denemez
    // Uzman: kontrol zinciri, rakip zaten sersemlemişse (dost ya da kendi) kontrolü sona sakla, hasarı kullan
    if(LP.chain && eVis && CC_TYPES.has(sk.type) && e.st.freeze>0.35 && !(e.pulled && e.pulled.src===b && sk.type==='slam')) continue;
    let use=false;
    if(sk.type==='haste'){
      use = (fight && d<reachTo(b,e)+60) || (quiet && tgt && (tgt.kind==='struct' || near(450)>=3));
    } else if(sk.type==='volley'){
      if(fp && eVis && d<sk.range-30){ use=true; cmd.aim=leadAim(b,e,sk.cast,sk.speed,M); }
      else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster')){
        let n=0; const a=Math.atan2(tgt.y-b.y,tgt.x-b.x);
        for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<sk.range-20 && Math.abs(Math.atan2(m.y-b.y,m.x-b.x)-a)<sk.spread/2) n++;
        use = n>=3;
      }
    } else if(sk.type==='bigarrow'){
      if(eVis && d<sk.range-40){
        const ang=leadAim(b,e,sk.cast,sk.speed,M), threat=!ranged(e) && d<threatR(e,b)+40;
        const kill = e.hp < atkDmg(b)*sk.ratio*0.95;
        if(fp || threat || kill || M.kw){ use=true; cmd.aim=ang; }   // Kalın Ok minyonlardan geçer
      }
    } else if(sk.type==='dash'){
      if(eVis && !M.kw && hpNow(b)<AI.recallHp*1.4 && d<threatR(e,b)+60 && !fight){   // kaçış: üsse doğru
        const home=Math.atan2(b.spawnY-b.y, b.spawnX-b.x);
        for(const o of [0,0.5,-0.5,1,-1]){ const a=home+o, nx=b.x+Math.cos(a)*sk.dist, ny=b.y+Math.sin(a)*sk.dist;
          if(leapOK(b,a,sk.dist) && hyp(nx-e.x,ny-e.y)>d+60){ use=true; cmd.aim=a; break; } }
      } else if(fight && eVis){
        const reach=reachTo(b,e);
        if(d>reach+5 && d<sk.dist+reach-10){
          const ang=Math.atan2(e.y+(e.vy||0)*0.15-b.y, e.x+(e.vx||0)*0.15-b.x);
          if(!blocker(b,ang,e,b.r)){ use=true; cmd.aim=ang; M.dashAt=S.time; }
        }
      }
    } else if(sk.type==='shield'){
      if(eVis && S.time-(M.dashAt||-9)<0.7 && d<420){ cmd[KEY[k]]=true; if(cands) cands.push({ k, type:sk.type, aim:cmd.aim, tx:cmd.tx, ty:cmd.ty }); continue; }   // atılışla girince kalkanı hemen aç
      // yakın dövüşçü kalkanı vuruş menzili yakınında ya da hasar yerken açar (eskiden fight && d<450: dalıştan önce boşa gidiyordu)
      const hurt = S.time-(b.ic.lastHurt??-99) < 0.6;
      use = (fight && (ranged(b) ? d<450 : (d<reachTo(b,e)+90 || (hurt && d<450)))) || (eVis && d<300 && b.hp<b.maxHp*0.6) || (M.recall && eVis && d<500);
    } else if(sk.type==='giant'){
      use = (fight && d<210) || (quiet && tgt && tgt.kind==='struct' && dist(b,tgt)<reachTo(b,tgt)) || (quiet && near(220)>=3);
    } else if(sk.type==='fireball'){
      // kısa bekleme: rakibe fırsat buldukça, sakinken dalgaya
      const poke = eVis && d<sk.range-30 && pz && heroHitSafe(b,e,b.x,b.y);
      // mageCombo (bot D5): İç Ateş hazır ve menzildeyse önce o (hasar artışı), Ateş Topu sonra
      const igK=LVP(b).mageCombo && skillKey(b,'ignite');
      if(poke && igK && rdy(b,igK) && d-e.r<b.def.skills[igK].range-10 && !(e.st.ignite)){ }
      else if(poke){
        const ang=leadAim(b,e,sk.cast,sk.speed,M);
        if(!blocker(b,ang,e,sk.radius)){ use=true; cmd.aim=ang; }
      } else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster') && dist(b,tgt)<sk.range-100){ use=true; cmd.aim=Math.atan2(tgt.y-b.y,tgt.x-b.x); }
    } else if(sk.type==='ignite'){
      if(eVis && d-e.r<sk.range-10 && pz && heroHitSafe(b,e,b.x,b.y)){ use=true; cmd.tx=e.x; cmd.ty=e.y; }
    } else if(sk.type==='meteor'){
      if(eVis && d<sk.range && (fight || M.kw || (ev && ev.adv>=LVP(b).pokeAdv))){
        // gecikme boyunca rakibin gideceği yere, kısmen (rakip kaçabilir)
        const k2=e.st.freeze>0 ? 0 : 0.6;
        cmd.tx=e.x+((e.vx||0)+(e.kx||0))*sk.delay*k2; cmd.ty=e.y+((e.vy||0)+(e.ky||0))*sk.delay*k2; use=true;
      } else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster') && !(LVP(b).mageCombo && tgt.kind==='minion')){   // mageCombo: Meteor dalgaya harcanmaz
        let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,tgt)<sk.radius) n++;
        if(n>=4 && dist(b,tgt)<sk.range){ use=true; cmd.tx=tgt.x; cmd.ty=tgt.y; }
      }
    } else if(sk.type==='tumble'){
      if(fight && eVis){
        const a=tumbleAim(b,e,sk,M,d);
        if(a!==null){ use=true; cmd.aim=a; }
      }
    } else if(sk.type==='bomb'){
      if(fp && eVis){
        // rakibin gecikme sonundaki tahmini yerine (hızıyla), menzildeyse
        const kk=e.st.freeze>0 ? 0 : 1, px=e.x+((e.vx||0)+(e.kx||0))*sk.delay*kk, py=e.y+((e.vy||0)+(e.ky||0))*sk.delay*kk;
        if(hyp(px-b.x,py-b.y)<=sk.range){ use=true; cmd.tx=px; cmd.ty=py; }
      } else if(quiet){
        // sakinken: menzildeki en kalabalık minyon kümesine (3+ minyon)
        let best=null, bn=0;
        for(const m of S.minions){
          if(m.dead || m.team===b.team || hyp(m.x-b.x,m.y-b.y)>sk.range || !canSee(b.team,m)) continue;
          let n=0; for(const o of S.minions) if(!o.dead && o.team!==b.team && hyp(o.x-m.x,o.y-m.y)<sk.radius-10) n++;
          if(n>bn){ bn=n; best=m; }
        }
        if(bn>=3){ use=true; cmd.tx=best.x; cmd.ty=best.y; }
      }
    } else if(sk.type==='boomerang'){
      // dövüşte menzildeki rakibe (öne nişan); sakinken yolu üstünde 3+ minyon varsa o yöne
      if(fp && eVis && d-e.r<sk.range-30){ use=true; cmd.aim=leadAim(b,e,sk.cast,sk.speed,M); }
      else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster')){
        const a=Math.atan2(tgt.y-b.y,tgt.x-b.x), ux=Math.cos(a), uy=Math.sin(a); let n=0;
        for(const m of S.minions){
          if(m.dead || m.team===b.team) continue;
          const rx=m.x-b.x, ry=m.y-b.y, along=rx*ux+ry*uy;
          if(along>0 && along<sk.range && Math.abs(rx*-uy+ry*ux)<m.r+sk.radius) n++;
        }
        if(n>=3){ use=true; cmd.aim=a; }
      }
    } else if(sk.type==='cleanse'){
      // sersemken ve tehlikedeyken hemen; ağır yavaşlatma altında yakın dövüşçü yakınsa (kaçış); ya da kaçana yetişmek için (kovalama)
      const slowAmt=b.st.slow ? b.st.slow.amt : 0;
      const danger=(eVis && d<Math.max(threatR(e,b)+120, 600)) || near(350)>0 || !!unsafeAt(b,b.x,b.y);
      const away=eVis ? ((e.vx||0)*(e.x-b.x)+(e.vy||0)*(e.y-b.y))/(d||1) : 0;
      use = ((b.st.freeze>0.15 || b.st.silence>0.4 || b.st.root>0.4) && danger)
        || (slowAmt>=0.3 && eVis && !ranged(e) && d<threatR(e,b)+150)
        || (fight && eVis && hpNow(e)<0.35 && away>30 && d>reachTo(b,e)-30 && d<800);
    } else if(sk.type==='frenzy'){
      // dövüş başlarken (rakip menzile yakın) ya da kalabalık dalga + rakip kahraman yakındayken; Bumerang ve Arınma da hazır olur
      use = (fight && eVis && d<reachTo(b,e)+150) || (eVis && d<800 && near(450)>=3);
    } else if(sk.type==='hook'){
      // dövüşte ya da rakip menzildeyken (dürtme üstünlüğü): yolda rakip minyon yoksa ve rakibi çekince kuleden zarar görmeyeceksek.
      // Kendi kulemizin altındaysak rakibi çekmek çok iyi: dövüş olmasa da menzildeki rakibe atar. Öne nişan.
      if(eVis && d-e.r<sk.range-40 && !e.pulled && !(e.stasis>0)){
        const ang=leadAim(b,e,sk.cast,sk.speed,M);
        let ownT=false; for(const s of S.lane[b.team]) if(!s.dead && s.sub!=='nexus' && dist(s,b)<=s.range-70){ ownT=true; break; }
        const want = pz || ownT;
        if(want && !M.recall && heroHitSafe(b,e,b.x,b.y) && !unsafeAt(b,b.x,b.y) && !blocker(b,ang,e,sk.radius)){ use=true; cmd.aim=ang; }
      }
    } else if(sk.type==='slam'){
      // rakip konideyse, kancadan hemen sonra (çekilen rakip önümüze iniyor); sakinken 3+ minyon konideyse
      const reach=b.r+sk.range, half=sk.angle*Math.PI/360;
      if(eVis && e.pulled && e.pulled.src===b && e.pulled.t<0.3){ use=true; cmd.aim=Math.atan2(e.y-b.y, e.x-b.x); }
      else if(eVis && d-e.r<reach-12 && heroHitSafe(b,e,b.x,b.y)){
        const ang=Math.atan2(e.y+(e.vy||0)*0.1-b.y, e.x+(e.vx||0)*0.1-b.x);
        if(inCone(b, ang, reach-12, half, e)){ use=true; cmd.aim=ang; }
      } else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster')){
        const ang=Math.atan2(tgt.y-b.y, tgt.x-b.x); let n=0;
        for(const m of S.minions) if(!m.dead && m.team!==b.team && inCone(b, ang, reach-12, half, m)) n++;
        if(n>=3){ use=true; cmd.aim=ang; }
      }
    } else if(sk.type==='breath'){
      // rakip konideyse; sakinken 3+ minyon konideyse
      const reach=b.r+sk.range, half=sk.angle*Math.PI/360;
      if(eVis && d-e.r<reach-12 && heroHitSafe(b,e,b.x,b.y)){
        const ang=Math.atan2(e.y+(e.vy||0)*0.1-b.y, e.x+(e.vx||0)*0.1-b.x);
        if(inCone(b, ang, reach-12, half, e)){ use=true; cmd.aim=ang; }
      } else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster')){
        const ang=Math.atan2(tgt.y-b.y, tgt.x-b.x); let n=0;
        for(const m of S.minions) if(!m.dead && m.team!==b.team && inCone(b, ang, reach-12, half, m)) n++;
        if(n>=3){ use=true; cmd.aim=ang; }
      }
    } else if(sk.type==='flameleap'){
      // dövüşte rakibe yetişmek için (rakip şeritte kalır, inişte vuruş menzilinde); canı düşük ve tehlikedeyse kendi üssümüze doğru kaçış.
      // Duvara ya da rakip kule menziline inmez.
      if(eVis && !M.recall){
        const reach=reachTo(b,e);
        if(hpNow(b)<AI.recallHp*1.8 && d<threatR(e,b)+80){
          const home=Math.atan2(b.spawnY-b.y, b.spawnX-b.x);
          for(const o of [0,0.5,-0.5,1,-1]){
            const a=home+o, nx=b.x+Math.cos(a)*sk.dist, ny=b.y+Math.sin(a)*sk.dist;
            if(leapOK(b,a,sk.dist) && hyp(nx-e.x,ny-e.y)>d+60){ use=true; cmd.aim=a; break; }
          }
        } else if(fight && d>reach+40 && d<sk.dist+reach-15){
          const a=Math.atan2(e.y+(e.vy||0)*0.1-b.y, e.x+(e.vx||0)*0.1-b.x);
          if(leapOK(b,a,Math.min(sk.dist,d)) && heroHitSafe(b,e,b.x+Math.cos(a)*(d-reach),b.y+Math.sin(a)*(d-reach))){ use=true; cmd.aim=a; }
        }
      }
    } else if(sk.type==='firering'){
      // dövüş başlarken rakip halka içindeyse ya da yaklaşıyorsa
      if(fight && eVis && !(e.stasis>0) && d-e.r<sk.radius+90) use=true;
    } else if(sk.type==='shockwave'){
      // rakip menzilde ve dövüş başlıyorsa (rakibin hazır yeteneği varsa susturmak işe yarar), rakip yetenekle kaçıyorsa (atılış), ya da rakibi öldürmeye yeterse / canı düşükse
      if(eVis && d-e.r<sk.radius-30 && !(e.stasis>0) && !(e.st.silence>0.5)){
        const dm=(sk.dmg[b.rank[k]-1]+(sk.ap||0)*apOf(b)+(sk.hpPct||0)*bonusHp(b))*100/(100+Math.max(0,stat(e,'mr')));
        const eReady=['r','e','s'].some(kk=>rdy(e,kk));
        const start = fight && d<reachTo(b,e)+200 && eReady;
        const fleeing = !!e.dash && ((e.vx||0)*(e.x-b.x)+(e.vy||0)*(e.y-b.y))>0;
        const low = hpNow(e)<0.35 && (fight || d<reachTo(b,e)+200) || e.hp<dm*0.95;
        if(start || fleeing || low) use=true;
      }
    } else if(sk.type==='bloodbolt'){
      // dövüşte menzildeki rakip kahramana; sakinken son vuruş için (canı ok hasarından az) minyona, canımız eksikse en yakın minyona
      const dm=sk.dmg[b.rank[k]-1]+(sk.ap||0)*apOf(b);
      if(eVis && fp && d-e.r<sk.range-20 && !(e.stasis>0) && heroHitSafe(b,e,b.x,b.y)){ use=true; cmd.tx=e.x; cmd.ty=e.y; }
      else if(quiet && !M.recall){
        let lh=null, near=null, nd=1e9;
        for(const m of S.minions){
          if(m.dead || m.team===b.team || dist(m,b)-m.r>sk.range-20 || !canSee(b.team,m)) continue;
          if(m.hp<=dm && (!lh || m.hp>lh.hp)) lh=m;
          const dd=dist(m,b); if(dd<nd){ nd=dd; near=m; }
        }
        const m = lh || (hpNow(b)<0.85 ? near : null);
        if(m){ use=true; cmd.tx=m.x; cmd.ty=m.y; }
      }
    } else if(sk.type==='bloodnova'){
      // canı %40'tan fazlaysa (can harcar): dövüşte rakip kahraman menzildeyse ya da 3+ minyon yakındaysa
      if(hpNow(b)>0.4 && !M.recall && ((fight && eVis && d-e.r<sk.range-30) || near(sk.range-50)>=3)){
        use=true; if(eVis) cmd.aim=Math.atan2(e.y-b.y, e.x-b.x);
      }
    } else if(sk.type==='bloodcurse'){
      // rakip lanet alanında (700+250) ve dövüş başlıyorsa ya da canı düşükse; rakibin 0,5 sn sonraki yerine (menzile kırpılmış noktada alandaysa)
      if(eVis && !M.recall && !(e.stasis>0) && d-e.r<sk.range+sk.radius-30 && (fight || hpNow(e)<0.4)){
        const kk=e.st.freeze>0 ? 0 : 1, px=e.x+((e.vx||0)+(e.kx||0))*0.5*kk, py=e.y+((e.vy||0)+(e.ky||0))*0.5*kk;
        const dx=px-b.x, dy=py-b.y, l=hyp(dx,dy)||1, cl=Math.min(1, sk.range/l), qx=b.x+dx*cl, qy=b.y+dy*cl;
        if(hyp(qx-px,qy-py)<sk.radius-30){ use=true; cmd.tx=qx; cmd.ty=qy; }
      }
    } else if(sk.type==='beam'){
      // dövüşte ya da dürterken menzildeki rakip kahramana (öne nişan, rakip şeritte kalacak biçimde); sakinken 3+ minyon şeritteyse
      if(eVis && d-e.r<sk.range-40 && !(e.stasis>0) && pz && heroHitSafe(b,e,b.x,b.y)){
        const kk=e.st.freeze>0 ? 0 : 1, px=e.x+((e.vx||0)+(e.kx||0))*sk.cast*kk, py=e.y+((e.vy||0)+(e.ky||0))*sk.cast*kk;
        if(hyp(px-b.x,py-b.y)<sk.range-20){ use=true; cmd.aim=Math.atan2(py-b.y, px-b.x); }
      } else if(quiet && tgt && (tgt.kind==='minion' || tgt.kind==='monster')){
        const a=Math.atan2(tgt.y-b.y,tgt.x-b.x), ux=Math.cos(a), uy=Math.sin(a); let n=0;
        for(const m of S.minions){
          if(m.dead || m.team===b.team || !canSee(b.team,m)) continue;
          const rx=m.x-b.x, ry=m.y-b.y, along=rx*ux+ry*uy;
          if(along>0 && along<sk.range && Math.abs(rx*-uy+ry*ux)<m.r+sk.radius-8) n++;
        }
        if(n>=3){ use=true; cmd.aim=a; }
      }
    } else if(sk.type==='stunorb'){
      // dövüşte ya da rakip yaklaşırken (özellikle yakın dövüşçü üstümüze gelirken); yolda rakip minyon yoksa
      if(eVis && d-e.r<sk.range-60 && !(e.stasis>0) && !e.pulled){
        const ang=leadAim(b,e,sk.cast,sk.speed,M);
        const toward=((e.vx||0)*(b.x-e.x)+(e.vy||0)*(b.y-e.y))/(d||1)>40;
        const meleeIn=!ranged(e) && d<threatR(e,b)+450 && toward;
        if((fp || meleeIn) && heroHitSafe(b,e,b.x,b.y) && !blocker(b,ang,e,sk.radius)){ use=true; cmd.aim=ang; }
      }
    } else if(sk.type==='artillery'){
      // rakip kahraman 2500 içinde ve görünüyor ya da son görüldüğü yer yeni; kendimiz güvendeysek (yakında tehdit, rakip kule, minyon yok).
      // İlk atış rakibin 0,6 sn sonraki tahmini yerine (görünmüyorsa son görülen yere); kanallama artChannel'da sürer.
      const L=M.eLast;
      if(!M.recall && L && (S.time-L.t<(eVis?99:5)) && hpNow(b)>LVP(b).artHp && b.st.silence<=0 && !e.dead){
        const px=eVis ? e.x : L.x, py=eVis ? e.y : L.y, dd=hyp(px-b.x,py-b.y);
        if(dd<sk.range-100 && artSafe(b,e,eVis,dd)){ use=true; const q=artAim(b,e,eVis,L,sk); cmd.tx=q.x; cmd.ty=q.y; }
      }
    } else if(sk.type==='tether'){
      // dövüşte ya da dürterken menzildeki rakibe (öne nişan), yolda minyon yoksa; bağı korumak için hareket kuralı aşağıda (bağlı rakipten uzaklaşma)
      const a=tetherPlan(b,e,eVis,d,fight,M,sk,ev);
      if(a!==null){ use=true; cmd.aim=a; }
    } else if(sk.type==='blink'){
      // dövüşte rakibe girerken (patlama rakibe değer) ya da canı düşükken üsse doğru kaçış; zincir bu tikte atılmıyorsa
      if(!cmd.rmb){
        const p=blinkPlan(b,e,eVis,d,fight,M,sk,ev);
        if(p){ use=true; cmd.tx=p.x; cmd.ty=p.y; if(p.esc) M.noBack=S.time+sk.back+0.2; else if(!fight) M.blinkPoke=S.time+0.5+rand()*0.4; }
      }
    } else if(sk.type==='mimic'){
      // en son kullanılan yeteneği tekrarlar: Zincir ise rakip menzildeyken, Gölge Adımı ise kombo/kaçış koşullarında
      const lk=b.ic.last, ls=lk && b.def.skills[lk];
      if(ls && b.rank[lk]>0 && !cmd.rmb && !cmd.e){
        if(ls.type==='tether'){ const a=tetherPlan(b,e,eVis,d,fight,M,ls,ev); if(a!==null){ use=true; cmd.aim=a; } }
        else if(ls.type==='blink'){
          const p=blinkPlan(b,e,eVis,d,fight,M,ls,ev);
          if(p){ use=true; cmd.tx=p.x; cmd.ty=p.y; if(p.esc) M.noBack=S.time+ls.back+0.2; }
        }
      }
    } else if(sk.type==='transform'){
      // biçim değiştir: genel kural formWant (bekleme 6 sn, anlık gidiş gelişi sınırlar); bu tikte başka yetenek basılıyorsa bekle
      if(!cmd.rmb && !cmd.e && b.form && formWant(b,e,eVis,d,fight,M)!==b.form) use=true;
    } else if(sk.type==='groworb'){
      // dövüşte ya da güvenli dürtmede menzildeki rakip kahramana (uzaktan atmak daha güçlü: dürtme yalnız 480+ mesafede); sakinken 3+ minyon kümesine
      if(eVis && !(e.stasis>0) && d-e.r<sk.range-40 && (fp || (ev && ev.adv>=LVP(b).pokeAdv && d>480)) && heroHitSafe(b,e,b.x,b.y)){
        const a=orbPlan(b,e,sk,M);
        if(a!==null){ use=true; cmd.aim=a; }
      } else if(quiet && !M.recall && tgt && (tgt.kind==='minion' || tgt.kind==='monster') && dist(b,tgt)<sk.range-150){
        const a=Math.atan2(tgt.y-b.y,tgt.x-b.x), first=blocker(b,a,tgt,sk.radius+10)||tgt;
        let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,first)<sk.blast-10) n++;
        if(n>=3){ use=true; cmd.aim=a; }
      }
    } else if(sk.type==='leapslam'){
      // dövüşte menzildeki rakip kahramana (iniş güvenliyse); sakinken 3+ minyon kümesine
      if(eVis && fight && !M.recall && !(e.stasis>0) && d-e.r<sk.range-30 && heroHitSafe(b,e,e.x,e.y) && !unsafeAt(b,e.x,e.y)){ use=true; cmd.tx=e.x; cmd.ty=e.y; }
      else if(quiet && !M.recall && tgt && (tgt.kind==='minion' || tgt.kind==='monster') && dist(b,tgt)-tgt.r<sk.range-30 && !unsafeAt(b,tgt.x,tgt.y)){
        let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,tgt)<sk.radius-10) n++;
        if(n>=3){ use=true; cmd.tx=tgt.x; cmd.ty=tgt.y; }
      }
    } else if(sk.type==='roll'){
      // Gülle Yuvarlan: canı azken tehlikedeyse üsse doğru kaçış; dövüşte rakibin tahmini yerine iniş (giriş/kovalama), iniş kule menzili dışında
      if(eVis && !M.recall){
        const reach=reachTo(b,e);
        if(hpNow(b)<AI.recallHp*1.8 && d<threatR(e,b)+80){
          const home=Math.atan2(b.spawnY-b.y, b.spawnX-b.x);
          for(const o of [0,0.5,-0.5,1,-1]){
            const a=home+o, L=sk.dMax*0.8, nx=b.x+Math.cos(a)*L, ny=b.y+Math.sin(a)*L;
            if(leapOK(b,a,L) && hyp(nx-e.x,ny-e.y)>d+60){ use=true; cmd.aim=a; cmd.tx=nx; cmd.ty=ny; break; }
          }
        } else if(fight && !(e.stasis>0) && d>reach+30 && d-e.r<sk.dMax-20){
          const t=d/sk.speed, px=e.x+((e.vx||0)+(e.kx||0))*t*0.7, py=e.y+((e.vy||0)+(e.ky||0))*t*0.7, a=Math.atan2(py-b.y, px-b.x), L=hyp(px-b.x,py-b.y);
          if(L<=sk.dMax && leapOK(b,a,Math.max(sk.dMin,L)) && heroHitSafe(b,e,px,py)){ use=true; cmd.aim=a; cmd.tx=px; cmd.ty=py; }
        }
      }
    } else if(sk.type==='heavy'){
      // Gladyatör Ağır Darbe: vuruş beklemesindeyken (sıfırlama) rakip erişimdeyse; sakinken kuleye ya da can azken minyona
      const rec=b.atk.state==='recovery';
      if(eVis && fight && d<reachTo(b,e)+30 && b.atk.state!=='windup') use=true;
      else if(quiet && tgt && tgt.kind!=='hero' && rec && dist(b,tgt)<reachTo(b,tgt)+10 && (tgt.kind==='struct' || hpNow(b)<0.75)) use=true;
    } else if(sk.type==='arena'){
      // Gladyatör Arena (kendi konumunda): dövüşte rakip alana girecek kadar yakınken, sakinken kule kuşatmasında
      if(eVis && fight && d<sk.radius+40){ use=true; cmd.tx=b.x; cmd.ty=b.y; }
      else if(quiet && tgt && tgt.kind==='struct' && dist(b,tgt)<reachTo(b,tgt)+20){ use=true; cmd.tx=b.x; cmd.ty=b.y; }
    } else if(sk.type==='duel'){
      // Gladyatör Meydan Okuma: menzildeki rakip kahramana, dövüş üstünlüğünde ya da rakibin canı azken
      if(eVis && !M.recall && !(e.stasis>0) && d-e.r<sk.range-15 && (heroHitSafe(b,e,e.x,e.y) || hpNow(e)<0.25) && ((fight && (!ev || ev.adv>=0.85)) || (hpNow(e)<0.45 && hpNow(b)>0.3))){
        use=true; cmd.tx=e.x; cmd.ty=e.y; cmd.aim=Math.atan2(e.y-b.y, e.x-b.x);
      }
    } else if(sk.type==='shell'){
      // Gülle Kabuk: dövüş başlarken (vuruş menzili yakını), hasar yerken, ya da rakibin kanca/Darbe tehdidi menzildeyken
      if(eVis){
        const hurt = S.time-(b.ic.lastHurt ?? -99) < 0.6 && d<600;
        let pullThreat=false;
        for(const kk of ['r','e','s']){ const es=e.def.skills[kk]; if(e.rank[kk]>0 && e.cd[kk]<=0.2 && (es.type==='hook' || es.type==='knockblow') && d<(es.range||200)+80) pullThreat=true; }
        use = (fight && d<reachTo(b,e)+120) || (hurt && (fight || hpNow(b)<0.6)) || pullThreat;
      }
    } else if(sk.type==='billiard'){
      // Gülle Bilardo: dövüşte rakip yakınken, üstünlük varsa ya da rakibin canı azsa; ya da yakında 2+ rakip kahraman
      if(eVis && !M.recall && !(e.stasis>0)){
        let foesN=0; for(const u of S.heroes) if(!u.dead && u.team!==b.team && canSee(b.team,u) && dist(u,b)<550) foesN++;
        if((fight && d<450 && (!ev || ev.adv>=0.9 || hpNow(e)<0.4)) || (foesN>=2 && (fight || hpNow(b)>0.5))){ use=true; cmd.aim=Math.atan2(e.y-b.y, e.x-b.x); }
      }
    } else if(sk.type==='knockblow'){
      // rakip erişimde: duvara ya da kendi kulemize doğru itiyorsa, öldürmeye yetiyorsa, kendimiz zorda ve rakip dibimizdeyse ya da dövüşü kaybediyorsak
      if(eVis && (fight || hpNow(e)<0.5) && !(e.stasis>0) && d-e.r<sk.range-10){
        const dm=(sk.dmg[b.rank[k]-1]+sk.hpPct*e.maxHp)*100/(100+Math.max(0,stat(e,'armor')));
        const kill=e.hp<dm*0.95, peel=hpNow(b)<0.5 && d<threatR(e,b), losing=!!(ev && ev.adv<1);
        if(pushGood(b,e,sk) || kill || peel || losing){ use=true; cmd.tx=e.x; cmd.ty=e.y; }
      }
    } else if(sk.type==='spiritburst'){
      if(mantraGo) continue;   // önce Güçlendir
      const a=burstPlan(b,e,eVis,d,fp,M,sk,tgt,quiet,false);
      if(a!==null){ use=true; cmd.aim=a; }
    } else if(sk.type==='spiritshield'){
      if(mantraGo) continue;   // önce Güçlendir
      const hurt = eVis && d<900 && S.time-(b.ic.lastHurt ?? -99)<1.0;
      use = hurt || (fight && eVis && d<reachTo(b,e)+250) || slowedFlee(b,e,eVis,d,fight,M) || allyDanger(b);
    } else if(sk.type==='mantra'){
      use = mantraGo;
    } else if(sk.type==='lockvolley'){
      // mermilerin beklenen toplam hasarı rakibin canının ~%70'inden fazlaysa ya da rakip kaçıyorsa (can %35 altı ve uzaklaşıyor);
      // kendimiz güvendeyse (yakında tehdit, kule ve kalabalık minyon yok) ve yolda rakip yapı yoksa
      if(eVis && !M.recall && !e.dead && d-e.r<=sk.range-60){
        const per=sk.dmg[b.rank[k]-1]+(sk.ad||0)*bonusAd(b), armor=Math.max(0,stat(e,'armor')*(1-((b.bonus&&b.bonus.armorPen)||0)));
        const frac=e.hp/e.maxHp, total=per*sk.count*(100/(100+armor))*(1+sk.missing*(1-frac)), ehp=e.hp+(e.st.shield?e.st.shield.amt:0);
        const away=((e.vx||0)*(e.x-b.x)+(e.vy||0)*(e.y-b.y))/(d||1);
        const kill=total>ehp*0.7, flee=frac<0.35 && away>40 && total>ehp*0.4;
        let mins=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<350) mins++;
        const safe=!unsafeAt(b,b.x,b.y) && mins<=2 && (flee || d>threatR(e,b)+(ranged(e)?40:150));
        if((kill||flee) && safe && !structOnLine(b,e,sk.radius)){ use=true; cmd.tx=e.x; cmd.ty=e.y; }
      }
    }
    // İsabet zamanlaması (shotWait, bot D6): kaçılabilir beceri atışını dövüşte/dürtmede rakip vururken, yavaşken ya da kontrol altındayken at; en fazla shotHoldT bekle
    if(use && LP.shotWait && eVis && fp && SHOT_TYPES.has(sk.type)){
      const good = isCC(e) || (e.st.slow>0) || (e.atk && e.atk.state!=='ready') || !!e.chan || d<(sk.range||600)*0.45;
      const H=M.shotHold||(M.shotHold={});
      if(good) H[k]=0; else { if(!H[k]) H[k]=S.time; if(S.time-H[k]<AI.shotHoldT) use=false; else H[k]=0; }
    }
    if(use){ cmd[KEY[k]]=true; if(cands) cands.push({ k, type:sk.type, aim:cmd.aim, tx:cmd.tx, ty:cmd.ty }); }
  }
  if(cands && cands.length>1){   // tek tikte tek yetenek: sıralı kullanım (kombo)
    const c=pickSkill(cands, eVis && isCC(e));
    for(const o of cands) if(o!==c) cmd[KEY[o.k]]=false;
    cmd.aim=c.aim; if(c.tx!==undefined){ cmd.tx=c.tx; cmd.ty=c.ty; }
  }
  if(M.poking && !fight) for(const k of ['r','e','s']) if(cmd[KEY[k]] && POKE_T.has(b.def.skills[k].type)){ M.tradeBack=S.time+0.7+rand()*0.8; break; }   // vurduk: geri çekil
}

/* ---- ana giriş ---- */
/* ---- orman (ormancı rolü, h.role==='jungle') ----
   Ormancı kampları keser (önce kendi tarafı ve eksik güçlendirmeler), kampların yeniden doğuşunu bekler, dost koridorcu dövüşteyse
   ya da görünen rakibin canı azsa koridora baskın yapar, büyük canavarı dost yanındayken (ya da yeterince güçlüyse) ve güvenliyken alır.
   Yapacak iş yoksa koridorcu gibi oynar (laneMove). 1v1 koridorcu dalga yokken yakındaki kampı kesebilir (laneCamp). */
AI.jgGankHp = 0.45;    // ormancı en az bu canla baskın yapar
AI.jgGankR = 2600;     // baskın için rakibe en fazla bu uzaklık
AI.jgLowHp = 0.35;     // baskın: görünen rakibin canı bunun altındaysa dost dövüşmese de git
AI.jgWait = 12;        // kamp en geç bu kadar sn içinde doğacaksa başında bekle
AI.jgBigLv = 7;   /* seviye 15 (14.10.2026): 6 idi */       // büyük canavar için en az seviye (dost yanındaysa)
AI.jgBigSolo = 11;   /* 9 idi */     // bu seviyeden sonra tek başına da dener
AI.jgBigWait = 18;
AI.laneCampAllyR = 1200;   // koridorcu: dost ormancı bu kadar yakındaysa o kampa girmez     // dostu bu kadar sn bekler
/* Kamp canlı mı: takımın bildiği kadarıyla (sim.js campIntel, savaş sisi 15.10.2026). 'unknown' canlı olabilir sayılır (gidip bakılır). */
const campLive = (c, b) => { const k=campIntel(b.team, c); return k.state==='alive' || (k.state==='unknown' && !c.big && hyp(b.x-c.x,b.y-c.y)<AI.unknownR); };
AI.unknownR = 1500;   // bilinmeyen kampa yalnız bu kadar yakınken bakmaya gider; bilinmeyen Titan beklenmez
/* Kampı (kalan canavarlarla) temizleyebilir miyiz: süre * aldığımız hasar < canımız */
function campCost(b, c){
  let hp=0, inc=0;
  if(c.alive && c.mobs.some(m=>!m.dead && canSee(b.team,m))){ for(const m of c.mobs) if(!m.dead){ hp+=m.hp; inc+=m.def.dmg*m.dmgMult/m.def.period*(m.def.cleave?1:1); } }
  else { const sc=JUNGLE.scale, mn=S.time/60, hM=Math.min(sc.cap,1+sc.hpPerMin*mn), dM=Math.min(sc.cap,1+sc.dmgPerMin*mn);   // görünmüyor: taze kamp tahmini (sis)
    for(const t of c.def.mobs){ const d=JUNGLE.monsters[t]; hp+=d.hp*hM; inc+=d.dmg*dM/d.period; } }
  const t=hp/Math.max(1,dps(b)*1.15);
  return { t, taken:inc*t*100/(100+stat(b,'armor')) };
}
function campOK(b, c, margin){ const k=campCost(b,c); return k.taken < b.hp*margin; }
function foeNear(b, x, y, R){
  for(const u of S.heroes) if(u.team!==b.team && !u.dead && canSee(b.team,u) && hyp(u.x-x,u.y-y)<R) return u;
  return null;
}
/* Kamptaki hedef: en az canlı canavar; ona gidilecek yön */
function campAttack(b, c){
  let t=null; if(c.alive) for(const m of c.mobs) if(!m.dead && (!t || m.hp<t.hp)) t=m;
  if(!t || !canSee(b.team,t)){ const dx=c.x-b.x, dy=c.y-b.y; return hyp(dx,dy)>60 ? { mv:{ x:dx, y:dy }, tgt:null, dive:false, hold:false } : null; }   // bilinen/bilinmeyen kampa git, bak
  const want=reachTo(b,t)-15, dx=t.x-b.x, dy=t.y-b.y, l=hyp(dx,dy);
  const mv = l>want ? { x:dx, y:dy } : { x:0, y:0 };
  return { mv, tgt:t, dive:false, hold:false };
}
function bigCamp(){ return S.camps.find(c=>c.big); }
/* Baskın hedefi: dost koridorcuya yakın, dövüşteki ya da canı az görünen rakip (rakip kule altında değil) */
function gankTarget(b){
  const ro=mem(b).pers.roam;   // kişilik: baskın eğilimi
  if(b.hp/b.maxHp<AI.jgGankHp*(1.15-0.3*ro)) return null;
  let best=null, bs=1e18;
  for(const u of S.heroes){
    if(u.team===b.team || u.dead || !canSee(b.team,u)) continue;
    const d=dist(b,u); if(d>AI.jgGankR*(0.8+0.5*ro)) continue;
    if(unsafeAt(b,u.x,u.y)) continue;
    let ok=u.hp/u.maxHp<AI.jgLowHp*(0.8+0.6*ro);
    for(const a of S.heroes){
      if(a===b || a.dead || a.team!==b.team || a.role==='jungle' || dist(a,u)>900) continue;
      const am=a.ai && a.ai.v2;
      if((am && am.fight) || S.time-(a.dmgBy[u.id] ?? -1e9)<2.5 || S.time-(u.dmgBy[a.id] ?? -1e9)<2.5 || u.hp/u.maxHp<0.6) ok=true;
    }
    if(ok && d<bs){ bs=d; best=u; }
  }
  return best;
}
/* Makro (12.10.2026): koridorda sayıca azlık. Koridorcu yalnızken 2+ rakip görünüyorsa kule altında bekler;
   ormancı bu durumda (ya da kulemize rakip kahraman dayanmışsa) koridora döner. */
AI.outnumR = 1500;      // koridorcunun çevresinde rakip sayımı
AI.allyHelpR = 1100;    // bu uzaklıktaki dost yanında sayılır
AI.jgDefendR = 3200;
AI.jgDefendHp = 0.5;
AI.jgDefendTowerR = 1100; // korunmasız (sıradaki) dost yapıya bu kadar yakın rakip kahraman varsa döner
AI.jgLateLv = 12;   /* 10 idi */      // ormancı bu seviyeye gelince ve rakip yapısı yıkılmaya başlayınca koridorda takımla oynar (güçlendirme/Titan hariç)    // yalnız koridorcunun canı bunun altındaysa (ya da kule baskıdaysa) döner    // ormancı en fazla bu uzaklıktan savunmaya döner
function foesAround(b, x, y, R){ let n=0; for(const u of S.heroes) if(u.team!==b.team && !u.dead && canSee(b.team,u) && hyp(u.x-x,u.y-y)<R) n++; return n; }
function alliesAround(b, x, y, R){ let n=0; for(const u of S.heroes) if(u!==b && u.team===b.team && !u.dead && hyp(u.x-x,u.y-y)<R) n++; return n; }
export function outnumbered(b){
  if(!AI.team) return false;
  return foesAround(b,b.x,b.y,LVP(b).outnumR)>=2 && alliesAround(b,b.x,b.y,LVP(b).allyHelpR)===0;
}
/* Sayı üstünlüğü (13.10.2026): yaşayan dostlar - yaşayan rakipler (yeniden doğuşuna AI.numResp sn'den az kalan ölü rakip yaşıyor sayılır) */
AI.numResp=7; AI.numAllyR=1400;
AI.lateK=0; AI.recallBuf=0;   // recallBuf (bot L3): eşya için üsse dönüş altın payı
 AI.lateSiege=0;   // lateSiege (bot L2): dakika eşiği; geç oyunda eşit sayıda bile dostla birlikte kuleye (0 kapalı)
function numEdge(b){ let n=0; for(const u of S.heroes){ const alive=!u.dead || u.respawn<=LVP(b).numResp; if(alive) n+= u.team===b.team ? 1 : -1; } return n; }
function foesInLane(b){ let n=0, all=0; for(const u of S.heroes) if(u.team!==b.team){ all++; if(!u.dead && canSee(b.team,u) && u.y>1450) n++; } return all>=2 && n>=all; }
function frontTower(team){ return S.lane[team].find(s=>!s.dead && s.sub!=='nexus') || S.lane[team][3]; }
/* Ormancı savunma: yalnız dost koridorcuya 2+ rakip ya da kulemize dayanan rakip kahraman */
function defendSpot(b){
  const ft=frontTower(b.team);
  for(const a of S.heroes){
    if(a===b || a.dead || a.team!==b.team) continue;
    if(foesAround(b,a.x,a.y,AI.outnumR)>=2 && a.hp/a.maxHp<LVP(b).jgDefendHp && dist(a,b)<LVP(b).jgDefendR) return { x:a.x, y:a.y };
  }
  for(const st of S.lane[b.team]) if(!st.dead && !st.prot && foesAround(b,st.x,st.y,LVP(b).jgDefendTowerR)>=1 && dist(st,b)<LVP(b).jgDefendR+800) return { x:st.x, y:st.y };
  return null;
}
function jungleMove(b, e, eVis, M, ev){
  if(b.noJungle) return null;
  const late=b.level>=AI.jgLateLv;   // geç oyun: yalnız Titan, gerisi koridor/itme
  // Titan bitirme (bot L5, titanFinish): Titan'ın canı bu orandan azsa ve vuruyorsak savunma/baskın için bırakma (yarım kalan Titan canını yeniler)
  if(LVP(b).titanFinish){
    const bc0=bigCamp();
    if(bc0 && campLive(bc0,b) && b.hp/b.maxHp>0.35 && !foeNear(b,bc0.x,bc0.y,700)){
      const tm=bc0.mobs.find(m=>!m.dead);
      if(tm && tm.aggro && tm.aggro.team===b.team && tm.hp/tm.maxHp<LVP(b).titanFinish){ M.jgS='big'; return campAttack(b,bc0); }
    }
  }
  { const d=defendSpot(b); if(d && b.hp/b.maxHp>0.35){ M.jgS='defend'; if(dist(b,d)>700) return { mv:{ x:d.x-b.x, y:d.y-b.y }, tgt:null, dive:false, hold:false }; return null; } }
  const hpF=b.hp/b.maxHp;
  if(LVP(b).numAdv && hpF>0.4 && numEdge(b)>0 && !(bigCamp() && campLive(bigCamp(),b) && b.level>=LVP(b).jgBigLv)){ M.jgS='push'; return null; }   // sayı üstünlüğü: koridora, itmeye
  M.jgGank=null; M.jgS='?';
  if(hpF<0.3 && !(eVis && dist(b,e)<700)){ M.recall=true; }
  // 1) baskın
  const g=gankTarget(b);
  if(g){ M.jgGank=g; M.jgS='gank'; return { mv:{ x:g.x-b.x, y:g.y-b.y }, tgt:null, dive:false, hold:false }; }
  // 2) büyük canavar
  const bc=bigCamp();
  if(bc && campLive(bc,b) && b.level>=LVP(b).jgBigLv && hpF>0.65 && !foeNear(b,bc.x,bc.y,1400)){
    let ally=null; for(const a of S.heroes) if(a!==b && !a.dead && a.team===b.team && hyp(a.x-bc.x,a.y-bc.y)<700) ally=a;
    const started=bc.mobs.some(m=>m.aggro && m.aggro.team===b.team);
    if(ally || started || (b.level>=LVP(b).jgBigSolo && campOK(b,bc,0.8))){ M.bigCall=0; M.jgS='big'; return campAttack(b,bc); }
    if(!M.bigWait || S.time<M.bigWait){
      if(!M.bigWait) M.bigWait=S.time+LVP(b).jgBigWait;
      M.bigCall=S.time; M.jgS='bigwait';   // koridorcu dostu çağır
      const dx=bc.x-b.x, dy=bc.y+260-b.y;   // çukurun koridor tarafında bekle
      return { mv: hyp(dx,dy)>40 ? { x:dx, y:dy } : { x:0, y:0 }, tgt:null, dive:false, hold:false };
    }
  } else if(M.bigWait && S.time>M.bigWait+60) M.bigWait=0;
  if(late){ M.jgS='lane'; return null; }
  // 3) süren kamp: başladıysak bitir
  if(M.jgCamp && campLive(M.jgCamp,b) && !M.jgCamp.big && hpF>0.3){
    const r=campAttack(b, M.jgCamp); if(r && dist(b,M.jgCamp)<900){ M.jgS='camp'; return r; }
  }
  // 4) yeni kamp: canlı ve temizlenebilir, yakın; kendi tarafı ve eksik güçlendirme öncelikli; rakip yakınsa olmaz
  let best=null, bs=1e18;
  const jgDead=!!LVP(b).invade && S.heroes.some(u=>u.team!==b.team && u.role==='jungle' && u.dead && u.respawn>AI.invadeT);
  for(const c of S.camps){
    if(c.big || !campLive(c,b)) continue;
    if(!campOK(b,c,0.7*hpF)) continue;
    if(foeNear(b,c.x,c.y,1000)) continue;
    let sc=dist(b,c);
    if(c.side>=0 && c.side!==b.team) sc+= (foesInLane(b) || jgDead) ? (jgDead && c.buff ? -400 : 0) : 700;   // iki rakip koridordaysa rakip ormanı da boş; invade (bot D3): rakip ormancı uzun ölüyse rakip ormanı (önce güçlendirmesi) bizim
    if(c.buff && !(b.jb && b.jb[c.buff]>S.time)) sc-=400;
    if(sc<bs){ bs=sc; best=c; }
  }
  if(best){ M.jgCamp=best; M.jgS='camp'; return campAttack(b,best); }
  // 5) yakında doğacak kamp: başında bekle
  let soon=null;
  let soonT=1e9;
  for(const c of S.camps){ const k=campIntel(b.team,c); if(!c.big && k.state==='dead' && (c.side===b.team) && k.until-S.time<AI.jgWait && k.until<soonT){ soonT=k.until; soon=c; } }
  if(soon){ M.jgS='wait'; const dx=soon.x-b.x, dy=soon.y-b.y; return { mv: hyp(dx,dy)>80 ? { x:dx, y:dy } : { x:0, y:0 }, tgt:null, dive:false, hold:false }; }
  M.jgS='lane';
  return null;
}
/* Koridorcu: dostu ormancı büyük canavara çağırıyorsa ve koridor sakinse çukura git */
function bigHelp(b, eVis, e){
  if(b.noJungle || b.role==='jungle' || b.hp/b.maxHp<0.6) return null;
  if(eVis && dist(b,e)<1200) return null;
  const bc=bigCamp(); if(!bc || !campLive(bc,b)) return null;
  for(const a of S.heroes){
    if(a===b || a.dead || a.team!==b.team || a.role!=='jungle' || !a.ai || !a.ai.v2) continue;
    const am=a.ai.v2, busy=bc.mobs.some(m=>m.aggro && m.aggro.team===b.team);
    if((S.time-(am.bigCall||-99)<1 || busy) && hyp(a.x-bc.x,a.y-bc.y)<900) return busy ? campAttack(b,bc) : { mv:{ x:bc.x+120-b.x, y:bc.y+260-b.y }, tgt:null, dive:false, hold:false };
  }
  return null;
}
/* Sayı üstünlüğünde Titan (Uzman/Zor titanAdv): rakiplerden biri uzun süre ölü, dost da çukura yakınsa koridorcu da Titan'a gider */
AI.titanAdvR=2600; AI.titanFinish=0;   // titanFinish (bot L5): 0 kapalı; örn. 0,5 AI.titanTeam=0;   // titanTeam (bot L4): sayı üstünlüğü aranmadan, dost de çukura yakınsa ve rakip yakında değilse koridorcu da Titan'a gider
function titanAdv(b, eVis, e){
  if(!(LVP(b).titanAdv || LVP(b).titanTeam) || b.noJungle || b.role==='jungle' || hpNow(b)<0.5 || b.level<LVP(b).jgBigLv) return null;
  const bc=bigCamp(); if(!bc || !campLive(bc,b)) return null;
  const started=bc.mobs.some(m=>m.aggro && m.aggro.team===b.team);
  if(!started){
    if((!LVP(b).titanTeam && numEdge(b)<=0) || dist(b,bc)>AI.titanAdvR || foeNear(b,bc.x,bc.y,1400)) return null;
    if(!S.heroes.some(a=>a!==b && a.team===b.team && !a.dead && hyp(a.x-bc.x,a.y-bc.y)<AI.titanAdvR && a.hp>a.maxHp*0.5)) return null;
  } else if(foeNear(b,bc.x,bc.y,900) || dist(b,bc)>AI.titanAdvR) return null;
  return campAttack(b,bc);
}
/* Dost ormancısı olmayan koridorcu (1v1 dahil): rakip görünmüyor ya da ölüyken, güçlüysek Vaha Titanı'nı tek başına al (12.10.2026).
   Başladıysak canımız yettikçe bitir; rakip yaklaşırsa bırak. */
AI.soloTitanLv = 9;   // seviye 15 (14.10.2026): 8 idi
function bigSolo(b, eVis, e){
  if(b.noJungle || b.role==='jungle' || !LVP(b).titan) return null;
  if(S.heroes.some(a=>a!==b && a.team===b.team && a.role==='jungle' && !a.dead)) return null;
  const bc=bigCamp(); if(!bc || !campLive(bc,b) || b.level<AI.soloTitanLv) return null;
  const started=bc.mobs.some(m=>m.aggro && m.aggro.team===b.team), hpF=hpNow(b);
  if(foeNear(b,bc.x,bc.y,started?900:1500)) return null;
  if(started ? hpF<0.3 : (hpF<0.75 || !campOK(b,bc,0.85))) return null;
  if(!started){
    if(dist(b,bc)>2600) return null;
    // yalnız bütün rakipler ölüyken ve dönmeleri titanı bitirmemize yetmeyecekse (yoksa koridoru ve kuleyi kaybederiz)
    const need=campCost(b,bc).t+dist(b,bc)/stat(b,'spd');
    for(const u of S.heroes) if(u.team!==b.team && !(u.dead && u.respawn>need*0.8)) return null;
  }
  return campAttack(b,bc);
}
/* Tek koridorcu (dost ormancı yok): dalga yokken ve rakip görünmüyorken yakındaki kendi kampını kes */
function laneCamp(b, eVis){
  if(b.noJungle || eVis || b.hp/b.maxHp<0.6) return null;
  const jg=S.heroes.find(a=>a!==b && a.team===b.team && a.role==='jungle' && !a.dead);   // dost ormancı varsa: güçlendirme kampları onun, yakındaki kampa girme
  for(const m of S.minions) if(!m.dead && dist(m,b)<1100) return null;
  const ro=mem(b).pers.roam, inv=ro>0.65 && !jg;   // kişilik: gezgin koridorcu rakip ormana da girer
  let best=null, bd=1100+500*ro;
  for(const c of S.camps){
    if(c.big || !campLive(c,b) || (c.side>=0 && c.side!==b.team && !inv)) continue;
    if(jg && (c.buff || hyp(jg.x-c.x,jg.y-c.y)<AI.laneCampAllyR)) continue;
    const d=dist(b,c); if(d<bd && campOK(b,c,0.5)){ bd=d; best=c; }
  }
  return best ? campAttack(b,best) : null;
}

function botCommandCore(b, dt){
  const cmd={ mx:0, my:0, aim:b.aim, attack:false, rmb:false, e:false, space:false };
  const mode=settings.botMode;
  if(mode==='idle') return cmd;
  if(b.dead){ if(canShop(b)) botShop(b); return cmd; }   // ölüyken de alışveriş
  const M=mem(b), dir=b.team===0?1:-1;
  const e=pickFoe(b,M,mode); M.foe=e;
  const eVis=!!e && !e.dead && (mode==='duel' || canSee(b.team,e));
  if(b.st.ball){ if(eVis) cmd.aim=Math.atan2(e.y-b.y, e.x-b.x); return cmd; }   // Gülle Bilardo: topu rakibe yönlendir

  M.noiseT-=dt; if(M.noiseT<=0){ M.noiseT=0.6+rand()*0.6; M.noise=(rand()*2-1)*LVP(b).aimNoise; }
  M.jukeT-=dt;  if(M.jukeT<=0){ M.jukeT=0.3+rand()*0.5; M.juke=rand()<0.5?-1:1; }

  // Alışveriş: üsteyken sıradaki eşyayı (ya da parçalarını) al
  if(canShop(b)) botShop(b);

  const LP=LVP(b);
  let ev = eVis ? teamEval(b,e,M) : null;
  const d = eVis ? dist(b,e) : 1e9;
  if(ev && (LP.win || LP.dng)) ev=adjustEv(b,e,ev,d,LP);
  if(ev && LP.mlW && FIGHT_MODEL) ev=mlBlend(b,e,ev,d,LP.mlW);
  if(eVis) M.eLast={ x:e.x, y:e.y, vx:(e.vx||0)+(e.kx||0), vy:(e.vy||0)+(e.ky||0), t:S.time };   // son görülen yer (Kök Sal)
  // Öldürme penceresi: kendi can eşiğimizden önce gelir (rakip 1-2 vuruşluksa kaçmayız)
  const kw = eVis && mode!=='duel' && !b.chan && !inFountain(b) ? killWindow(b,e,d,M) : false;
  M.kw=kw;
  // Ters öldürme hesabı: rakip bizi şimdi öldürebilir mi? (biz öldüremiyorsak menzilinden çıkarız)
  M.inDanger=false;
  if(eVis && !kw && LP.selfKw && mode!=='duel' && d<1100){ const k2=killCalc(e,b); M.inDanger = k2.myDmg > (b.hp+(b.st.shield?b.st.shield.amt:0))*0.95; }
  if(S.time>=(M.engT||0)){ M.engT=S.time+2+rand()*2; M.engJit=1+(rand()*2-1)*LP.misjudge*0.6; }

  // Kum Saati (16.10.2026) pasif oldu: ölümcül hasarda kendiliğinden heykel olur, botun tuşa basması gerekmez

  // Eşya almak için üsse dön: sıradaki büyük eşyayı tamamlayacak altın biriktiyse ve ortalık sakinse
  const nb=nextBuild(b);
  let waveNear=false, ownN=0, foeN=0;
  for(const m of S.minions) if(!m.dead && dist(m,b)<800){ if(m.team!==b.team){ waveNear=true; foeN++; } else ownN++; }
  // Zor: dalgayı itiyorsak (bizim minyon sayısı belirgin üstünse) dalga kendi başına itmeye devam ederken üsse dönüp eşya al
  if(!M.recall && mode!=='duel' && nb && !canShop(b) && b.gold>=itemCostFor(b,nb)*(1+LP.recallBuf) && !(eVis && d<1000) && (!waveNear || hpNow(b)<0.5 || (LP.wave && ownN>=foeN+2))) { M.recall=true; M.shop=true; }

  // Rakiplerin hepsi uzun süre ölüyse: kuşatamayacak kadar yaralıysak ya da eşya alacaksak şimdi dön (cezası yok)
  if(LP.deadRecall && !M.recall && mode!=='duel' && !canShop(b)){
    let allDead=true; for(const u of S.heroes) if(u.team!==b.team && !(u.dead && u.respawn>AI.deadRecallT)) { allDead=false; break; }
    if(allDead){
      const es=S.lane[1-b.team].find(s=>!s.dead), nearS=es && !es.prot && dist(b,es)<1500;
      if(hpNow(b)<0.4 || (nb && b.gold>=itemCostFor(b,nb) && !nearS)) { M.recall=true; M.shop=!!nb; }
    }
  }
  // Savunma: rakip kahraman kendi yapımıza vuruyor mu? Yarışı kaybedeceksek dönüp savun.
  const myS=S.lane[b.team].find(s=>!s.dead), enS=S.lane[1-b.team].find(s=>!s.dead);
  let defend=false;
  if(eVis && myS && mode!=='duel' && dist(e,myS) < reachTo(e,myS)+150){
    const sieging = enS && !enS.prot && dist(b,enS) < reachTo(b,enS)+60;
    const raceWon = sieging && enS.hp/dps(b) < myS.hp/dps(e);
    defend = !raceWon && ev.adv>=LVP(b).defendAdv;
  }

  // Geri çekilme
  const hpF=b.hp/b.maxHp;
  if(M.recall && kw && !b.recallCh){ M.recall=false; M.shop=false; }
  if(M.recall){ if((hpF>=LVP(b).recallOut && (!M.shop || canShop(b))) || (defend && hpF>LVP(b).diveFloor)) { M.recall=false; M.shop=false; } }
  else if(mode!=='duel' && !defend && hpF<LP.recallHp && !(ev && ev.adv>2.5 && ev.tKill<1.5) && !kw){
    // uzaktaysak sadece rakip bizi tehdit ediyorsa dön, yoksa dikkatli oynamaya devam
    const far=respawnTime(S.time)<=LVP(b).cheapDeath && dist(b,S.lane[b.team][3])>AI.recallDist;
    if(!far || (ev && ev.adv<1 && d<threatR(e,b)+250)) M.recall=true;
  }

  let mv={ x:0, y:0 }, tgt=null, fight=false, allowDive=false;
  // yürüme süresi 8 sn'den kısaysa kanallamaya değmez, yürü
  const walkT=Math.hypot(b.x-b.spawnX,b.y-b.spawnY)/stat(b,'spd');
  if(M.recall && !inFountain(b) && (walkT>RECALL.time || b.recallCh)){
    // güvendeysek üsse dönüş kanalla (yürümekten hızlı); kesilirse yürüyerek devam
    let safe = !(eVis && d<threatR(e,b)+(b.recallCh?100:350));
    if(safe && b.recallCh){ cmd.recall=true; return cmd; }   // başladıysak sadece rakip kahraman yaklaşırsa bırak
    if(safe) for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<450){ safe=false; break; }
    if(safe) for(const p of S.projs) if(p.team!==b.team && Math.hypot(p.x-b.x,p.y-b.y)<500){ safe=false; break; }
    if(safe && !(b.st.burn || b.st.ignite)){ cmd.recall=true; if(eVis) cmd.aim=Math.atan2(e.y-b.y,e.x-b.x); return cmd; }
  }
  if(M.recall){
    const nx=S.lane[b.team][3];
    mv={ x:nx.x+dir*150-b.x, y:nx.y-b.y };
    if(inFountain(b)) mv={ x:0, y:0 };
    // kovalayana karşılık ver: menzilli rakibe vur, yakın dövüşçüden kaç
    if(eVis && d<=reachTo(b,e) && (ranged(e) || d>reachTo(e,b)+60 || inFountain(b))) tgt=e;
  } else {
    const L=(b.role==='jungle' && jungleMove(b,e,eVis,M,ev)) || titanAdv(b,eVis,e) || bigHelp(b,eVis,e) || bigSolo(b,eVis,e) || laneMove(b,e,eVis,M,ev);
    if(eVis){
      if(mode==='duel') fight=true;
      else {
        let engR = ranged(b) ? reachTo(b,e)+220 : 560;
        if(allyFighting(b,e)) engR+=LP.helpRange;   // dostumuz dövüşüyorsa yardıma gel
        const engBase=engR;
        const pa=LP.persOn ? M.pers.aggr : 1, engA=LP.engageAdv/pa*(LP.persOn ? (M.engJit||1) : 1)*(LP.lateK ? 1+LP.lateK*Math.max(0,respawnTime(S.time)-30)/60 : 1);   // lateK (bot L1): geç oyunda uzayan ölüm süresiyle girme eşiği artar   // kişilik ve anlık yanılma: bazen erken, bazen geç girer
        if(ev.adv>=(M.fight?LP.stayAdv/pa:engA) && d<engR) fight=true;
        if(!fight && LP.explore && ev.adv>=0.5 && d<engR){   // veri toplama: çeşitlilik için bazen eşiğin altında da dövüş (6 sn)
          if(S.time>=(M.exT||0)){ M.exT=S.time+6; M.exOn=rand()<LP.explore; }
          if(M.exOn) fight=true;
        }
        if(M.inDanger && ev.adv<1.6 && !defend) fight=false;
        if(kw){ fight=true; M.killUntil=S.time+1.5; }
        else if(!fight && S.time<(M.killUntil||0) && hpNow(b)>0.12 && ev.adv>=0.6) fight=true;   // öldürmeye girdiysek hemen bırakma
        if(defend) fight=true;
        // Kaçış senkronu (syncFlee): yakındaki dostumuz geri çekiliyorsa (üsse dönüş ya da canı çok az) ve kesin öldürme yoksa tek başına dövüşte kalma
        if(fight && LP.syncFlee && !kw && !defend && ev.adv<LP.syncAdv){
          for(const a of S.heroes) if(a!==b && a.team===b.team && !a.dead && dist(a,b)<AI.syncR && ((a.ai && a.ai.v2 && a.ai.v2.recall) || hpNow(a)<0.2)){ fight=false; M.tradeBack=Math.max(M.tradeBack||0, S.time+1); break; }
        }
        // dostumuz saldırı altında ve dövüş lehimizeyse uzaktan da yardıma koş
        if(!fight && ev.adv>=LP.engageAdv && d<LVP(b).helpRun && allyUnderAttack(b,e)) fight=true;
        if(!fight && LP.cmb) fight=hardFight(b,e,ev,d,engBase);   // Zor: kombo, öldürme fırsatı, kuleye dalan rakip
        // menzilliye yakın dövüşçü yapıştıysa kaçmak yetmez (hız aynı): vura vura geri çekil
        if(!fight && ranged(b) && !ranged(e) && d<threatR(e,b)) fight=true;
        // yakın dövüşçü menzilliye karşı: atılış hazırken dalış penceresi; daldıysa kısa süre bırakma
        if(!ranged(b) && ranged(e)){
          const dk=skillKey(b,'dash'), dashReady=dk && rdy(b,dk);
          const sk=skillKey(b,'shield'), shieldReady=sk && rdy(b,sk);
          const reachAll = reachTo(b,e) + (dashReady ? b.def.skills[dk].dist : 0) + (shieldReady ? AI.diveShieldGap : 0);
          if(!fight && dashReady && d<reachAll+LVP(b).diveGap && hpNow(b)>=hpNow(e)-LVP(b).diveHpGap && ev.adv>=LVP(b).diveAdv && heroHitSafe(b,e,e.x,e.y)){
            fight=true; M.commitUntil=S.time+LVP(b).commitTime;
          }
          if(!fight && (M.commitUntil||0)>S.time && hpNow(b)>AI.recallHp && heroHitSafe(b,e,e.x,e.y)) fight=true;
        }
        // yapıya vurabiliyorsak ve rakip bize dokunmuyorsa kovalamaya gerek yok
        if(fight && !kw && L.tgt && L.tgt.kind==='struct' && d>threatR(e,b)+40 && ev.tKill>1.5) fight=false;
        // Uzman/Zor: vurulurken ne dövüşüp ne kaçma (arada kalma): yakın üstünlükte karşılık ver, değilse geri çekil
        if(!fight && LP.noLimbo && (b.dmgBy[e.id] ?? -1e9) > S.time-LVP(b).limboT){
          if(ev.adv>=LVP(b).limboAdv && hpNow(b)>0.3) fight=true; else M.tradeBack=Math.max(M.tradeBack||0, S.time+0.8);
        }
        // Erken kaçış (hurtFlee, bot D4): son 1,5 sn'de kaybedilen can kalan canın büyük kısmıysa ve üstünlük yoksa, can eşiğini beklemeden geri çekil
        if(LP.hurtFlee && !kw && !defend){
          const hh=M.hpHist||(M.hpHist=[]); hh.push([S.time,b.hp]); while(hh.length && hh[0][0]<S.time-1.5) hh.shift();
          const drop=hh.length ? hh[0][1]-b.hp : 0;
          if(drop>b.hp*AI.hurtK && ev.adv<AI.hurtAdv){ fight=false; M.tradeBack=Math.max(M.tradeBack||0, S.time+1.5); }
        }
        if(fight){
          const sp = ranged(b) ? standPoint(b,e,reachTo(b,e)-20) : e;
          if(!heroHitSafe(b,e,sp.x,sp.y)){
            if((ev.tKill<1.2 && b.hp>b.maxHp*0.45) || kw) allowDive=true; else fight=false;
          }
        }
      }
    }
    M.fight=fight;
    if(LP.collect && AI.sink && fight && eVis && ev && S.time>=(M.colT||0)){ M.colT=S.time+0.5; AI.sink.push({ id:b.id, eid:e.id, t:S.time, f:fightFeatures(b,e,ev,d), hp:b.hp/b.maxHp, ehp:e.hp/e.maxHp, dth:b.deaths, edth:e.deaths }); }
    M.poking=false;
    if(fight){ tgt=e; mv=fightMove(b,e,M,ev); }
    else {
      mv=L.mv; tgt=L.tgt; allowDive=L.dive; M.hold=L.hold;
      // Rakip ormancı takibi (jgTrack, bot D2): rakip ormancı uzun süredir görünmüyorsa, dostsuzken kendi kulemizden çok ilerde durma (pusuya karşı)
      if(LP.jgTrack && b.role!=='jungle' && !kw){
        for(const u of S.heroes) if(u.team!==b.team && u.role==='jungle'){
          if(!u.dead && canSee(b.team,u)) M.jgSeen=S.time;
          if(u.dead) M.jgSeen=S.time;
          const ft=frontTower(b.team), ahead=(b.x-ft.x)*(b.team===0?1:-1);
          if(S.time-(M.jgSeen||0)>AI.jgMissT && ahead>AI.jgAhead && alliesAround(b,b.x,b.y,900)===0 && !(L.tgt && L.tgt.kind==='struct')){
            const gx=ft.x+(b.team===0?1:-1)*AI.jgAhead*0.7; mv={ x:gx-b.x, y:mv.y };
          }
        }
      }
      // Dürtme: hazır uzak hasar yeteneğinin menziline gir, at, kısa süre geri çekil (alışveriş)
      const pk = eVis && mode!=='duel' && !b.chan && !(L.tgt && L.tgt.kind==='struct') ? pokePlan(b,e,d,ev,M) : null;
      if(pk){ M.poking=true; mv={ x:pk.x-b.x, y:pk.y-b.y }; }
      else if(eVis && S.time<(M.tradeBack||0) && d<threatR(e,b)+500){
        const l=hyp(mv.x,mv.y)||1;
        mv={ x:mv.x/l*0.5+(b.x-e.x)/d*1.2+homeDir(b)*0.4, y:mv.y/l*0.5+(b.y-e.y)/d*1.2 };
      }
      // menzilli kahraman fırsat buldukça rakibi dürter
      if(eVis && ranged(b) && ev.adv>=LVP(b).pokeAdv && d<=reachTo(b,e) && heroHitSafe(b,e,b.x,b.y)) tgt=e;
    }
  }

  // Nişan ve düz vuruş
  if(tgt){
    cmd.aim = Math.atan2(tgt.y-b.y, tgt.x-b.x);
    cmd.target = tgt;   // düz vuruş hedefli (oyuncuyla aynı kural: menzil içindeyse)
    let ok = inAttackRange(b,tgt);
    // okçu: yakın dövüşçü yetişecekse hazırlığa başlama (hazırlıkta yavaşlarız)
    if(ok && ranged(b) && eVis && !ranged(e) && !M.recall){
      const close=stat(e,'spd')*timings(b).wind;
      if(d-reachTo(e,b) < close+15 && b.atk.state==='ready' && tgt!==e) ok=false;
    }
    if(ok && tgt===e && !allowDive && !heroHitSafe(b,e,b.x,b.y)) ok=false;
    if(ok && M.hold && tgt && (tgt.kind==='minion' || tgt.kind==='monster') && !fight) ok=false;   // son vuruş için bekle
    cmd.attack=ok;
  } else if(eVis) cmd.aim=Math.atan2(e.y-b.y, e.x-b.x);

  // Zor: rakip kontrol altındayken yetenekler dövüş gibi kullanılır (kombo)
  useSkills(b, e, eVis, tgt, fight || (LP.cmb && eVis && !M.recall && isCC(e) && ev.adv>=0.7), M, cmd, ev);

  // İnsansılık: düz vuruşa basmada küçük gecikme, varış noktası hatası, beklerken dolanma
  if(AI.human){
    if(!cmd.attack || b.atk.state!=='ready') M.atkWait=null;
    else { if(M.atkWait==null) M.atkWait=S.time+rand()*LVP(b).humanAtkDelay; if(S.time<M.atkWait) cmd.attack=false; }
    M.errT=(M.errT||0)-dt;
    if(M.errT<=0){
      M.errT=1+rand()*2; const a=rand()*Math.PI*2, r=Math.sqrt(rand())*LVP(b).humanErr;
      M.err={ x:Math.cos(a)*r, y:Math.sin(a)*r }; M.rangeErr=(rand()*2-1)*LVP(b).humanRange;
    }
    const ml=hyp(mv.x,mv.y);
    if(!fight && !M.recall){
      if(ml>40) mv={ x:mv.x+M.err.x, y:mv.y+M.err.y };
      else mv={ x:mv.x+M.err.x*1.4, y:mv.y+M.err.y*1.4 };
    }
  }

  // Hareketi birleştir: hedef + kaçınma + duvar + kule güvenliği
  let vx=mv.x, vy=mv.y; const l=hyp(vx,vy);
  if(l>40){ const nd=navDir(b.x, b.y, b.x+vx, b.y+vy, b.r+4); vx=nd.x; vy=nd.y; }   // varış noktası: duvarların etrafından yol bul
  else if(l>1){ vx/=l; vy/=l; }
  const dg=dodgeVec(b,e,eVis,M); vx+=dg.x; vy+=dg.y;
  if(b.y<70) vy+=(70-b.y)/40; if(b.y>WORLD.h-70) vy-=(b.y-(WORLD.h-70))/40;
  // Zincir bağı sürerken bağlı rakipten uzaklaşma (bağ mesafe aşılınca kopar): dışa doğru hareket bileşeni silinir, sınıra yaklaşınca içe doğru çekilir
  { const tt=b.ic.tether;
    if(tt && eVis && tt.target===e && !M.recall && d>tt.range-170){
      const ux=(e.x-b.x)/d, uy=(e.y-b.y)/d, out=-(vx*ux+vy*uy);
      if(out>0){ vx+=ux*out; vy+=uy*out; }
      if(d>tt.range-90){ vx+=ux*0.8; vy+=uy*0.8; }
    } }
  if(!allowDive){
    const s=unsafeAt(b, b.x+vx*40, b.y+vy*40);
    if(s){
      const ax=b.x-s.x, ay=b.y-s.y, al=hyp(ax,ay)||1, inward=-(vx*ax+vy*ay)/al;
      if(inward>0){ vx+=ax/al*inward; vy+=ay/al*inward; }
      if(unsafeAt(b,b.x,b.y)){ vx+=ax/al*1.2; vy+=ay/al*1.2; }
    }
  }
  if(Math.abs(vx)<1e-3 && Math.abs(vy)<1e-3){ vx=0; vy=0; }
  else { const sd=slideDir(b.x, b.y, vx, vy, b.r+4); vx=sd.x; vy=sd.y; }   // duvara doğruysa duvar boyunca kay
  // İnsansılık: hareket yönü her karede değil, insan tıklama hızında güncellenir (kaçınma hemen tepki verir)
  if(AI.human){
    M.mvT=(M.mvT||0)-dt;
    if(M.mvT>0 && M.lmx!==undefined && !dg.x && !dg.y){ vx=M.lmx; vy=M.lmy; }
    else { const [h0,h1]=LVP(b).humanMoveHold; M.mvT=h0+rand()*(h1-h0); M.lmx=vx; M.lmy=vy; }
  }
  cmd.mx=vx; cmd.my=vy;
  return cmd;
}

export function botCommand(b, dt){
  const cmd=botCommandCore(b, dt);
  if(b.chan && !b.dead){ if(b.chan.art) artChannel(b, cmd); else holdChannel(b, cmd); }   // Kilitli Yaylım kanallanırken hareket komutu verme (yoksa iptal olur)
  return cmd;
}

/* test ve hata ayıklama için iç fonksiyonlar */
export const _dbg = { laneMove, unsafeAt, towerHits, standPoint, reachTo, fightEval, canDive, threatR, heroHitSafe };

/* BOT v2 (fayda sistemi öncesi), karşılaştırma için saklanıyor. Güncel bot ai.js içinde.
   Akış: algı -> karar (geri çekil / dövüş / koridor) -> hareket (konum + kaçınma + kule güvenliği) -> saldırı ve yetenekler.
   Eski bot karşılaştırma için ai_v1.js içinde. */
import { WORLD, LANE_Y, TOWER, towerChampHit, towerMinionHit, FOUNTAIN, respawnTime } from './data.js';
import { S, settings, rand, dist, atkDef, atkDmg, attackSpeed, timings, canSee, canAct, stat, burnDps, apOf, canShop, botShop, nextBuild, itemCostFor } from './sim.js';
import { CRIT_MULT } from './items.js';

/* Ayarlanabilir sabitler */
export const AI = {
  react:[0.15, 0.30],   // görülen mermiye / hazırlığa tepki süresi (sn)
  aimNoise:0.05,        // nişan sapması (radyan, ±)
  recallHp:0.30,        // can bu oranın altına inince üsse dön
  recallOut:0.85,       // üste bu orana kadar iyileş
  engageAdv:1.15,       // dövüşe girmek için gereken üstünlük (ölme süresi / öldürme süresi)
  stayAdv:0.85,         // dövüşteyken bu orana kadar kal
  fleeAdv:0.85,         // bunun altında rakipten uzak dur
  homeBias:0.8,
  stasisHp:0.25,        // Kum Saati bu canın altında kullanılır         // geri çekilirken üsse doğru eğilim
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
  diveMinDmg:250        // dalışta en az bu kadar hasar verebileceksek dal
};
const KEY = { r:'rmb', e:'e', s:'space' };

function mem(b){
  return b.ai.v2 || (b.ai.v2 = { recall:false, fight:false, seen:new WeakMap(), juke:1, jukeT:0, noise:0, noiseT:0, threatRef:null, threatAt:0 });
}

/* ---- yardımcılar ---- */
const hyp = Math.hypot;
const ranged = h => atkDef(h).type==='projectile';
const dps = h => { const B=h.bonus||{}; return atkDmg(h)*attackSpeed(h)*(1+(B.crit||0)*((B.critMult||CRIT_MULT)-1)); };
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
  const k=skillKey(e,'dash');
  return reachTo(e,b) + (k && rdy(e,k) ? e.def.skills[k].dist : 0) + 30;
}

/* Kule s, b pos noktasındayken b'ye vurur mu? Kule en yakın birime vurur, şampiyona saldırana döner. */
function towerHits(s, b, px, py, margin){
  if(s.dead || s.sub==='nexus') return false;
  const myD=hyp(s.x-px, s.y-py)-b.r;
  if(myD > s.range+margin) return false;
  if(s.aggro && s.aggro.target===b) return true;
  for(const u of S.minions){
    if(u.dead || u.team!==b.team || u.hp<AI.tankHp) continue;
    const d=dist(s,u)-u.r;
    if(d<=s.range && d<myD-AI.tankMargin) return false;
  }
  for(const h of S.heroes){
    if(h===b || h.dead || h.team!==b.team) continue;
    const d=dist(s,h)-h.r;
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
  for(let i=0;i<n;i++) sum+=towerChampHit(i);
  return sum;
}
/* Tanksız kule dalışı değer mi? Rakip kahraman uzaktaysa ve ölmeden önce verebileceğimiz hasar yeterliyse dal.
   (Yeniden doğma kısa olduğu için ölüm ucuz: kuleye ciddi hasar vermek çoğu zaman ölmeye değer.) */
function canDive(b, st, e, M){
  if(st.sub==='nexus') return true;
  if(e && !e.dead && dist(e,st)<AI.diveEnemyDist) return false;
  // ölüm ucuzsa (yeniden doğma kısa) ölene kadar vur, pahalıysa canı koru
  const cheap=respawnTime(S.time)<=AI.cheapDeath;
  const floor=b.maxHp*(cheap?0:AI.diveFloor), start=cheap?0.2:AI.diveStart;
  if(b.hp < (M.dive ? floor : b.maxHp*start)) return false;
  let myD=dps(b)*0.95;
  for(const m of S.minions) if(!m.dead && m.team===b.team && dist(m,st)<300) myD+=m.def.dmg/m.def.period;
  const live=(b.hp-floor)/(towerChampHit(3)/TOWER.interval);
  return myD*live >= Math.min(st.hp, AI.diveMinDmg);
}

/* Hazır yeteneklerin ham katkısı, türüne göre (ağırlıklar FE.w içinde) */
function burstRaw(h){
  const out={}, base=atkDmg(h);
  const add=(k,v)=>{ out[k]=(out[k]||0)+v; };
  for(const k of ['r','e','s']){
    if(!rdy(h,k)) continue;
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
  }
  return out;
}
/* Dövüş tahmini ağırlıkları. tools/calib.js gerçek maç dövüşlerinden bunları uydurur. */
export const FE = {
  hitRR:0.02, hitRM:1.256, hitMR:0.265, hitMM:0.509,   // isabet: R=menzilli, M=yakın (saldıran, savunan)
  towerW:0.125, minionW:0.137, k:0.874,
  w:{volley:0.104, bigarrow:0.275, dash:0.27, haste:0.595, giant:0.385, shield:3.349, fireball:0.427, ignite:0.506, igniteAmp:0.5, meteor:0.595}
};
const BONUS_T={ haste:1, giant:1, igniteAmp:1 }, EHP_T={ shield:1 };
/* Hazır hasar yeteneklerinin en uzun menzili (yoksa 0) */
function skillReach(h){
  let r=0;
  for(const k of ['r','e','s']){
    const sk=h.def.skills[k];
    if(rdy(h,k) && sk.range && ['fireball','ignite','meteor','volley','bigarrow'].includes(sk.type)) r=Math.max(r, sk.range);
  }
  return r;
}
const hpNow = h => h.hp/h.maxHp;
/* Kendi üssümüzün yönü (x ekseninde) */
const homeDir = b => b.team===0 ? -1 : 1;
/* Pasif yakma: saniye başı ek hasar */
function burnOf(h){ const p=h.def.skills.p; return p.burnMin!==undefined ? burnDps(p,h.level)+(p.ap||0)*apOf(h) : 0; }
/* Bir tarafın ham dövüş bileşenleri (b'nin e'ye karşı) */
function sideComps(b, e){
  const tw=towerChampHit(2)/TOWER.interval;
  let tower=0, minion=0;
  for(const s of S.structs){
    if(s.dead || s.sub==='nexus') continue;
    if(s.team===b.team && dist(s,e)-e.r<=s.range+60) tower+=tw;
  }
  for(const m of S.minions) if(!m.dead && m.team===b.team && dist(m,e)<300) minion+=m.def.dmg*(m.dmgMult||1)/m.def.period;
  return { dps:dps(b), burn:burnOf(b), cat:(ranged(b)?'R':'M')+(ranged(e)?'R':'M'), burst:burstRaw(b),
    hp:b.hp+(b.st.shield?b.st.shield.amt:0), heal:inFountain(b)?b.maxHp*FOUNTAIN.healPct:0, tower, minion };
}
export function fightComps(b, e){ return { me:sideComps(b,e), en:sideComps(e,b) }; }
/* Bileşenlerden üstünlük: adv = (bizim ölme süremiz) / (rakibi öldürme süremiz). 1'den büyükse biz önde. */
export function advFrom(c, P=FE){
  const one=(x)=>{
    let dmg=0, ehp=0, bonus=0;
    for(const [t,v] of Object.entries(x.burst)){ const w=P.w[t]||0; if(BONUS_T[t]) bonus+=v*w; else if(EHP_T[t]) ehp+=v*w; else dmg+=v*w; }
    return { D:x.dps*(1+bonus)*P['hit'+x.cat]+x.burn+x.tower*P.towerW+x.minion*0.7*P.minionW, dmg, ehp };
  };
  const m=one(c.me), n=one(c.en);
  const myD=Math.max(1, m.D-c.en.heal), enD=Math.max(1, n.D-c.me.heal);
  const tKill=Math.max(0.2, c.en.hp+n.ehp-m.dmg)/myD, tDie=Math.max(0.2, c.me.hp+m.ehp-n.dmg)/enD;
  return { adv:Math.pow(tDie/tKill, P.k), tKill, tDie };
}
function fightEval(b, e){ return advFrom(fightComps(b,e)); }

/* Mermi nişanı: hedefin hızına göre önden nişan alır (hazırlık + uçuş süresi) */
function leadAim(b, u, wind, speed, M){
  const vx=(u.vx||0)+(u.kx||0), vy=(u.vy||0)+(u.ky||0);
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
  const side=(ux,uy,rx,ry,need,w)=>{
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
    if(t0===undefined){ t0=S.time+AI.react[0]+rand()*(AI.react[1]-AI.react[0]); M.seen.set(p,t0); }
    if(S.time<t0) continue;
    const sp=hyp(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, rx=b.x-p.x, ry=b.y-p.y, along=rx*ux+ry*uy;
    if(along<0 || along>p.max-p.dist+b.r) continue;
    side(ux,uy,rx,ry,b.r+p.r+8,2);
  }
  // Düşman alan saldırısının (meteor) içindeysek dışarı çık
  for(const z of S.zones||[]){
    if(z.team===b.team) continue;
    let t0=M.seen.get(z);
    if(t0===undefined){ t0=S.time+AI.react[0]+rand()*(AI.react[1]-AI.react[0]); M.seen.set(z,t0); }
    if(S.time<t0) continue;
    const rx=b.x-z.x, ry=b.y-z.y, l=hyp(rx,ry)||1;
    if(l<z.r+b.r+10){ vx+=rx/l*2.5; vy+=ry/l*2.5; }
  }
  // Rakip kahraman bize nişan alıyor (yetenek hazırlığı ya da okçu düz vuruş hazırlığı)
  if(eVis){
    let ang=null, width=0, len=0;
    if(e.cast){
      const sk=e.def.skills[e.cast.k];
      ang=e.cast.aim; len=sk.range+e.r+40;
      width = sk.type==='volley' ? Math.tan(sk.spread/2)*Math.min(len,dist(b,e)) + sk.radius : sk.radius;
    } else if(e.atk.state==='windup' && ranged(e)){
      const at=atkDef(e); ang=e.atk.aim; len=at.range+e.r+40; width=at.projRadius;
    }
    const ref=e.cast || (ang!==null ? e.atk : null);
    if(ref && ref!==M.threatRef){ M.threatRef=ref; M.threatAt=S.time+AI.react[0]+rand()*(AI.react[1]-AI.react[0]); }
    if(ang!==null && S.time>=M.threatAt){
      const ux=Math.cos(ang), uy=Math.sin(ang), rx=b.x-e.x, ry=b.y-e.y, along=rx*ux+ry*uy;
      if(along>0 && along<len) side(ux,uy,rx,ry,width+b.r+8,1.6);
    }
  }
  return { x:vx, y:vy };
}

/* ---- karar katmanları ---- */

/* Dövüş hareketi: okçu mesafe korur, yakın dövüşçü üstüne gider; ikisi de nişandan kaçmak için yön değiştirir */
function fightMove(b, e, M, ev){
  const dx=e.x-b.x, dy=e.y-b.y, d=hyp(dx,dy)||1, nx=dx/d, ny=dy/d, px=-ny, py=nx;
  const eR=ranged(e);
  let radial, side;
  if(ranged(b)){
    const my=reachTo(b,e);
    // yakın dövüşçüye karşı: düz vuruş menzili kısa ama hazır yetenek menzili uzunsa, yetenek menzilinden oyna
    const safeD=threatR(e,b)+AI.keepMelee, sr=skillReach(b);
    // yakın dövüşçünün tehdit menziline (atılış dahil) girme; düz vuruş yetişmiyorsa yeteneklerle oyna
    let keep = eR ? my-25 : (my-20>=safeD ? my-20 : (sr>safeD ? safeD+20 : safeD));
    if(ev.adv>2.5) keep=Math.min(keep, my-20);
    radial = d>keep+25 ? 1 : d<keep-25 ? -1 : 0;
    side = M.juke*(eR?0.7:0.35);
  } else {
    radial=1;
    side = eR ? M.juke*(d>250?0.55:0.2) : M.juke*0.15;
  }
  // Düz vuruş yolunu düşman minyonu kesiyorsa yana kay
  if(ranged(b)){
    const bl=blocker(b, Math.atan2(dy,dx), e, atkDef(b).projRadius);
    if(bl) side += ((bl.x-b.x)*px+(bl.y-b.y)*py) > 0 ? -0.9 : 0.9;
  }
  let mx=nx*radial+px*side, my=ny*radial+py*side;
  // geri çekilirken kendi üssümüze doğru kaç (rakip arkamıza geçtiyse düşman tarafına koşma)
  if(radial<0){ mx+=homeDir(b)*AI.homeBias; }
  return { x:mx, y:my };
}

/* Koridor: yapı (tank varken) > düşman minyonu > dalganın arkasında bekle */
function laneMove(b, e, eVis, M, ev){
  const dir=b.team===0?1:-1;
  let tgt=null, stand=null;
  const st=S.lane[1-b.team].find(s=>!s.dead);
  let dive=false;
  if(st && !st.prot && dist(b,st)<1600){
    const sp=findStand(b, st, reachTo(b,st)-15);
    if(sp){ tgt=st; stand=sp; }
    else if(canDive(b,st,e,M)){ tgt=st; stand=standPoint(b, st, reachTo(b,st)-15); dive=true; }
  }
  if(!tgt){
    let best=1e9;
    const meleeThreat = eVis && ranged(b) && !ranged(e) && !(ev && ev.adv>=AI.engageAdv);
    for(const m of S.minions){
      if(m.dead || m.team===b.team || !canSee(b.team,m)) continue;
      const dd=dist(b,m); if(dd>950) continue;
      const sp=findStand(b, m, reachTo(b,m)-12);
      if(!sp) continue;
      // menzilli: yakın dövüşçünün tehdit menzilinde minyon kesme (uzakta durup yetenekle kes)
      if(meleeThreat && hyp(sp.x-e.x,sp.y-e.y) < threatR(e,b)+AI.keepMelee) continue;
      const sc=dd+m.hp*0.6;
      if(sc<best){ best=sc; tgt=m; stand=sp; }
    }
  }
  let mv;
  if(tgt){
    const dx=stand.x-b.x, dy=stand.y-b.y;
    mv = hyp(dx,dy)<10 ? { x:0, y:0 } : { x:dx, y:dy };
  } else {
    // dalganın biraz arkasında, yoksa kendi en öndeki kulemizin önünde bekle
    let front=null;
    for(const m of S.minions) if(!m.dead && m.team===b.team && (!front || m.x*dir>front.x*dir)) front=m;
    const own=S.lane[b.team].find(s=>!s.dead && s.sub!=='nexus') || S.lane[b.team][3];
    let gx = front ? front.x-dir*(ranged(b)?190:80) : own.x+dir*130, gy=LANE_Y+(b.team===0?70:-70);
    for(let i=0;i<40 && unsafeAt(b,gx,gy);i++) gx-=dir*40;
    const dx=gx-b.x, dy=gy-b.y;
    mv = hyp(dx,dy)<20 ? { x:0, y:0 } : { x:dx, y:dy };
  }
  // Güçlü rakipten uzak dur (eşit güçteyse dalgayla oynamaya devam)
  if(eVis && ev && ev.adv<AI.fleeAdv){
    const d=dist(b,e), tr=threatR(e,b);
    if(d<tr){
      const l=hyp(mv.x,mv.y)||1, w=(tr-d)/tr*2.5+0.6;
      mv={ x:mv.x/l+(b.x-e.x)/d*w+homeDir(b)*AI.homeBias*w, y:mv.y/l+(b.y-e.y)/d*w };
    }
  }
  M.dive=dive;
  return { mv, tgt, dive };
}

/* Yetenek kullanımı */
function useSkills(b, e, eVis, tgt, fight, M, cmd, ev){
  if(!canAct(b)) return;
  const d=eVis ? dist(b,e) : 1e9, quiet=!eVis || d>900;
  const near=(r)=>{ let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<r) n++; return n; };
  for(const k of ['r','e','s']){
    if(!rdy(b,k)) continue;
    const sk=b.def.skills[k];
    let use=false;
    if(sk.type==='haste'){
      use = (fight && d<reachTo(b,e)+60) || (quiet && tgt && (tgt.kind==='struct' || near(450)>=3));
    } else if(sk.type==='volley'){
      if(fight && d<sk.range-30){ use=true; cmd.aim=leadAim(b,e,sk.cast,sk.speed,M); }
      else if(quiet && tgt && tgt.kind==='minion'){
        let n=0; const a=Math.atan2(tgt.y-b.y,tgt.x-b.x);
        for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<sk.range-20 && Math.abs(Math.atan2(m.y-b.y,m.x-b.x)-a)<sk.spread/2) n++;
        use = n>=3;
      }
    } else if(sk.type==='bigarrow'){
      if(eVis && d<sk.range-40){
        const ang=leadAim(b,e,sk.cast,sk.speed,M), threat=!ranged(e) && d<threatR(e,b)+40;
        const kill = e.hp < atkDmg(b)*sk.ratio*0.95;
        if((fight || threat || kill) && !blocker(b,ang,e,sk.radius)){ use=true; cmd.aim=ang; }
      }
    } else if(sk.type==='dash'){
      if(fight && eVis){
        const reach=reachTo(b,e);
        if(d>reach+5 && d<sk.dist+reach-10){
          const ang=Math.atan2(e.y+(e.vy||0)*0.15-b.y, e.x+(e.vx||0)*0.15-b.x);
          if(!blocker(b,ang,e,b.r)){ use=true; cmd.aim=ang; }
        }
      }
    } else if(sk.type==='shield'){
      use = (fight && d<450) || (eVis && d<300 && b.hp<b.maxHp*0.6) || (M.recall && eVis && d<500);
    } else if(sk.type==='giant'){
      use = (fight && d<210) || (quiet && tgt && tgt.kind==='struct' && dist(b,tgt)<reachTo(b,tgt)) || (quiet && near(220)>=3);
    } else if(sk.type==='fireball'){
      // kısa bekleme: rakibe fırsat buldukça, sakinken dalgaya
      const poke = eVis && d<sk.range-60 && (fight || ev && ev.adv>=AI.pokeAdv) && heroHitSafe(b,e,b.x,b.y);
      if(poke){
        const ang=leadAim(b,e,sk.cast,sk.speed,M);
        if(!blocker(b,ang,e,sk.radius)){ use=true; cmd.aim=ang; }
      } else if(quiet && tgt && tgt.kind==='minion' && dist(b,tgt)<sk.range-100){ use=true; cmd.aim=Math.atan2(tgt.y-b.y,tgt.x-b.x); }
    } else if(sk.type==='ignite'){
      if(eVis && d-e.r<sk.range-10 && (fight || ev && ev.adv>=AI.pokeAdv) && heroHitSafe(b,e,b.x,b.y)){ use=true; cmd.tx=e.x; cmd.ty=e.y; }
    } else if(sk.type==='meteor'){
      if(eVis && d<sk.range && (fight || ev && ev.adv>=AI.pokeAdv)){
        // gecikme boyunca rakibin gideceği yere, kısmen (rakip kaçabilir)
        const k2=e.st.freeze>0 ? 0 : 0.6;
        cmd.tx=e.x+((e.vx||0)+(e.kx||0))*sk.delay*k2; cmd.ty=e.y+((e.vy||0)+(e.ky||0))*sk.delay*k2; use=true;
      } else if(quiet && tgt && tgt.kind==='minion'){
        let n=0; for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,tgt)<sk.radius) n++;
        if(n>=4 && dist(b,tgt)<sk.range){ use=true; cmd.tx=tgt.x; cmd.ty=tgt.y; }
      }
    }
    if(use) cmd[KEY[k]]=true;
  }
}

/* ---- ana giriş ---- */
export function botCommand(b, dt){
  const cmd={ mx:0, my:0, aim:b.aim, attack:false, rmb:false, e:false, space:false };
  const mode=settings.botMode;
  if(mode==='idle' || b.dead) return cmd;
  const M=mem(b), dir=b.team===0?1:-1;
  const e=S.heroes.find(u=>u.team!==b.team);
  const eVis=!!e && !e.dead && (mode==='duel' || canSee(b.team,e));

  M.noiseT-=dt; if(M.noiseT<=0){ M.noiseT=0.6+rand()*0.6; M.noise=(rand()*2-1)*AI.aimNoise; }
  M.jukeT-=dt;  if(M.jukeT<=0){ M.jukeT=0.3+rand()*0.5; M.juke=rand()<0.5?-1:1; }

  // Alışveriş: üsteyken sıradaki eşyayı (ya da parçalarını) al
  if(canShop(b)) botShop(b);

  const ev = eVis ? fightEval(b,e) : null;
  const d = eVis ? dist(b,e) : 1e9;

  // Kum Saati: can çok azken ve rakip yakındayken dokunulmazlık
  if(b.bonus && b.bonus.stasis && (b.ic.stasisCd||0)<=S.time && hpNow(b)<AI.stasisHp && eVis && d<450) cmd.item=true;

  // Eşya almak için üsse dön: sıradaki büyük eşyayı tamamlayacak altın biriktiyse ve ortalık sakinse
  const nb=nextBuild(b);
  if(!M.recall && mode!=='duel' && nb && !canShop(b) && b.gold>=itemCostFor(b,nb) && !(eVis && d<1000)) { M.recall=true; M.shop=true; }

  // Savunma: rakip kahraman kendi yapımıza vuruyor mu? Yarışı kaybedeceksek dönüp savun.
  const myS=S.lane[b.team].find(s=>!s.dead), enS=S.lane[1-b.team].find(s=>!s.dead);
  let defend=false;
  if(eVis && myS && mode!=='duel' && dist(e,myS) < reachTo(e,myS)+150){
    const sieging = enS && !enS.prot && dist(b,enS) < reachTo(b,enS)+60;
    const raceWon = sieging && enS.hp/dps(b) < myS.hp/dps(e);
    defend = !raceWon && ev.adv>=AI.defendAdv;
  }

  // Geri çekilme
  const hpF=b.hp/b.maxHp;
  if(M.recall){ if((hpF>=AI.recallOut && (!M.shop || canShop(b))) || (defend && hpF>AI.diveFloor)) { M.recall=false; M.shop=false; } }
  else if(mode!=='duel' && !defend && hpF<AI.recallHp && !(ev && ev.adv>2.5 && ev.tKill<1.5)){
    // uzaktaysak sadece rakip bizi tehdit ediyorsa dön, yoksa dikkatli oynamaya devam
    const far=respawnTime(S.time)<=AI.cheapDeath && dist(b,S.lane[b.team][3])>AI.recallDist;
    if(!far || (ev && ev.adv<1 && d<threatR(e,b)+250)) M.recall=true;
  }

  let mv={ x:0, y:0 }, tgt=null, fight=false, allowDive=false;
  if(M.recall && !inFountain(b)){
    // güvendeysek üsse dönüş kanalla (yürümekten hızlı); kesilirse yürüyerek devam
    let safe = !(eVis && d<threatR(e,b)+(b.recallCh?100:350));
    if(safe && b.recallCh){ cmd.recall=true; return cmd; }   // başladıysak sadece rakip kahraman yaklaşırsa bırak
    if(safe) for(const m of S.minions) if(!m.dead && m.team!==b.team && dist(m,b)<450){ safe=false; break; }
    if(safe) for(const p of S.projs) if(p.team!==b.team && Math.hypot(p.x-b.x,p.y-b.y)<500){ safe=false; break; }
    if(safe && !(b.st.burn || b.st.ignite)){ cmd.recall=true; if(eVis) cmd.aim=Math.atan2(e.y-b.y,e.x-b.x); return cmd; }
  }
  if(M.recall){
    const nx=S.lane[b.team][3];
    mv={ x:nx.x+dir*140-b.x, y:LANE_Y+100-b.y };
    if(inFountain(b)) mv={ x:0, y:0 };
    // kovalayana karşılık ver: menzilli rakibe vur, yakın dövüşçüden kaç
    if(eVis && d<=reachTo(b,e) && (ranged(e) || d>reachTo(e,b)+60 || inFountain(b))) tgt=e;
  } else {
    const L=laneMove(b,e,eVis,M,ev);
    if(eVis){
      if(mode==='duel') fight=true;
      else {
        const engR = ranged(b) ? reachTo(b,e)+220 : 560;
        if(ev.adv>=(M.fight?AI.stayAdv:AI.engageAdv) && d<engR) fight=true;
        if(defend) fight=true;
        // menzilliye yakın dövüşçü yapıştıysa kaçmak yetmez (hız aynı): vura vura geri çekil
        if(!fight && ranged(b) && !ranged(e) && d<threatR(e,b)) fight=true;
        // yapıya vurabiliyorsak ve rakip bize dokunmuyorsa kovalamaya gerek yok
        if(fight && L.tgt && L.tgt.kind==='struct' && d>threatR(e,b)+40 && ev.tKill>1.5) fight=false;
        if(fight){
          const sp = ranged(b) ? standPoint(b,e,reachTo(b,e)-20) : e;
          if(!heroHitSafe(b,e,sp.x,sp.y)){
            if(ev.tKill<1.2 && b.hp>b.maxHp*0.45) allowDive=true; else fight=false;
          }
        }
      }
    }
    M.fight=fight;
    if(fight){ tgt=e; mv=fightMove(b,e,M,ev); }
    else {
      mv=L.mv; tgt=L.tgt; allowDive=L.dive;
      // menzilli kahraman fırsat buldukça rakibi dürter
      if(eVis && ranged(b) && ev.adv>=AI.pokeAdv && d<=reachTo(b,e) && heroHitSafe(b,e,b.x,b.y)) tgt=e;
    }
  }

  // Nişan ve düz vuruş
  if(tgt){
    cmd.aim=aimAt(b,tgt,M);
    let ok = dist(b,tgt) <= reachTo(b,tgt);
    // okçu: yakın dövüşçü yetişecekse hazırlığa başlama (hazırlıkta yavaşlarız)
    if(ok && ranged(b) && eVis && !ranged(e) && !M.recall){
      const close=stat(e,'spd')*timings(b).wind;
      if(d-reachTo(e,b) < close+15 && b.atk.state==='ready' && tgt!==e) ok=false;
    }
    if(ok && tgt===e && !allowDive && !heroHitSafe(b,e,b.x,b.y)) ok=false;
    cmd.attack=ok;
  } else if(eVis) cmd.aim=Math.atan2(e.y-b.y, e.x-b.x);

  useSkills(b, e, eVis, tgt, fight, M, cmd, ev);

  // Hareketi birleştir: hedef + kaçınma + duvar + kule güvenliği
  let vx=mv.x, vy=mv.y; const l=hyp(vx,vy); if(l>1){ vx/=l; vy/=l; }
  const dg=dodgeVec(b,e,eVis,M); vx+=dg.x; vy+=dg.y;
  if(b.y<70) vy+=(70-b.y)/40; if(b.y>WORLD.h-70) vy-=(b.y-(WORLD.h-70))/40;
  if(!allowDive){
    const s=unsafeAt(b, b.x+vx*40, b.y+vy*40);
    if(s){
      const ax=b.x-s.x, ay=b.y-s.y, al=hyp(ax,ay)||1, inward=-(vx*ax+vy*ay)/al;
      if(inward>0){ vx+=ax/al*inward; vy+=ay/al*inward; }
      if(unsafeAt(b,b.x,b.y)){ vx+=ax/al*1.2; vy+=ay/al*1.2; }
    }
  }
  if(Math.abs(vx)<1e-3 && Math.abs(vy)<1e-3){ vx=0; vy=0; }
  cmd.mx=vx; cmd.my=vy;
  return cmd;
}

/* test ve hata ayıklama için iç fonksiyonlar */
export const _dbg = { laneMove, unsafeAt, towerHits, standPoint, reachTo, fightEval, canDive, threatR, heroHitSafe };

/* ESKİ BOT (v1): karşılaştırma için saklanıyor. Yeni bot ai.js içinde. */
import { WORLD, LANE_Y } from './data.js';
import { S, settings, rand, dist, angDiff, atkDef, timings, canSee, canAct } from './sim.js';

/* Kulenin yanına girmek için gereken dost minyon sayısı (380 birim içinde) */
const COVER_MIN=1;
/* İtme: rakip kahraman ölü/zayıfsa ya da yanımızda dost minyon varsa kuleye gir */
const PUSH_HP=0.5;
const WEAK_HP=0.6;      // rakip kahraman bu canın altındaysa zayıf sayılır
const RETREAT_IN=0.3, RETREAT_OUT=0.9;

export function botCommand(b, dt){
  const ai=b.ai, at=atkDef(b), mode=settings.botMode;
  const cmd={ mx:0, my:0, aim:b.aim, attack:false, rmb:false, e:false, space:false };
  if(mode==='idle' || b.dead) return cmd;

  const t=S.heroes.find(u=>u.team!==b.team), dir=b.team===0?1:-1, enemyTeam=1-b.team, myNexus=S.lane[b.team][3];
  const tSeen = !t.dead && (mode==='duel' || canSee(b.team,t));   // bot da sisten etkilenir
  ai.strafeT-=dt;
  if(ai.strafeT<=0){ ai.strafe=rand()<0.5?-1:1; ai.strafeT=0.5+rand(); ai.noise=(rand()-0.5)*0.16; }

  const towers=S.lane[enemyTeam].filter(s=>!s.dead && s.sub!=='nexus');
  const inTower=u=>towers.some(s=>dist(s,u)<=s.range+u.r+40);
  const cover=pos=>S.minions.filter(m=>!m.dead && m.team===b.team && dist(m,pos)<380).length;
  const weak=!t.dead ? t.hp<t.maxHp*WEAK_HP : true;
  const pushOk=b.hp>=b.maxHp*PUSH_HP && (weak || cover(b)>=1 || !tSeen || dist(t,b)>900);

  // Geri çekilme (sadece koridor modunda)
  if(mode==='lane'){
    if(ai.retreat){ if(b.hp>=b.maxHp*RETREAT_OUT) ai.retreat=false; }
    else if(b.hp<b.maxHp*RETREAT_IN) ai.retreat=true;
  } else ai.retreat=false;

  if(ai.retreat){
    // Üs kulesi ortada durduğu için yanından dolan
    cmd.mx=myNexus.x+dir*150-b.x; cmd.my=LANE_Y+90-b.y;
    if(tSeen && dist(t,b)<260){
      cmd.aim=Math.atan2(t.y-b.y,t.x-b.x);
      cmd.attack = dist(t,b)-t.r <= (at.type==='projectile'?at.range:at.range+b.r)*0.9;
    }
    return cmd;
  }

  // Hedef seçimi
  let tu=null;
  if(mode==='duel'){
    if(tSeen) tu=t;
  } else {
    const fightR = at.type==='projectile' ? at.range+160 : 300;
    if(tSeen && dist(t,b)<fightR && !inTower(t)){
      tu=t;
    } else {
      const st0=S.lane[enemyTeam].find(s=>!s.dead);
      let bd=1e9;
      if(st0 && !st0.prot && pushOk && dist(st0,b)<2500) tu=st0;   // itme: önce yapı
      else for(const m of S.minions){
        if(m.dead || m.team===b.team || !canSee(b.team,m)) continue;
        const dd=dist(m,b);
        if(dd<650 && dd<bd && (!inTower(m) || cover(m)>=COVER_MIN)){ bd=dd; tu=m; }
      }
      if(!tu){
        const st=S.lane[enemyTeam].find(s=>!s.dead);
        if(st && !st.prot && dist(st,b)<900 && (cover(st)>=COVER_MIN || pushOk)) tu=st;
      }
    }
  }

  if(tu){
    const dx=tu.x-b.x, dy=tu.y-b.y, d=Math.hypot(dx,dy)||1, nx=dx/d, ny=dy/d, px=-ny, py=nx;
    const isHero=tu.kind==='hero', ed=d-tu.r;
    let radial, strafe=ai.strafe*(isHero?1:0.15);
    if(at.type==='projectile'){
      const want=at.range*0.72;
      radial = ed>want+40?1 : ed<want-40?-1 : 0;
      if(isHero) strafe*=0.9;
    } else {
      if(isHero){ radial=1; strafe*= d<200?0.6:0.35; }
      else radial = ed-b.r > at.range*0.6 ? 1 : 0;
    }
    cmd.mx=nx*radial+px*strafe; cmd.my=ny*radial+py*strafe;
    if(b.y<60)cmd.my+=1.5; if(b.y>WORLD.h-60)cmd.my-=1.5;

    let ax=tu.x, ay=tu.y;
    if(at.type==='projectile'){
      const tt=d/at.projSpeed+timings(b).wind*0.5;
      ax+=((tu.vx||0)+(tu.kx||0))*tt*0.85; ay+=((tu.vy||0)+(tu.ky||0))*tt*0.85;
    }
    cmd.aim=Math.atan2(ay-b.y, ax-b.x)+(isHero?ai.noise:0);

    const reach = at.type==='projectile' ? at.range+b.r : at.range+b.r;
    cmd.attack = ed <= reach*0.92;

    // Koruması zayıf kule menzilinden uzaklaş
    if(mode==='lane' && inTower(b) && cover(b)<COVER_MIN && tu.kind!=='struct'){
      cmd.mx=-dir; cmd.my=(LANE_Y-b.y)/200;
    }

    // Yetenekler sadece kahramana karşı
    if(isHero){
      const rdy=k=>b.cd[k]<=0 && b.rank[k]>0 && canAct(b);
      const facing=Math.abs(angDiff(cmd.aim,Math.atan2(dy,dx)))<0.35;
      if(at.type==='projectile'){
        if(rdy('e') && d<450) cmd.e=true;
        if(rdy('s') && d<600 && facing) cmd.space=true;
        else if(rdy('r') && d<420 && facing) cmd.rmb=true;
      } else {
        if(rdy('e') && d<260) cmd.e=true;
        if(rdy('r') && d>120 && d<250 && facing) cmd.rmb=true;
        else if(rdy('s') && d<170) cmd.space=true;
      }
    }
    return cmd;
  }

  // Hedef yok: kendi minyonlarının biraz gerisinde bekle
  let front=null;
  for(const m of S.minions) if(!m.dead && m.team===b.team && (!front || m.x*dir>front.x*dir)) front=m;
  const homeX = S.lane[b.team][0].x;
  let fx_ = front ? front.x-dir*130 : homeX;
  const et=towers[0];
  if(et){
    if(dir<0) fx_=Math.max(fx_, et.x+et.range+70);
    else      fx_=Math.min(fx_, et.x-et.range-70);
  }
  cmd.mx=fx_-b.x; cmd.my=LANE_Y+90-b.y;
  if(Math.hypot(cmd.mx,cmd.my)<30){ cmd.mx=0; cmd.my=0; }
  if(tSeen){ cmd.aim=Math.atan2(t.y-b.y,t.x-b.x); }
  return cmd;
}
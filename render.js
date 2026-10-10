/* Çizim: durumu sadece okur. Tarayıcıya bağımlı. */
import { TEAM_COLORS as DATA_TEAM, MAX_LEVEL, FOUNTAIN, XP_NEED, KEY_LABELS, VISION, FORMS } from './data.js';
import { PAL, rgba, mix } from './palette.js';
import { drawToken, drawGlow, drawCrystal, paintMap, bushLights, texReady } from './art.js';
texReady.then(()=>{ fieldCache=null; });   // dokular gelince zemini bir kez yeniden çiz
const TEAM_COLORS=PAL.team, TEAM_DARK=PAL.teamDark, TAU=Math.PI*2;   // takım renkleri görsel dilden (data.js'teki mavi/kırmızı yalnız sim'e)
import { ITEMS, PARTS, SLOTS } from './items.js';
import { MAP_W, MAP_H, LANES, WALLS, BUSHES, BASES, rayDist, wallsNear, bushAt } from './map.js';
import { HERO_NAMES } from './names.js';
import { S, settings, stat, dist, atkDef, atkDmg, attackSpeed, timings, canLearn, passiveText, visiblePos, canSee } from './sim.js';

export const cam={ x:0, y:0 };
export const uiState={ hold:null, aimTgt:null, mx:0, my:0 };   // girdiden gelen çizim bilgisi (basılı yetenek tuşu, nişan hedefi)
export const hudBtns=[];
/* Dükkân tezgâhının dünya konumu (nexus yakınında, çeşme alanının içinde) */
export const SHOP_R=62;
export function shopSpot(team){
  const n=S.structs.find(u=>u.sub==='nexus' && u.team===team); if(!n) return null;
  return { x:n.x, y:n.y-170, r:SHOP_R };
}
export const view={ s:1, oy:0, dpr:1, W:800, H:600, availH:500, visW:1000, visH:600, zoom:1 };
export const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
const fogCanvas=document.createElement('canvas'), fctx=fogCanvas.getContext('2d');

export function resize(){
  const uiH=document.getElementById('ui').offsetHeight, W=innerWidth, H=innerHeight-uiH;
  view.dpr=window.devicePixelRatio||1;
  canvas.width=W*view.dpr; canvas.height=H*view.dpr;
  fogCanvas.width=canvas.width; fogCanvas.height=canvas.height;
  canvas.style.width=W+'px'; canvas.style.height=H+'px'; canvas.style.marginTop=uiH+'px';
  view.W=W; view.H=H; view.availH=Math.max(200,H-86);
  // Varsayılan görüş: yaklaşık 2000 birim genişlik, tekerlekle ayarlanır (harita ekrandan büyük, genişliğe göre ölçeklenir)
  const maxS=W/1500;                                  // en fazla yakınlaşma: en az 1500 birim genişlik görünür
  const minS=Math.min(W/MAP_W, H/MAP_H);              // en uzak: tüm harita sığar
  const baseS=W/2000;
  view.s=Math.max(minS, Math.min(maxS, baseS*view.zoom));
  view.oy=0;
  if(!isFinite(view.s)||view.s<=0) view.s=0.5;
  view.visW=W/view.s; view.visH=H/view.s;
}

/* Kamera: oyuncuyu ortada tutar, harita sınırında durur (görüş haritadan büyükse haritayı ortalar) */
function camTarget(pos, vis, size){ return vis>=size ? (size-vis)/2 : Math.max(0, Math.min(size-vis, pos-vis/2)); }
export function updateCamera(){
  const p=S.player, px=p.dead?p.spawnX:p.x, py=p.dead?p.spawnY:p.y;
  if(!isFinite(cam.x)) cam.x=0;
  if(!isFinite(cam.y)) cam.y=0;
  const tx=camTarget(px,view.visW,MAP_W), ty=camTarget(py,view.visH,MAP_H);
  if(isFinite(tx)) cam.x += (tx-cam.x)*0.18;
  if(isFinite(ty)) cam.y += (ty-cam.y)*0.18;
}

function wedge(x,y,r,a,half){ ctx.beginPath(); ctx.moveTo(x,y); ctx.arc(x,y,r,a-half,a+half); ctx.closePath(); }

function rrect(x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}
function lanePath(lane){ ctx.beginPath(); lane.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); }

/* Şekil yolu: daire, dikdörtgen (köşe yuvarlak), çokgen */
function shapePath(w, round=0){
  if(w.c){ ctx.beginPath(); ctx.arc(w.c[0],w.c[1],w.r,0,Math.PI*2); }
  else if(w.poly){ ctx.beginPath(); w.poly.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); }
  else if(round) rrect(w.x,w.y,w.w,w.h,Math.min(round,w.w/2,w.h/2));
  else { ctx.beginPath(); ctx.rect(w.x,w.y,w.w,w.h); }
}
function shapeBox(w){
  if(w.c) return { x:w.c[0]-w.r, y:w.c[1]-w.r, w:w.r*2, h:w.r*2 };
  if(w.poly){ const xs=w.poly.map(p=>p[0]), ys=w.poly.map(p=>p[1]), x=Math.min(...xs), y=Math.min(...ys); return { x, y, w:Math.max(...xs)-x, h:Math.max(...ys)-y }; }
  return w;
}
/* Statik zemin (çim, koridor, duvar, çalı) bir kez offscreen canvas'a çizilir; her karede yalnız görünen kısım kopyalanır. */
let fieldCache=null;
const onScreen=(x,y,m)=>x>cam.x-m && x<cam.x+view.visW+m && y>cam.y-m && y<cam.y+view.visH+m;   // kamera dışındakini çizme
function buildFieldCache(){
  const cv=document.createElement('canvas'); cv.width=MAP_W; cv.height=MAP_H;
  paintMap(cv.getContext('2d'),{ W:MAP_W, H:MAP_H, LANES, WALLS, BUSHES, BASES, fountainR:FOUNTAIN.radius });
  fieldCache=cv;
}
function drawField(){
  if(!fieldCache) buildFieldCache();
  const x0=Math.max(0,Math.floor(cam.x)-8), y0=Math.max(0,Math.floor(cam.y)-8);
  const x1=Math.min(MAP_W,Math.ceil(cam.x+view.visW)+8), y1=Math.min(MAP_H,Math.ceil(cam.y+view.visH)+8);
  if(x1>x0 && y1>y0) ctx.drawImage(fieldCache,x0,y0,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);
  const t=S.time;
  // çeşmeler: nefes alan ışık ve dönen kesikli halka
  for(const u of S.structs){
    if(u.sub!=='nexus' || !onScreen(u.x,u.y,FOUNTAIN.radius+40)) continue;
    const col=TEAM_COLORS[u.team];
    drawGlow(ctx,col,u.x,u.y,FOUNTAIN.radius*1.05,0.16+0.06*Math.sin(t*1.6+u.team));
    ctx.save(); ctx.beginPath(); ctx.arc(u.x,u.y,FOUNTAIN.radius-3,0,TAU);
    ctx.strokeStyle=rgba(col,0.6); ctx.lineWidth=2.5; ctx.setLineDash([16,14]); ctx.lineDashOffset=-t*12; ctx.stroke(); ctx.restore();
  }
  // çalılarda ışıkböcekleri
  ctx.globalCompositeOperation='lighter';
  for(const l of bushLights){
    if(l.x<cam.x-20 || l.x>cam.x+view.visW+20 || l.y<cam.y-20 || l.y>cam.y+view.visH+20) continue;
    const a=0.12+0.5*Math.max(0,Math.sin(t*l.sp+l.ph));
    ctx.globalAlpha=a; const x=l.x+Math.sin(t*0.5+l.ph)*7, y=l.y+Math.cos(t*0.42+l.ph)*5;
    ctx.drawImage(fireflySprite(),x-9,y-9,18,18);
  }
  ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
}
let _ff=null;
function fireflySprite(){
  if(_ff) return _ff;
  _ff=document.createElement('canvas'); _ff.width=_ff.height=32; const g=_ff.getContext('2d');
  const gr=g.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,rgba(PAL.bushTip,1)); gr.addColorStop(0.25,rgba(PAL.bushC,0.55)); gr.addColorStop(1,rgba(PAL.bushC,0));
  g.fillStyle=gr; g.fillRect(0,0,32,32); return _ff;
}

function drawShops(){
  const pl=S.player, t=S.time;
  for(const team of [0,1]){
    const sp=shopSpot(team); if(!sp || !onScreen(sp.x,sp.y,140)) continue;
    const mine=team===pl.team, c=TEAM_COLORS[team], x=sp.x, y=sp.y;
    const hov=mine && Math.hypot(uiState.mx-x,uiState.my-y)<=sp.r+10;
    ctx.save(); ctx.globalAlpha=mine?1:0.85;
    ctx.beginPath(); ctx.ellipse(x+5,y+44,68,16,0,0,TAU); ctx.fillStyle='rgba(4,2,16,0.38)'; ctx.fill();
    rrect(x-52,y-6,104,50,6); ctx.fillStyle='#3a2a5a'; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle=hov?PAL.gold:PAL.ink; ctx.stroke();   // tezgâh
    rrect(x-44,y+6,88,30,4); ctx.fillStyle='#53397f'; ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle='rgba(255,207,90,0.35)'; ctx.beginPath(); ctx.moveTo(x-40,y+14); ctx.lineTo(x+40,y+14); ctx.stroke();
    for(let i=0;i<8;i++){ const ax=x-60+i*15; ctx.beginPath(); ctx.moveTo(ax,y-8); ctx.lineTo(ax+15,y-8); ctx.lineTo(ax+11,y-40); ctx.lineTo(ax+4,y-40); ctx.closePath(); ctx.fillStyle=i%2?'#f1e3bd':c; ctx.fill(); }   // çizgili tente
    ctx.lineWidth=3; ctx.strokeStyle=PAL.ink; ctx.beginPath(); ctx.moveTo(x-60,y-8); ctx.lineTo(x+60,y-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-60,y-8); ctx.lineTo(x-56,y-14); ctx.lineTo(x+56,y-14); ctx.lineTo(x+60,y-8); ctx.fillStyle=rgba(PAL.ink,0.35); ctx.fill();
    for(const lx of [x-52,x+52]){   // fenerler
      ctx.beginPath(); ctx.moveTo(lx,y-8); ctx.lineTo(lx,y+2); ctx.lineWidth=2; ctx.strokeStyle=PAL.ink; ctx.stroke();
      ctx.beginPath(); ctx.arc(lx,y+7,5,0,TAU); ctx.fillStyle=PAL.goldLight; ctx.fill();
      drawGlow(ctx,PAL.gold,lx,y+7,22,0.4+0.15*Math.sin(t*3+lx));
    }
    ctx.beginPath(); ctx.arc(x,y+21,11,0,TAU); ctx.fillStyle=PAL.gold; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=PAL.goldDark; ctx.stroke();   // altın
    ctx.beginPath(); ctx.arc(x,y+21,6.5,0,TAU); ctx.lineWidth=1.8; ctx.strokeStyle=PAL.goldDark; ctx.stroke();
    ctx.font='bold 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineWidth=4; ctx.strokeStyle='rgba(8,6,28,0.8)'; ctx.fillStyle=hov?PAL.gold:'#fff';
    ctx.strokeText('Mağaza',x,y-56); ctx.fillText('Mağaza',x,y-56);
    ctx.restore();
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

function drawStructRange(s){
  if(s.dead || s.sub==='nexus') return;
  const p=S.player;
  let show=settings.showHit;
  if(!show && !p.dead && s.team!==p.team && dist(s,p)<=s.range+160) show=true;
  if(!show) return;
  ctx.save(); ctx.beginPath(); ctx.arc(s.x,s.y,s.range,0,Math.PI*2);
  ctx.fillStyle=TEAM_COLORS[s.team]; ctx.globalAlpha=0.07; ctx.fill();
  ctx.globalAlpha=0.55; ctx.strokeStyle=TEAM_COLORS[s.team]; ctx.lineWidth=2; ctx.setLineDash([12,10]); ctx.stroke();
  ctx.restore();
}

/* Can çubuğu: genişlik azami cana göre değil sabit; her 100 canda ince, her 1000'de kalın çentik (LoL gibi),
   kalkan beyaz parça olarak canın ardına eklenir, kaybedilen can kısa süre açık renkli iz bırakır. */
const hpTrail=new WeakMap();
function hpBar(u,x,y,w,col,h,shield,unit){
  h=h||6; shield=shield||0; unit=unit||100;
  const hp=Math.max(0,u.hp), tot=Math.max(u.maxHp,hp+shield), sc=w/tot;
  let tr=hpTrail.get(u); if(!tr){ tr={ v:hp, prev:hp, drop:-1, last:S.time }; hpTrail.set(u,tr); }
  if(hp<tr.prev) tr.drop=S.time;
  if(hp>tr.v) tr.v=hp; else if(S.time-tr.drop>0.4) tr.v=Math.max(hp, tr.v-u.maxHp*1.5*Math.max(0,Math.min(0.1,S.time-tr.last)));
  tr.prev=hp; tr.last=S.time;
  ctx.fillStyle='rgba(6,4,22,0.78)'; rrect(x-1.5,y-1.5,w+3,h+3,3); ctx.fill();
  ctx.save(); rrect(x,y,w,h,2); ctx.clip();
  if(tr.v>hp){ ctx.fillStyle='rgba(255,236,200,0.75)'; ctx.fillRect(x+hp*sc,y,(tr.v-hp)*sc,h); }
  if(hp>0){ ctx.fillStyle=col; ctx.fillRect(x,y,hp*sc,h); ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(x,y+0.6,hp*sc,h*0.35); }
  if(shield>0){ ctx.fillStyle='rgba(235,242,255,0.92)'; ctx.fillRect(x+hp*sc,y,shield*sc,h); }
  // çentikler: unit (100; yapılarda 250) aralık çok sıkışırsa yalnız 1000'likler
  const step=unit*sc>=3.5?unit:(1000*sc>=3.5?1000:0);
  if(step){
    ctx.fillStyle='rgba(6,4,22,0.85)';
    for(let v=step; v<tot; v+=step){
      const big=v%1000===0, tx=Math.round(x+v*sc);
      if(big) ctx.fillRect(tx-1,y,2,h); else ctx.fillRect(tx-0.5,y,1,h*0.55);
    }
  }
  ctx.restore();
}
function teamRing(x,y,r,team){ ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.lineWidth=2; ctx.strokeStyle=TEAM_COLORS[team]; ctx.stroke(); }
const projTeam=p=>p.owner?p.owner.team:(p.team!==undefined?p.team:0);
function drawStruct(s){
  if(!onScreen(s.x,s.y,s.r*3+60)) return;
  const c=TEAM_COLORS[s.team], cd=TEAM_DARK[s.team], cl=PAL.teamLight[s.team], t=S.time, r=s.r;
  if(s.dead){   // yıkıntı: dağılmış taşlar
    ctx.save(); ctx.globalAlpha=0.85;
    for(let i=0;i<6;i++){ const a=i*1.05+s.id, d=r*(0.2+(i%3)*0.3); ctx.beginPath(); ctx.ellipse(s.x+Math.cos(a)*d,s.y+Math.sin(a)*d*0.8,r*0.28,r*0.2,a,0,TAU); ctx.fillStyle=i%2?PAL.rockSide:PAL.rock; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=PAL.rockEdge; ctx.stroke(); }
    ctx.restore(); return;
  }
  ctx.beginPath(); ctx.ellipse(s.x+5,s.y+9,r*1.05,r*0.85,0,0,TAU); ctx.fillStyle='rgba(4,2,16,0.34)'; ctx.fill();
  if(s.sub==='nexus'){
    ctx.beginPath(); ctx.arc(s.x,s.y,r*1.3,0,TAU); ctx.fillStyle=PAL.rockSide; ctx.fill(); ctx.lineWidth=5; ctx.strokeStyle=PAL.rockEdge; ctx.stroke();
    ctx.beginPath(); ctx.arc(s.x,s.y,r*1.08,0,TAU); ctx.lineWidth=3; ctx.strokeStyle=rgba(c,0.7); ctx.setLineDash([10,9]); ctx.lineDashOffset=-t*10; ctx.stroke(); ctx.setLineDash([]);
    drawGlow(ctx,c,s.x,s.y-r*0.35,r*2.7,0.34+0.12*Math.sin(t*2+s.team));
    for(let k=0;k<4;k++){   // yörüngedeki kristal kıymıkları
      const a=t*0.7+k*Math.PI/2, ox=s.x+Math.cos(a)*r*1.05, oy=s.y+Math.sin(a)*r*0.8-4;
      drawCrystal(ctx,ox,oy,5,11,cl,c,'#fff');
    }
    drawCrystal(ctx,s.x-r*0.72,s.y+r*0.22,r*0.26,r*0.62,c,cd,cl);
    drawCrystal(ctx,s.x+r*0.72,s.y+r*0.22,r*0.26,r*0.62,c,cd,cl);
    drawCrystal(ctx,s.x,s.y+r*0.05+Math.sin(t*1.8)*2,r*0.62,r*1.3,c,cd,cl);
  } else {
    const base=s.sub==='base';
    ctx.beginPath(); ctx.arc(s.x,s.y,r*1.02,0,TAU); ctx.fillStyle=PAL.rockSide; ctx.fill(); ctx.lineWidth=5; ctx.strokeStyle=PAL.rockEdge; ctx.stroke();
    ctx.beginPath(); ctx.arc(s.x,s.y,r*0.82,0,TAU); ctx.lineWidth=3; ctx.strokeStyle=rgba(c,0.75); ctx.setLineDash([7,7]); ctx.lineDashOffset=t*8; ctx.stroke(); ctx.setLineDash([]);
    if(base){
      ctx.beginPath(); ctx.arc(s.x,s.y,r*1.25,0,TAU); ctx.lineWidth=3; ctx.strokeStyle=rgba(cl,0.55); ctx.stroke();
      for(let k=0;k<4;k++){ const a=k*Math.PI/2+Math.PI/4; drawCrystal(ctx,s.x+Math.cos(a)*r*1.0,s.y+Math.sin(a)*r*0.9+3,r*0.16,r*0.4,c,cd,cl); }
    }
    drawGlow(ctx,c,s.x,s.y-r*0.45,r*1.9,0.28+0.1*Math.sin(t*2.4+s.id));
    drawCrystal(ctx,s.x,s.y+r*0.1,r*0.46,r*(base?1.2:1.05),c,cd,cl);
  }
  if(s.flash>0){ ctx.beginPath(); ctx.arc(s.x,s.y,r*1.02,0,TAU); ctx.fillStyle=`rgba(255,255,255,${s.flash/0.12*0.45})`; ctx.fill(); }
  if(s.prot){
    ctx.save(); ctx.setLineDash([6,6]); ctx.beginPath(); ctx.arc(s.x,s.y,r+10,0,TAU);
    ctx.strokeStyle='rgba(214,208,255,0.6)'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
  }
  // hedefe giden çizgi (şampiyon hedefliyse)
  if(s.tgt && !s.tgt.dead && s.tgt.kind==='hero'){
    ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(s.tgt.x,s.tgt.y);
    ctx.strokeStyle='rgba(255,106,88,0.4)'; ctx.lineWidth=2; ctx.stroke();
  }
  const bw=s.sub==='nexus'?130:90;
  hpBar(s, s.x-bw/2, s.y-r-(s.sub==='nexus'?44:30), bw, c, 8, 0, 250);
}

function drawMinion(m){
  if(m.dead) return;
  const c=TEAM_COLORS[m.team], cd=TEAM_DARK[m.team], cl=PAL.teamLight[m.team], r=m.r, melee=m.def.kind==='cone';
  // (minyon vuruş hazırlığı çizilmez: LoL gibi yalnız mermi/vuruş efekti görünür)
  ctx.beginPath(); ctx.ellipse(m.x+2,m.y+4,r,r*0.8,0,0,TAU); ctx.fillStyle='rgba(4,2,16,0.3)'; ctx.fill();
  const body=()=>{
    ctx.beginPath();
    if(melee) ctx.arc(m.x,m.y,r,0,TAU);
    else { const q=r*1.22; ctx.moveTo(m.x,m.y-q); ctx.lineTo(m.x+q,m.y); ctx.lineTo(m.x,m.y+q); ctx.lineTo(m.x-q,m.y); ctx.closePath(); }
  };
  body(); ctx.fillStyle=melee?c:cd; ctx.fill(); ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.strokeStyle=melee?PAL.ink:c; ctx.stroke();
  if(melee){
    ctx.beginPath(); ctx.arc(m.x,m.y,r*0.58,0,TAU); ctx.fillStyle=cd; ctx.fill();
    ctx.fillStyle=cl; ctx.fillRect(m.x-r*0.2,m.y-r*0.2,r*0.4,r*0.4);
  } else {
    ctx.beginPath(); ctx.arc(m.x,m.y,r*0.38,0,TAU); ctx.fillStyle=cl; ctx.fill();
    ctx.lineWidth=1.5; ctx.strokeStyle=PAL.ink; ctx.stroke();
  }
  if(m.st.slow){ body(); ctx.fillStyle='rgba(92,200,255,0.35)'; ctx.fill(); }
  if(m.flash>0){ body(); ctx.fillStyle=`rgba(255,255,255,${m.flash/0.12*0.7})`; ctx.fill(); }
  if(m.st.freeze>0){ body(); ctx.fillStyle='rgba(175,230,255,0.65)'; ctx.fill(); }
  const bw=m.def.kind==='cone'?40:34;
  hpBar(m, m.x-bw/2, m.y-r-12, bw, c, 5);
  if(settings.showHit){ ctx.beginPath(); ctx.arc(m.x,m.y,r,0,TAU); ctx.strokeStyle='#ff0'; ctx.lineWidth=1; ctx.stroke(); }
}

function drawBow(h, ang, p){
  const cx=Math.cos(ang), cy=Math.sin(ang), pull=8*p;
  ctx.save(); ctx.strokeStyle='#f3e2b3'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(h.x-cx*pull*0.3,h.y-cy*pull*0.3,h.r+10,ang-0.9,ang+0.9); ctx.stroke(); ctx.restore();
}

function drawTelegraph(h){
  if(h.dead) return;
  const at=atkDef(h), a=h.atk;
  if(h.chan && h.chan.art && h===S.player){   // Kök Sal: kanallarken 2500 menzil dairesi (yalnız kendi ekranımızda)
    const sk=h.def.skills[h.chan.k];
    ctx.save(); ctx.beginPath(); ctx.arc(h.x,h.y,sk.range,0,Math.PI*2); ctx.fillStyle='rgba(160,120,255,0.03)'; ctx.fill();
    ctx.strokeStyle='rgba(181,140,255,0.55)'; ctx.lineWidth=3; ctx.setLineDash([16,12]); ctx.stroke(); ctx.restore();
  }
  if(h.chan && h.chan.target){   // Kilitli Yaylım: kahramandan kilitli hedefe ince kırmızı çizgi ve hedefte halka
    const T=h.chan.target;
    ctx.save(); ctx.strokeStyle='rgba(255,70,60,0.75)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(T.x,T.y); ctx.stroke();
    ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(T.x,T.y,T.r+9,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  // LoL gibi: rakibin hazırlıkları (düz vuruş, yetenek önizlemeleri) çizilmez. İstisnalar görünür kalır:
  // Uzun Işın hazırlığı (burada), Kilitli Yaylım çizgisi (yukarıda), Meteor/Şok Bombası/Kök Sal alanları, Kan Laneti işareti (başka yerde)
  const mine = h.team===S.player.team;
  if(h.cast){
    const c=h.cast, sk=h.def.skills[c.k], p=1-Math.max(0,c.t)/c.total;
    if(!mine && sk.type!=='beam') return;
    ctx.save();
    if(sk.type==='volley'){
      const reach=h.r+sk.range, half=sk.spread/2+0.04;
      wedge(h.x,h.y,reach,c.aim,half);
      ctx.fillStyle=`rgba(255,255,255,${0.08+0.12*p})`; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2; ctx.stroke();
    } else if(sk.type==='slam' || sk.type==='breath'){
      const reach=h.r+sk.range, half=sk.angle*Math.PI/360;
      wedge(h.x,h.y,reach,c.aim,half);
      ctx.fillStyle=`rgba(255,255,255,${0.08+0.12*p})`; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2; ctx.stroke();
      wedge(h.x,h.y,h.r+(reach-h.r)*p,c.aim,half);
      ctx.fillStyle=`rgba(255,235,200,${0.15+0.25*p})`; ctx.fill();
    } else if(sk.type==='beam'){   // Uzun Işın: kahramanın merkezinden range uzunlukta şerit önizlemesi (rakip de görür), hazırlıkla dolar
      const cx=Math.cos(c.aim), cy=Math.sin(c.aim);
      ctx.translate(h.x,h.y); ctx.rotate(c.aim);
      ctx.fillStyle=`rgba(160,120,255,${0.10+0.14*p})`; ctx.fillRect(0,-sk.radius,sk.range,sk.radius*2);
      ctx.strokeStyle=`rgba(200,170,255,${0.45+0.4*p})`; ctx.lineWidth=2; ctx.strokeRect(0,-sk.radius,sk.range,sk.radius*2);
      ctx.fillStyle=`rgba(230,215,255,${0.15+0.3*p})`; ctx.fillRect(0,-sk.radius*p,sk.range,sk.radius*2*p);
    } else if(sk.type==='bigarrow' || sk.type==='fireball' || sk.type==='boomerang' || sk.type==='hook' || sk.type==='stunorb' || sk.type==='tether' || sk.type==='spiritburst' || sk.type==='groworb'){
      const cx=Math.cos(c.aim), cy=Math.sin(c.aim), sx=h.x+cx*h.r, sy=h.y+cy*h.r;
      ctx.lineCap='butt'; ctx.strokeStyle=`rgba(160,225,255,${0.15+0.2*p})`; ctx.lineWidth=sk.radius*2;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+cx*sk.range,sy+cy*sk.range); ctx.stroke();
      ctx.strokeStyle=`rgba(200,240,255,${0.4+0.5*p})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+cx*sk.range*p,sy+cy*sk.range*p); ctx.stroke();
    }
    ctx.restore();
    if(at.type==='projectile') drawBow(h,c.aim,p);
    return;
  }
  if(a.state!=='windup' || !mine) return;
  const p=1-Math.max(0,a.t)/a.total;
  if(at.type==='projectile'){
    // hedefli vuruş: sadece yay gerilir, hedefe ince bir bağ (beceri atışı çizgisi yok)
    const u=a.target;
    if(u && !u.dead && h===S.player){
      ctx.save(); ctx.strokeStyle=`rgba(255,230,120,${0.15+0.35*p})`; ctx.lineWidth=1.5; ctx.setLineDash([4,6]);
      ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(u.x,u.y); ctx.stroke(); ctx.restore();
    }
    drawBow(h,a.aim,p);
  } else {
    // yakın dövüş: sade, hedefe doğru gerilen ince yay (alan/koni yok)
    ctx.save(); ctx.lineCap='round'; ctx.strokeStyle=`rgba(255,235,200,${0.2+0.5*p})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+7,a.aim-0.25-0.55*p,a.aim+0.25+0.55*p); ctx.stroke(); ctx.restore();
  }
}

function drawHero(h){
  if(h.dead){
    ctx.save(); ctx.globalAlpha=0.35;
    ctx.beginPath(); ctx.arc(h.spawnX,h.spawnY,h.baseR,0,Math.PI*2);
    ctx.fillStyle=TEAM_COLORS[h.team]; ctx.fill();
    ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.font='bold 16px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(Math.ceil(h.respawn),h.spawnX,h.spawnY); ctx.restore(); return;
  }
  const a=h.atk, st=h.st;
  if(st.fring){   // Alev Halkası: kahramanla hareket eden ateş halkası
    const R=st.fring, fade=Math.min(1,R.t/0.4), ph=S.time*3;
    ctx.save(); ctx.globalAlpha=fade;
    ctx.beginPath(); ctx.arc(h.x,h.y,R.radius,0,Math.PI*2); ctx.fillStyle='rgba(255,110,30,0.13)'; ctx.fill();
    ctx.strokeStyle='rgba(255,160,70,0.9)'; ctx.lineWidth=4; ctx.setLineDash([22,14]); ctx.lineDashOffset=-ph*40; ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle='rgba(255,210,120,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(h.x,h.y,R.radius-8,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(h.x+3,h.y+6,h.r,h.r*0.88,0,0,TAU); ctx.fillStyle='rgba(4,2,16,0.34)'; ctx.fill();
  if(st.giant){ ctx.beginPath(); ctx.arc(h.x,h.y,h.r+7,0,TAU); ctx.strokeStyle='rgba(255,207,90,0.85)'; ctx.lineWidth=4; ctx.stroke(); }
  drawToken(ctx,h.type,h.x,h.y,h.r,{ team:h.team, aim:h.aim, flash:h.flash>0?h.flash/0.12:0 });
  if(st.slow){ ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,TAU); ctx.fillStyle='rgba(92,200,255,0.3)'; ctx.fill(); }
  if((a.state==='windup'||h.cast) && (h.team===S.player.team || (h.cast && h.def.skills[h.cast.k].type==='beam'))){ ctx.beginPath(); ctx.arc(h.x,h.y,h.r+1,0,TAU); ctx.lineWidth=2.5; ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.stroke(); }
  const ax=Math.cos(h.aim), ay=Math.sin(h.aim);
  if(h.form){   // İkili biçim işareti: uzak biçim mavi halka + yay, yakın biçim turuncu halka + çekiç
    const mel=h.form==='melee', col=mel?'#ff9a4d':'#6fe6ff';
    ctx.save(); ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineCap='round';
    ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,h.r+2,0,Math.PI*2); ctx.stroke();
    if(mel){
      ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(h.x+ax*(h.r-2),h.y+ay*(h.r-2)); ctx.lineTo(h.x+ax*(h.r+14),h.y+ay*(h.r+14)); ctx.stroke();
      ctx.translate(h.x+ax*(h.r+15),h.y+ay*(h.r+15)); ctx.rotate(h.aim); ctx.fillRect(-4,-8,9,16);
    } else {
      ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,h.r+10,h.aim-0.8,h.aim+0.8); ctx.stroke();
    }
    ctx.restore();
  }
  if(st.freeze>0){
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,Math.PI*2);
    ctx.fillStyle='rgba(175,230,255,0.65)'; ctx.fill();
    ctx.strokeStyle='#e4f8ff'; ctx.lineWidth=4; ctx.stroke();
    ctx.lineWidth=2;
    for(let i=0;i<3;i++){
      const an=i*Math.PI/3+0.3;
      ctx.beginPath(); ctx.moveTo(h.x-Math.cos(an)*h.r*0.7,h.y-Math.sin(an)*h.r*0.7);
      ctx.lineTo(h.x+Math.cos(an)*h.r*0.7,h.y+Math.sin(an)*h.r*0.7); ctx.stroke();
    }
  }
  if(st.shield){
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+9,0,Math.PI*2);
    ctx.strokeStyle=`rgba(111,195,255,${0.45+0.5*Math.min(1,st.shield.amt/st.shield.max)})`; ctx.lineWidth=5; ctx.stroke();
  }
  if(h.ic.mantra && S.time<=h.ic.mantra.until){   // Güçlendir hazır: çevrede nabız atan turkuaz halka, kalan süre yayı
    const mt=h.ic.mantra, f=Math.max(0,(mt.until-S.time)/mt.total), pu=0.6+0.4*Math.sin(S.time*9);
    ctx.save();
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+15,0,Math.PI*2); ctx.strokeStyle=`rgba(127,245,220,${0.25*pu})`; ctx.lineWidth=7; ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+15,-Math.PI/2,-Math.PI/2+Math.PI*2*f); ctx.strokeStyle=`rgba(127,245,220,${0.95*pu})`; ctx.lineWidth=3; ctx.stroke();
    ctx.restore();
  }
  if(st.frenzy){
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+7,0,Math.PI*2); ctx.strokeStyle='rgba(255,154,61,0.9)'; ctx.lineWidth=3; ctx.stroke();
  }
  if(st.asB){
    ctx.save(); ctx.setLineDash([6,6]); ctx.beginPath(); ctx.arc(h.x,h.y,h.r+4,0,Math.PI*2);
    ctx.strokeStyle='#ffb347'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  }
  if(h.recallCh){
    const p=1-h.recallCh.t/h.recallCh.total;
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+12,0,Math.PI*2); ctx.strokeStyle='rgba(159,214,255,0.25)'; ctx.lineWidth=5; ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+12,-Math.PI/2,-Math.PI/2+Math.PI*2*p); ctx.strokeStyle='#9fd6ff'; ctx.lineWidth=5; ctx.stroke();
  }
  if(h.ic.focus){   // Odak hazır: kahramanın çevresinde mor kesikli halka
    ctx.save(); ctx.setLineDash([4,6]); ctx.lineDashOffset=-S.time*20; ctx.beginPath(); ctx.arc(h.x,h.y,h.r+17,0,Math.PI*2);
    ctx.strokeStyle='rgba(201,166,255,0.95)'; ctx.lineWidth=2.5; ctx.stroke(); ctx.restore();
  }
  if(h.chan){   // Kilitli Yaylım / Kök Sal kanallama ilerlemesi
    const p=Math.min(1,h.chan.t/h.def.skills[h.chan.k].dur);
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+12,0,Math.PI*2); ctx.strokeStyle='rgba(255,106,92,0.25)'; ctx.lineWidth=5; ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+12,-Math.PI/2,-Math.PI/2+Math.PI*2*p); ctx.strokeStyle='#ff6a5c'; ctx.lineWidth=5; ctx.stroke();
  }
  if(st.curse){   // Kan Laneti işareti: kırmızı kesikli halka, süre bitince daralır
    const p=Math.max(0,st.curse.t/st.curse.total);
    ctx.save(); ctx.setLineDash([6,5]); ctx.beginPath(); ctx.arc(h.x,h.y,h.r+8+10*p,0,Math.PI*2);
    ctx.strokeStyle='rgba(220,40,70,0.95)'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
  }
  if(st.burn || st.ignite){
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+3,0,Math.PI*2);
    ctx.strokeStyle=st.ignite?'rgba(255,80,30,0.95)':'rgba(255,150,60,0.8)'; ctx.lineWidth=st.ignite?4:2; ctx.stroke();
  }
  if(st.spd){
    ctx.save(); ctx.setLineDash([3,7]); ctx.beginPath(); ctx.arc(h.x,h.y,h.r+14,0,Math.PI*2);
    ctx.strokeStyle='#8cf08c'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  }
  if(a.state==='recovery' && h.team===S.player.team){
    const p=1-Math.max(0,a.t)/a.total;
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+5,-Math.PI/2,-Math.PI/2+Math.PI*2*p);
    ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2; ctx.stroke();
  }
  const bw=74, bx=h.x-bw/2+6, by=h.y-h.r-20;
  ctx.beginPath(); ctx.arc(bx-11,by+4.5,9.5,0,TAU); ctx.fillStyle=PAL.ink; ctx.fill();
  ctx.lineWidth=2.5; ctx.strokeStyle=TEAM_COLORS[h.team]; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(h.level,bx-11,by+4.5);
  hpBar(h,bx,by,bw,TEAM_COLORS[h.team],9,st.shield?st.shield.amt:0);
  if(S.heroes.length>2 && h!==S.player){   // 2v2: dost ve rakip kahraman isimleri
    ctx.save(); ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.lineJoin='round'; ctx.lineWidth=3; ctx.strokeStyle='rgba(6,4,22,0.85)';
    const nm=HERO_NAMES[h.type]||h.def.name, ny=h.y+h.r+6;
    ctx.strokeText(nm,h.x,ny); ctx.fillStyle=h.team===S.player.team?'#bff7ef':'#ffc2b9'; ctx.fillText(nm,h.x,ny); ctx.restore();
  }
  if(st.root>0){   // kök: ayakta mor kesikli halka ve canın üstünde zincir işareti
    ctx.save(); ctx.setLineDash([5,5]); ctx.beginPath(); ctx.arc(h.x,h.y,h.r+4,0,Math.PI*2);
    ctx.strokeStyle='rgba(185,162,255,0.95)'; ctx.lineWidth=4; ctx.stroke(); ctx.restore();
    const rx=h.x+(st.silence>0?-20:0), ry=by-14;
    ctx.beginPath(); ctx.arc(rx,ry,8,0,Math.PI*2); ctx.fillStyle='rgba(40,25,80,0.85)'; ctx.fill();
    ctx.lineWidth=2.5; ctx.strokeStyle='#b9a2ff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx-4,ry-3); ctx.lineTo(rx+4,ry-3); ctx.moveTo(rx-4,ry+3); ctx.lineTo(rx+4,ry+3); ctx.stroke();
  }
  if(st.silence>0){   // susturma: canın üstünde mor yasak işareti
    const sx=h.x+(st.root>0?20:0), sy=by-14;
    ctx.beginPath(); ctx.arc(sx,sy,8,0,Math.PI*2); ctx.fillStyle='rgba(40,20,70,0.85)'; ctx.fill();
    ctx.lineWidth=2.5; ctx.strokeStyle='#c9a6ff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx-5.5,sy+5.5); ctx.lineTo(sx+5.5,sy-5.5); ctx.stroke();
  }
  if(settings.showHit){
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,Math.PI*2); ctx.strokeStyle='#ff0'; ctx.lineWidth=1; ctx.stroke();
  }
}

/* Gölge Adımı dönüş işareti: yalnız sahibinin takımı görür, 3 sn boyunca küçük bir elmas ve azalan halka */
function drawBackMarks(){
  for(const h of S.heroes){
    if(h.dead || !h.ic.back || h.team!==S.player.team) continue;
    for(const k in h.ic.back){
      const bk=h.ic.back[k]; if(!bk || S.time>bk.until) continue;
      const f=Math.max(0,(bk.until-S.time)/bk.total);
      ctx.save();
      ctx.beginPath(); ctx.arc(bk.x,bk.y,16,-Math.PI/2,-Math.PI/2+Math.PI*2*f); ctx.strokeStyle='rgba(200,180,255,0.9)'; ctx.lineWidth=3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bk.x,bk.y-9); ctx.lineTo(bk.x+7,bk.y); ctx.lineTo(bk.x,bk.y+9); ctx.lineTo(bk.x-7,bk.y); ctx.closePath();
      ctx.fillStyle='rgba(154,123,255,0.55)'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#e0d6ff'; ctx.stroke();
      ctx.restore();
    }
  }
}
function drawRanges(h){
  if(!settings.showHit||h.dead) return;
  const at=atkDef(h);
  ctx.save(); ctx.setLineDash([8,8]); ctx.strokeStyle='rgba(255,255,0,0.5)'; ctx.lineWidth=1.5;
  if(at.type==='projectile'){ ctx.beginPath(); ctx.arc(h.x,h.y,h.r+at.range,0,Math.PI*2); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(h.x,h.y,h.r+at.range,0,Math.PI*2); ctx.stroke(); }   // yakın dövüş: hedefli, koni yok
  const pk=h.def.skills.p;
  if(pk.radius){ ctx.strokeStyle='rgba(255,120,120,0.5)'; ctx.beginPath(); ctx.arc(h.x,h.y,h.r+pk.radius,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
}

/* Yetenek tuşu basılıyken: menzil ve etki alanı (bırakınca atılır, sol tık iptal) */
function holdLine(p, ang, len, w){
  ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(ang);
  ctx.fillStyle='rgba(120,200,255,0.18)'; ctx.fillRect(0,-w/2,len,w);
  ctx.strokeStyle='rgba(140,210,255,0.85)'; ctx.lineWidth=2; ctx.strokeRect(0,-w/2,len,w);
  ctx.restore();
}
function holdCircle(x, y, r, fill, stroke, dash){
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  if(fill){ ctx.fillStyle=fill; ctx.fill(); }
  ctx.strokeStyle=stroke; ctx.lineWidth=2; if(dash) ctx.setLineDash([10,8]); ctx.stroke(); ctx.setLineDash([]);
}
function drawHoldRange(){
  const p=S.player, k=uiState.hold;
  if(!k || !p || p.dead) return;
  const lbl=p.def.skills[k]; if(!lbl || !lbl.type) return;
  let sk=lbl;
  const ang=Math.atan2(uiState.my-p.y, uiState.mx-p.x);
  ctx.save();
  const bk=p.ic.back && p.ic.back[k];
  if(bk && S.time<=bk.until){   // Gölge Adımı dönüşü: basınca başladığı yere döner
    holdCircle(bk.x,bk.y,p.r+10,'rgba(154,123,255,0.18)','rgba(200,180,255,0.95)');
    ctx.strokeStyle='rgba(200,180,255,0.6)'; ctx.lineWidth=2; ctx.setLineDash([8,8]); ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(bk.x,bk.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#fff'; ctx.font='600 13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Geri dön ('+Math.max(0,bk.until-S.time).toFixed(1)+' sn)', p.x, p.y-p.r-28);
    ctx.restore(); return;
  }
  if(sk.type==='mimic'){   // Taklit: en son kullanılan yeteneğin alanı gösterilir
    sk = p.ic.last ? p.def.skills[p.ic.last] : null;
    if(!sk){
      ctx.fillStyle='#fff'; ctx.font='600 13px system-ui'; ctx.textAlign='center';
      ctx.fillText('Taklit (önce Zincir ya da Gölge Adımı kullan)', p.x, p.y-p.r-28);
      ctx.restore(); return;
    }
  }
  if(sk.type==='artillery'){   // Kök Sal: 2500 menzil ve imleçteki 150 yarıçaplı atış alanı (menzile kırpılır)
    holdCircle(p.x,p.y,sk.range,'rgba(160,120,255,0.03)','rgba(181,140,255,0.8)',true);
    let tx=uiState.mx, ty=uiState.my; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>sk.range){ tx=p.x+(tx-p.x)/d*sk.range; ty=p.y+(ty-p.y)/d*sk.range; }
    holdCircle(tx,ty,sk.radius,'rgba(160,120,255,0.20)','rgba(200,170,255,0.95)');
    if(p.chan && p.chan.art){ ctx.fillStyle='#e6dcff'; ctx.font='600 13px system-ui'; ctx.textAlign='center'; ctx.fillText('Atış '+(p.chan.shots+1)+'/'+sk.shots, tx, ty-sk.radius-8); }
  } else if(sk.type==='spiritburst'){   // Ruh Patlaması: 450 menzilli çizgi ve menzil sonunda patlama alanı (güçlendirildiyse 250)
    const rad=(p.ic.mantra && S.time<=p.ic.mantra.until) ? p.def.skills.s.burstRadius : sk.blast;
    holdLine(p, ang, sk.range, sk.radius*2);
    holdCircle(p.x+Math.cos(ang)*sk.range, p.y+Math.sin(ang)*sk.range, rad, 'rgba(95,224,200,0.10)', 'rgba(127,245,220,0.8)', true);
  } else if(sk.type==='bloodbolt'){   // Kan Oku: menzil ve imlece en yakın görünen rakip kahraman ya da minyon
    holdCircle(p.x,p.y,sk.range,'rgba(200,30,60,0.05)','rgba(220,50,80,0.8)',true);
    let best=null, bd=1e9;
    for(const u of S.heroes.concat(S.minions)){
      if(u.dead || u.team===p.team || !canSee(p.team,u) || dist(u,p)-u.r>sk.range) continue;
      const dd=Math.hypot(u.x-uiState.mx,u.y-uiState.my); if(dd<bd){ bd=dd; best=u; }
    }
    if(best) holdCircle(best.x,best.y,best.r+8,null,'#e0304f');
  } else if(sk.type==='blink'){   // Gölge Adımı: menzil, imlece (menzile kırpılır) iniş noktası ve patlama alanı
    holdCircle(p.x,p.y,sk.range,'rgba(154,123,255,0.05)','rgba(190,165,255,0.75)',true);
    let tx=uiState.mx, ty=uiState.my; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>sk.range){ tx=p.x+(tx-p.x)/d*sk.range; ty=p.y+(ty-p.y)/d*sk.range; }
    holdCircle(tx,ty,sk.radius,'rgba(154,123,255,0.20)','rgba(200,180,255,0.95)');
    holdCircle(tx,ty,p.r,null,'rgba(255,255,255,0.7)',true);
  } else if(sk.type==='bloodnova'){
    holdCircle(p.x,p.y,sk.range,'rgba(200,30,60,0.07)','rgba(220,50,80,0.85)',true);
  } else if(sk.type==='bloodcurse'){
    holdCircle(p.x,p.y,sk.range,'rgba(200,30,60,0.04)','rgba(220,50,80,0.7)',true);
    let tx=uiState.mx, ty=uiState.my; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>sk.range){ tx=p.x+(tx-p.x)/d*sk.range; ty=p.y+(ty-p.y)/d*sk.range; }
    holdCircle(tx,ty,sk.radius,'rgba(160,20,50,0.20)','rgba(220,50,80,0.9)');
  } else if(sk.type==='ignite'){
    holdCircle(p.x,p.y,sk.range,'rgba(255,140,60,0.06)','rgba(255,150,70,0.8)',true);
    let best=null, bd=1e9;
    for(const u of S.heroes.concat(S.minions)){
      if(u.dead || u.team===p.team || !canSee(p.team,u) || dist(u,p)-u.r>sk.range) continue;
      const dd=Math.hypot(u.x-uiState.mx,u.y-uiState.my); if(dd<bd){ bd=dd; best=u; }
    }
    if(best) holdCircle(best.x,best.y,best.r+8,null,'#ff8a3d');
  } else if(sk.type==='meteor'){
    holdCircle(p.x,p.y,sk.range,'rgba(255,140,60,0.05)','rgba(255,150,70,0.7)',true);
    let tx=uiState.mx, ty=uiState.my; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>sk.range){ tx=p.x+(tx-p.x)/d*sk.range; ty=p.y+(ty-p.y)/d*sk.range; }
    holdCircle(tx,ty,sk.radius,'rgba(255,90,40,0.22)','rgba(255,120,60,0.9)');
  } else if(sk.type==='volley'){
    ctx.fillStyle='rgba(120,200,255,0.15)'; wedge(p.x,p.y,sk.range,ang,sk.spread/2); ctx.fill();
    ctx.strokeStyle='rgba(140,210,255,0.85)'; ctx.lineWidth=2; ctx.stroke();
  } else if(sk.type==='groworb'){   // Enerji Küresi: 1300 menzilli çizgi (uç kalın) ve menzil sonunda patlama alanı
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0,-sk.radius); ctx.lineTo(sk.range,-sk.radiusEnd); ctx.lineTo(sk.range,sk.radiusEnd); ctx.lineTo(0,sk.radius); ctx.closePath();
    ctx.fillStyle='rgba(111,230,255,0.14)'; ctx.fill(); ctx.strokeStyle='rgba(140,235,255,0.85)'; ctx.lineWidth=2; ctx.stroke();
    ctx.restore();
    holdCircle(p.x+Math.cos(ang)*sk.range, p.y+Math.sin(ang)*sk.range, sk.blastEnd, 'rgba(111,230,255,0.08)', 'rgba(140,235,255,0.7)', true);
  } else if(sk.type==='leapslam' || sk.type==='knockblow'){   // yakın biçim: menzil ve imlece en yakın görünen rakip (kahraman ya da minyon); inişte alan / itme yönü
    holdCircle(p.x,p.y,sk.range,'rgba(255,154,77,0.05)','rgba(255,170,90,0.8)',true);
    let best=null, bd=1e9;
    for(const u of S.heroes.concat(S.minions)){
      if(u.dead || u.team===p.team || !canSee(p.team,u) || dist(u,p)-u.r>sk.range) continue;
      const dd=Math.hypot(u.x-uiState.mx,u.y-uiState.my); if(dd<bd){ bd=dd; best=u; }
    }
    if(best){
      holdCircle(best.x,best.y,best.r+8,null,'#ff9a4d');
      const a2=Math.atan2(best.y-p.y,best.x-p.x);
      if(sk.type==='leapslam') holdCircle(best.x-Math.cos(a2)*(best.r+p.r), best.y-Math.sin(a2)*(best.r+p.r), sk.radius, 'rgba(255,154,77,0.14)', 'rgba(255,190,120,0.9)');
      else {
        const ex=best.x+Math.cos(a2)*sk.push, ey=best.y+Math.sin(a2)*sk.push;
        ctx.strokeStyle='rgba(255,190,120,0.9)'; ctx.lineWidth=3; ctx.setLineDash([8,6]); ctx.beginPath(); ctx.moveTo(best.x,best.y); ctx.lineTo(ex,ey); ctx.stroke(); ctx.setLineDash([]);
        holdCircle(ex,ey,best.r,null,'rgba(255,190,120,0.8)',true);
      }
    }
  } else if(sk.type==='bigarrow' || sk.type==='fireball' || sk.type==='boomerang' || sk.type==='hook' || sk.type==='stunorb' || sk.type==='beam' || sk.type==='tether'){
    holdLine(p, ang, sk.range, (sk.radius||10)*2);
  } else if(sk.type==='slam' || sk.type==='breath'){
    ctx.fillStyle='rgba(120,200,255,0.15)'; wedge(p.x,p.y,p.r+sk.range,ang,sk.angle*Math.PI/360); ctx.fill();
    ctx.strokeStyle='rgba(140,210,255,0.85)'; ctx.lineWidth=2; ctx.stroke();
  } else if(sk.type==='flameleap'){   // sıçrama çizgisi ve inişte (duvara göre değişebilir) 2 katı uzunlukta ateş şeridi
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(ang);
    ctx.fillStyle='rgba(255,120,40,0.16)'; ctx.fillRect(0,-sk.width/2,sk.dist*sk.mult,sk.width);
    ctx.strokeStyle='rgba(255,150,70,0.8)'; ctx.lineWidth=2; ctx.strokeRect(0,-sk.width/2,sk.dist*sk.mult,sk.width);
    ctx.restore();
    holdLine(p, ang, sk.dist+p.r, p.r*2);
    holdCircle(p.x+Math.cos(ang)*sk.dist, p.y+Math.sin(ang)*sk.dist, p.r, null, 'rgba(255,170,90,0.9)', true);
  } else if(sk.type==='firering'){
    holdCircle(p.x,p.y,sk.radius,'rgba(255,120,40,0.08)','rgba(255,150,70,0.85)',true);
  } else if(sk.type==='shockwave'){
    holdCircle(p.x,p.y,sk.radius,'rgba(181,140,255,0.08)','rgba(200,170,255,0.85)',true);
  } else if(sk.type==='bomb'){
    holdCircle(p.x,p.y,sk.range,'rgba(255,220,100,0.05)','rgba(255,225,120,0.7)',true);
    let tx=uiState.mx, ty=uiState.my; const d=Math.hypot(tx-p.x,ty-p.y);
    if(d>sk.range){ tx=p.x+(tx-p.x)/d*sk.range; ty=p.y+(ty-p.y)/d*sk.range; }
    holdCircle(tx,ty,sk.radius,'rgba(255,220,90,0.22)','rgba(255,225,120,0.95)');
  } else if(sk.type==='lockvolley'){
    holdCircle(p.x,p.y,sk.range,'rgba(255,90,80,0.04)','rgba(255,100,90,0.7)',true);
    let best=null, bd=1e9;   // kilitlenecek rakip: imlece en yakın görünen kahraman
    for(const u of S.heroes){
      if(u.dead || u.team===p.team || !canSee(p.team,u) || dist(u,p)-u.r>sk.range) continue;
      const dd=Math.hypot(u.x-uiState.mx,u.y-uiState.my); if(dd<bd){ bd=dd; best=u; }
    }
    if(best) holdCircle(best.x,best.y,best.r+9,null,'#ff5a4d');
  } else if(sk.type==='dash' || sk.type==='tumble'){
    holdLine(p, ang, sk.dist+p.r, p.r*2);
    holdCircle(p.x+Math.cos(ang)*sk.dist, p.y+Math.sin(ang)*sk.dist, p.r, null, 'rgba(140,210,255,0.85)', true);
  } else {
    // kendine etkili (Seri Atış, Kalkan, Öfke): kahramanın çevresinde halka
    const rr = sk.type==='giant' ? p.r*(1+(sk.size?sk.size[Math.max(0,p.rank[k]-1)]:0.4))+6 : p.r+12;
    holdCircle(p.x,p.y,rr,'rgba(120,255,160,0.12)','rgba(120,255,160,0.85)');
  }
  ctx.fillStyle='#fff'; ctx.font='600 13px system-ui'; ctx.textAlign='center';
  ctx.fillText(lbl.name+(sk!==lbl?' ('+sk.name+')':'')+(p.rank[k]<=0?' (öğrenilmedi)':p.cd[k]>0?' ('+p.cd[k].toFixed(1)+' sn)':''), p.x, p.y-p.r-28);
  ctx.restore();
}
/* C basılıyken: düz vuruş menzili (rakibin kenarı bu dairenin içindeyse vurulur) */
function drawAttackRange(){
  const p=S.player; if(!uiState.showRange || !p || p.dead) return;
  ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,p.r+atkDef(p).range,0,Math.PI*2);
  ctx.fillStyle='rgba(255,230,120,0.05)'; ctx.fill();
  ctx.strokeStyle='rgba(255,230,120,0.8)'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
}
/* Otomatik nişanın kilitlendiği hedef */
function drawAimTarget(){
  const u=uiState.aimTgt; if(!u || u.dead) return;
  ctx.save(); ctx.strokeStyle='rgba(255,230,90,0.9)'; ctx.lineWidth=2; ctx.setLineDash([6,5]);
  ctx.beginPath(); ctx.arc(u.x,u.y,u.r+7,0,Math.PI*2); ctx.stroke(); ctx.restore();
}

function drawChain(x1,y1,x2,y2){
  ctx.save(); ctx.lineCap='round';
  ctx.strokeStyle='#4a4f5c'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.strokeStyle='#c4c9d6'; ctx.lineWidth=3; ctx.setLineDash([7,6]); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
}
function drawProjectiles(){
  // Zincir bağı: Gölge ile bağlı rakip arasında mor zincir (kopma sınırına yaklaştıkça kırmızılaşır)
  for(const h of S.heroes){
    const T=h.ic.tether; if(!T || h.dead || T.target.dead) continue;
    if(!seenByPlayer(h.x,h.y) && !seenByPlayer(T.target.x,T.target.y)) continue;
    const d=Math.hypot(T.target.x-h.x,T.target.y-h.y), warn=Math.max(0,Math.min(1,(d-(T.range-150))/150));
    ctx.save(); ctx.lineCap='round';
    ctx.strokeStyle='#2c2146'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(T.target.x,T.target.y); ctx.stroke();
    ctx.strokeStyle=warn>0?`rgb(${Math.round(170+80*warn)},${Math.round(140-70*warn)},${Math.round(255-155*warn)})`:'#b9a2ff'; ctx.lineWidth=3.5; ctx.setLineDash([8,6]); ctx.lineDashOffset=-S.time*30;
    ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(T.target.x,T.target.y); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle='rgba(185,162,255,0.9)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(T.target.x,T.target.y,T.target.r+6,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-Math.max(0,T.t)/(T.total||2))); ctx.stroke();   // 2 sn dolarken halka tamamlanır
    ctx.restore();
  }
  // çekilen birimlerle çeken arasında zincir
  for(const u of S.heroes.concat(S.minions)){
    if(!u.pulled || u.pulled.shove || u.dead || !seenByPlayer(u.x,u.y)) continue;
    const o=u.pulled.src; drawChain(o.x,o.y,u.x,u.y);
  }
  for(const p of S.projs){
    if(!seenByPlayer(p.x,p.y)) continue;
    if(p.tether){   // Zincir mermisi: sahibinden mermiye mor zincir, uçta halka
      const o=p.owner; ctx.save(); ctx.lineCap='round';
      if(o && !o.dead){ ctx.strokeStyle='#2c2146'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(p.x,p.y); ctx.stroke();
        ctx.strokeStyle='#b9a2ff'; ctx.lineWidth=2.5; ctx.setLineDash([7,6]); ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='#4b3a8a'; ctx.fill(); ctx.lineWidth=3; ctx.strokeStyle='#e0d6ff'; ctx.stroke();
      ctx.restore();
      continue;
    }
    if(p.hook){   // Kanca: zincir ve uçta kanca ucu
      const o=p.owner; if(o && !o.dead) drawChain(o.x,o.y,p.x,p.y);
      const cx=Math.cos(p.ang), cy=Math.sin(p.ang);
      ctx.beginPath(); ctx.moveTo(p.x+cx*12,p.y+cy*12); ctx.lineTo(p.x-cx*4-cy*9,p.y-cy*4+cx*9); ctx.lineTo(p.x-cx*4+cy*9,p.y-cy*4-cx*9); ctx.closePath();
      ctx.fillStyle='#e8ebf2'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#2b2f3a'; ctx.stroke();
      if(settings.showHit){ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.strokeStyle='#ff0'; ctx.lineWidth=1; ctx.stroke(); }
      continue;
    }
    if(p.spirit){   // Ruh Patlaması: turkuaz ruh küresi
      const cx=Math.cos(p.ang), cy=Math.sin(p.ang), tail=p.r*3;
      const g=ctx.createLinearGradient(p.x-cx*tail,p.y-cy*tail,p.x,p.y);
      g.addColorStop(0,'rgba(95,224,200,0)'); g.addColorStop(1,'rgba(95,224,200,0.8)');
      ctx.strokeStyle=g; ctx.lineWidth=p.r*1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(p.x-cx*tail,p.y-cy*tail); ctx.lineTo(p.x,p.y); ctx.stroke();
      drawGlow(ctx,PAL.spirit,p.x,p.y,p.r*3.2,0.5); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='#2fbfa5'; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle='#d6fff6'; ctx.stroke(); teamRing(p.x,p.y,p.r+3,projTeam(p));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.45,0,Math.PI*2); ctx.fillStyle='#f0fffb'; ctx.fill();
      continue;
    }
    if(p.blood){   // Kan Patlaması topu: koyu kırmızı küre
      const cx=Math.cos(p.ang), cy=Math.sin(p.ang), tail=p.r*3;
      const g=ctx.createLinearGradient(p.x-cx*tail,p.y-cy*tail,p.x,p.y);
      g.addColorStop(0,'rgba(160,20,50,0)'); g.addColorStop(1,'rgba(200,30,60,0.8)');
      ctx.strokeStyle=g; ctx.lineWidth=p.r*1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(p.x-cx*tail,p.y-cy*tail); ctx.lineTo(p.x,p.y); ctx.stroke();
      drawGlow(ctx,PAL.blood,p.x,p.y,p.r*3.2,0.5); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='#c21f4a'; ctx.fill(); teamRing(p.x,p.y,p.r+2.5,projTeam(p));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.5,0,Math.PI*2); ctx.fillStyle='#ff9aa8'; ctx.fill();
      continue;
    }
    if(p.grow){   // Enerji Küresi: büyüdükçe iri, mavi-beyaz enerji küresi
      const cx=Math.cos(p.ang), cy=Math.sin(p.ang), tail=p.r*3.4;
      const g=ctx.createLinearGradient(p.x-cx*tail,p.y-cy*tail,p.x,p.y);
      g.addColorStop(0,'rgba(80,200,255,0)'); g.addColorStop(1,'rgba(120,225,255,0.8)');
      ctx.strokeStyle=g; ctx.lineWidth=p.r*1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(p.x-cx*tail,p.y-cy*tail); ctx.lineTo(p.x,p.y); ctx.stroke();
      drawGlow(ctx,PAL.azure,p.x,p.y,p.r*2.8,0.5); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='#2bb0e0'; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle='#dff8ff'; ctx.stroke(); teamRing(p.x,p.y,p.r+3,projTeam(p));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.5,0,Math.PI*2); ctx.fillStyle='#f2fcff'; ctx.fill();
      if(settings.showHit){ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.strokeStyle='#ff0'; ctx.lineWidth=1; ctx.stroke(); }
      continue;
    }
    if(p.orb){   // Ağır Küre: büyük mor küre
      const cx=Math.cos(p.ang), cy=Math.sin(p.ang), tail=p.r*3.2;
      const g=ctx.createLinearGradient(p.x-cx*tail,p.y-cy*tail,p.x,p.y);
      g.addColorStop(0,'rgba(140,100,255,0)'); g.addColorStop(1,'rgba(170,130,255,0.75)');
      ctx.strokeStyle=g; ctx.lineWidth=p.r*1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(p.x-cx*tail,p.y-cy*tail); ctx.lineTo(p.x,p.y); ctx.stroke();
      drawGlow(ctx,PAL.arcane,p.x,p.y,p.r*2.8,0.5); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='#7a55d8'; ctx.fill(); ctx.lineWidth=2.5; ctx.strokeStyle='#e6dcff'; ctx.stroke(); teamRing(p.x,p.y,p.r+3,projTeam(p));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.45,0,Math.PI*2); ctx.fillStyle='#efe6ff'; ctx.fill();
      continue;
    }
    if(p.fire || (p.owner && p.owner.type==='mage')){
      // ateş: turuncu küre ve kuyruk
      const cx=Math.cos(p.ang), cy=Math.sin(p.ang), tail=p.r*3;
      const g=ctx.createLinearGradient(p.x-cx*tail,p.y-cy*tail,p.x,p.y);
      g.addColorStop(0,'rgba(255,120,40,0)'); g.addColorStop(1,'rgba(255,150,60,0.8)');
      ctx.strokeStyle=g; ctx.lineWidth=p.r*1.6; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(p.x-cx*tail,p.y-cy*tail); ctx.lineTo(p.x,p.y); ctx.stroke();
      drawGlow(ctx,PAL.ember,p.x,p.y,p.r*3,0.55); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='#ffb347'; ctx.fill(); teamRing(p.x,p.y,p.r+2.5,projTeam(p));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.5,0,Math.PI*2); ctx.fillStyle='#fff3c4'; ctx.fill();
      continue;
    }
    const cx=Math.cos(p.ang), cy=Math.sin(p.ang), sc=p.r/6, tail=34*Math.min(sc,1.8);
    const g=ctx.createLinearGradient(p.x-cx*tail*2,p.y-cy*tail*2,p.x,p.y);
    g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(1,p.freeze>0?'rgba(170,230,255,0.7)':rgba(TEAM_COLORS[projTeam(p)],0.7));
    ctx.strokeStyle=g; ctx.lineWidth=4*sc; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(p.x-cx*tail*2,p.y-cy*tail*2); ctx.lineTo(p.x,p.y); ctx.stroke();
    ctx.strokeStyle=p.freeze>0?'#8fd8ff':'#efe0b4'; ctx.lineWidth=3*Math.max(1,sc);
    ctx.beginPath(); ctx.moveTo(p.x-cx*tail,p.y-cy*tail); ctx.lineTo(p.x,p.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x+cx*7*sc,p.y+cy*7*sc);
    ctx.lineTo(p.x-cy*5*sc,p.y+cx*5*sc); ctx.lineTo(p.x+cy*5*sc,p.y-cx*5*sc); ctx.closePath();
    ctx.fillStyle=p.freeze>0?'#dff6ff':PAL.teamLight[projTeam(p)]; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle=PAL.ink; ctx.stroke();
    if(settings.showHit){ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.strokeStyle='#ff0'; ctx.lineWidth=1; ctx.stroke(); }
  }
  for(const b of S.bolts){
    if(b.delay>0 || !seenByPlayer(b.x,b.y)) continue;   // gecikmeli ok henüz atılmadı
    if(b.lock){   // Kilitli Yaylım mermisi: kırmızı kalın ok
      const cx=Math.cos(b.ang||0), cy=Math.sin(b.ang||0);
      ctx.strokeStyle='#ff5a4d'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(b.x-cx*26,b.y-cy*26); ctx.lineTo(b.x,b.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x+cx*8,b.y+cy*8); ctx.lineTo(b.x-cy*6,b.y+cx*6); ctx.lineTo(b.x+cy*6,b.y-cx*6); ctx.closePath(); ctx.fillStyle='#ffe0dc'; ctx.fill();
      continue;
    }
    if(b.mini){ ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fillStyle=TEAM_COLORS[b.team]; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle=PAL.teamLight[b.team]; ctx.stroke(); continue; }   // menzilli minyon vuruşu
    if(b.basic){   // düz vuruş (güdümlü): okçuda ok, büyücüde ateş topu; Sekme'nin seken oku açık mavi
      const cx=Math.cos(b.ang||0), cy=Math.sin(b.ang||0);
      if(b.bounce){
        ctx.strokeStyle='#8fe3ff'; ctx.lineWidth=3; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(b.x-cx*16,b.y-cy*16); ctx.lineTo(b.x,b.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x+cx*6,b.y+cy*6); ctx.lineTo(b.x-cy*5,b.y+cx*5); ctx.lineTo(b.x+cy*5,b.y-cx*5); ctx.closePath(); ctx.fillStyle=b.crit?'#ffe066':'#d6f6ff'; ctx.fill();
        continue;
      }
      if(b.src.type==='spirit'){
        drawGlow(ctx,PAL.spirit,b.x,b.y,16,0.45);
        ctx.beginPath(); ctx.arc(b.x,b.y,6,0,Math.PI*2); ctx.fillStyle='#2fbfa5'; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fillStyle='#e6fffa'; ctx.fill(); teamRing(b.x,b.y,8,b.team);
      } else if(b.src.type==='blood'){
        drawGlow(ctx,PAL.blood,b.x,b.y,16,0.45);
        ctx.beginPath(); ctx.arc(b.x,b.y,6,0,Math.PI*2); ctx.fillStyle='#c21f4a'; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fillStyle='#ff9aa8'; ctx.fill(); teamRing(b.x,b.y,8,b.team);
      } else if(b.src.type==='mage'){
        drawGlow(ctx,PAL.ember,b.x,b.y,16,0.5);
        ctx.beginPath(); ctx.arc(b.x,b.y,6,0,Math.PI*2); ctx.fillStyle='#ffb347'; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fillStyle='#fff3c4'; ctx.fill(); teamRing(b.x,b.y,8,b.team);
      } else {
        ctx.strokeStyle=TEAM_COLORS[b.team]; ctx.lineWidth=3.2; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(b.x-cx*18,b.y-cy*18); ctx.lineTo(b.x,b.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x+cx*7,b.y+cy*7); ctx.lineTo(b.x-cy*5,b.y+cx*5); ctx.lineTo(b.x+cy*5,b.y-cx*5); ctx.closePath(); ctx.fillStyle=b.crit?PAL.gold:PAL.teamLight[b.team]; ctx.fill(); ctx.lineWidth=1.3; ctx.strokeStyle=PAL.ink; ctx.stroke();
      }
      continue;
    }
    if(b.blood){   // Kan Oku: büyük koyu kırmızı küre
      drawGlow(ctx,PAL.blood,b.x,b.y,24,0.5); ctx.beginPath(); ctx.arc(b.x,b.y,9,0,Math.PI*2); ctx.fillStyle='#c21f4a'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#ffc2cb'; ctx.stroke(); teamRing(b.x,b.y,11.5,b.team);
      continue;
    }
    ctx.beginPath(); ctx.arc(b.x,b.y,6+b.stacks,0,Math.PI*2);
    ctx.fillStyle=b.fire?'#ff8a3d':TEAM_COLORS[b.team]; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=b.fire?'#fff3c4':PAL.teamLight[b.team]; ctx.stroke();
  }
  // Bumerang: dönen çift kollu hilal
  for(const b of S.booms||[]){
    if(!seenByPlayer(b.x,b.y)) continue;
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.spin);
    ctx.lineCap='round'; ctx.lineWidth=7; ctx.strokeStyle=b.mult<1?'#e2c9a0':'#f3e2b3';
    ctx.beginPath(); ctx.arc(0,0,b.r*0.62,0.3,Math.PI*0.5+0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,b.r*0.62,Math.PI+0.3,Math.PI*1.5+0.3); ctx.stroke();
    ctx.lineWidth=2; ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
    if(settings.showHit){ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.strokeStyle='#ff0'; ctx.lineWidth=1; ctx.stroke(); }
  }
  // Meteor: düşeceği alan, dolarak geri sayar
  for(const n of S.novas||[]){   // Kan Patlaması: büyüyen halka
    if(!seenByPlayer(n.x,n.y)) continue;
    ctx.save(); ctx.globalAlpha=0.35+0.5*(1-n.r/n.max);
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.strokeStyle='#d0213f'; ctx.lineWidth=10; ctx.stroke();
    ctx.restore();
  }
  for(const z of S.zones||[]){
    if(!seenByPlayer(z.x,z.y)) continue;
    const p=1-Math.max(0,z.t)/z.total, bm=z.kind==='bomb', sh=z.kind==='shell';
    if(z.kind==='spirit'){   // güçlü Ruh Patlaması alanı: yavaşlatan turkuaz alan, süre bitince küçülen iç halka
      ctx.save();
      ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,Math.PI*2); ctx.fillStyle='rgba(95,224,200,0.14)'; ctx.fill();
      ctx.strokeStyle='rgba(127,245,220,0.85)'; ctx.lineWidth=3; ctx.setLineDash([10,8]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(z.x,z.y,z.r*(1-p),0,Math.PI*2); ctx.strokeStyle='rgba(214,255,246,0.6)'; ctx.lineWidth=2; ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,Math.PI*2);
    ctx.fillStyle=bm?'rgba(255,225,100,0.12)':sh?'rgba(160,120,255,0.13)':'rgba(255,110,40,0.12)'; ctx.fill();
    ctx.strokeStyle=bm?'rgba(255,225,120,0.85)':sh?'rgba(200,170,255,0.9)':'rgba(255,140,60,0.8)'; ctx.lineWidth=3; ctx.setLineDash([10,8]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(z.x,z.y,z.r*p,0,Math.PI*2); ctx.fillStyle=bm?'rgba(255,225,100,0.3)':sh?'rgba(170,130,255,0.3)':'rgba(255,130,50,0.25)'; ctx.fill();
    if(sh){   // topçu mermisi yukarıdan düşer
      const by=z.y-(1-p)*420;
      ctx.beginPath(); ctx.arc(z.x,by,9,0,Math.PI*2); ctx.fillStyle='#4a3a8c'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#e6dcff'; ctx.stroke();
    }
    if(!bm && !sh && p<1){   // Meteor: gökten düşen ateş topu (alan dolarken yaklaşır)
      const my=z.y-(1-p)*520;
      ctx.strokeStyle=rgba(PAL.ember,0.55); ctx.lineWidth=14; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(z.x-(1-p)*60,my-90); ctx.lineTo(z.x,my); ctx.stroke();
      drawGlow(ctx,PAL.ember,z.x,my,56,0.7);
      ctx.beginPath(); ctx.arc(z.x,my,13,0,TAU); ctx.fillStyle=PAL.emberLight; ctx.fill(); ctx.lineWidth=3; ctx.strokeStyle=PAL.ember; ctx.stroke();
    }
    if(bm){   // havadaki bomba: atıldığı yerden düşeceği yere yay çizerek gider
      const bx=z.ox+(z.x-z.ox)*p, by=z.oy+(z.y-z.oy)*p-Math.sin(p*Math.PI)*40;
      ctx.beginPath(); ctx.arc(bx,by,8,0,Math.PI*2); ctx.fillStyle='#2b2b33'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#ffe27a'; ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFx(){
  for(const f of S.fx){
    if(!fxSeen(f)) continue;
    const k=f.t/f.life;
    if(f.type==='cone'){
      const h=f.owner; if(h.dead) continue;
      const rr=f.reach*(1+0.08*(1-k));
      wedge(h.x,h.y,rr,f.ang,f.half);
      const cc=f.color||'255,240,210';
      ctx.fillStyle=`rgba(${cc},${0.55*k})`; ctx.fill();
      ctx.beginPath(); ctx.arc(h.x,h.y,rr,f.ang-f.half,f.ang+f.half);
      ctx.strokeStyle=f.color?`rgba(${cc},${0.95*k})`:`rgba(255,255,255,${0.9*k})`; ctx.lineWidth=4; ctx.stroke();
    } else if(f.type==='strip'){   // Alevli Sıçrayış şeridi
      const dx=f.x2-f.x1, dy=f.y2-f.y1, l=Math.hypot(dx,dy);
      ctx.save(); ctx.translate(f.x1,f.y1); ctx.rotate(Math.atan2(dy,dx)); ctx.globalAlpha=0.55*k;
      ctx.fillStyle=f.fill||'#ff7a2a'; ctx.fillRect(0,-f.w/2,l,f.w);
      ctx.globalAlpha=k; ctx.strokeStyle=f.line||'#ffd27a'; ctx.lineWidth=3; ctx.strokeRect(0,-f.w/2,l,f.w);
      ctx.restore();
    } else if(f.type==='muzzle'){
      drawGlow(ctx,f.crit?PAL.gold:PAL.goldLight,f.x,f.y,14+14*(1-k),0.7*k);
      if(f.ang!==undefined){   // mermi çıkış efekti: namlu yönünde kısa ışık çizgileri
        ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.ang); ctx.lineCap='round';
        ctx.strokeStyle=f.crit?`rgba(255,207,90,${k})`:`rgba(255,244,214,${k})`; ctx.lineWidth=2.5;
        for(const da of [-0.35,0,0.35]){ ctx.beginPath(); ctx.moveTo(8*Math.cos(da),8*Math.sin(da)); ctx.lineTo((16+16*(1-k))*Math.cos(da),(16+16*(1-k))*Math.sin(da)); ctx.stroke(); }
        ctx.restore();
      }
    } else if(f.type==='slash'){   // yakın dövüş vuruşu: hedefe doğru savurma / pençe izi
      const o=f.owner, u=f.tgt; if(o.dead) continue;
      const dd=u?Math.hypot(u.x-o.x,u.y-o.y):o.r+40, R=Math.max(o.r+10, dd-(u?u.r*0.4:0)), pr=1-k;
      ctx.save(); ctx.lineCap='round';
      for(let j=-1;j<=1;j++){
        const rr=R+j*7, a0=f.ang-0.95+j*0.04, a1=a0+1.9*Math.min(1,pr*1.6);
        ctx.beginPath(); ctx.arc(o.x,o.y,rr,a0,a1);
        ctx.strokeStyle=f.crit?`rgba(255,207,90,${k})`:rgba(PAL.teamLight[o.team],k); ctx.lineWidth=(j===0?5:2.5)*(0.4+k); ctx.stroke();
      }
      ctx.restore();
    } else if(f.type==='impact'){   // isabet: hedefte parlama + kıvılcım çizgileri (geri tepme render()'da)
      const u=f.tgt, x=u?u.x:f.x, y=u?u.y:f.y, rr=(u?u.r:14)*0.9+(f.crit?16:9)*(1-k);
      ctx.save();
      drawGlow(ctx,f.crit?PAL.gold:PAL.goldLight,x,y,rr*1.9,(f.crit?0.42:0.3)*k);
      ctx.strokeStyle=f.crit?`rgba(255,207,90,${k})`:`rgba(255,246,222,${k})`; ctx.lineWidth=f.crit?3.5:2.5; ctx.lineCap='round';
      const n=f.crit?7:5, l0=rr, l1=rr+(f.crit?20:12)*(1-k)+6;
      for(let j=0;j<n;j++){
        const aa=f.ang+(j/(n-1)-0.5)*2.2;
        ctx.beginPath(); ctx.moveTo(x+Math.cos(aa)*l0,y+Math.sin(aa)*l0); ctx.lineTo(x+Math.cos(aa)*l1,y+Math.sin(aa)*l1); ctx.stroke();
      }
      ctx.restore();
    } else if(f.type==='hit'){
      ctx.beginPath(); ctx.arc(f.x,f.y,(f.big?10:6)+(f.big?34:18)*(1-k),0,Math.PI*2);
      ctx.strokeStyle=f.big?`rgba(150,240,255,${k})`:`rgba(255,244,214,${k})`; ctx.lineWidth=3; ctx.stroke();
    } else if(f.type==='fizzle'){
      ctx.globalAlpha=k; ctx.strokeStyle='#5b3a1e'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(f.x-Math.cos(f.ang)*20,f.y-Math.sin(f.ang)*20); ctx.stroke(); ctx.globalAlpha=1;
    } else if(f.type==='death'){
      drawGlow(ctx,TEAM_COLORS[f.team],f.x,f.y,f.r*2.4+30*(1-k),0.6*k);
      ctx.save(); ctx.globalAlpha=k; ctx.beginPath(); ctx.arc(f.x,f.y,f.r+40*(1-k),0,Math.PI*2); ctx.strokeStyle=TEAM_COLORS[f.team]; ctx.lineWidth=5; ctx.stroke();
      ctx.strokeStyle=PAL.teamLight[f.team]; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.beginPath();
      for(let j=0;j<8;j++){ const aa=j*Math.PI/4+0.3, d0=f.r*0.6+(1-k)*f.r*1.6, d1=d0+10+8*k; ctx.moveTo(f.x+Math.cos(aa)*d0,f.y+Math.sin(aa)*d0); ctx.lineTo(f.x+Math.cos(aa)*d1,f.y+Math.sin(aa)*d1); }
      ctx.stroke(); ctx.restore();
    } else if(f.type==='boom'){
      { const bc=f.color===DATA_TEAM[0]?TEAM_COLORS[0]:f.color===DATA_TEAM[1]?TEAM_COLORS[1]:f.color, rb=f.r0+(f.r1-f.r0)*(1-k);
        ctx.save(); ctx.globalAlpha=k*0.16; ctx.beginPath(); ctx.arc(f.x,f.y,rb,0,Math.PI*2); ctx.fillStyle=bc; ctx.fill();
        ctx.globalAlpha=k; ctx.beginPath(); ctx.arc(f.x,f.y,rb,0,Math.PI*2); ctx.strokeStyle=bc; ctx.lineWidth=9; ctx.stroke(); ctx.restore(); }
    } else if(f.type==='ring'){
      const o=f.owner; if(o&&o.dead) continue;
      ctx.globalAlpha=k; ctx.beginPath(); ctx.arc(o.x,o.y,f.r0+(f.r1-f.r0)*(1-k),0,Math.PI*2);
      ctx.strokeStyle=f.color; ctx.lineWidth=f.lw; ctx.stroke(); ctx.globalAlpha=1;
    } else if(f.type==='ghost'){
      ctx.globalAlpha=0.35*k; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
      ctx.fillStyle=TEAM_COLORS[f.team]; ctx.fill(); ctx.globalAlpha=1;
    } else if(f.type==='line'){
      ctx.globalAlpha=k; ctx.strokeStyle='#ff7a7a'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(f.x1,f.y1); ctx.lineTo(f.x2,f.y2); ctx.stroke(); ctx.globalAlpha=1;
    } else if(f.type==='dmg'){
      ctx.globalAlpha=Math.min(1,k*1.5); ctx.font=f.crit?'bold 28px system-ui':'bold 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
      ctx.lineWidth=f.crit?4:3; ctx.strokeStyle='rgba(8,4,28,0.92)'; ctx.lineJoin='round'; ctx.strokeText(f.txt,f.x,f.y);
      ctx.fillStyle=f.blue?'#8fe8ff':f.crit?PAL.gold:'#fff1cf'; ctx.fillText(f.txt,f.x,f.y); ctx.globalAlpha=1;
    }
  }
}

/* Altın kazanınca (tek seferde 3 ve üstü artış) oyuncunun üstünde sade "+N" yazısı; sim'e dokunmadan altın farkından üretilir */
const goldPops=[]; let lastGold=null, lastTime=0;
function trackGold(){
  const p=S.player; if(!p) return;
  if(lastGold===null || S.time<lastTime-0.5){ lastGold=p.gold; goldPops.length=0; }
  lastTime=S.time;
  const d=p.gold-lastGold; lastGold=p.gold;
  if(d>=3 && !p.dead && goldPops.length<8) goldPops.push({ n:Math.floor(d+0.001), t:S.time, x:p.x+(goldPops.length%2?14:-14), y:p.y-p.r-50 });
}
function drawGoldPops(){
  for(let i=goldPops.length-1;i>=0;i--){
    const g=goldPops[i], a=(S.time-g.t)/0.95;
    if(a>=1||a<0){ goldPops.splice(i,1); continue; }
    ctx.save(); ctx.globalAlpha=Math.min(1,(1-a)*2.2); ctx.font='bold 17px system-ui'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    const y=g.y-a*34, t='+'+g.n;
    ctx.lineWidth=3.5; ctx.lineJoin='round'; ctx.strokeStyle='rgba(8,4,28,0.9)'; ctx.strokeText(t,g.x,y); ctx.fillStyle=PAL.gold; ctx.fillText(t,g.x,y);
    ctx.restore();
  }
}

function drawMinimap(W,H){
  const mw=W>1100?260:190, mh=Math.round(mw*MAP_H/MAP_W), x0=W-mw-14, y0=H-mh-14, sx=mw/MAP_W, sy=mh/MAP_H;
  ctx.fillStyle=PAL.hudBg; ctx.fillRect(x0-5,y0-5,mw+10,mh+10); ctx.strokeStyle=PAL.hudLine; ctx.lineWidth=1.5; ctx.strokeRect(x0-5,y0-5,mw+10,mh+10);
  ctx.save(); ctx.beginPath(); ctx.rect(x0,y0,mw,mh); ctx.clip();
  ctx.fillStyle=PAL.ground; ctx.fillRect(x0,y0,mw,mh);
  ctx.lineJoin='round'; ctx.lineCap='round';
  for(const lane of LANES){
    ctx.beginPath(); lane.pts.forEach(([x,y],i)=>i?ctx.lineTo(x0+x*sx,y0+y*sy):ctx.moveTo(x0+x*sx,y0+y*sy));
    ctx.strokeStyle=lane.active?PAL.laneCore:PAL.laneRim; ctx.lineWidth=Math.max(2,lane.width*sx); ctx.stroke();
  }
  const mini=(w)=>{
    if(w.c){ ctx.beginPath(); ctx.ellipse(x0+w.c[0]*sx,y0+w.c[1]*sy,w.r*sx,w.r*sy,0,0,Math.PI*2); }
    else if(w.poly){ ctx.beginPath(); w.poly.forEach(([x,y],i)=> i?ctx.lineTo(x0+x*sx,y0+y*sy):ctx.moveTo(x0+x*sx,y0+y*sy)); ctx.closePath(); }
    else { ctx.beginPath(); ctx.rect(x0+w.x*sx,y0+w.y*sy,w.w*sx,w.h*sy); }
    ctx.fill();
  };
  ctx.fillStyle=PAL.bushB; for(const b of BUSHES) mini(b);
  ctx.fillStyle=PAL.rock; for(const w of WALLS) mini(w);
  ctx.restore();
  for(const s of S.structs){
    ctx.fillStyle = s.dead ? '#4a4668' : TEAM_COLORS[s.team];
    const sz = s.sub==='nexus'?8:5;
    ctx.fillRect(x0+s.x*sx-sz/2, y0+s.y*sy-sz/2, sz, sz);
  }
  for(const m of S.minions){ if(m.dead || !unitSeen(m)) continue; ctx.fillStyle=TEAM_COLORS[m.team]; ctx.fillRect(x0+m.x*sx-1.5,y0+m.y*sy-1.5,3,3); }
  for(const h of S.heroes){
    if(h.dead || !unitSeen(h)) continue;
    ctx.beginPath(); ctx.arc(x0+h.x*sx,y0+h.y*sy,3.5,0,Math.PI*2); ctx.fillStyle=TEAM_COLORS[h.team]; ctx.fill();
    ctx.lineWidth=1.5; ctx.strokeStyle=h===S.player?'#ffd24d':'#fff'; ctx.stroke();
    if(h===S.player){ ctx.beginPath(); ctx.arc(x0+h.x*sx,y0+h.y*sy,6.5,0,Math.PI*2); ctx.lineWidth=1.5; ctx.strokeStyle='#ffd24d'; ctx.stroke(); }
  }
  // kamera çerçevesi (iki eksen), harita içine kırpılır
  const fx=Math.max(0,cam.x), fy=Math.max(0,cam.y), fx2=Math.min(MAP_W,cam.x+view.visW), fy2=Math.min(MAP_H,cam.y+view.visH);
  ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1;
  ctx.strokeRect(x0+fx*sx, y0+fy*sy, (fx2-fx)*sx, (fy2-fy)*sy);
}

/* Skor tablosu (Tab basılıyken): takımlar, kahraman, seviye, K/D/A, altın, eşyalar */
function drawScoreboard(W,H){
  const heroes=S.heroes, myT=S.player.team, tw=Math.min(780,W-24), rowH=34, headH=26;
  const th=14+2*headH+heroes.length*rowH+30, x0=(W-tw)/2, y0=Math.max(56,Math.min(90,(H-th)/2-30));
  ctx.save();
  ctx.fillStyle='rgba(10,8,30,0.9)'; rrect(x0,y0,tw,th,10); ctx.fill(); ctx.strokeStyle=PAL.hudLine; ctx.lineWidth=1.5; rrect(x0,y0,tw,th,10); ctx.stroke();
  const cN=x0+16, cL=x0+tw*0.30, cK=x0+tw*0.38, cG=x0+tw*0.51, cI=x0+tw*0.62;
  ctx.textBaseline='middle'; ctx.textAlign='left';
  ctx.font='bold 14px system-ui'; ctx.fillStyle='#fff'; ctx.fillText('Skor tablosu', cN, y0+18);
  ctx.textAlign='right'; ctx.font='bold 14px system-ui';
  ctx.fillStyle=TEAM_COLORS[myT]; ctx.fillText(S.score[myT], x0+tw-60, y0+18); ctx.fillStyle='#fff'; ctx.fillText('-', x0+tw-44, y0+18); ctx.fillStyle=TEAM_COLORS[1-myT]; ctx.fillText(S.score[1-myT], x0+tw-24, y0+18);
  let y=y0+36;
  for(const team of [myT,1-myT]){
    ctx.fillStyle=team===myT?'rgba(39,226,205,0.16)':'rgba(255,106,88,0.16)'; rrect(x0+8,y,tw-16,headH-4,6); ctx.fill();
    ctx.textAlign='left'; ctx.font='bold 12px system-ui'; ctx.fillStyle=TEAM_COLORS[team];
    ctx.fillText((team===myT?'Takımın':'Rakip takım')+(S.over&&S.over.winner===team?'  ·  Kazandı':''), cN, y+(headH-4)/2);
    ctx.fillStyle='#9b9ac4'; ctx.font='11px system-ui'; ctx.fillText('Sv',cL,y+(headH-4)/2); ctx.fillText('K / D / A',cK,y+(headH-4)/2); ctx.fillText('Altın',cG,y+(headH-4)/2); ctx.fillText('Eşyalar',cI,y+(headH-4)/2);
    y+=headH;
    for(const h of heroes.filter(u=>u.team===team)){
      const cy=y+rowH/2-2;
      if(h===S.player){ ctx.fillStyle='rgba(255,210,77,0.10)'; rrect(x0+8,y,tw-16,rowH-2,6); ctx.fill(); }
      drawToken(ctx,h.type,cN+10,cy,10,{ team:h.team, aim:0, flash:0 });
      ctx.textAlign='left'; ctx.font='bold 13px system-ui'; ctx.fillStyle=h.dead?'#8a87a8':'#fff';
      ctx.fillText((HERO_NAMES[h.type]||h.def.name)+(h===S.player?' (sen)':''), cN+28, cy);
      ctx.font='13px system-ui'; ctx.fillStyle=h.dead?'#8a87a8':'#dfe3f2';
      ctx.fillText(h.level, cL, cy); ctx.fillText(h.kills+' / '+h.deaths+' / '+h.assists, cK, cy);
      ctx.fillStyle='#ffd24d'; ctx.fillText(Math.floor(h.gold), cG, cy);
      for(let i=0;i<SLOTS;i++){
        const id=h.items[i], it=id&&(ITEMS[id]||PARTS[id]), ix=cI+i*(tw*0.075), iw=tw*0.07;
        ctx.fillStyle=it?'#1b212d':'#12151c'; rrect(ix,cy-12,iw,24,5); ctx.fill();
        ctx.strokeStyle=it?(ITEMS[id]?'#c9b45a':'#6d7a99'):'#343a49'; ctx.lineWidth=1.5; rrect(ix+0.5,cy-11.5,iw-1,23,5); ctx.stroke();
        if(it){ const w=it.name.split(' '), ab=w.length>1?w.map(q=>q[0]).join('').slice(0,3):it.name.slice(0,3);
          ctx.font='bold 11px system-ui'; ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.fillText(ab, ix+iw/2, cy+1); }
      }
      y+=rowH;
    }
    y+=4;
  }
  ctx.textAlign='center'; ctx.font='11px system-ui'; ctx.fillStyle='#9b9ac4'; ctx.fillText('Tab basılı tutulurken görünür', x0+tw/2, y0+th-14);
  ctx.restore();
}

/* =========================================================
   HUD (alt çubuk): tek panel. Sol: portre, seviye, XP. Orta: can, durum etiketleri, yetenek kutuları. Sağ: eşyalar ve altın.
   Panel PW x PH yerel birimle çizilir, dar ekranda ölçeklenir (sc). Üzerine gelince tooltip.
   ========================================================= */
const HUD_PW=694, HUD_PH=140, HUD_BOX=78, HUD_GAP=10;
const HUD_KEY={ p:'Pasif', r:'Sağ tık', e:'E', s:'Boşluk' };
const hudFlash={}, hudPrev={};
const hudZones=[];
/* tooltip sayıları: [anahtar, etiket, tür] tür: n sayı, p yüzde, t süre (sn), x çarpan, s kalkan (<=1 ise yüzde) */
const HUD_NUM=[
  ['dmg','Hasar','n'],['dps','Saniyelik hasar','n'],['ad','SG oranı','p'],['ap','YG oranı','p'],['hpPct','Hedefin azami canı','p'],['pct','Oran','p'],
  ['sparkMin','En az patlama','n'],['sparkMax','En çok patlama','n'],['burnMin','Yakma (sn başına, en az)','n'],['burnMax','Yakma (sn başına, en çok)','n'],
  ['heal','İyileşme','p'],['shield','Kalkan','s'],['amp','Hasar artışı','p'],['slow','Yavaşlatma','p'],['slowMin','Yavaşlatma (1. seviye)','p'],['slowMax','Yavaşlatma (10. seviye)','p'],
  ['slowDur','Yavaşlatma süresi','t'],['stun','Sersemletme','t'],['stunMin','En kısa sersemletme','t'],['stunMax','En uzun sersemletme','t'],
  ['freeze','Dondurma','t'],['silence','Susturma','t'],['root','Kök','t'],['bind','Bağ süresi','t'],
  ['spd','Hız artışı','p'],['as','Saldırı hızı','p'],['size','Büyüme','p'],['bonus','Ek hasar','p'],['mult','Çarpan','x'],
  ['dur','Süre','t'],['window','Süre','t'],['field','Alan süresi','t'],['fieldSlow','Alan yavaşlatması','p'],['again','İkinci patlama','p'],['shieldMult','Kalkan çarpanı','x'],
  ['range','Menzil','n'],['radius','Yarıçap','n'],['blast','Patlama yarıçapı','n'],['burstRadius','Patlama yarıçapı','n'],['dist','Mesafe','n'],
  ['count','Mermi sayısı','n'],['shots','Atış sayısı','n'],['bounceCount','Sekme','n'],['back','Dönüş süresi','t'],['delay','Gecikme','t'],['missing','Eksik can başına','p'],['res','Zırh ve BD','n'],
  ['killPct','Son vuruşta can','p'],['nearPct','Yakındaki ölümde can','p'],['twinPct','Ok başına hasar','p'],['bouncePct','Sekme hasarı','p'],['regenPct','Can yenileme (5 sn)','p'],
  ['flowMin','Hız (1. seviye)','p'],['flowMax','Hız (10. seviye)','p'],['timerMax','Odak süresi (1. seviye)','t'],['timerMin','Odak süresi (10. seviye)','t'],
  ['oppCd','Bekleme','t'],['oppBase','Ek hasar','n'],['oppMax','Azami can oranı','p'],['flowCd','Bekleme kısalması','t'],['flowHero','Kahramanda','t']
];
const TYPE_DESC={
  volley:'Önündeki yelpazeye ok yağdırır.', haste:'Saldırı hızın bir süre artar.', bigarrow:'Harita boyunca giden dev ok; vurduğunu kısa süre dondurur.',
  tumble:'İmleç yönüne kısa kayarsın; sonraki düz vuruş 3 ok atar.', bomb:'Bomba atar; patlayınca hasar verir ve sersemletir.',
  lockvolley:'Bir kahramana kilitlenir, yerinde durup mermi yağdırırsın. Araya giren mermiyi alır.',
  dash:'İleri atılırsın; çarptığın rakibi yavaşlatıp itersin.', shield:'Kalkan kazanır ve hızlanırsın.', giant:'Büyürsün; hasarın artar.',
  fireball:'Düz giden, ilk değdiğine çarpan ateş topu.', ignite:'Hedefi yakar; yanarken daha fazla hasar alır.', meteor:'Seçilen alana gecikmeli büyük top düşer.',
  boomerang:'Gidip geri dönen bumerang; gidiş ve dönüşte ayrı vurur.', cleanse:'Yavaşlatma ve kontrolleri temizler, kısa hız verir.',
  frenzy:'Bumerang ve Arınma beklemesi sıfırlanır; güçlenir, sekme sayısı artar.', hook:'Kanca fırlatır; vurduğunu önüne çeker.',
  slam:'Önündeki koniye vurur, yavaşlatır.', shockwave:'Çevredeki kahramanları susturur ve yavaşlatır.', breath:'Dar koni içine ateş üfler.',
  flameleap:'İleri sıçrarsın; arkanda yanan şerit kalır.', firering:'Çevrende yanan halka açılır; zırh ve BD artar.',
  bloodbolt:'Güdümlü kan oku; verdiği hasarın bir kısmı seni iyileştirir.', bloodnova:'Canının bir kısmını harcayıp etrafa mermi saçarsın.',
  bloodcurse:'Alanı lanetler; hasar artar, süre bitince patlar ve iyileştirir.', beam:'Önündeki şeride anlık ışın.',
  stunorb:'Küre fırlatır; ne kadar uzağa giderse sersemletme o kadar uzar.', artillery:'Yerinde kök salar, her basışta imlece top atışı yaparsın.',
  tether:'Rakibe zincir bağlar; kopmazsa kök salar.', blink:'Anında ışınlanırsın; aynı tuşa tekrar basınca geri dönersin.',
  mimic:'Son Zincir ya da Gölge Adımı daha güçlü tekrar edilir.', spiritburst:'Küre fırlatır; patlar, hasar verir ve yavaşlatır.',
  spiritshield:'Kalkan ve kısa hız artışı.', mantra:'Sonraki Ruh Patlaması ya da Kalkanı güçlenir.', groworb:'Mesafeyle büyüyüp hızlanan enerji küresi.',
  leapslam:'Rakibe sıçrayıp inersin; alan hasarı ve yavaşlatma.', knockblow:'Rakibi iter; duvara çarparsa sersemler.', transform:'Uzak ve yakın biçim arasında geçiş yaparsın.'
};
const PASS_DESC={
  archer:'Düz vuruşların rakibi yavaşlatır.', warrior:'Hasarın bir kısmı yakındaki rakiplere yayılır.', mage:'Rakip kahramanı her vuruşta yakar.',
  twin:'Her düz vuruş iki güdümlü ok atar.', bounce:'Düz vuruş yakındaki başka bir rakibe seker.', hook:'Canın sürekli ek yenilenir.',
  flame:'Yetenek sonrası ilk düz vuruş patlama çıkarır.', blood:'Yakında ölen rakipten can kazanırsın.', artillery:'Dolunca sağ tık ve E beklemesi çok kısalır.',
  shadow:'Canı yarının altındaki rakibe vurunca ek hasar.', spirit:'Düz vuruşların yeteneklerin beklemesini kısaltır.', dual:'Yetenek kullanınca kısa süre hızlanırsın.'
};
const HUD_STATS=[ ['dmg','SG'], ['asPct','Saldırı hızı'], ['crit','Kritik'], ['ls','Can çalma'], ['ap','YG'], ['ah','YH'], ['hp','Can'], ['armor','Zırh'], ['mr','Büyü direnci'], ['msPct','Hareket hızı'], ['lethal','Zırh delme'], ['regen','Yenileme'] ];

function hudNum(v){ return String(Math.round(v*100)/100).replace('.',','); }
function hudFmt(kind,v){
  if(kind==='s') kind = v<=1 ? 'p' : 'n';
  if(kind==='p') return '%'+hudNum(v*100);
  if(kind==='t') return hudNum(v)+' sn';
  if(kind==='x') return 'x'+hudNum(v);
  return hudNum(v);
}
function hudWrap(text,maxW){
  const out=[]; let line='';
  for(const w of String(text).split(' ')){
    const t=line?line+' '+w:w;
    if(line && ctx.measureText(t).width>maxW){ out.push(line); line=w; } else line=t;
  }
  if(line) out.push(line);
  return out;
}
/* Yazıyı genişliğe sığdırır: önce küçültür (en az minS), olmazsa kısaltır. Yazı tipini ayarlar. */
function hudFit(t,maxW,size,bold,minS){
  let s=size; const f=n=>(bold?'bold ':'')+n+'px system-ui';
  ctx.font=f(s);
  while(ctx.measureText(t).width>maxW && s>minS){ s--; ctx.font=f(s); }
  if(ctx.measureText(t).width>maxW){ while(t.length>1 && ctx.measureText(t+'…').width>maxW) t=t.slice(0,-1); t+='…'; }
  return t;
}
function hudText(t,x,y,size,color,align,bold,base){
  ctx.font=(bold?'bold ':'')+size+'px system-ui'; ctx.fillStyle=color; ctx.textAlign=align||'left'; ctx.textBaseline=base||'alphabetic'; ctx.fillText(t,x,y);
}
function hudSkillTip(p,k){
  const sk=p.def.skills[k], rk=k==='p'?1:p.rank[k];
  const pick=a=>Array.isArray(a)?a[Math.max(0,Math.min(rk-1,a.length-1))]:a;
  const lines=[], desc=k==='p'?(PASS_DESC[p.type]||''):(TYPE_DESC[sk.type]||'');
  const subs=[HUD_KEY[k]];
  if(k!=='p' && !sk.fixed) subs.push('Kademe '+rk+' / '+sk.max);
  if(k!=='p' && rk===0) subs.push('öğrenilmedi');
  if(Array.isArray(sk.cd)){
    const all=sk.cd.map(hudNum).join(' / ');
    lines.push({ t:'Bekleme: '+(sk.cd.length>1?(rk>0?hudNum(pick(sk.cd))+' sn  ':'')+'('+all+')':hudNum(sk.cd[0])+' sn'), c:'#ffe066' });
  }
  if(sk.cast && k!=='p') lines.push({ t:'Hazırlık: '+hudNum(sk.cast)+' sn', c:PAL.muted });
  const seen=new Set();
  for(const [key,label,kind] of HUD_NUM){
    const v=sk[key]; if(v===undefined || v===0) continue;
    if(typeof v!=='number' && !Array.isArray(v)) continue;
    const id=label+(Array.isArray(v)?v.join():v); if(seen.has(id)) continue; seen.add(id);
    let s;
    if(Array.isArray(v)){ const all=v.map(x=>hudFmt(kind,x)).join(' / '); s = v.length>1 ? (rk>0?hudFmt(kind,pick(v))+'  ':'')+'('+all+')' : hudFmt(kind,v[0]); }
    else s=hudFmt(kind,v);
    lines.push({ t:label+': '+s, c:'#9fd6ff' });
  }
  if(k==='p'){ const pt=passiveText(p); if(pt) lines.unshift({ t:'Şu an: '+pt, c:'#9fd6ff' }); }
  return { title:sk.name, sub:subs.join(' · '), desc, lines };
}
function hudItemTip(id){
  const it=ITEMS[id]||PARTS[id]; if(!it) return null;
  const st=HUD_STATS.filter(([k])=>it.stats[k]).map(([k,n])=>'+'+(k==='asPct'||k==='crit'||k==='ls'||k==='msPct'?Math.round(it.stats[k]*100)+'%':it.stats[k])+' '+n).join(', ');
  return { title:it.name, sub:ITEMS[id]?'Eşya':'Temel parça', desc:it.desc||'', lines:st?[{ t:st, c:'#9fd6ff' }]:[] };
}
function hudDrawTip(tip,lx,ly,zone,bounds){
  ctx.font='12px system-ui';
  const MAXW=270, descL=tip.desc?hudWrap(tip.desc,MAXW):[];
  const lines=[];
  for(const l of tip.lines){ for(const w of hudWrap(l.t,MAXW)) lines.push({ t:w, c:l.c }); }
  const lh=16, h=10+20+(tip.sub?15:0)+descL.length*lh+(descL.length&&lines.length?4:0)+lines.length*lh+8;
  let w=MAXW+20;
  let x=zone.x+zone.w/2-w/2, y=zone.y-h-8;
  x=Math.max(bounds.l+6,Math.min(bounds.r-w-6,x));
  if(y<bounds.t+6) y=Math.min(zone.y+zone.h+8,bounds.b-h-6);
  ctx.fillStyle='rgba(8,10,16,0.97)'; rrect(x,y,w,h,7); ctx.fill();
  ctx.strokeStyle='#56607a'; ctx.lineWidth=1; rrect(x,y,w,h,7); ctx.stroke();
  let yy=y+10;
  ctx.textBaseline='top'; ctx.textAlign='left';
  hudText(tip.title,x+10,yy,14,'#fff','left',true,'top'); yy+=20;
  if(tip.sub){ hudText(tip.sub,x+10,yy,11,PAL.muted,'left',false,'top'); yy+=15; }
  ctx.font='12px system-ui';
  for(const d of descL){ hudText(d,x+10,yy,12,'#cfd5e3','left',false,'top'); yy+=lh; }
  if(descL.length&&lines.length) yy+=4;
  for(const l of lines){ hudText(l.t,x+10,yy,12,l.c,'left',false,'top'); yy+=lh; }
}
function hudLock(cx,cy,c){
  ctx.strokeStyle=c; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy-3,4.5,Math.PI,0); ctx.stroke();
  ctx.fillStyle=c; ctx.fillRect(cx-6,cy-3,12,9);
}

function hudSkillBox(p,k,x,y,sc,ox,oy){
  const S0=HUD_BOX, sk=p.def.skills[k], rk=k==='p'?1:p.rank[k], learned=rk>0;
  const cd=(k!=='p' && learned)?p.cd[k]:0, cdMax=Math.max(0.001,p.cdMax[k]||1);
  const silenced = k!=='p' && learned && p.st.silence>0 && sk.type!=='cleanse';
  const flash = k!=='p' && learned ? hudFlashOf(p,k,cd,sk) : 0;
  const mantraOn = k!=='p' && learned && p.ic.mantra && S.time<=p.ic.mantra.until && (sk.type==='spiritburst' || sk.type==='spiritshield');
  const focusOn = k==='p' && p.ic.focus;
  const cx=x+S0/2;
  // zemin
  ctx.fillStyle=learned?'#171c27':'#121419'; rrect(x,y,S0,S0,6); ctx.fill();
  if(learned){ const g=ctx.createLinearGradient(0,y,0,y+S0); g.addColorStop(0,'rgba(255,255,255,0.05)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; rrect(x,y,S0,S0,6); ctx.fill(); }
  // susturma: mor perde ve soluk çarpı (yazıların altında kalır)
  if(silenced){
    ctx.fillStyle='rgba(70,35,115,0.55)'; rrect(x,y,S0,S0,6); ctx.fill();
    ctx.strokeStyle='rgba(235,220,255,0.3)'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x+12,y+12); ctx.lineTo(x+S0-12,y+S0-12); ctx.moveTo(x+S0-12,y+12); ctx.lineTo(x+12,y+S0-12); ctx.stroke(); ctx.lineCap='butt';
  }
  // bekleme: saat yönünde açılan karartma (tuş etiketi ve kademe noktaları üstte kalsın)
  if(cd>0){
    ctx.save(); rrect(x,y,S0,S0,6); ctx.clip();
    const frac=Math.min(1,cd/cdMax), a0=-Math.PI/2+(1-frac)*Math.PI*2, cy=y+S0/2;
    ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,S0,a0,Math.PI*1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a0)*S0,cy+Math.sin(a0)*S0); ctx.stroke();
    ctx.restore();
  }
  // tuş etiketi
  hudText(HUD_KEY[k],x+6,y+13,10,learned?'#ffe066':'#6b7280','left',true);
  // ad (bekleme sürerken gizli, kilitli kutuda soluk)
  if(cd<=0){
    const nm=hudFit(sk.name,S0-10,13,true,9);
    ctx.fillStyle=learned?'#fff':'#6f7686'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(nm,cx,y+(learned?34:30));
  }
  if(!learned) hudLock(cx,y+52,'#6f7686');
  if(k==='p'){
    const t=hudFit(passiveText(p)||'',S0-8,10,false,8);
    ctx.fillStyle=focusOn?'#e6dcff':'#9fd6ff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(t,cx,y+58);
  } else if(learned){
    if(!sk.fixed){
      const pw=9, pg=3, tot=sk.max*pw+(sk.max-1)*pg, px0=cx-tot/2;
      for(let j=0;j<sk.max;j++){ ctx.fillStyle=j<rk?'#ffe066':'#323848'; ctx.fillRect(px0+j*(pw+pg),y+S0-11,pw,5); }
    }
    if(p.offCd && (k==='r'||k==='e')){   // İkili: diğer biçimdeki karşılığın
      const ov=p.offCd[k], lab=(p.form==='ranged'?'Yakın':'Uzak')+': '+(ov>0?Math.ceil(ov)+' sn':'hazır');
      hudText(lab,cx,y+S0-17,9,ov>0?'#8d96a8':'#8fdc9a','center',false,'alphabetic');
    }
  }
  // bekleme sayısı (karartma yazılardan önce çizildi)
  if(cd>0){
    const txt=cd>=1?String(Math.ceil(cd)):cd.toFixed(1);
    ctx.font='bold 28px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,0.8)'; ctx.strokeText(txt,cx,y+34); ctx.fillStyle='#fff'; ctx.fillText(txt,cx,y+34);
  }
  // kenarlık
  let bc=learned?'#6d7a99':'#3a4050', bw=2;
  if(learned && cd<=0 && !silenced) bc='#a9b6d6';
  if(focusOn){ bc='#c9a6ff'; bw=3; }
  if(mantraOn){ bc='#7ff5dc'; bw=3; }
  if(p.chan && p.chan.k===k){ bc='#9be39b'; bw=3; }
  ctx.strokeStyle=bc; ctx.lineWidth=bw; rrect(x+bw/2-0.5,y+bw/2-0.5,S0-bw+1,S0-bw+1,6); ctx.stroke();
  // hazır olunca kısa parlama
  if(flash>0){
    ctx.save(); ctx.globalAlpha=flash*0.55; ctx.fillStyle='#fff6c0'; rrect(x,y,S0,S0,6); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha=flash; ctx.strokeStyle='#ffe066'; ctx.lineWidth=3; rrect(x-1,y-1,S0+2,S0+2,7); ctx.stroke(); ctx.restore();
  }
  // + düğmesi (kutunun üst kenarında, sağda)
  if(k!=='p' && canLearn(p,k)){
    const bx=x+S0-24, by=y-7, bs=20;
    ctx.fillStyle='#ffd24d'; rrect(bx,by,bs,bs,5); ctx.fill();
    ctx.strokeStyle='#7a5a00'; ctx.lineWidth=1; rrect(bx,by,bs,bs,5); ctx.stroke();
    hudText('+',bx+bs/2,by+bs/2+1,16,'#222','center',true,'middle');
    hudBtns.push({ k, x:ox+bx*sc, y:oy+by*sc, w:bs*sc, h:bs*sc });
  }
  hudZones.push({ x, y, w:S0, h:S0, tip:()=>hudSkillTip(p,k) });
}
function hudFlashOf(p,k,cd,sk){
  const key=p.id+k, pr=hudPrev[key];
  if(pr && pr.name===sk.name && pr.cd && !(cd>0)) hudFlash[key]=S.time;
  hudPrev[key]={ name:sk.name, cd:cd>0 };
  const f=hudFlash[key], d=f===undefined?-1:S.time-f;
  return d>=0 && d<0.4 ? 1-d/0.4 : 0;
}

function hudChips(p,x,y,maxW){
  const list=[], st=p.st;
  if(p.dead) list.push({ t:'Öldün, '+Math.ceil(Math.max(0,p.respawn))+' sn', c:'#ffb3b3', bg:'#58232a' });
  if(st.silence>0) list.push({ t:'Susturuldu '+st.silence.toFixed(1)+' sn', c:'#e3d1ff', bg:'#4a2f7a' });
  if(st.freeze>0 && !p.dead) list.push({ t:'Kontrol altında', c:'#bfeaff', bg:'#2c4a66' });
  if(p.stasis>0) list.push({ t:'Dokunulmaz '+p.stasis.toFixed(1)+' sn', c:'#fff1b0', bg:'#5a4a1a' });
  if(p.recallCh) list.push({ t:'Üsse dönüş '+Math.max(0,p.recallCh.t).toFixed(1)+' sn', c:'#b8d8ff', bg:'#26406a' });
  if(p.form) list.push({ t:'Biçim: '+(p.form==='melee'?'Yakın':'Uzak'), c:p.form==='melee'?'#ffd7a8':'#bfe0ff', bg:p.form==='melee'?'#5a3a1c':'#26406a' });
  if(p.ic.focus) list.push({ t:'Odak hazır', c:'#e6dcff', bg:'#4a2f7a' });
  if(p.ic.mantra && S.time<=p.ic.mantra.until) list.push({ t:'Güçlendirme '+Math.max(0,p.ic.mantra.until-S.time).toFixed(1)+' sn', c:'#c8fff2', bg:'#1d5a4e' });
  if(p.ic.back) for(const k of ['r','e','s']){ const b=p.ic.back[k]; if(b && S.time<=b.until) list.push({ t:'Dönüş ('+HUD_KEY[k]+') '+Math.max(0,b.until-S.time).toFixed(1)+' sn', c:'#e0d6ff', bg:'#3d2f6a' }); }
  if(p.chan){
    const c=p.chan, sk=p.def.skills[c.k];
    if(c.art) list.push({ t:'Kök Sal: '+Math.max(0,sk.shots-c.shots)+' atış, '+Math.max(0,sk.dur-c.t).toFixed(1)+' sn', c:'#e6dcff', bg:'#4a2f7a' });
    else if(sk) list.push({ t:sk.name+': '+Math.max(0,(sk.count||0)-c.shots)+' mermi, '+Math.max(0,(sk.dur||0)-c.t).toFixed(1)+' sn', c:'#d7f5d2', bg:'#244a2c' });
  }
  let cx=x;
  ctx.textBaseline='middle';
  for(const ch of list){
    ctx.font='bold 10px system-ui'; const w=ctx.measureText(ch.t).width+12;
    if(cx+w>x+maxW) break;
    ctx.fillStyle=ch.bg; rrect(cx,y,w,15,7); ctx.fill();
    ctx.strokeStyle='rgba(8,4,28,0.85)'; ctx.lineWidth=1.5; rrect(cx,y,w,15,7); ctx.stroke();
    hudText(ch.t,cx+6,y+8,10,ch.c,'left',true,'middle');
    cx+=w+5;
  }
}

function hudPanel(p,W,H){
  const mmw=W>1100?260:190;
  const sc=Math.min(1,(W-mmw-34)/HUD_PW,(W-16)/HUD_PW);
  const pw=HUD_PW*sc, ph=HUD_PH*sc;
  const ox=Math.max(8,Math.min((W-pw)/2,W-mmw-24-pw)), oy=H-ph-12;
  hudZones.length=0;
  ctx.save(); ctx.translate(ox,oy); ctx.scale(sc,sc);
  // panel
  ctx.fillStyle=PAL.hudBg; rrect(0,0,HUD_PW,HUD_PH,10); ctx.fill();
  ctx.strokeStyle=PAL.hudLine; ctx.lineWidth=1.5; rrect(0,0,HUD_PW,HUD_PH,10); ctx.stroke();
  // XP çubuğu (panelin üstünde, ince)
  const need=p.level>=MAX_LEVEL?1:XP_NEED(p.level), frac=p.level>=MAX_LEVEL?1:Math.max(0,Math.min(1,p.xp/need));
  ctx.fillStyle='#14173a'; rrect(0,-8,HUD_PW,6,3); ctx.fill();
  if(frac>0){ ctx.fillStyle='#9a78f0'; rrect(0,-8,Math.max(6,HUD_PW*frac),6,3); ctx.fill(); }
  hudZones.push({ x:0, y:-10, w:HUD_PW, h:10, tip:()=>({ title:'Seviye '+p.level+(p.level>=MAX_LEVEL?' (en yüksek)':''), sub:'Deneyim', desc:'', lines:[{ t:p.level>=MAX_LEVEL?'En yüksek seviyedesin.':'XP '+Math.floor(p.xp)+' / '+need, c:'#c9a6ff' }].concat(p.points>0?[{ t:p.points+' yetenek puanın var', c:'#ffe066' }]:[]) }) });

  // sol: portre
  const pcx=72, pcy=54;
  drawToken(ctx,p.type,pcx,pcy,34,{ team:p.team });
  ctx.fillStyle='#10131b'; ctx.beginPath(); ctx.arc(pcx+27,pcy+27,13,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#a98be8'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(pcx+27,pcy+27,13,0,Math.PI*2); ctx.stroke();
  hudText(String(p.level),pcx+27,pcy+28,14,'#fff','center',true,'middle');
  if(p.points>0){
    ctx.fillStyle='#ffd24d'; rrect(pcx+10,pcy-48,34,17,8); ctx.fill();
    hudText('+'+p.points,pcx+27,pcy-39,11,'#222','center',true,'middle');
  }
  const nm=hudFit(HERO_NAMES[p.type]||p.def.name,128,14,true,10); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(nm,pcx,100);
  const xpt=p.level>=MAX_LEVEL?'Seviye '+p.level+' (en yüksek)':'XP '+Math.floor(p.xp)+' / '+need;
  const xt=hudFit(xpt,128,10,false,8); ctx.fillStyle=PAL.muted; ctx.fillText(xt,pcx,118);
  hudZones.push({ x:pcx-36, y:pcy-36, w:72, h:72, tip:()=>({ title:(HERO_NAMES[p.type]||p.def.name)+(p.form?' ('+(p.form==='melee'?'yakın':'uzak')+' biçim)':''), sub:'Seviye '+p.level,
    desc:'', lines:[ { t:'Can '+Math.ceil(p.hp)+' / '+Math.ceil(p.maxHp)+(stat(p,'regen')?', 5 sn\'de +'+hudNum(stat(p,'regen')):''), c:'#9be39b' },
      { t:'SG '+Math.round(atkDmg(p))+', saldırı hızı '+attackSpeed(p).toFixed(2)+' / sn, menzil '+atkDef(p).range, c:'#9fd6ff' },
      { t:'Zırh '+Math.round(stat(p,'armor'))+', büyü direnci '+Math.round(stat(p,'mr'))+', YG '+Math.round(stat(p,'ap')), c:'#9fd6ff' } ] }) });

  // orta: can çubuğu
  const CX=160, CW=4*HUD_BOX+3*HUD_GAP;
  const hf=Math.max(0,Math.min(1,p.hp/p.maxHp));
  ctx.fillStyle='#080a1c'; rrect(CX,10,CW,20,5); ctx.fill();
  if(hf>0){ ctx.fillStyle=hf<0.3?'#ff7a5a':PAL.hp[0]; rrect(CX,10,Math.max(5,CW*hf),20,5); ctx.fill(); }
  if(p.st.shield && p.st.shield.amt>0){
    const sw=Math.min(CW*(1-hf),CW*p.st.shield.amt/p.maxHp);
    if(sw>1){ ctx.fillStyle='rgba(235,240,255,0.85)'; ctx.fillRect(CX+CW*hf,10,sw,20); }
  }
  ctx.strokeStyle=PAL.hudLine; ctx.lineWidth=1; rrect(CX,10,CW,20,5); ctx.stroke();
  const ht=Math.ceil(p.hp)+' / '+Math.ceil(p.maxHp)+(p.st.shield&&p.st.shield.amt>0?'  (+'+Math.ceil(p.st.shield.amt)+')':'');
  ctx.font='bold 12px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.strokeText(ht,CX+CW/2,21); ctx.fillStyle='#fff'; ctx.fillText(ht,CX+CW/2,21);
  hudChips(p,CX,-29,CW+180);   // panelin üstünde: + düğmeleriyle çakışmasın
  // yetenek kutuları
  ['p','r','e','s'].forEach((k,i)=>hudSkillBox(p,k,CX+i*(HUD_BOX+HUD_GAP),54,sc,ox,oy));

  // sağ: eşyalar (3 x 2; son hücre altın)
  const IX=CX+CW+20, IS=48, IG=6, IY=(HUD_PH-(2*IS+IG))/2;
  let actIdx=-1;
  if(p.bonus && p.bonus.stasis) actIdx=p.items.findIndex(id=>ITEMS[id] && ITEMS[id].stasis);
  for(let i=0;i<SLOTS;i++){
    const x=IX+(i%3)*(IS+IG), y=IY+Math.floor(i/3)*(IS+IG), id=p.items[i], it=id&&(ITEMS[id]||PARTS[id]);
    ctx.fillStyle=it?'#1b212d':'#12151c'; rrect(x,y,IS,IS,6); ctx.fill();
    if(it){
      const w=it.name.split(' '), ab=w.length>1?w.map(s=>s[0]).join('').slice(0,3):it.name.slice(0,3);
      const t=hudFit(ab,IS-8,15,true,10); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(t,x+IS/2,y+IS/2);
      if(PARTS[id]){ ctx.fillStyle='#7d8aa5'; ctx.fillRect(x+IS-10,y+IS-10,6,6); }
    }
    const act=i===actIdx;
    ctx.strokeStyle=act?'#ffd24d':(it?(ITEMS[id]?'#c9b45a':'#6d7a99'):'#343a49'); ctx.lineWidth=act?3:2; ctx.setLineDash(it?[]:[4,3]);
    rrect(x+1,y+1,IS-2,IS-2,6); ctx.stroke(); ctx.setLineDash([]);
    if(act){
      const left=Math.max(0,(p.ic.stasisCd||0)-S.time), tot=p.bonus.stasis.cd;
      if(left>0){
        ctx.save(); rrect(x,y,IS,IS,6); ctx.clip();
        const a0=-Math.PI/2+(1-Math.min(1,left/tot))*Math.PI*2;
        ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.beginPath(); ctx.moveTo(x+IS/2,y+IS/2); ctx.arc(x+IS/2,y+IS/2,IS,a0,Math.PI*1.5); ctx.closePath(); ctx.fill(); ctx.restore();
        const tx=left>=1?String(Math.ceil(left)):left.toFixed(1);
        ctx.font='bold 18px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.8)';
        ctx.strokeText(tx,x+IS/2,y+IS/2); ctx.fillStyle='#fff'; ctx.fillText(tx,x+IS/2,y+IS/2);
      }
      ctx.fillStyle='#ffd24d'; rrect(x+3,y+3,14,14,4); ctx.fill();
      hudText('1',x+10,y+11,11,'#222','center',true,'middle');
    }
    if(it) hudZones.push({ x, y, w:IS, h:IS, tip:()=>{ const t=hudItemTip(id); if(t && act) t.lines.push({ t:'Aktif eşya: 1 tuşu', c:'#ffd24d' }); return t; } });
  }
  { const x=IX+2*(IS+IG), y=IY+IS+IG;   // altın
    ctx.fillStyle='#1b212d'; rrect(x,y,IS,IS,6); ctx.fill();
    ctx.strokeStyle='#6b5a1a'; ctx.lineWidth=2; rrect(x+1,y+1,IS-2,IS-2,6); ctx.stroke();
    ctx.fillStyle='#ffd24d'; ctx.beginPath(); ctx.arc(x+IS/2,y+15,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#8a6b00'; ctx.lineWidth=1.5; ctx.stroke();
    const gt=hudFit(String(Math.floor(p.gold)),IS-6,16,true,10); ctx.fillStyle='#ffe066'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(gt,x+IS/2,y+34);
    hudZones.push({ x, y, w:IS, h:IS, tip:()=>({ title:'Altın', sub:'', desc:'Eşya almak için üste dön (B), mağaza P tuşu.', lines:[{ t:Math.floor(p.gold)+' altın', c:'#ffe066' }] }) });
  }
  // tooltip
  const lx=(( uiState.sx===undefined?-1e9:uiState.sx)-ox)/sc, ly=((uiState.sy===undefined?-1e9:uiState.sy)-oy)/sc;
  const z=hudZones.find(q=>lx>=q.x && lx<=q.x+q.w && ly>=q.y && ly<=q.y+q.h);
  if(z){ const tip=z.tip(); if(tip) hudDrawTip(tip,lx,ly,z,{ l:-ox/sc, r:(W-ox)/sc, t:-oy/sc, b:(H-oy)/sc }); }
  ctx.restore();
}


function drawHud(){
  hudBtns.length=0;
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
  const W=view.W, H=view.H;

  // skor
  ctx.font='bold 22px system-ui'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(W/2-80,8,160,34);
  ctx.fillStyle=TEAM_COLORS[0]; ctx.fillText(S.score[0],W/2-40,13);
  ctx.fillStyle='#fff'; ctx.fillText('-',W/2,13);
  ctx.fillStyle=TEAM_COLORS[1]; ctx.fillText(S.score[1],W/2+40,13);
  const mm=Math.floor(S.time/60), ss=Math.floor(S.time%60);
  ctx.font='12px system-ui'; ctx.fillStyle='rgba(255,255,255,0.8)';
  ctx.fillText(`${mm}:${String(ss).padStart(2,'0')}   |   Sonraki dalga: ${settings.waves?Math.max(0,Math.ceil(S.waveT)):'-'} sn`, W/2, 46);

  // kahraman bilgisi (sol üst, küçük ve sade)
  const p=S.player;
  { const lines=[ `${HERO_NAMES[p.type]||p.def.name}${p.form?' ('+(p.form==='melee'?'yakın':'uzak')+')':''}  Sv ${p.level}`,
      `SG ${Math.round(atkDmg(p))}  Hız ${attackSpeed(p).toFixed(2)}  Menzil ${atkDef(p).range}`,
      `Zırh ${Math.round(stat(p,'armor'))}  BD ${Math.round(stat(p,'mr'))}  YG ${Math.round(stat(p,'ap'))}` ];
    ctx.font='11px system-ui'; ctx.textAlign='left'; ctx.textBaseline='top';
    const bw=Math.ceil(Math.max(...lines.map(l=>ctx.measureText(l).width)))+16;
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fillRect(8,8,bw,lines.length*15+10);
    lines.forEach((l,i)=>{ ctx.fillStyle=i?'#c9cfdd':'#fff'; ctx.fillText(l,16,13+i*15); }); }

  hudPanel(p,W,H);
  drawMinimap(W,H);
  if(uiState.showScore) drawScoreboard(W,H);

  // oyun sonu ekranı HTML katmanıdır (menu.js)
}

/* Oyuncunun takımının göremediği şeyler çizilmez */
/* Çalıdaki birim yarı saydam çizilir (gizli olduğu belli olsun) */
function inBushAlpha(u, draw){
  if(!BUSHES.length || u.dead || bushAt(u.x,u.y)<0){ draw(); return; }
  ctx.save(); ctx.globalAlpha=0.55; draw(); ctx.restore();
}
function seenByPlayer(x,y){ return visiblePos(S.player.team,x,y,0); }
function unitSeen(u){ return canSee(S.player.team,u); }
function fxSeen(f){
  if(f.owner) return seenByPlayer(f.owner.x,f.owner.y);
  if(f.x!==undefined) return seenByPlayer(f.x,f.y);
  if(f.x1!==undefined) return seenByPlayer(f.x1,f.y1) || seenByPlayer(f.x2,f.y2);
  return true;
}

function drawFog(){
  if(!settings.fog || !fogCanvas.width || !fogCanvas.height) return;
  const fw=fogCanvas.width, fh=fogCanvas.height, team=S.player.team, s=view.s*view.dpr;
  fctx.setTransform(1,0,0,1,0,0);
  fctx.globalCompositeOperation='source-over';
  fctx.clearRect(0,0,fw,fh);
  fctx.fillStyle=PAL.fog; fctx.fillRect(0,0,fw,fh);
  fctx.globalCompositeOperation='destination-out';
  // görüş: menzil dairesi, duvar varsa ışınlarla kesilmiş görüş çokgeni (duvar arkası görünmez)
  const RAYS=360, PEN=40;   // PEN: duvarın görünen yüzü kadar içeri
  const hole=(u,vr)=>{
    const x=(u.x-cam.x)*s, y=(view.oy+(u.y-cam.y)*view.s)*view.dpr, r=vr*s;
    if(!isFinite(x)||!isFinite(y)||!isFinite(r)||r<=0) return;
    if(x+r<0 || x-r>fw || y+r<0 || y-r>fh) return;
    const g=fctx.createRadialGradient(x,y,r*0.62,x,y,r);
    g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.5,'rgba(0,0,0,0.62)'); g.addColorStop(1,'rgba(0,0,0,0)');
    fctx.fillStyle=g; fctx.beginPath();
    if(!wallsNear(u.x,u.y,vr)) fctx.arc(x,y,r,0,Math.PI*2);
    else for(let i=0;i<RAYS;i++){
      const a=i/RAYS*Math.PI*2, dx=Math.cos(a), dy=Math.sin(a);
      const d=Math.min(vr, rayDist(u.x,u.y,dx,dy,vr)+PEN)*s;
      i ? fctx.lineTo(x+dx*d, y+dy*d) : fctx.moveTo(x+dx*d, y+dy*d);
    }
    fctx.closePath(); fctx.fill();
  };
  for(const a of S.heroes)  if(!a.dead && a.team===team) hole(a,VISION.hero);
  for(const a of S.minions) if(!a.dead && a.team===team) hole(a,VISION.minion);
  for(const a of S.structs) if(!a.dead && a.team===team) hole(a,VISION.tower);
  for(const a of S.heroes) if(!a.dead && a.team===team && a.chan && a.chan.target) hole(a.chan.target,110);   // kilitlenen hedef sisin içinde de görünür
  for(const g of S.sights) if(g.team===team) hole(g,g.r);   // Kök Sal atış yeri geçici görüş
  fctx.globalCompositeOperation='source-over';
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(fogCanvas,0,0);
}

/* Vuruş geri tepmesi: isabet efektindeki hedef kısa süre vuruş yönünde kayar (yalnız çizim) */
const recoil=new Map();
function recoilDraw(u, fn){
  const r=recoil.get(u);
  if(!r){ fn(); return; }
  const ox=Math.cos(r.a)*r.d, oy=Math.sin(r.a)*r.d;
  u.x+=ox; u.y+=oy; try{ fn(); } finally { u.x-=ox; u.y-=oy; }
}
export function render(){
  recoil.clear();
  for(const f of S.fx) if(f.type==='impact' && f.tgt && !f.tgt.dead){ const k=f.t/f.life; recoil.set(f.tgt,{ a:f.ang, d:(f.crit?7:4)*Math.sin(Math.PI*Math.min(1,(1-k)*1.6)) }); }
  // kendi isabetimizde çok hafif ekran sarsıntısı (S.shake sim'de damage() koyar, burada sönümlenir)
  let shx=0, shy=0;
  if(S.shake>0.05){ shx=(Math.random()-0.5)*2*S.shake; shy=(Math.random()-0.5)*2*S.shake; S.shake*=0.82; } else S.shake=0;
  ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle=PAL.void; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(view.dpr*view.s,0,0,view.dpr*view.s,-view.dpr*cam.x*view.s+shx*view.dpr,view.dpr*(view.oy-cam.y*view.s)+shy*view.dpr);
  drawField();
  drawShops();
  S.structs.forEach(drawStructRange);
  S.structs.forEach(drawStruct);
  S.heroes.forEach(h=>{ if(unitSeen(h)) drawRanges(h); });
  S.heroes.forEach(h=>{ if(unitSeen(h)) drawTelegraph(h); });
  S.minions.forEach(m=>{ if(unitSeen(m)) inBushAlpha(m, ()=>recoilDraw(m, ()=>drawMinion(m))); });
  drawBackMarks();
  drawProjectiles();
  S.heroes.forEach(h=>{ if(h.dead ? h.team===S.player.team : unitSeen(h)) inBushAlpha(h, ()=>recoilDraw(h, ()=>drawHero(h))); });
  trackGold();
  drawFx();
  drawGoldPops();
  drawFog();
  ctx.setTransform(view.dpr*view.s,0,0,view.dpr*view.s,-view.dpr*cam.x*view.s,view.dpr*(view.oy-cam.y*view.s));   // sis ekran koordinatına geçti, dünyaya dön
  drawAttackRange();
  drawAimTarget();
  drawHoldRange();
  drawHud();
}
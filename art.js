/* Çizim yardımcıları: kahraman tokenları ve simgeleri, parıltı sprite'ı, kristal, harita katmanı (bir kez çizilip önbelleğe alınır).
   Durumu okumaz, oyun mantığına dokunmaz. render.js ve menu.js kullanır. */
import { PAL, HERO_THEME, rgba, mix } from './palette.js';

const TAU = Math.PI * 2;

/* Tohumlu rastgele (harita her açılışta aynı görünür) */
export function rng32(a){
  return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}

/* ---------- parıltı sprite'ı (additive çizim için, renk başına bir kez) ---------- */
const _glow = new Map();
export function glowSprite(color){
  let c=_glow.get(color);
  if(!c){
    c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    const gr=g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,rgba(color,1)); gr.addColorStop(0.3,rgba(color,0.5)); gr.addColorStop(1,rgba(color,0));
    g.fillStyle=gr; g.fillRect(0,0,64,64); _glow.set(color,c);
  }
  return c;
}
export function drawGlow(g, color, x, y, r, a){
  g.globalCompositeOperation='lighter'; g.globalAlpha=a;
  g.drawImage(glowSprite(color),x-r,y-r,r*2,r*2);
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
}

/* ---------- kristal (kule, nexus, kaya süsü) ---------- */
export function drawCrystal(g, x, y, w, h, col, dark, light, edge){
  const tx=x, ty=y-h, rx=x+w, ry=y-h*0.25, bx=x, by=y+h*0.45, lx=x-w, ly=y-h*0.25;
  g.beginPath(); g.moveTo(tx,ty); g.lineTo(lx,ly); g.lineTo(bx,by); g.closePath(); g.fillStyle=dark; g.fill();
  g.beginPath(); g.moveTo(tx,ty); g.lineTo(rx,ry); g.lineTo(bx,by); g.closePath(); g.fillStyle=col; g.fill();
  g.beginPath(); g.moveTo(tx,ty); g.lineTo(rx,ry); g.lineTo(x+w*0.12,y-h*0.32); g.closePath(); g.fillStyle=rgba(light,0.55); g.fill();
  g.beginPath(); g.moveTo(tx,ty); g.lineTo(rx,ry); g.lineTo(bx,by); g.lineTo(lx,ly); g.closePath();
  g.lineWidth=Math.max(1.5,w*0.12); g.lineJoin='round'; g.strokeStyle=edge||PAL.ink; g.stroke();
}

/* ---------- kahraman simgeleri (-1..1 kutusunda, s ile ölçeklenir) ---------- */
function arrowShape(g, ox, len){
  g.beginPath(); g.moveTo(ox,0.85); g.lineTo(ox,-0.35); g.lineWidth=0.2; g.stroke();
  g.beginPath(); g.moveTo(ox,-0.95); g.lineTo(ox-0.3,-0.35); g.lineTo(ox+0.3,-0.35); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(ox,0.85); g.lineTo(ox-0.24,1.05); g.moveTo(ox,0.6); g.lineTo(ox-0.24,0.8); g.moveTo(ox,0.85); g.lineTo(ox+0.24,1.05); g.moveTo(ox,0.6); g.lineTo(ox+0.24,0.8); g.lineWidth=0.13; g.stroke();
}
const ICONS = {
  arrow(g){ g.rotate(0.7); g.translate(0,-0.08); arrowShape(g,0); },
  twin(g){ g.rotate(0.45); g.scale(0.82,0.82); arrowShape(g,-0.42); arrowShape(g,0.42); },
  shield(g,c,d){
    g.beginPath(); g.moveTo(-0.72,-0.78); g.quadraticCurveTo(0,-1.02,0.72,-0.78); g.lineTo(0.72,0.1); g.quadraticCurveTo(0.62,0.7,0,1.02); g.quadraticCurveTo(-0.62,0.7,-0.72,0.1); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0,-0.62); g.lineTo(0,0.78); g.moveTo(-0.45,-0.12); g.lineTo(0.45,-0.12); g.lineWidth=0.17; g.strokeStyle=d; g.stroke();
  },
  flame(g,c,d){
    g.beginPath(); g.moveTo(0.05,-1.02); g.bezierCurveTo(0.25,-0.5,0.85,-0.15,0.72,0.35); g.bezierCurveTo(0.6,0.85,0.25,1.0,0,1.0);
    g.bezierCurveTo(-0.3,1.0,-0.78,0.8,-0.72,0.28); g.bezierCurveTo(-0.68,-0.1,-0.35,-0.25,-0.28,-0.62); g.bezierCurveTo(-0.1,-0.45,-0.05,-0.75,0.05,-1.02); g.closePath(); g.fill();
    g.fillStyle=d; g.beginPath(); g.moveTo(0.02,0.05); g.bezierCurveTo(0.2,0.3,0.42,0.45,0.32,0.7); g.bezierCurveTo(0.24,0.9,0.1,0.92,0,0.92); g.bezierCurveTo(-0.16,0.92,-0.38,0.82,-0.32,0.58); g.bezierCurveTo(-0.28,0.4,-0.1,0.3,0.02,0.05); g.closePath(); g.fill();
  },
  bounce(g){
    g.beginPath(); g.moveTo(-0.8,0.75); g.lineTo(-0.3,-0.55); g.lineTo(0.15,0.35); g.lineTo(0.7,-0.65); g.lineWidth=0.21; g.stroke();
    g.beginPath(); g.moveTo(0.95,-0.95); g.lineTo(0.35,-0.78); g.lineTo(0.78,-0.3); g.closePath(); g.fill();
    g.beginPath(); g.arc(-0.8,0.75,0.17,0,TAU); g.fill();
  },
  hook(g){
    g.beginPath(); g.arc(0.2,-0.78,0.2,0,TAU); g.lineWidth=0.15; g.stroke();
    g.beginPath(); g.moveTo(0.2,-0.58); g.lineTo(0.2,0.3); g.arc(-0.2,0.3,0.4,0,Math.PI,false); g.lineTo(-0.6,0.0); g.lineWidth=0.21; g.stroke();
    g.beginPath(); g.moveTo(-0.6,-0.2); g.lineTo(-0.9,0.08); g.lineTo(-0.28,0.1); g.closePath(); g.fill();
  },
  fist(g,c,d){
    for(const x of [-0.45,-0.15,0.15,0.45]){ g.beginPath(); g.arc(x,-0.3,0.27,0,TAU); g.fill(); }
    g.beginPath(); g.moveTo(-0.72,-0.2); g.lineTo(-0.72,0.55); g.quadraticCurveTo(-0.72,0.98,-0.3,0.98); g.lineTo(0.3,0.98); g.quadraticCurveTo(0.72,0.98,0.72,0.55); g.lineTo(0.72,-0.2); g.closePath(); g.fill();
    g.beginPath(); for(const x of [-0.3,0,0.3]){ g.moveTo(x,-0.52); g.lineTo(x,0.1); } g.lineWidth=0.11; g.strokeStyle=d; g.stroke();
    g.beginPath(); g.moveTo(-0.6,0.42); g.quadraticCurveTo(0,0.12,0.55,0.42); g.lineWidth=0.14; g.stroke();
  },
  drop(g,c,d){
    g.beginPath(); g.moveTo(0,-1.02); g.bezierCurveTo(0.3,-0.55,0.74,-0.15,0.74,0.3); g.arc(0,0.3,0.74,0,Math.PI,false); g.bezierCurveTo(-0.74,-0.15,-0.3,-0.55,0,-1.02); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(-0.3,0.3,0.12,0.26,0.25,0,TAU); g.fillStyle=d; g.fill();
  },
  target(g,c,d){
    g.beginPath(); g.arc(0,0,0.62,0,TAU); g.lineWidth=0.16; g.stroke();
    g.beginPath(); g.arc(0,0,0.2,0,TAU); g.fill();
    g.beginPath(); g.moveTo(0,-1.0); g.lineTo(0,-0.38); g.moveTo(0,1.0); g.lineTo(0,0.38); g.moveTo(-1.0,0); g.lineTo(-0.38,0); g.moveTo(1.0,0); g.lineTo(0.38,0); g.lineWidth=0.16; g.stroke();
  },
  eye(g,c,d){
    g.beginPath(); g.moveTo(-1.0,0); g.quadraticCurveTo(0,-1.05,1.0,0); g.quadraticCurveTo(0,1.05,-1.0,0); g.closePath(); g.fill();
    g.beginPath(); g.arc(0,0,0.38,0,TAU); g.fillStyle=d; g.fill();
    g.beginPath(); g.arc(-0.1,-0.1,0.1,0,TAU); g.fillStyle=c; g.fill();
  },
  star(g){
    g.beginPath(); for(let i=0;i<8;i++){ const a=-Math.PI/2+i*Math.PI/4, rr=i%2?0.3:1.0; g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } g.closePath(); g.fill();
    g.beginPath(); g.arc(0.72,-0.72,0.14,0,TAU); g.fill();
  },
  helm(g,c,d){   // Gladyatör: tepeli miğfer, yüz yarığı
    g.beginPath(); g.moveTo(-0.62,0.95); g.lineTo(-0.62,-0.05); g.quadraticCurveTo(-0.62,-0.7,0,-0.72); g.quadraticCurveTo(0.62,-0.7,0.62,-0.05); g.lineTo(0.62,0.95); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-0.42,0.02); g.lineTo(0.42,0.02); g.lineTo(0.42,0.2); g.lineTo(0.1,0.2); g.lineTo(0.1,0.82); g.lineTo(-0.1,0.82); g.lineTo(-0.1,0.2); g.lineTo(-0.42,0.2); g.closePath(); g.fillStyle=d; g.fill();
    g.beginPath(); g.moveTo(-0.5,-0.78); g.quadraticCurveTo(0,-1.25,0.62,-0.95); g.quadraticCurveTo(0.2,-0.85,0.05,-0.66); g.quadraticCurveTo(-0.2,-0.72,-0.5,-0.78); g.closePath(); g.fillStyle=c; g.fill();
  },
  ball(g,c,d){   // Gülle: hız çizgili top
    g.beginPath(); g.arc(0.18,0.05,0.68,0,TAU); g.fill();
    g.beginPath(); g.arc(0.18,0.05,0.68,0,TAU); g.lineWidth=0.1; g.strokeStyle=d; g.stroke();
    g.beginPath(); g.arc(-0.05,-0.2,0.18,0,TAU); g.fillStyle=d; g.fill();
    g.beginPath(); g.moveTo(-1.0,-0.35); g.lineTo(-0.6,-0.35); g.moveTo(-1.05,0.05); g.lineTo(-0.55,0.05); g.moveTo(-1.0,0.45); g.lineTo(-0.6,0.45); g.lineWidth=0.13; g.strokeStyle=c; g.stroke();
  },
  yin(g,c,d){
    g.beginPath(); g.arc(0,0,0.9,0,TAU); g.lineWidth=0.14; g.stroke();
    g.beginPath(); g.arc(0,0,0.9,Math.PI/2,Math.PI*1.5); g.arc(0,-0.45,0.45,-Math.PI/2,Math.PI/2,false); g.arc(0,0.45,0.45,-Math.PI/2,Math.PI/2,true); g.closePath(); g.fill();
    g.beginPath(); g.arc(0,-0.45,0.14,0,TAU); g.fillStyle=d; g.fill();
    g.beginPath(); g.arc(0,0.45,0.14,0,TAU); g.fillStyle=c; g.fill();
  }
};
export function drawIcon(g, name, x, y, s, col, dark){
  const f=ICONS[name]; if(!f) return;
  g.save(); g.translate(x,y); g.scale(s,s); g.lineJoin='round'; g.lineCap='round'; g.fillStyle=col; g.strokeStyle=col; g.lineWidth=0.2;
  f(g,col,dark); g.restore();
}

/* ---------- kahraman tokeni ----------
   o: { team (0/1, yoksa kahraman rengi), aim (radyan, yön oku), flash (0..1 beyaz parlama) } */
export function drawToken(g, type, x, y, r, o){
  o=o||{};
  const th=HERO_THEME[type]||{ c:'#9aa', icon:null };
  const hasTeam=o.team!==undefined;
  const ring=hasTeam?PAL.team[o.team]:th.c;
  if(o.aim!==undefined){   // yön oku: halkanın dışına çıkan küçük üçgen
    const ax=Math.cos(o.aim), ay=Math.sin(o.aim), tl=hasTeam?PAL.teamLight[o.team]:'#fff';
    const k=Math.max(0.8,r/26); g.beginPath(); g.moveTo(x+ax*(r+9*k),y+ay*(r+9*k)); g.lineTo(x+ax*(r-1)-ay*6.5*k,y+ay*(r-1)+ax*6.5*k); g.lineTo(x+ax*(r-1)+ay*6.5*k,y+ay*(r-1)-ax*6.5*k); g.closePath();
    g.fillStyle=tl; g.fill(); g.lineWidth=1.8*k; g.lineJoin='round'; g.strokeStyle=PAL.ink; g.stroke();
  }
  g.beginPath(); g.arc(x,y,r,0,TAU); g.fillStyle=PAL.ink; g.fill();
  g.beginPath(); g.arc(x,y,r-1.7,0,TAU); g.fillStyle=ring; g.fill();
  const ri=r*0.73;
  // halka alt gölgesi ve üst parlaması
  g.lineCap='round';
  g.beginPath(); g.arc(x,y,r*0.87,0.35,2.8); g.lineWidth=r*0.11; g.strokeStyle='rgba(8,6,32,0.28)'; g.stroke();
  g.beginPath(); g.arc(x,y,r*0.87,-2.55,-1.15); g.lineWidth=r*0.1; g.strokeStyle='rgba(255,255,255,0.38)'; g.stroke();
  // iç disk
  const gr=g.createRadialGradient(x-ri*0.35,y-ri*0.42,ri*0.1,x,y,ri);
  gr.addColorStop(0,mix(th.c,PAL.ink,0.28)); gr.addColorStop(1,mix(th.c,PAL.ink,0.7));
  g.beginPath(); g.arc(x,y,ri,0,TAU); g.fillStyle=gr; g.fill(); g.lineWidth=1.6; g.strokeStyle=PAL.ink; g.stroke();
  if(th.icon) drawIcon(g,th.icon,x,y+ri*0.02,ri*0.6,mix(th.c,'#ffffff',0.82),mix(th.c,PAL.ink,0.55));
  if(o.flash>0){ g.beginPath(); g.arc(x,y,r,0,TAU); g.fillStyle='rgba(255,255,255,'+(o.flash*0.7).toFixed(3)+')'; g.fill(); }
}

/* ---------- harita katmanı ---------- */
function rrectP(g,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  g.beginPath(); g.moveTo(x+r,y); g.lineTo(x+w-r,y); g.arcTo(x+w,y,x+w,y+r,r); g.lineTo(x+w,y+h-r); g.arcTo(x+w,y+h,x+w-r,y+h,r);
  g.lineTo(x+r,y+h); g.arcTo(x,y+h,x,y+h-r,r); g.lineTo(x,y+r); g.arcTo(x,y,x+r,y,r); g.closePath();
}
function shapeP(g,w,round){
  if(w.c){ g.beginPath(); g.arc(w.c[0],w.c[1],w.r,0,TAU); }
  else if(w.poly){ g.beginPath(); w.poly.forEach(([x,y],i)=> i?g.lineTo(x,y):g.moveTo(x,y)); g.closePath(); }
  else if(round) rrectP(g,w.x,w.y,w.w,w.h,round);
  else { g.beginPath(); g.rect(w.x,w.y,w.w,w.h); }
}
function bboxOf(w){
  if(w.c) return { x:w.c[0]-w.r, y:w.c[1]-w.r, w:w.r*2, h:w.r*2 };
  if(w.poly){ const xs=w.poly.map(p=>p[0]), ys=w.poly.map(p=>p[1]), x=Math.min(...xs), y=Math.min(...ys); return { x, y, w:Math.max(...xs)-x, h:Math.max(...ys)-y }; }
  return { x:w.x, y:w.y, w:w.w, h:w.h };
}
function polyPath(g,lane){ g.beginPath(); lane.pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); }

/* Yol boyunca örnekler: her adımda konum ve normal */
function laneSamples(lane, step){
  const out=[]; let acc=0; const p=lane.pts;
  for(let i=0;i<p.length-1;i++){
    const dx=p[i+1][0]-p[i][0], dy=p[i+1][1]-p[i][1], L=Math.hypot(dx,dy); if(!L) continue;
    const ux=dx/L, uy=dy/L; let d=acc;
    while(d<L){ out.push({ x:p[i][0]+ux*d, y:p[i][1]+uy*d, nx:-uy, ny:ux, ux, uy }); d+=step; }
    acc=d-L;
  }
  return out;
}

/* Çalı ışıkböcekleri (render.js dinamik çizer) */
export const bushLights=[];
/* Higgsfield (GPT Image 2.5) dokuları: assets/tex. Yüklenince paintMap düşük alfayla desen olarak bindirir; yüklenmezse eski çizim aynen kalır. */
const TEX={};
export const texReady=(typeof Image==='undefined')?Promise.resolve():Promise.all(['ground','lane','rock','bush'].map(n=>new Promise(res=>{
  const im=new Image(); im.onload=()=>{ TEX[n]=im; res(); }; im.onerror=()=>res(); im.src='assets/tex/'+n+'.jpg';
})));
function texFill(g,name,alpha,op,x,y,w,h){   // kırpılmış bölgeye desen bindir
  const im=TEX[name]; if(!im) return;
  g.save(); g.globalAlpha=alpha; g.globalCompositeOperation=op; g.fillStyle=g.createPattern(im,'repeat'); g.fillRect(x,y,w,h); g.restore();
}

/* M: { W, H, LANES, WALLS, BUSHES, BASES:[{x,y},{x,y}], fountainR } */
export function paintMap(g, M){
  const W=M.W, H=M.H, R=rng32(20261010);
  bushLights.length=0;
  // 1) zemin ve yumuşak lekeler
  g.fillStyle=PAL.ground; g.fillRect(0,0,W,H);
  const blot=[PAL.groundA,PAL.groundB,PAL.groundC,PAL.groundD,PAL.groundA];
  for(let i=0;i<300;i++){
    const x=R()*W, y=R()*H, r=140+R()*380, col=blot[i%blot.length];
    const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,rgba(col,0.6)); gr.addColorStop(1,rgba(col,0));
    g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);
  }
  texFill(g,'ground',0.55,'overlay',0,0,W,H);
  // 2) ot kümeleri (kısa çizgiler), toz taneleri, çiçek noktaları
  const tufts=(col,n,len)=>{
    g.beginPath();
    for(let i=0;i<n;i++){ const x=R()*W, y=R()*H, h=len*(0.6+R()*0.8), lean=(R()-0.5)*6;
      g.moveTo(x,y); g.lineTo(x+lean,y-h); g.moveTo(x+3,y+1); g.lineTo(x+3+lean*0.7,y-h*0.75); g.moveTo(x-3,y+1); g.lineTo(x-3+lean*0.5,y-h*0.6); }
    g.strokeStyle=col; g.lineWidth=1.6; g.lineCap='round'; g.stroke();
  };
  tufts(rgba(PAL.tuft,0.40),6500,9); tufts(rgba(PAL.tuftDark,0.45),5000,8); tufts(rgba(PAL.groundB,0.8),2500,11);
  g.beginPath(); for(let i=0;i<14000;i++){ g.rect(R()*W,R()*H,2,2); } g.fillStyle=rgba(PAL.grain,0.16); g.fill();
  const dots=(col,n,rad)=>{ g.beginPath(); for(let i=0;i<n;i++){ const x=R()*W, y=R()*H; g.moveTo(x+rad,y); g.arc(x,y,rad,0,TAU); } g.fillStyle=col; g.fill(); };
  dots(rgba(PAL.team[1],0.55),160,3); dots(rgba(PAL.gold,0.6),200,2.6); dots(rgba(PAL.team[0],0.55),160,3);
  // 3) üs alanları: takım rengi ışıma ve taş meydan
  for(const team of [0,1]){
    const b=M.BASES[team], col=PAL.team[team];
    const gr=g.createRadialGradient(b.x,b.y,60,b.x,b.y,760); gr.addColorStop(0,rgba(col,0.34)); gr.addColorStop(0.5,rgba(col,0.12)); gr.addColorStop(1,rgba(col,0));
    g.fillStyle=gr; g.fillRect(b.x-760,b.y-760,1520,1520);
    g.beginPath(); g.arc(b.x,b.y,M.fountainR,0,TAU); g.fillStyle=rgba(PAL.rockSide,0.55); g.fill();
    g.lineWidth=6; g.strokeStyle=rgba(PAL.laneRim,0.9); g.stroke();
    g.beginPath(); g.arc(b.x,b.y,M.fountainR*0.62,0,TAU); g.lineWidth=3; g.strokeStyle=rgba(col,0.35); g.stroke();
    g.beginPath(); for(let i=0;i<32;i++){ const a=i/32*TAU; g.moveTo(b.x+Math.cos(a)*(M.fountainR-26),b.y+Math.sin(a)*(M.fountainR-26)); g.lineTo(b.x+Math.cos(a)*(M.fountainR-10),b.y+Math.sin(a)*(M.fountainR-10)); }
    g.lineWidth=5; g.strokeStyle=rgba(col,0.55); g.stroke();
  }
  // 4) koridorlar: yumuşak omuz, taş kenar, kumlu gövde, taşlar ve altın rünler
  g.lineJoin='round'; g.lineCap='round';
  for(const lane of M.LANES){
    const on=lane.active; g.globalAlpha=on?1:0.55;
    const layers=[[lane.width+70,rgba(PAL.ink,0.28)],[lane.width+26,PAL.laneEdge],[lane.width+10,PAL.laneRim],[lane.width,PAL.laneBody],[lane.width*0.6,PAL.laneCore],[lane.width*0.3,rgba(PAL.laneCore,0.7)]];
    for(const [w,c] of layers){ polyPath(g,lane); g.strokeStyle=c; g.lineWidth=w; g.stroke(); }
    if(TEX.lane){ g.save(); g.globalAlpha=0.35*(on?1:0.55); g.globalCompositeOperation='overlay'; polyPath(g,lane); g.strokeStyle=g.createPattern(TEX.lane,'repeat'); g.lineWidth=lane.width+10; g.stroke(); g.restore(); }
    const sm=laneSamples(lane,38);
    // toz ve gölge lekeleri: yolu düz renkten çıkarır
    for(let i=0;i<sm.length*2;i++){
      const q=sm[(R()*sm.length)|0], off=(R()-0.5)*lane.width*0.9, x=q.x+q.nx*off, y=q.y+q.ny*off, rot=Math.atan2(q.uy,q.ux);
      g.beginPath(); g.ellipse(x,y,26+R()*70,10+R()*24,rot+(R()-0.5)*0.4,0,TAU);
      g.fillStyle=R()<0.5?rgba(PAL.pebble,0.07):rgba(PAL.laneEdge,0.10); g.fill();
    }
    // yol taşları (kenar) ve çakıl
    for(const s of sm){
      for(const side of [-1,1]){
        if(R()<0.35) continue;
        const off=(lane.width/2+6+R()*9)*side, x=s.x+s.nx*off, y=s.y+s.ny*off, rx=6+R()*9, ry=4+R()*6, rot=Math.atan2(s.uy,s.ux)+(R()-0.5)*0.6;
        g.beginPath(); g.ellipse(x,y+2,rx,ry,rot,0,TAU); g.fillStyle=rgba(PAL.ink,0.45); g.fill();
        g.beginPath(); g.ellipse(x,y,rx,ry,rot,0,TAU); g.fillStyle=mix(PAL.laneRim,PAL.rockTop,R()*0.6); g.fill();
        g.beginPath(); g.ellipse(x-1,y-1.5,rx*0.6,ry*0.45,rot,0,TAU); g.fillStyle='rgba(255,255,255,0.12)'; g.fill();
      }
    }
    g.beginPath();
    for(let i=0;i<sm.length*3;i++){ const s=sm[(R()*sm.length)|0], off=(R()-0.5)*lane.width*0.95, x=s.x+s.nx*off, y=s.y+s.ny*off, rr=1.5+R()*3; g.moveTo(x+rr,y); g.ellipse(x,y,rr,rr*0.7,0,0,TAU); }
    g.fillStyle=rgba(PAL.pebble,0.38); g.fill();
    g.beginPath();
    for(let i=0;i<sm.length*2;i++){ const s=sm[(R()*sm.length)|0], off=(R()-0.5)*lane.width*0.9, x=s.x+s.nx*off, y=s.y+s.ny*off; g.moveTo(x,y); g.lineTo(x+(R()-0.5)*10,y+(R()-0.5)*4); }
    g.strokeStyle=rgba(PAL.laneEdge,0.35); g.lineWidth=1.4; g.stroke();
    if(on){   // orta hat: soluk altın rün elmasları
      for(let i=0;i<sm.length;i+=7){ const s=sm[i]; g.beginPath(); g.moveTo(s.x,s.y-9); g.lineTo(s.x+6,s.y); g.lineTo(s.x,s.y+9); g.lineTo(s.x-6,s.y); g.closePath(); g.fillStyle=rgba(PAL.rune,0.2); g.fill(); g.lineWidth=1.5; g.strokeStyle=rgba(PAL.rune,0.35); g.stroke(); }
    }
    g.globalAlpha=1;
  }
  g.lineCap='butt';
  for(const lane of M.LANES) if(!lane.active){
    const m=lane.pts[Math.floor(lane.pts.length/2)];
    g.save(); g.font='bold 60px system-ui'; g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=8; g.strokeStyle='rgba(8,6,32,0.55)'; g.fillStyle='rgba(200,190,255,0.35)';
    const t=lane.name+' (şimdilik boş)'; g.strokeText(t,m[0],m[1]); g.fillText(t,m[0],m[1]); g.restore();
  }
  // 5) duvarlar: yükseltili obsidyen kaya (gölge, yan yüz, üst yüz, çatlak, kristal)
  for(const w of M.WALLS){
    const bb=bboxOf(w), area=bb.w*bb.h;
    g.save(); g.translate(9,26); shapeP(g,w,38); g.fillStyle='rgba(4,2,16,0.22)'; g.fill(); g.restore();
    g.save(); g.translate(5,17); shapeP(g,w,38); g.fillStyle='rgba(4,2,16,0.26)'; g.fill(); g.restore();
    g.save(); g.translate(0,15); shapeP(g,w,38); g.fillStyle=PAL.rockSide; g.fill(); g.lineWidth=8; g.lineJoin='round'; g.strokeStyle=PAL.rockEdge; g.stroke(); g.restore();
    shapeP(g,w,38); g.fillStyle=PAL.rock; g.fill();
    g.save(); g.clip();
    // yüz tonlaması: üstten ışık
    const lg=g.createLinearGradient(0,bb.y,0,bb.y+bb.h); lg.addColorStop(0,rgba(PAL.rockLight,0.28)); lg.addColorStop(0.5,rgba(PAL.rockTop,0.1)); lg.addColorStop(1,rgba(PAL.rockEdge,0.28));
    g.fillStyle=lg; g.fillRect(bb.x,bb.y,bb.w,bb.h);
    texFill(g,'rock',0.5,'overlay',bb.x,bb.y,bb.w,bb.h);
    const nb=Math.max(6,Math.min(120,Math.round(area/9000)));
    for(let i=0;i<nb;i++){   // düzensiz yüzey parçaları
      const cx=bb.x+R()*bb.w, cy=bb.y+R()*bb.h, rr=30+R()*90, k=5+((R()*3)|0), a0=R()*TAU;
      g.beginPath(); for(let j=0;j<k;j++){ const aa=a0+j/k*TAU, rd=rr*(0.55+R()*0.6); g.lineTo(cx+Math.cos(aa)*rd,cy+Math.sin(aa)*rd); } g.closePath();
      g.fillStyle=R()<0.5?rgba(PAL.rockLight,0.10+R()*0.1):rgba(PAL.rockEdge,0.14+R()*0.12); g.fill();
    }
    g.beginPath();   // çatlaklar
    for(let i=0;i<Math.max(3,nb/3);i++){ let x=bb.x+R()*bb.w, y=bb.y+R()*bb.h; g.moveTo(x,y); for(let j=0;j<4;j++){ x+=(R()-0.5)*70; y+=(R()-0.2)*50; g.lineTo(x,y); } }
    g.strokeStyle=rgba(PAL.rockEdge,0.55); g.lineWidth=2.4; g.stroke();
    // üst-sol kenar parlaması (içeri kırpılı)
    g.save(); g.translate(-3,-3); shapeP(g,w,38); g.lineWidth=9; g.strokeStyle=rgba(PAL.rockLight,0.5); g.stroke(); g.restore();
    // kristaller
    const nc=Math.max(1,Math.min(7,Math.round(area/70000)));
    for(let i=0;i<nc;i++){
      const cx=bb.x+bb.w*(0.12+R()*0.76), cy=bb.y+bb.h*(0.15+R()*0.7);
      shapeP(g,w,38); if(!g.isPointInPath(cx,cy)) continue;
      drawGlow(g,PAL.crystal,cx,cy-6,34,0.4);
      for(const [dx,dy,sw,sh] of [[-11,4,7,18],[0,0,9,26],[11,5,6,15]]) drawCrystal(g,cx+dx,cy+dy,sw,sh,PAL.crystal,mix(PAL.crystal,PAL.arcaneDark,0.6),'#e8fffa',PAL.rockEdge);
    }
    g.restore();
    shapeP(g,w,38); g.lineWidth=7; g.lineJoin='round'; g.strokeStyle=PAL.rockEdge; g.stroke();
  }
  // 6) çalılar: koyu taban, üst üste yapraklar, uç ışıkları
  for(const b of M.BUSHES){
    const bb=bboxOf(b), area=bb.w*bb.h;
    shapeP(g,b,30); g.fillStyle=rgba(PAL.bushEdge,0.5); g.save(); g.translate(0,8); g.fill(); g.restore();
    shapeP(g,b,30); g.fillStyle=PAL.bush; g.fill();
    g.save(); shapeP(g,b,30); g.clip();
    texFill(g,'bush',0.45,'source-over',bb.x,bb.y,bb.w,bb.h);
    const n=Math.round(area/700);
    const lc=[PAL.bushA,PAL.bushB,PAL.bushC];
    for(let i=0;i<n;i++){
      const x=bb.x+R()*bb.w, y=bb.y+R()*bb.h, a=R()*TAU, L=14+R()*20, wd=5+R()*6, col=lc[(R()*3)|0];
      g.save(); g.translate(x,y); g.rotate(a);
      g.beginPath(); g.moveTo(0,0); g.quadraticCurveTo(L*0.5,-wd,L,0); g.quadraticCurveTo(L*0.5,wd,0,0); g.fillStyle=col; g.globalAlpha=0.55+R()*0.4; g.fill();
      g.restore();
    }
    g.globalAlpha=1;
    g.beginPath(); for(let i=0;i<n/3;i++){ const x=bb.x+R()*bb.w, y=bb.y+R()*bb.h; g.moveTo(x+2,y); g.arc(x,y,2,0,TAU); } g.fillStyle=rgba(PAL.bushTip,0.45); g.fill();
    g.restore();
    shapeP(g,b,30); g.lineWidth=7; g.lineJoin='round'; g.strokeStyle=PAL.bushEdge; g.stroke();
    shapeP(g,b,30); g.lineWidth=2.5; g.strokeStyle=rgba(PAL.bushC,0.45); g.stroke();
    // ışıkböcekleri (şekil içinde rastgele noktalar)
    let k=0, tries=0; const nl=Math.max(4,Math.min(12,Math.round(area/18000)));
    while(k<nl && tries++<60){ const x=bb.x+R()*bb.w, y=bb.y+R()*bb.h; shapeP(g,b,30); if(g.isPointInPath(x,y)){ bushLights.push({ x, y, ph:R()*TAU, sp:0.8+R()*1.2 }); k++; } }
  }
  // 7) harita sınırı
  g.strokeStyle='rgba(4,2,16,0.9)'; g.lineWidth=12; g.strokeRect(0,0,W,H);
}

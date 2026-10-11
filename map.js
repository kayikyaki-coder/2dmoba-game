/* Harita: oval, altta tek koridor + üstte orman (11.10.2026). Sadece veri ve geometri yardımcıları (tarayıcıya bağımlı değil).
   Koridor (alt): kuleler ve minyonlar. Orman (üst yarı): kayalarla ayrılmış yollar ve kamplar (kamp verisi data.js JUNGLE).
   LANES tek elemanlı; ACTIVE_LANE ona eşit (eski iki koridor kodu kırılmasın diye dizi olarak duruyor). */

import { MAP_DATA } from './map_data.js';

export const MAP_W = MAP_DATA.w, MAP_H = MAP_DATA.h, MID_Y = MAP_H/2;

/* Koridor yolları: takım 0 üssünden takım 1 üssüne nokta listesi. width = yürünebilir genişlik (görsel ve minyon yolu). */
export const LANES = MAP_DATA.lanes;
export const ACTIVE_LANE = LANES.find(l=>l.active) || LANES[0];

/* Duvarlar (geçilmez, görüşü keser): daire {c:[x,y], r}, dikdörtgen {x,y,w,h} ya da çokgen {poly:[[x,y],...]}. Mermiler üstünden geçer. */
export const WALLS = MAP_DATA.walls;
export const BUSHES = MAP_DATA.bushes || [];

/* Yapılar (takım 0; takım 1 x'te aynalanır). Sıra: dış kule, iç kule, üs kulesi, nexus. */
export const STRUCT_POS = MAP_DATA.structs;
export const structPos = (team, i) => { const [sub,x,y]=STRUCT_POS[i]; return { sub, x: team===0 ? x : MAP_W-x, y }; };
export const BASES = [ structPos(0,3), structPos(1,3) ];
export const SPAWN_OFF = 170;   // doğuş noktası: nexus'tan haritanın ortasına doğru

/* ---- geometri ---- */
/* Dairenin (x,y,r) duvarlara çarpışmasını çöz: itilmiş konumu döndürür (çarpmıyorsa aynısı) */
/* Duvar sınır kutuları (hızlı eleme için) */
const BOX = WALLS.map(w=>{
  if(w.c) return [w.c[0]-w.r, w.c[1]-w.r, w.c[0]+w.r, w.c[1]+w.r];
  if(w.poly){ const xs=w.poly.map(p=>p[0]), ys=w.poly.map(p=>p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  return [w.x, w.y, w.x+w.w, w.y+w.h];
});
/* Duvardan uzak mı? Kaba ızgara: hücre, duvar kutusunun WALL_CLEAR_R kadar şişmişine değmiyorsa
   yarıçapı en çok WALL_CLEAR_R olan bir daire hiçbir duvar kutusuna değemez (pushOutWalls'ın kutu elemesiyle aynı sonuç). */
export const WALL_CLEAR_R = 100;
const GC = 50, GW = Math.ceil(MAP_W/GC)+1, GH = Math.ceil(MAP_H/GC)+1;
const NEARW = new Uint8Array(GW*GH);
for(let gy=0; gy<GH; gy++) for(let gx=0; gx<GW; gx++){
  const x0=gx*GC, x1=x0+GC, y0=gy*GC, y1=y0+GC;
  for(let wi=0; wi<BOX.length; wi++){
    const b=BOX[wi];
    if(x1>=b[0]-WALL_CLEAR_R-1 && x0<=b[2]+WALL_CLEAR_R+1 && y1>=b[1]-WALL_CLEAR_R-1 && y0<=b[3]+WALL_CLEAR_R+1){ NEARW[gy*GW+gx]=1; break; }
  }
}
export function wallsFar(x, y, r){
  if(r>WALL_CLEAR_R || !(x>=0 && y>=0 && x<MAP_W && y<MAP_H)) return false;
  return NEARW[((y/GC)|0)*GW + ((x/GC)|0)]===0;
}
/* Sonuç PUSH.x/PUSH.y içine yazılır (nesne tahsisi yok; sıcak yol için). */
export const PUSH = { x:0, y:0 };
export function pushOutWallsInto(x, y, r){
  for(let wi=0; wi<WALLS.length; wi++){
    const w=WALLS[wi], bx=BOX[wi];
    if(x+r<bx[0] || x-r>bx[2] || y+r<bx[1] || y-r>bx[3]) continue;
    if(w.c){
      const dx=x-w.c[0], dy=y-w.c[1], d=Math.hypot(dx,dy)||0.001, min=w.r+r;
      if(d<min){ x=w.c[0]+dx/d*min; y=w.c[1]+dy/d*min; }
    } else if(w.poly){
      const q=polyClosest(w.poly, x, y), inside=pointInPoly(w.poly, x, y);
      if(inside || q.d<r){
        let nx=x-q.x, ny=y-q.y, l=Math.hypot(nx,ny);
        if(l<0.001){ nx=q.nx; ny=q.ny; l=1; }
        if(inside){ nx=-nx; ny=-ny; }
        x=q.x+nx/l*r; y=q.y+ny/l*r;
      }
    } else {
      const cx=Math.max(w.x, Math.min(x, w.x+w.w)), cy=Math.max(w.y, Math.min(y, w.y+w.h));
      let dx=x-cx, dy=y-cy, d=Math.hypot(dx,dy);
      if(d<r){
        if(d<0.001){   // merkez dikdörtgenin içinde: en yakın kenara it
          const l=x-w.x, rr=w.x+w.w-x, t=y-w.y, b=w.y+w.h-y, m=Math.min(l,rr,t,b);
          if(m===l) x=w.x-r; else if(m===rr) x=w.x+w.w+r; else if(m===t) y=w.y-r; else y=w.y+w.h+r;
        } else { x=cx+dx/d*r; y=cy+dy/d*r; }
      }
    }
  }
  x=Math.max(r, Math.min(MAP_W-r, x)); y=Math.max(r, Math.min(MAP_H-r, y));
  PUSH.x=x; PUSH.y=y;
}
export function pushOutWalls(x, y, r){
  pushOutWallsInto(x, y, r);
  return { x:PUSH.x, y:PUSH.y };
}
/* Nokta bir duvarın içinde mi (r kadar şişirilmiş)? */
export function inWall(x, y, r=0){
  if(x<r || y<r || x>MAP_W-r || y>MAP_H-r) return true;
  for(const w of WALLS){
    if(w.c){ if(Math.hypot(x-w.c[0],y-w.c[1])<w.r+r) return true; }
    else if(w.poly){ if(pointInPoly(w.poly,x,y) || polyClosest(w.poly,x,y).d<r) return true; }
    else { const cx=Math.max(w.x,Math.min(x,w.x+w.w)), cy=Math.max(w.y,Math.min(y,w.y+w.h)); if(Math.hypot(x-cx,y-cy)<Math.max(r,1e-9)) return true; }
  }
  return false;
}

/* Çokgen yardımcıları */
export function pointInPoly(P, x, y){
  let inside=false;
  for(let i=0, j=P.length-1; i<P.length; j=i++){
    const [xi,yi]=P[i], [xj,yj]=P[j];
    if((yi>y)!==(yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
/* Çokgen kenarındaki en yakın nokta, uzaklık ve kenar normali */
function polyClosest(P, x, y){
  let best={ d:1e18, x:0, y:0, nx:0, ny:1 };
  for(let i=0; i<P.length; i++){
    const [x1,y1]=P[i], [x2,y2]=P[(i+1)%P.length], vx=x2-x1, vy=y2-y1, l2=vx*vx+vy*vy||1;
    const t=Math.max(0, Math.min(1, ((x-x1)*vx+(y-y1)*vy)/l2)), px=x1+vx*t, py=y1+vy*t, d=Math.hypot(x-px,y-py);
    if(d<best.d){ const l=Math.sqrt(l2); best={ d, x:px, y:py, nx:-vy/l, ny:vx/l }; }
  }
  return best;
}
function segSegHit(ax,ay,bx,by, cx,cy,dx,dy){
  const d1x=bx-ax, d1y=by-ay, d2x=dx-cx, d2y=dy-cy, den=d1x*d2y-d1y*d2x;
  if(Math.abs(den)<1e-12) return false;
  const t=((cx-ax)*d2y-(cy-ay)*d2x)/den, u=((cx-ax)*d1y-(cy-ay)*d1x)/den;
  return t>=0 && t<=1 && u>=0 && u<=1;
}
/* Görüş hattı: (x1,y1)-(x2,y2) doğru parçası bir duvardan geçiyor mu (kalınlıksız) */
export function sightBlocked(x1, y1, x2, y2){
  const minX=Math.min(x1,x2), maxX=Math.max(x1,x2), minY=Math.min(y1,y2), maxY=Math.max(y1,y2);
  const dx=x2-x1, dy=y2-y1, l2=dx*dx+dy*dy;
  for(const w of WALLS){
    if(w.c){
      const [cx,cy]=w.c; if(cx+w.r<minX || cx-w.r>maxX || cy+w.r<minY || cy-w.r>maxY) continue;
      const t=l2>0 ? Math.max(0, Math.min(1, ((cx-x1)*dx+(cy-y1)*dy)/l2)) : 0;
      if(Math.hypot(x1+dx*t-cx, y1+dy*t-cy) < w.r) return true;
    } else if(w.poly){
      const P=w.poly;
      for(let i=0; i<P.length; i++){ const p=P[i], q=P[(i+1)%P.length]; if(segSegHit(x1,y1,x2,y2,p[0],p[1],q[0],q[1])) return true; }
      if(pointInPoly(P,x1,y1) || pointInPoly(P,x2,y2)) return true;
    } else {
      if(w.x>maxX || w.x+w.w<minX || w.y>maxY || w.y+w.h<minY) continue;
      let t0=0, t1=1, hit=true;
      const Pp=[-dx,dx,-dy,dy], Q=[x1-w.x, w.x+w.w-x1, y1-w.y, w.y+w.h-y1];
      for(let k=0;k<4;k++){
        if(Math.abs(Pp[k])<1e-12){ if(Q[k]<0){ hit=false; break; } continue; }
        const r=Q[k]/Pp[k];
        if(Pp[k]<0){ if(r>t1){ hit=false; break; } if(r>t0) t0=r; }
        else { if(r<t0){ hit=false; break; } if(r<t1) t1=r; }
      }
      if(hit) return true;
    }
  }
  return false;
}

/* Işın: (x,y)'den birim (dx,dy) yönünde ilk duvara uzaklık (en fazla maxD) */
export function rayDist(x, y, dx, dy, maxD){
  let best=maxD;
  for(const w of WALLS){
    if(w.c){
      const ox=x-w.c[0], oy=y-w.c[1], b=ox*dx+oy*dy, c=ox*ox+oy*oy-w.r*w.r;
      if(c<0){ best=0; continue; }
      const disc=b*b-c; if(disc<0) continue;
      const t=-b-Math.sqrt(disc); if(t>=0 && t<best) best=t;
    } else if(w.poly){
      const P=w.poly;
      for(let i=0;i<P.length;i++){
        const [ax,ay]=P[i], [bx,by]=P[(i+1)%P.length], ex=bx-ax, ey=by-ay, den=dx*ey-dy*ex;
        if(Math.abs(den)<1e-12) continue;
        const t=((ax-x)*ey-(ay-y)*ex)/den, u=((ax-x)*dy-(ay-y)*dx)/den;
        if(t>=0 && u>=0 && u<=1 && t<best) best=t;
      }
    } else {
      let t0=0, t1=best, ok=true;
      const Pp=[-dx,dx,-dy,dy], Q=[x-w.x, w.x+w.w-x, y-w.y, w.y+w.h-y];
      for(let k=0;k<4;k++){
        if(Math.abs(Pp[k])<1e-12){ if(Q[k]<0){ ok=false; break; } continue; }
        const r=Q[k]/Pp[k];
        if(Pp[k]<0){ if(r>t1){ ok=false; break; } if(r>t0) t0=r; } else { if(r<t0){ ok=false; break; } if(r<t1) t1=r; }
      }
      if(ok && t0<best) best=t0;
    }
  }
  return best;
}
/* Nokta hangi çalının içinde (yoksa -1) */
const BBOX = BUSHES.map(b=>{   // çalı sınır kutuları: dışındaki nokta içeride olamaz
  if(b.c) return [b.c[0]-b.r, b.c[1]-b.r, b.c[0]+b.r, b.c[1]+b.r];
  if(b.poly){ const xs=b.poly.map(p=>p[0]), ys=b.poly.map(p=>p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  return [b.x, b.y, b.x+b.w, b.y+b.h];
});
export function bushAt(x, y){
  for(let i=0;i<BUSHES.length;i++){
    const bb=BBOX[i];
    if(x<bb[0]-1 || x>bb[2]+1 || y<bb[1]-1 || y>bb[3]+1) continue;
    const b=BUSHES[i];
    if(b.c){ if(Math.hypot(x-b.c[0],y-b.c[1])<=b.r) return i; }
    else if(b.poly){ if(pointInPoly(b.poly,x,y)) return i; }
    else if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return i;
  }
  return -1;
}
/* Kaynağın görüş menzili içinde bir duvar var mı (yoksa görüş tam daire) */
export function wallsNear(x, y, R){
  for(const w of WALLS){
    if(w.c){ if(Math.hypot(x-w.c[0],y-w.c[1])<R+w.r) return true; }
    else if(w.poly){ if(pointInPoly(w.poly,x,y) || polyClosest(w.poly,x,y).d<R) return true; }
    else { const cx=Math.max(w.x,Math.min(x,w.x+w.w)), cy=Math.max(w.y,Math.min(y,w.y+w.h)); if(Math.hypot(x-cx,y-cy)<R) return true; }
  }
  return false;
}

/* Koridor yolu üzerinde ilerleme (takım 0 üssünden uzaklık) */
function segs(lane){
  if(lane._segs) return lane._segs;
  const out=[]; let acc=0;
  for(let i=0;i<lane.pts.length-1;i++){
    const [x1,y1]=lane.pts[i], [x2,y2]=lane.pts[i+1], len=Math.hypot(x2-x1,y2-y1);
    out.push({ x1,y1,x2,y2,len,s0:acc }); acc+=len;
  }
  lane._segs=out; lane._len=acc; return out;
}
export function laneLength(lane=ACTIVE_LANE){ segs(lane); return lane._len; }
/* İlerleme s'deki nokta ve yön (birim teğet) */
export function lanePoint(s, lane=ACTIVE_LANE){
  const S=segs(lane); s=Math.max(0, Math.min(lane._len, s));
  for(const g of S) if(s<=g.s0+g.len){ const t=(s-g.s0)/g.len; return { x:g.x1+(g.x2-g.x1)*t, y:g.y1+(g.y2-g.y1)*t, tx:(g.x2-g.x1)/g.len, ty:(g.y2-g.y1)/g.len }; }
  const g=S[S.length-1]; return { x:g.x2, y:g.y2, tx:(g.x2-g.x1)/g.len, ty:(g.y2-g.y1)/g.len };
}
/* (x,y)'nin yola en yakın izdüşümü: ilerleme s ve yola uzaklık */
export function laneProject(x, y, lane=ACTIVE_LANE){
  let bs=0, bd2=1e18, bex=0, bey=0, found=false;   // en yakın kenar kareli uzaklıkla seçilir, kök bir kez alınır
  const G=segs(lane);
  for(let i=0;i<G.length;i++){
    const g=G[i];
    const vx=g.x2-g.x1, vy=g.y2-g.y1, t=Math.max(0, Math.min(1, ((x-g.x1)*vx+(y-g.y1)*vy)/(g.len*g.len)));
    const px=g.x1+vx*t, py=g.y1+vy*t, ex=x-px, ey=y-py, d2=ex*ex+ey*ey;
    if(d2<bd2){ bd2=d2; bs=g.s0+t*g.len; bex=ex; bey=ey; found=true; }
  }
  return { s:bs, d: found ? Math.hypot(bex,bey) : 1e9 };
}
/* Takım için "ileri" ilerleme yönü: takım 0 s artar, takım 1 s azalır */
export const laneDir = team => team===0 ? 1 : -1;

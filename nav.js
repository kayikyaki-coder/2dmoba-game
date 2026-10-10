/* Yol bulma: botların duvar dolaşması. Saf fonksiyonlar (DOM yok), deterministik.
   Yöntem: 40 birimlik ızgara (r=30 şişirilmiş engel), hedef hücre başına Dijkstra akış alanı (8 yön, köşe kesme yok),
   akış alanları küçük LRU'da. navDir: yolda görüş hattı (LOS) ile en uzak görünen noktaya doğru yön. */
import { MAP_W, MAP_H, WALLS, inWall, pushOutWalls, pointInPoly } from './map.js';

const CELL = 40, GW = Math.ceil(MAP_W/CELL), GH = Math.ceil(MAP_H/CELL), N = GW*GH;
const GRID_R = 30, LRU_MAX = 128, LOOK = 32, SQ2 = Math.SQRT2;

/* Engel ızgarası (bir kez): hücre merkezi r=30 şişirilmiş duvarın içindeyse engel */
const blocked = new Uint8Array(N);
for(let cy=0; cy<GH; cy++) for(let cx=0; cx<GW; cx++) blocked[cy*GW+cx] = inWall(cx*CELL+CELL/2, cy*CELL+CELL/2, GRID_R) ? 1 : 0;
const cellX = i => (i%GW)*CELL + CELL/2, cellY = i => ((i/GW)|0)*CELL + CELL/2;
const cellOf = (x, y) => Math.max(0, Math.min(GH-1, (y/CELL)|0))*GW + Math.max(0, Math.min(GW-1, (x/CELL)|0));

/* ---- görüş hattı: r kalınlıklı doğru parçası, çözümsel (örneklemesiz) ---- */
const WC = WALLS.filter(w=>w.c), WR = WALLS.filter(w=>!w.c && !w.poly), WP = WALLS.filter(w=>w.poly);
function segDist2(px, py, x1, y1, dx, dy, l2){   // noktanın doğru parçasına uzaklığının karesi
  let t = l2>0 ? ((px-x1)*dx+(py-y1)*dy)/l2 : 0; t = t<0?0:t>1?1:t;
  const qx=x1+dx*t-px, qy=y1+dy*t-py; return qx*qx+qy*qy;
}
export function hasLOS(x1, y1, x2, y2, r=30){
  if(x1<r||y1<r||x1>MAP_W-r||y1>MAP_H-r||x2<r||y2<r||x2>MAP_W-r||y2>MAP_H-r) return false;
  const dx=x2-x1, dy=y2-y1, l2=dx*dx+dy*dy, r2=r*r;
  const minX=Math.min(x1,x2)-r, maxX=Math.max(x1,x2)+r, minY=Math.min(y1,y2)-r, maxY=Math.max(y1,y2)+r;
  for(const w of WC){
    const rr=w.r+r;
    if(w.c[0]<minX-w.r || w.c[0]>maxX+w.r || w.c[1]<minY-w.r || w.c[1]>maxY+w.r) continue;
    if(segDist2(w.c[0], w.c[1], x1, y1, dx, dy, l2) < rr*rr) return false;
  }
  for(const w of WP){   // çokgen: doğru parçası kenarlardan birine r'den yakın mı, ya da uç nokta içeride mi
    const Q=w.poly;
    if(pointInPoly(Q,x1,y1) || pointInPoly(Q,x2,y2)) return false;
    for(let i=0;i<Q.length;i++){
      const [ax,ay]=Q[i], [bx,by]=Q[(i+1)%Q.length], ex=bx-ax, ey=by-ay, e2=ex*ex+ey*ey;
      const den=dx*ey-dy*ex;
      if(Math.abs(den)>1e-12){ const t=((ax-x1)*ey-(ay-y1)*ex)/den, u=((ax-x1)*dy-(ay-y1)*dx)/den; if(t>=0&&t<=1&&u>=0&&u<=1) return false; }
      if(segDist2(ax,ay,x1,y1,dx,dy,l2)<r2 || segDist2(bx,by,x1,y1,dx,dy,l2)<r2 || segDist2(x1,y1,ax,ay,ex,ey,e2)<r2 || segDist2(x2,y2,ax,ay,ex,ey,e2)<r2) return false;
    }
  }
  for(const w of WR){
    const rx=w.x, ry=w.y, rx2=w.x+w.w, ry2=w.y+w.h;
    if(rx>maxX || rx2<minX || ry>maxY || ry2<minY) continue;
    // uç nokta dikdörtgene r'den yakın mı
    for(let e=0; e<2; e++){
      const px=e?x2:x1, py=e?y2:y1, cx=px<rx?rx:px>rx2?rx2:px, cy=py<ry?ry:py>ry2?ry2:py;
      if((px-cx)*(px-cx)+(py-cy)*(py-cy) < r2) return false;
    }
    // doğru parçası dikdörtgeni kesiyor mu (Liang-Barsky)
    let t0=0, t1=1, hit=true;
    const P=[-dx,dx,-dy,dy], Q=[x1-rx, rx2-x1, y1-ry, ry2-y1];
    for(let k=0;k<4;k++){
      if(P[k]===0){ if(Q[k]<0){ hit=false; break; } }
      else { const t=Q[k]/P[k]; if(P[k]<0){ if(t>t1){hit=false;break;} if(t>t0) t0=t; } else { if(t<t0){hit=false;break;} if(t<t1) t1=t; } }
    }
    if(hit) return false;
    // köşelerin doğru parçasına uzaklığı
    if(segDist2(rx,ry,x1,y1,dx,dy,l2)<r2 || segDist2(rx2,ry,x1,y1,dx,dy,l2)<r2 || segDist2(rx,ry2,x1,y1,dx,dy,l2)<r2 || segDist2(rx2,ry2,x1,y1,dx,dy,l2)<r2) return false;
  }
  return true;
}

/* ---- akış alanı: hedef hücreden Dijkstra, par[i] = hedefe doğru sonraki hücre (hedefin kendisi: kendi, ulaşılamaz: -1) ---- */
const NB = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,SQ2],[1,-1,SQ2],[-1,1,SQ2],[-1,-1,SQ2]];
const NBX = Int8Array.from(NB, a=>a[0]), NBY = Int8Array.from(NB, a=>a[1]), NBC = Float64Array.from(NB, a=>a[2]);   // düz diziler (hız)
const dist = new Float32Array(N), hKey = new Float32Array(N*2), hIdx = new Int32Array(N*2);
function buildField(tc, par){
  par.fill(-1); dist.fill(1e9);
  let hn = 0;
  const push = (k, i) => { let c=hn++; while(c>0){ const p=(c-1)>>1; if(hKey[p]<=k) break; hKey[c]=hKey[p]; hIdx[c]=hIdx[p]; c=p; } hKey[c]=k; hIdx[c]=i; };
  dist[tc]=0; par[tc]=tc; push(0, tc);
  while(hn>0){
    const k=hKey[0], u=hIdx[0]; hn--;
    if(hn>0){ const lk=hKey[hn], li=hIdx[hn]; let c=0; for(;;){ let l=c*2+1; if(l>=hn) break; if(l+1<hn && hKey[l+1]<hKey[l]) l++; if(hKey[l]>=lk) break; hKey[c]=hKey[l]; hIdx[c]=hIdx[l]; c=l; } hKey[c]=lk; hIdx[c]=li; }
    if(k>dist[u]) continue;
    const ux=u%GW, uy=(u/GW)|0;
    for(let n=0;n<8;n++){
      const nx=ux+NBX[n], ny=uy+NBY[n];
      if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const v=ny*GW+nx; if(blocked[v]) continue;
      if(n>=4 && (blocked[uy*GW+nx] || blocked[ny*GW+ux])) continue;   // köşe kesme yok
      const nd=k+NBC[n];
      if(nd<dist[v]){ dist[v]=nd; par[v]=u; push(nd, v); }
    }
  }
}
const fields = new Map();   // hedef hücre -> par (LRU: Map ekleme sırası)
function getField(tc){
  let f = fields.get(tc);
  if(f){ fields.delete(tc); fields.set(tc, f); return f; }
  if(fields.size>=LRU_MAX){ const old=fields.keys().next().value; f=fields.get(old); fields.delete(old); }
  else f = new Int16Array(N);
  buildField(tc, f); fields.set(tc, f); return f;
}
/* (x,y)'ye en yakın yürünebilir hücre (kendi hücresi yürünebilirse o) */
function walkCell(x, y){
  const c=cellOf(x, y); if(!blocked[c]) return c;
  const cx=c%GW, cy=(c/GW)|0; let best=-1, bd=1e18;
  for(let R=1; R<=10 && best<0; R++){
    for(let oy=-R; oy<=R; oy++) for(let ox=-R; ox<=R; ox++){
      if(Math.max(Math.abs(ox),Math.abs(oy))!==R) continue;
      const nx=cx+ox, ny=cy+oy; if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      const i=ny*GW+nx; if(blocked[i]) continue;
      const d=(cellX(i)-x)**2+(cellY(i)-y)**2; if(d<bd){ bd=d; best=i; }
    }
  }
  return best;
}

const WPX = new Float64Array(LOOK+2), WPY = new Float64Array(LOOK+2);
/* Hedefe gitmek için birim yön. Düz yol açıksa doğrudan, değilse akış alanı yolunda en uzak görünen nokta. */
export function navDir(fromX, fromY, toX, toY, r=30){
  const dx=toX-fromX, dy=toY-fromY, d=Math.hypot(dx,dy);
  if(d<1e-6) return { x:0, y:0 };
  const rr=r+1;
  if(hasLOS(fromX, fromY, toX, toY, rr)) return { x:dx/d, y:dy/d };
  const tc0=cellOf(toX, toY), tc=blocked[tc0] ? walkCell(toX, toY) : tc0, sc=walkCell(fromX, fromY);
  if(tc<0 || sc<0) return { x:dx/d, y:dy/d };
  const gx = blocked[tc0] ? cellX(tc) : toX, gy = blocked[tc0] ? cellY(tc) : toY;   // hedef duvarda: en yakın yürünebilir hücre
  const par = getField(tc);
  if(par[sc]<0) return { x:dx/d, y:dy/d };
  // yoldaki sonraki hücrelerin merkezleri (+ hedef)
  let c=sc, n=0;
  while(n<LOOK){
    const p=par[c];
    if(p===c){ WPX[n]=gx; WPY[n]=gy; n++; break; }
    WPX[n]=cellX(p); WPY[n]=cellY(p); n++; c=p;
  }
  // en uzak görünen nokta: önce sonuncu, sonra ikili arama
  let k=n-1;
  if(!hasLOS(fromX, fromY, WPX[k], WPY[k], rr)){
    let lo=-1, hi=k;   // lo: görünen (-1: yok), hi: görünmeyen
    while(hi-lo>1){ const m=(lo+hi)>>1; if(hasLOS(fromX, fromY, WPX[m], WPY[m], rr)) lo=m; else hi=m; }
    k = lo<0 ? 0 : lo;
  }
  let vx=WPX[k]-fromX, vy=WPY[k]-fromY, vl=Math.hypot(vx,vy);
  if(vl<1e-6){ if(k+1<n){ vx=WPX[k+1]-fromX; vy=WPY[k+1]-fromY; vl=Math.hypot(vx,vy); } if(vl<1e-6) return { x:dx/d, y:dy/d }; }
  return { x:vx/vl, y:vy/vl };
}

/* (vx,vy) yönünde küçük adım duvara giriyorsa yönü duvar boyunca kaydır (teğet bileşen), değilse aynısı. Büyüklük korunur. */
export function slideDir(x, y, vx, vy, r=30){
  const m=Math.hypot(vx,vy); if(m<1e-9) return { x:vx, y:vy };
  const S=10, nx=x+vx/m*S, ny=y+vy/m*S;
  if(!inWall(nx, ny, r)) return { x:vx, y:vy };
  const p=pushOutWalls(nx, ny, r);
  let ox=p.x-nx, oy=p.y-ny, ol=Math.hypot(ox,oy);
  if(ol<1e-6) return { x:vx, y:vy };
  ox/=ol; oy/=ol;   // duvardan dışarı normal
  const dot=vx*ox+vy*oy;
  let tx=vx-dot*ox, ty=vy-dot*oy, tl=Math.hypot(tx,ty);
  if(tl<m*0.02){ tx=-oy; ty=ox; tl=1; if(vx*tx+vy*ty<0){ tx=-tx; ty=-ty; } }   // tam kafa kafaya: sabit taraf
  return { x:tx/tl*m, y:ty/tl*m };
}

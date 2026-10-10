/* nav.js testi: seed'li rastgele çiftler, 30 birimlik adımlarla yürüt, varma oranı ve süre. Çalıştır: node tools/navtest.js */
import { WALLS, MAP_W, MAP_H, inWall, pushOutWalls } from '../map.js';
import { navDir, hasLOS, slideDir } from '../nav.js';

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const rnd = mulberry32(12345), R = 30, STEP = 30, MAXS = 2000;

function walk(sx, sy, tx, ty, rec){
  let x=sx, y=sy, i=0;
  for(; i<MAXS; i++){
    if(Math.hypot(tx-x,ty-y)<60) return { ok:true, steps:i };
    if(rec) rec.push([x,y,tx,ty]);
    const d=navDir(x,y,tx,ty,R);
    const p=pushOutWalls(x+d.x*STEP, y+d.y*STEP, R); x=p.x; y=p.y;
  }
  return { ok:false, steps:i, x, y };
}
const free = () => { for(;;){ const x=R+rnd()*(MAP_W-2*R), y=R+rnd()*(MAP_H-2*R); if(!inWall(x,y,R+2)) return [x,y]; } };

const pairs = [];
for(let i=0;i<500;i++){ const a=free(), b=free(); pairs.push([...a,...b]); }
const rec = []; let ok=0, steps=0, fails=[];
const t0=performance.now();
for(const [a,b,c,d] of pairs){ const r=walk(a,b,c,d,rec); if(r.ok){ ok++; steps+=r.steps; } else fails.push([a|0,b|0,c|0,d|0,r.x|0,r.y|0]); }
const cold=performance.now()-t0;
console.log(`rastgele 500 cift: varma ${(ok/5).toFixed(1)}% (${ok}/500), ort adim ${(steps/Math.max(1,ok)).toFixed(1)}, toplam ${cold.toFixed(0)} ms (soguk dahil)`);
if(fails.length) console.log('basarisizlar (bx,by,hx,hy,son x,y):', fails.slice(0,10).map(f=>f.join(',')).join(' | '));

/* özel senaryolar */
const sc = [['ust koridor -> alt koridor',2600,270,2600,1930],['sol ust -> orman -> sag alt',700,500,4500,1700],['sol alt -> sag ust',400,1700,4800,500],['ust ussten alt uss',320,1100,4880,1100],['orta kaya arkasi',2300,1100,2900,1100]];
for(const [n,a,b,c,d] of sc){ const r=walk(a,b,c,d); console.log(`${n}: ${r.ok?'vardi':'BASARISIZ'} (${r.steps} adim)`); }

/* süre: yalnızca navDir (kayıtlı konumlar), önbellek ısınmış */
for(const [a,b,c,d] of rec) navDir(a,b,c,d,R);
const t1=performance.now(); for(const [a,b,c,d] of rec) navDir(a,b,c,d,R); const dt=performance.now()-t1;
console.log(`navDir ort ${(dt/rec.length*1000).toFixed(2)} us/cagri (${rec.length} cagri, sicak onbellek)`);
/* soguk: her cagri yeni hedef (onbellek cok kucuk degil ama farkli hedefler) */
let cs=0, cn=0; for(let i=0;i<300;i++){ const a=free(), b=free(); const t=performance.now(); navDir(a[0],a[1],b[0],b[1],R); cs+=performance.now()-t; cn++; }
console.log(`soguk (yeni hedef) ort ${(cs/cn).toFixed(3)} ms/cagri`);
/* sagdurum: hasLOS ve slideDir */
console.log('hasLOS ust-alt koridor (orta kaya):', hasLOS(2600,270,2600,1930,R), '| ust koridor boyunca:', hasLOS(1700,300,3500,300,R));
const s=slideDir(1112,825,1,0.3,R); console.log('slideDir duvara dik:', s);
/* hedef duvarın içinde: duvar kenarına varıp durmalı (60'a yakınlık beklenmez) */
{ let x=600,y=300; for(let i=0;i<400;i++){ const d=navDir(x,y,1700,825,R), p=pushOutWalls(x+d.x*STEP,y+d.y*STEP,R); x=p.x; y=p.y; } console.log('duvar ici hedef: son konum', x|0, y|0, 'duvarda mi:', inWall(x,y,R-1)); }

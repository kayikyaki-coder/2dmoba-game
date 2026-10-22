/* Dövüş modeli eğitimi: node tools/mltrain.js a.jsonl b.jsonl ... [--hidden 16] [--epochs 60] [--out ai_model.js]
   17 girdi -> tanh gizli katman -> 1 çıktı (6 sn net sonuç skoru). Adam, küçük L2. Son %20 doğrulama (maç sırası korunur).
   Standartlaştırma ağırlıklara gömülür; k = ln(adv) ile tahmin arasındaki eğim (ai.js mlBlend ölçeği). */
import fs from 'node:fs';
const args=process.argv.slice(2); const opt={}; const files=[];
for(let i=0;i<args.length;i++){ if(args[i].startsWith('--')){ opt[args[i].slice(2)]=args[++i]; } else files.push(args[i]); }
const H=+(opt.hidden||16), EP=+(opt.epochs||60), OUT=opt.out||'ai_model.js';
const rows=files.flatMap(f=>fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
const N=rows[0].f.length, ntr=Math.floor(rows.length*0.8), tr=rows.slice(0,ntr), va=rows.slice(ntr);
const mean=new Array(N).fill(0), sd=new Array(N).fill(0);
for(const r of tr) for(let i=0;i<N;i++) mean[i]+=r.f[i]/tr.length;
for(const r of tr) for(let i=0;i<N;i++) sd[i]+=(r.f[i]-mean[i])**2/tr.length;
for(let i=0;i<N;i++) sd[i]=Math.sqrt(sd[i])||1;
const Z=r=>r.f.map((v,i)=>(v-mean[i])/sd[i]);
let seed=12345; const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-9))*Math.cos(6.2831853*rnd());
const W1=Array.from({length:H},()=>Array.from({length:N},()=>gauss()*0.3)), b1=new Array(H).fill(0), W2=Array.from({length:H},()=>gauss()*0.3); let b2=0;
const P=[W1.flat(),b1,W2,[b2]]; // yalnız boyut kaydı
const params=()=>{ const a=[]; for(const row of W1) a.push(...row); a.push(...b1,...W2,b2); return a; };
function fwd(z){ const h=new Array(H); for(let j=0;j<H;j++){ let s=b1[j]; const w=W1[j]; for(let i=0;i<N;i++) s+=w[i]*z[i]; h[j]=Math.tanh(s); } let o=b2; for(let j=0;j<H;j++) o+=W2[j]*h[j]; return [o,h]; }
const mse=(set)=>{ let s=0; for(const r of set){ const [o]=fwd(Z(r)); s+=(o-r.y)**2; } return s/set.length; };
const varY=(set)=>{ const m=set.reduce((a,r)=>a+r.y,0)/set.length; return set.reduce((a,r)=>a+(r.y-m)**2,0)/set.length; };
// Adam
const m1=new Map(), v1=new Map(); let tstep=0; const lr=0.003, l2=1e-4;
function adam(arr,idx,g){ const key=arr; tstep; /* basit: dizi/indeks anahtarı */ const k=arr.__id+':'+idx; const m=(m1.get(k)||0)*0.9+0.1*g, v=(v1.get(k)||0)*0.999+0.001*g*g; m1.set(k,m); v1.set(k,v); const mh=m/(1-0.9**tstep), vh=v/(1-0.999**tstep); return lr*mh/(Math.sqrt(vh)+1e-8); }
W1.forEach((r,j)=>{ r.__id='w1_'+j; }); b1.__id='b1'; W2.__id='w2'; const B2={__id:'b2'};
let best=1e9, bestState=null;
for(let ep=0;ep<EP;ep++){
  const idx=tr.map((_,i)=>i); for(let i=idx.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  for(let s=0;s<idx.length;s+=64){
    tstep++; const batch=idx.slice(s,s+64);
    const gW1=Array.from({length:H},()=>new Array(N).fill(0)), gb1=new Array(H).fill(0), gW2=new Array(H).fill(0); let gb2=0;
    for(const bi of batch){ const r=tr[bi], z=Z(r), [o,h]=fwd(z), e=2*(o-r.y)/batch.length; gb2+=e; for(let j=0;j<H;j++){ gW2[j]+=e*h[j]; const dh=e*W2[j]*(1-h[j]*h[j]); gb1[j]+=dh; for(let i=0;i<N;i++) gW1[j][i]+=dh*z[i]; } }
    for(let j=0;j<H;j++){ for(let i=0;i<N;i++) W1[j][i]-=adam(W1[j],i,gW1[j][i]+l2*W1[j][i]); b1[j]-=adam(b1,j,gb1[j]); W2[j]-=adam(W2,j,gW2[j]+l2*W2[j]); }
    b2-=adam(B2,0,gb2);
  }
  const vm=mse(va); if(vm<best){ best=vm; bestState=JSON.stringify({W1,b1,W2,b2}); }
  if(ep%10===9||ep===EP-1) console.log(`ep ${ep+1} train mse ${mse(tr).toFixed(4)} val mse ${vm.toFixed(4)} (val var ${varY(va).toFixed(4)})`);
}
const S0=JSON.parse(bestState); // en iyi doğrulama durumu
Object.assign(W1,S0.W1); for(let j=0;j<H;j++){ W1[j]=S0.W1[j]; } b1.splice(0,H,...S0.b1); W2.splice(0,H,...S0.W2); b2=S0.b2;
// temel: yalnız ln(adv) ile doğrusal (özellik 0)
{ const xs=tr.map(r=>r.f[0]), ys=tr.map(r=>r.y), mx=xs.reduce((a,b)=>a+b)/xs.length, my=ys.reduce((a,b)=>a+b)/ys.length; let c=0,vx=0; for(let i=0;i<xs.length;i++){ c+=(xs[i]-mx)*(ys[i]-my); vx+=(xs[i]-mx)**2; } const a=c/vx, b=my-a*mx; let s=0; for(const r of va) s+=(a*r.f[0]+b-r.y)**2; console.log(`temel (yalnız ev.adv, doğrusal) val mse ${(s/va.length).toFixed(4)}; ağ ${mse(va).toFixed(4)} -> iyileşme %${(100*(1-mse(va)/(s/va.length))).toFixed(1)}`); }
// k: ln(adv) ~ k * tahmin
let cxy=0,vp=0; const ps=tr.map(r=>fwd(Z(r))[0]); const mp=ps.reduce((a,b)=>a+b)/ps.length, ml=tr.reduce((a,r)=>a+r.f[0],0)/tr.length; tr.forEach((r,i)=>{ cxy+=(ps[i]-mp)*(r.f[0]-ml); vp+=(ps[i]-mp)**2; }); const k=cxy/vp;
// standartlaştırmayı ağırlıklara göm
const FW1=W1.map(row=>row.map((w,i)=>w/sd[i])), Fb1=b1.map((b,j)=>b-W1[j].reduce((a,w,i)=>a+w*mean[i]/sd[i],0));
const round=x=>+x.toFixed(5);
fs.writeFileSync(OUT, `/* Öğrenilmiş dövüş modeli (tools/mltrain.js, ${rows.length} örnek, gizli ${H}, doğrulama mse ${best.toFixed(4)}). */\nexport const FIGHT_MODEL = ${JSON.stringify({ k:round(k), W1:FW1.map(r=>r.map(round)), b1:Fb1.map(round), W2:W2.map(round), b2:round(b2) })};\n`);
console.log(`yazıldı ${OUT} | k ${k.toFixed(3)} | örnek ${rows.length}`);

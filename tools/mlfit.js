/* Kazanma olasılığı modeli: node tools/mlfit.js a.jsonl b.jsonl ... [--out tools/ml_model.json]
   Lojistik regresyon (standartlaştırılmış özellikler, L2), maç bazında 5 katlı çapraz doğrulama.
   Çıktı: ağırlıklar (etki sırası), doğruluk ve log-kayıp, zamana göre doğruluk. */
import fs from 'node:fs';
const args=process.argv.slice(2); const outI=args.indexOf('--out'); const out=outI>=0?args[outI+1]:null; const files=args.filter((a,i)=>!a.startsWith('--')&&i!==outI+1);
const rows=files.flatMap(f=>fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
const F=['worth','xp','kills','alive','deadT','towers','structHp','minions','push','titan','jm','lvl'];
const mean=F.map(f=>rows.reduce((s,r)=>s+r[f],0)/rows.length), sd=F.map((f,i)=>Math.sqrt(rows.reduce((s,r)=>s+(r[f]-mean[i])**2,0)/rows.length)||1);
const X=r=>[1,...F.map((f,i)=>(r[f]-mean[i])/sd[i])];
const sig=z=>1/(1+Math.exp(-z));
function fit(R,l2=0.5,it=400,lr=0.3){ const w=new Array(F.length+1).fill(0); for(let k=0;k<it;k++){ const g=new Array(w.length).fill(0); for(const r of R){ const x=X(r), p=sig(x.reduce((s,v,i)=>s+v*w[i],0)), e=p-r.y; for(let i=0;i<w.length;i++) g[i]+=e*x[i]; } for(let i=0;i<w.length;i++) w[i]-=lr*(g[i]/R.length+(i?l2*w[i]/R.length:0)); } return w; }
const pred=(w,r)=>sig(X(r).reduce((s,v,i)=>s+v*w[i],0));
const games=[...new Set(rows.map(r=>r.g+':'+r.T))]; const fold=g=>Math.abs([...g].reduce((s,c)=>s*31+c.charCodeAt(0)|0,7))%5;
let ok=0,n=0,ll=0; const byT={};
for(let k=0;k<5;k++){ const tr=rows.filter(r=>fold(r.g+':'+r.T)!==k), te=rows.filter(r=>fold(r.g+':'+r.T)===k); const w=fit(tr);
  for(const r of te){ const p=pred(w,r); n++; ok+=(p>0.5)===(r.y===1)?1:0; ll+=-(r.y?Math.log(p+1e-9):Math.log(1-p+1e-9)); const b=Math.floor(r.t/5)*5; (byT[b]=byT[b]||[0,0]); byT[b][0]+=(p>0.5)===(r.y===1)?1:0; byT[b][1]++; } }
console.log(`örnek ${rows.length}, maç ${games.length} | CV doğruluk %${(100*ok/n).toFixed(1)} log-kayıp ${(ll/n).toFixed(3)} (taban 0.693)`);
console.log('zamana göre doğruluk:', Object.keys(byT).map(b=>`${b}-${+b+5}dk %${(100*byT[b][0]/byT[b][1]).toFixed(0)} (${byT[b][1]})`).join(' | '));
const w=fit(rows); console.log('ağırlıklar (standart sapma başına log-oran):'); F.map((f,i)=>[f,w[i+1]]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).forEach(([f,v])=>console.log('  '+f.padEnd(9)+v.toFixed(2)));
if(out) fs.writeFileSync(out, JSON.stringify({ F, mean, sd, w },null,1));

/* Toplu öğrenme: her maçta verilen ayarlar aralıklarında rastgele seçilir, sonuçlardan lojistik model kurulur.
   Tek maç dizisi bütün ayarların etkisini birlikte ölçer, ayrıca bütün çiftleri %50'ye en çok yaklaştıran değerleri önerir.
   node tools/regress.js --param archer.hp.base=380:480 --param warrior.dmg.base=55:70 [--param "mage.skill.s.dmg=*0.8:1.2"] [--matches 150]
   "*a:b" dizi ya da sayıyı mevcut değerin a ile b katı arasında ölçekler. --sc duel/lane ile kısa senaryo da olur.
   Arayüz de runRegress'i kullanır. */
import { STATS, HEROES as HDEF } from '../data.js';
import { Pool, parseArgs, score } from './pool.js';
import { allPairs, jobBase, scLabel, counted, isMain } from './smart.js';
import { checkPath } from './runner.js';

const curOf=(hero,stat,field)=> stat==='skill' ? HDEF[hero].skills[field.split('.')[0]][field.split('.')[1]] : STATS[hero][stat][field];
/* "archer.hp.base=380:480" ya da "...=*0.8:1.2" -> parametre nesnesi */
export function parseParam(s){
  const [p,rng]=s.split('='), [hero,stat,...rest]=p.split('.'), field=rest.join('.');
  checkPath({ hero, stat, field });
  if(!rng || !rng.includes(':')) throw new Error('Parametre biçimi: '+p+'=alt:üst');
  const mult=rng.startsWith('*'), [lo,hi]=rng.replace('*','').split(':').map(Number), cur=curOf(hero,stat,field);
  if(!isFinite(lo) || !isFinite(hi) || hi<=lo) throw new Error('Aralık geçersiz: '+s);
  const val=u=>{ const t=lo+(hi-lo)*u; return mult ? (Array.isArray(cur) ? cur.map(x=>+(x*t).toFixed(3)) : +(cur*t).toFixed(3)) : +t.toFixed(3); };
  const u0 = mult ? (1-lo)/(hi-lo) : Array.isArray(cur) ? 0.5 : (cur-lo)/(hi-lo);
  return { name:p, hero, stat, field, lo, hi, mult, cur, val, u0:Math.min(1,Math.max(0,u0)) };
}

// seed'li rastgele (her maç için ayrı, tekrarlanabilir)
const mulberry=a=>()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };

/* Lojistik regresyon (IRLS, küçük L2): x = u-0.5 (aralık birimi), y kesirli olabilir */
function logit(rows, idx){
  const k=idx.length+1, X=rows.map(r=>[1, ...idx.map(j=>r.u[j]-0.5)]), y=rows.map(r=>r.y);
  let w=new Array(k).fill(0);
  for(let it=0; it<30; it++){
    const H=Array.from({length:k},()=>new Array(k).fill(0)), g=new Array(k).fill(0);
    for(let n=0;n<X.length;n++){
      const z=X[n].reduce((s,x,j)=>s+x*w[j],0), p=1/(1+Math.exp(-z)), q=Math.max(1e-6,p*(1-p));
      for(let i=0;i<k;i++){ g[i]+=X[n][i]*(y[n]-p); for(let j=0;j<k;j++) H[i][j]+=q*X[n][i]*X[n][j]; }
    }
    for(let i=1;i<k;i++){ H[i][i]+=0.5; g[i]-=0.5*w[i]; }   // hafif düzenleme
    const d=solve(H,g); w=w.map((x,i)=>x+d[i]);
    if(d.reduce((s,x)=>s+Math.abs(x),0)<1e-6) break;
  }
  // standart hata (Hessian tersi köşegeni)
  const H=Array.from({length:k},()=>new Array(k).fill(0));
  for(const x of X){ const z=x.reduce((s,v,j)=>s+v*w[j],0), p=1/(1+Math.exp(-z)), q=p*(1-p); for(let i=0;i<k;i++) for(let j=0;j<k;j++) H[i][j]+=q*x[i]*x[j]; }
  const se=w.map((_,i)=>{ const e=new Array(k).fill(0); e[i]=1; return Math.sqrt(Math.max(0,solve(H,e)[i])); });
  return { w, se };
}
function solve(A,b){
  const n=b.length, M=A.map((r,i)=>[...r, b[i]]);
  for(let i=0;i<n;i++){
    let p=i; for(let r=i+1;r<n;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    [M[i],M[p]]=[M[p],M[i]]; const v=M[i][i]||1e-12;
    for(let r=0;r<n;r++) if(r!==i){ const f=M[r][i]/v; for(let c=i;c<=n;c++) M[r][c]-=f*M[i][c]; }
  }
  return M.map((r,i)=>r[n]/(r[i]||1e-12));
}
const sig=z=>1/(1+Math.exp(-z));

/* opts: { base(jobBase), params:["archer.hp.base=380:480",...], matches (çift başına), seed, heroes, lambda }
   Dönüş: { n, pairCount, effects:[{a,b,mid,items:[{name,from,to,lo,hi,significant}]}], suggestion:[{name,cur,val}], predictions:[{a,b,p}], total, ran, seconds } */
export async function runRegress(opts, onProgress){
  const { base={}, params=[], matches:N=150, seed=1, heroes, lambda=0.3 } = opts;
  if(!params.length) throw new Error('En az bir parametre gerekli');
  const P=params.map(parseParam), t0=Date.now();
  const touched=new Set(P.map(q=>q.hero));
  const pairs=allPairs(heroes || Object.keys(STATS)).filter(([a,b])=>touched.has(a)||touched.has(b));
  if(!pairs.length) throw new Error('Parametre kahramanlarını içeren çift yok');
  const total=pairs.length*N, pool=new Pool(), cp=counted(pool,total,onProgress), data=pairs.map(()=>[]);
  try {
    await Promise.all(pairs.flatMap(([a,b],pi)=>Array.from({length:N},async (_,i)=>{
      const r=mulberry(seed*1000003+pi*7919+i*31), u=P.map(()=>r());
      const overrides=P.map((q,k)=>({ hero:q.hero, stat:q.stat, field:q.field, value:q.val(u[k]) }));
      const res=await cp.one({ ...base, a, b, overrides, seed:seed+pi*7919 }, i);
      data[pi].push({ u, y:score(res) });
    })));
  } finally { pool.close(); }
  const models=pairs.map(([a,b],pi)=>{ const idx=P.map((q,j)=>j).filter(j=>P[j].hero===a||P[j].hero===b); return { a, b, idx, ...logit(data[pi], idx) }; });
  const effects=models.map(m=>({ a:m.a, b:m.b, mid:sig(m.w[0]), items:m.idx.map((j,t)=>{
    const b=m.w[t+1], z=b/(m.se[t+1]||1e-9);
    return { name:P[j].name, from:P[j].val(0), to:P[j].val(1), lo:sig(m.w[0]-b/2), hi:sig(m.w[0]+b/2), significant:Math.abs(z)>=2 }; }) }));
  // öneri: bütün çiftlerin logit'i 0'a yakın, mevcut değerden çok uzaklaşmadan
  let u=P.map(q=>q.u0);
  for(let it=0; it<4000; it++){
    const g=u.map((x,j)=>2*lambda*(x-P[j].u0));
    for(const m of models){ const z=m.w[0]+m.idx.reduce((s,j,t)=>s+m.w[t+1]*(u[j]-0.5),0); m.idx.forEach((j,t)=>{ g[j]+=2*z*m.w[t+1]; }); }
    u=u.map((x,j)=>Math.min(1,Math.max(0,x-0.01*g[j])));
  }
  return { n:N, pairCount:pairs.length, effects,
    suggestion:P.map((q,j)=>({ name:q.name, cur:q.cur, val:q.val(u[j]) })),
    predictions:models.map(m=>({ a:m.a, b:m.b, p:sig(m.w[0]+m.idx.reduce((s,j,t)=>s+m.w[t+1]*(u[j]-0.5),0)) })),
    total, ran:cp.done, seconds:(Date.now()-t0)/1000 };
}

if(isMain(import.meta.url)){
  const o=parseArgs(process.argv.slice(2)), base=jobBase(o);
  if(!o.param.length){ console.log('En az bir --param gerekli. Örnek: --param archer.hp.base=380:480'); process.exit(1); }
  const r=await runRegress({ base, params:o.param, matches:+(o.matches||150), seed:+(o.seed||1), heroes:o.heroes ? o.heroes.split(',') : undefined, lambda:+(o.lambda||0.3) },
    (d,t)=>{ if(d%50===0) process.stderr.write('\r'+d+'/'+t+' maç'); });
  process.stderr.write('\n');
  const show=v=>Array.isArray(v)?'['+v.join(',')+']':v;
  console.log(`${r.n} maç x ${r.pairCount} çift, ${scLabel(base)}, ${r.seconds.toFixed(0)} sn`);
  console.log("\nEtkiler (diğer ayarlar aralık ortasındayken, ayar aralığın başından sonuna gidince A'nın kazanma oranı):");
  for(const m of r.effects){
    console.log(`${m.a} vs ${m.b}: aralık ortasında ${(m.mid*100).toFixed(0)}%`);
    for(const t of m.items) console.log(`   ${t.name.padEnd(24)} ${show(t.from)} -> ${show(t.to)}: ${(t.lo*100).toFixed(0)}% -> ${(t.hi*100).toFixed(0)}%  ${t.significant?'(anlamlı)':'(belirsiz)'}`);
  }
  console.log("\nÖneri (bütün çiftleri %50'ye yaklaştıran, mevcuda yakın değerler; compare.js ya da smartmatrix.js ile doğrula):");
  for(const q of r.suggestion) console.log(`   ${q.name.padEnd(24)} ${show(q.cur)} -> ${show(q.val)}`);
  for(const p of r.predictions) console.log(`   tahmin ${p.a} vs ${p.b}: ${(p.p*100).toFixed(0)}%`);
}

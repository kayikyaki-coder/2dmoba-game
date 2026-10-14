/* Bütün 2v2 takım kombinasyonları: node tools/teams2v2.js [--rounds 1] [--seed 1] [--threads 4] [--top 5] [--out tools/teams2v2_result.json] [--report 1] [--fast 1 --games 20] [--shard i/n] [--merge a.json,b.json] [--diff easy|medium|hard|expert]
   12 kahramandan 66 takım; ortak kahramanı olmayan her takım çifti rounds kez oynar (taraf dönüşümlü).
   Çıktı: en iyi N takım (kazanma oranı) ve bireysel tablo (kahraman başına maç, kazanma, K/D/A, en iyi dost ve en zor rakip).
   Sonuçlar --out dosyasına yazılır; yarıda kalırsa aynı komut kaldığı yerden devam eder. */
import fs from 'node:fs';
import { runDuoJobs } from './duo.js';
import { parseArgs, pct } from './pool.js';
import { HERO_NAMES } from '../names.js';

const o=parseArgs(process.argv.slice(2));
const rounds=+(o.rounds||1), seed=+(o.seed||1), top=+(o.top||5), out=o.out||'tools/teams2v2_result.json';
const H=Object.keys(HERO_NAMES), teams=[];
for(let i=0;i<H.length;i++) for(let j=i+1;j<H.length;j++) teams.push([H[i],H[j]]);
const jobs=[];
// --fast 1: örnekleme (her takım yaklaşık --games rakiple, dengeli ve tohumlu) + erken bitirme. Varsayılan: bütün eşleşmeler.
const fast=!!o.fast, perTeam=+(o.games||20);
const pairs=[];
for(let x=0;x<teams.length;x++) for(let y=x+1;y<teams.length;y++){ const A=teams[x], B=teams[y]; if(!A.some(h=>B.includes(h))) pairs.push([x,y]); }
let use=pairs;
if(fast){
  let rs=(seed*2654435761)>>>0; const rnd=()=>((rs=(rs*1664525+1013904223)>>>0)/4294967296);
  for(let i=pairs.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [pairs[i],pairs[j]]=[pairs[j],pairs[i]]; }
  const cnt=new Array(teams.length).fill(0); use=[];
  for(const [x,y] of pairs) if(cnt[x]<perTeam && cnt[y]<perTeam){ use.push([x,y]); cnt[x]++; cnt[y]++; }
}
for(const [x,y] of use){
  const A=teams[x], B=teams[y];
  for(let r=0;r<rounds;r++){ const k=jobs.length; jobs.push({ key:A+'|'+B+'|'+r, a:A, b:B, aTeam:k%2, seed:seed*100000+k, maxTime:2400, earlyStop:fast, diffA:o.diff||'easy', diffB:o.diff||'easy' }); }
}
// --shard i/n: işin yalnız i. parçası (paralel oturumlar/makineler için); sonuçlar --out dosyasına; birleştirme: --merge a.json,b.json
if(o.shard){ const [si,sn]=String(o.shard).split('/').map(Number); for(let i=jobs.length-1;i>=0;i--) if(i%sn!==si) jobs.splice(i,1); }
let done={}; try { done=JSON.parse(fs.readFileSync(out,'utf8')); } catch {}
if(o.merge) for(const f of String(o.merge).split(',')) Object.assign(done, JSON.parse(fs.readFileSync(f,'utf8')));
const todo=(o.report||o.merge) ? [] : jobs.filter(j=>!done[j.key]);   // --report 1: yalnız mevcut sonuçların özeti
console.log(`${teams.length} takım, ${jobs.length} maç (${todo.length} kaldı)`);
const t0=Date.now(), CH=48;
for(let i=0;i<todo.length;i+=CH){
  const part=todo.slice(i,i+CH), rs=await runDuoJobs(part.map(({key,...j})=>j), o.threads?+o.threads:undefined);
  part.forEach((j,k)=>{ const r=rs[k]; done[j.key]={ a:j.a, b:j.b, aWon:r.aWon, time:r.time, early:r.early, heroes:r.heroes }; });
  fs.writeFileSync(out, JSON.stringify(done));
  const n=i+part.length, el=(Date.now()-t0)/1000;
  console.log(`${n}/${todo.length}  ${(el/60).toFixed(1)} dk, kalan ~${(el/n*(todo.length-n)/60).toFixed(0)} dk`);
}
// --- özet ---
const R=Object.values(done).filter(r=>r.aWon!==null);
const tk=t=>t.join('+'), TS={}, HS={}, pair={};
const add=(m,k,w)=>{ const e=m[k]||(m[k]={ n:0, w:0 }); e.n++; e.w+=w; };
for(const r of R){
  add(TS,tk(r.a),r.aWon?1:0); add(TS,tk(r.b),r.aWon?0:1);
  for(const h of r.heroes){
    const won=(h.side==='A')===r.aWon, e=HS[h.type]||(HS[h.type]={ n:0, w:0, k:0, d:0, as:0 });
    e.n++; e.w+=won?1:0; e.k+=h.kills; e.d+=h.deaths; e.as+=h.assists;
    for(const g of r.heroes){ if(g===h) continue; add(pair, h.type+(g.side===h.side?'+':'>')+g.type, won?1:0); }
  }
}
const nm=h=>HERO_NAMES[h]||h, pad=(s,n)=>String(s).padEnd(n);
const ranked=Object.entries(TS).sort((x,y)=>y[1].w/y[1].n-x[1].w/x[1].n);
console.log(`\nEn iyi ${top} takım (${R.length} maç, takım başına ~${Math.round(R.length*2/teams.length)} maç)`);
ranked.slice(0,top).forEach(([k,e],i)=>console.log(`${i+1}. ${pad(k.split('+').map(nm).join(' + '),36)} ${pct(e.w/e.n)}  (${e.w}/${e.n})`));
console.log('\nBireysel tablo');
console.log(pad('Kahraman',18)+pad('Maç',6)+pad('Kazanma',9)+pad('K/D/A',16)+pad('En iyi dost',22)+'En zor rakip');
const rows=Object.entries(HS).sort((x,y)=>y[1].w/y[1].n-x[1].w/x[1].n);
for(const [h,e] of rows){
  const best=(sep,dir)=>{ let b=null,bv=dir*-1e9; for(const g of H){ if(g===h) continue; const p=pair[h+sep+g]; if(!p||p.n<5) continue; const v=p.w/p.n; if(dir*v>dir*bv){ bv=v; b=g; } } return b?nm(b)+' '+pct(bv):'-'; };
  console.log(pad(nm(h),18)+pad(e.n,6)+pad(pct(e.w/e.n),9)+pad((e.k/e.n).toFixed(1)+'/'+(e.d/e.n).toFixed(1)+'/'+(e.as/e.n).toFixed(1),16)+pad(best('+',1),22)+best('>',-1));
}

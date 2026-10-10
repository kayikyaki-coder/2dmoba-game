/* Dövüş tahmini kalibrasyonu (gerçek koridor maçlarından).
   1) Maçlar oynatılır; iki kahraman yakınken (550 içinde) her 0,5 sn'de dövüş bileşenleri kaydedilir.
   2) Etiket: sonraki 15 sn içinde önce kim ölürse (kimse ölmezse örnek atılır).
   3) FE ağırlıkları, tahmin (adv/(1+adv)) ile gerçek sonucun log-olabilirliği en iyi olacak şekilde uydurulur.
   node tools/calib.js 30          (30 maç / eşleşme)
   node tools/calib.js 30 --apply  (bulunan ağırlıkları ai.js içindeki FE'ye yazar) */
import fs from 'node:fs';
import { TICK, STATS } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand, fightComps, advFrom, FE } from '../ai.js';

const N=+(process.argv[2]||20), APPLY=process.argv.includes('--apply');
const argOf=k=>{ const i=process.argv.indexOf(k); return i>0 ? process.argv[i+1] : null; };
const PART=argOf('--part'), SAVE=argOf('--save'), LOAD=argOf('--load');
const heroes=Object.keys(STATS), samples=[];
let pairIdx=-1;
if(!LOAD) for(let i=0;i<heroes.length;i++) for(let j=i;j<heroes.length;j++){ pairIdx++;
 if(PART){ const [pi,pn]=PART.split('/').map(Number); if(pairIdx%pn!==pi) continue; }
 for(let g=0;g<N;g++){
  const types = g%2 ? [heroes[j],heroes[i]] : [heroes[i],heroes[j]];
  resetGame({ types, levels:[1,1], human:null, seed:3000+g*7+i*101+j*13, fx:false });
  const pend=[]; let next=0;
  while(!S.over && S.time<2700){
    step(TICK, botCommand);
    const [h0,h1]=S.heroes;
    for(const [k,h] of [[0,h0],[1,h1]]) if(h.dead && !h._wasDead){
      for(const p of pend) if(p.y===undefined && S.time-p.t<=15) p.y = k===1 ? 1 : 0;
    }
    h0._wasDead=h0.dead; h1._wasDead=h1.dead;
    if(S.time>=next){
      next=S.time+0.5;
      if(!h0.dead && !h1.dead && Math.hypot(h0.x-h1.x,h0.y-h1.y)<550){
        const s={ t:S.time, c:fightComps(h0,h1) }; pend.push(s); samples.push(s);
      }
    }
  }
 }
}
const data=[];
for(const s of samples) if(s.y!==undefined){
  data.push({ c:s.c, y:s.y });
  data.push({ c:{ me:s.c.en, en:s.c.me }, y:1-s.y });   // aynası (simetri)
}
if(LOAD) for(const f of LOAD.split(',')) data.push(...JSON.parse(fs.readFileSync(f,'utf8')));
if(SAVE){ fs.writeFileSync(SAVE, JSON.stringify(data)); console.log('kaydedildi '+SAVE+' ('+data.length+')'); process.exit(0); }
console.log('örnek: '+data.length+' (etiketli, aynalı)');

const clone=o=>JSON.parse(JSON.stringify(o));
function loss(P){
  let L=0;
  for(const d of data){ const a=advFrom(d.c,P).adv, p=Math.min(0.999,Math.max(0.001,a/(1+a))); L-= d.y?Math.log(p):Math.log(1-p); }
  return L/data.length;
}
function brier(P){ let b=0; for(const d of data){ const a=advFrom(d.c,P).adv, p=a/(1+a); b+=(p-d.y)**2; } return b/data.length; }
const get0=(P,k)=>k.startsWith('w.')?P.w[k.slice(2)]:P[k];
const P0=clone(FE);   // sınırlama: başlangıç değerlerinden çok uzaklaşmayı cezalandır
const REG=0.003;
const lossR=P=>{ let r=0; for(const k of keys){ const v=get(P,k), v0=get(P0,k)||0.5; r+=Math.log(v/v0)**2; } return loss(P)+REG*r; };
let P=clone(FE), best;
console.log('başlangıç log-kayıp '+loss(P).toFixed(4)+'  Brier '+brier(P).toFixed(4)+'  (yazı tura: 0.6931 / 0.25)');
var keys=['hitRR','hitRM','hitMR','hitMM','towerW','minionW','k', ...Object.keys(P.w).map(k=>'w.'+k)];
const get=(P,k)=>k.startsWith('w.')?P.w[k.slice(2)]:P[k], set=(P,k,v)=>{ if(k.startsWith('w.')) P.w[k.slice(2)]=v; else P[k]=v; };
best=lossR(P);
for(let it=0; it<6; it++){
  for(const k of keys){
    for(const f of [0.5,0.7,0.85,1.15,1.4,2]){
      const Q=clone(P); set(Q,k,Math.max(0.02,Math.min(5,get(P,k)*f)));
      const l=lossR(Q); if(l<best-1e-5){ best=l; P=Q; }
    }
  }
}
console.log('sonuç    log-kayıp '+loss(P).toFixed(4)+'  Brier '+brier(P).toFixed(4));
const r=x=>+x.toFixed(3);
console.log('FE = '+JSON.stringify({ ...Object.fromEntries(Object.entries(P).filter(([k])=>k!=='w').map(([k,v])=>[k,r(v)])), w:Object.fromEntries(Object.entries(P.w).map(([k,v])=>[k,r(v)])) }));
// tahmin aralığı -> gerçek
const bk=[0,0.5,0.8,1,1.25,2,1e9];
for(let i=0;i<bk.length-1;i++){ let n=0,w=0; for(const d of data){ const a=advFrom(d.c,P).adv; if(a>=bk[i]&&a<bk[i+1]){ n++; w+=d.y; } } if(n) console.log('  adv '+bk[i]+'-'+(bk[i+1]>1e8?'∞':bk[i+1])+': gerçek %'+(w/n*100).toFixed(0)+' ('+n+')'); }
if(APPLY){
  const f='ai.js'; let s=fs.readFileSync(new URL('../'+f, import.meta.url),'utf8');
  const a=s.indexOf('export const FE = {'), b=s.indexOf('};', a)+2;
  const body='export const FE = {\n  hitRR:'+r(P.hitRR)+', hitRM:'+r(P.hitRM)+', hitMR:'+r(P.hitMR)+', hitMM:'+r(P.hitMM)+',   // isabet: R=menzilli, M=yakın (saldıran, savunan)\n  towerW:'+r(P.towerW)+', minionW:'+r(P.minionW)+', k:'+r(P.k)+',\n  w:'+JSON.stringify(Object.fromEntries(Object.entries(P.w).map(([k,v])=>[k,r(v)]))).replace(/"/g,'').replace(/,/g,', ').replace(/:/g,':')+'\n};';
  s=s.slice(0,a)+body+s.slice(b);
  fs.writeFileSync(new URL('../'+f, import.meta.url), s);
  console.log('ai.js içindeki FE güncellendi');
}

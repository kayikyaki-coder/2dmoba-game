/* Otomatik denge önerisi: her kahramana bir güç çarpanı (can ve düz vuruş hasarı, taban ve seviye başı) verilir.
   Her turda bütün çiftler akıllı matrisle ölçülür; ortalaması %50'nin üstündekiler biraz zayıflatılır, altındakiler güçlendirilir.
   Sonuç sadece ÖNERİ: dosyaları değiştirmez, son çarpanları ve önerilen statları yazar.
   node tools/autobalance.js [tur=4] [çift başına en fazla maç=24] [adım=0.3] [başlangıç.json] > tools/autobalance.log */
import fs from 'node:fs';
import { STATS, HEROES as HDEF } from '../data.js';
import { runSmartMatrix } from './smartmatrix.js';
import { HEROES } from './smart.js';

const [ROUNDS=4, MAX=24, STEP=0.3] = process.argv.slice(2).map(Number);
const LO=0.6, HI=1.6;
const SKILL_FIELDS=['dmg','dps','dot','ratio','sparkMin','sparkMax'];   // yetenek hasarları da çarpana girer
const mult=Object.fromEntries(HEROES.map(h=>[h,1]));
if(process.argv[5]) Object.assign(mult, JSON.parse(fs.readFileSync(process.argv[5],'utf8')));   // başlangıç çarpanları (ince ayar için)
const scale=(v,m)=>Array.isArray(v) ? v.map(x=>+(x*m).toFixed(3)) : +(v*m).toFixed(3);
const ovOf=()=>HEROES.flatMap(h=>[
  ...['hp','dmg'].flatMap(st=>['base','per'].map(f=>({ hero:h, stat:st, field:f, value:+(STATS[h][st][f]*mult[h]).toFixed(2) }))),
  ...Object.entries(HDEF[h].skills).flatMap(([k,sk])=>SKILL_FIELDS.filter(f=>typeof sk[f]==='number' || (Array.isArray(sk[f]) && sk[f].every(x=>typeof x==='number'))).map(f=>({ hero:h, stat:'skill', field:k+'.'+f, value:scale(sk[f],mult[h]) })))
]);
const log=(...a)=>console.log(new Date().toLocaleTimeString('tr-TR'), ...a);
const avgOf=r=>{ const W={}; for(const p of r.pairs){ (W[p.a]=W[p.a]||[]).push(p.win); (W[p.b]=W[p.b]||[]).push(1-p.win); }
  return Object.fromEntries(HEROES.map(h=>[h, W[h].reduce((s,x)=>s+x,0)/W[h].length])); };
let last=null;
for(let r=1; r<=ROUNDS+1; r++){
  const final = r===ROUNDS+1, res=await runSmartMatrix({ overrides:ovOf(), max: final ? MAX*2 : MAX, min: Math.min(12, MAX), seed:100+r });
  const avg=avgOf(res); last={ avg, res };
  const spread=Math.sqrt(HEROES.reduce((s,h)=>s+(avg[h]-0.5)**2,0)/HEROES.length);
  log(`tur ${r}${final?' (doğrulama)':''}: sapma ${(spread*100).toFixed(1)} puan, ${res.ran} maç, ${(res.seconds/60).toFixed(1)} dk`);
  log('   '+HEROES.slice().sort((a,b)=>avg[b]-avg[a]).map(h=>`${h} ${(avg[h]*100).toFixed(0)}% (x${mult[h].toFixed(2)})`).join(' | '));
  if(final) break;
  for(const h of HEROES) mult[h]=Math.min(HI, Math.max(LO, mult[h]*Math.exp(-STEP*(avg[h]-0.5)*2)));
}
const out={ mult, avg:last.avg, stats:Object.fromEntries(HEROES.map(h=>[h, { hp:[+(STATS[h].hp.base*mult[h]).toFixed(0), +(STATS[h].hp.per*mult[h]).toFixed(1)], dmg:[+(STATS[h].dmg.base*mult[h]).toFixed(1), +(STATS[h].dmg.per*mult[h]).toFixed(2)] }])),
  pairs:last.res.pairs.map(p=>({ a:p.a, b:p.b, win:+p.win.toFixed(3), n:p.n })) };
fs.writeFileSync(new URL('./autobalance_best.json', import.meta.url), JSON.stringify(out,null,2));
log('bitti, öneri tools/autobalance_best.json');
for(const h of HEROES) log(`  ${h.padEnd(10)} x${mult[h].toFixed(2)}  can ${STATS[h].hp.base}->${out.stats[h].hp[0]}  hasar ${STATS[h].dmg.base}->${out.stats[h].dmg[0]}`);

/* Denge simülasyonu (komut satırı). Arayüz için: npm run sim-ui
   Örnek: node tools/simulate.js --a archer --b warrior --levelA 1 --levelB 1 --matches 2000 --seed 1
   Geçici stat: --override archer.as.per=0.08   (birden çok kez verilebilir)
   Yetenek:     --override mage.skill.r.dmg=50,70,90,110   --override warrior.skill.e.spd=0.15
   Tarama:      --sweep archer.hp.base=400:600:50
   Bot seçimi:  --aiA eski --aiB yeni   (yeni = ai.js, eski = ai_v1.js)
   Bot ayarı:   --tune diveStart=0.35   (ai.js içindeki AI sabitleri, sadece yeni bot)
   Diğer:       --threads N, --maxTime 1200 (saniye) */
import { runSimulation } from './runner.js';

function die(m){ console.error(m); process.exit(1); }

const args = {}; const overrideArgs = [], tuneArgs = [];
const argv = process.argv.slice(2);
for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith('--')) die('Bilinmeyen argüman: '+argv[i]);
  const k = argv[i].slice(2), v = argv[++i];
  if(v===undefined) die('--'+k+' için değer yok');
  if(k==='override') overrideArgs.push(v); else if(k==='tune') tuneArgs.push(v); else args[k]=v;
}
const parsePath = p => { const [hero, stat, ...rest] = p.split('.'); return { hero, stat, field:rest.join('.') }; };
const overrides = overrideArgs.map(s=>{
  const [p, val] = s.split('='); const v = val && val.includes(',') ? val.split(',').map(Number) : Number(val);
  if(val===undefined || (Array.isArray(v) ? v.some(x=>!isFinite(x)) : !isFinite(v))) die('Geçersiz değer: '+s);
  return { ...parsePath(p), value:v };
});
let sweep = null;
if(args.sweep){
  const [p, range] = args.sweep.split('=');
  const [from, to, step] = (range||'').split(':').map(Number);
  sweep = { ...parsePath(p), from, to, step };
}
const a = args.a || 'archer', b = args.b || 'warrior';
const opts = { a, b, levelA:+(args.levelA||1), levelB:+(args.levelB||1), matches:+(args.matches||1000),
  seed:+(args.seed||1), maxTime:+(args.maxTime||1200), aiA:args.aiA||'yeni', aiB:args.aiB||'yeni', tune:Object.fromEntries(tuneArgs.map(s=>{ const [k,v]=s.split('='); return [k, Number(v)]; })), threads:args.threads?+args.threads:0, overrides, sweep,
  onProgress:(d,t)=>{ if(process.stderr.isTTY) process.stderr.write('\r'+d+'/'+t+' parça'); } };

let r;
try { r = await runSimulation(opts); } catch(e){ die(e.message); }
if(process.stderr.isTTY) process.stderr.write('\r'+' '.repeat(30)+'\r');

const pct = x => x===null ? '-' : (x*100).toFixed(1)+'%';
const mmss = s => { if(s===null) return '-'; s=Math.round(s); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
const f1 = x => x===null ? '-' : x.toFixed(1);
const table = r.rows.map(x=>({
  'Ayar': x.label,
  [a+' kazanma']: pct(x.aWin),
  '%95 aralık': pct(x.ciLo)+' - '+pct(x.ciHi),
  'Ort. süre': mmss(x.avgTime),
  'İlk kule': mmss(x.firstTower),
  'İlk kill': mmss(x.firstKill),
  ['Sev '+a]: f1(x.levelA),
  ['Sev '+b]: f1(x.levelB),
  'Zaman aşımı': String(x.timeouts),
  'Takım0 kazanma': pct(x.team0Win)
}));
console.log(a+' (sev '+opts.levelA+', bot '+opts.aiA+') vs '+b+' (sev '+opts.levelB+', bot '+opts.aiB+') | '+opts.matches+' maç'+(r.rows.length>1 ? ' x '+r.rows.length+' değer' : '')+' | seed '+opts.seed+' | taraf yarı yarıya değişimli | sınır '+mmss(opts.maxTime)+' | '+r.threads+' iş parçacığı | '+r.seconds.toFixed(1)+' sn');
console.log('Kazanma oranı: zaman aşımı hariç, '+a+' için. Süre ve ilk kule/kill: oyun içi dakika. Seviye: maç sonu ortalaması.');
const cols = Object.keys(table[0]);
const w = cols.map(c=>Math.max(c.length, ...table.map(x=>x[c].length)));
console.log(cols.map((c,i)=>c.padEnd(w[i])).join('  '));
console.log(w.map(x=>'-'.repeat(x)).join('  '));
for(const x of table) console.log(cols.map((c,i)=>x[c].padEnd(w[i])).join('  '));

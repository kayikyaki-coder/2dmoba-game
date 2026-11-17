/* Nöroevrim kontrol paneli: tarayıcıda canlı grafik + ayarlar + Başlat / Durdur / Sınav.
   Eğitimi tools/neuro.js alt süreci olarak çalıştırır; veriyi tools/neuro/log.txt'den okur (eğitim panelden bağımsız da çalışabilir).
   Çalıştır: node tools/neuro_ui.js  (ya da Noroevrim-Panel.bat)  ->  http://localhost:8090 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'tools', 'neuro');
const LOG = path.join(DIR, 'log.txt'), STATE = path.join(DIR, 'state.json');
const PORT = +(process.env.PORT || 8090);
const CORES = os.availableParallelism ? os.availableParallelism() : os.cpus().length;

let train = null, test = null, lastErr = '';
function startChild(args){
  const c = spawn(process.execPath, [path.join(ROOT,'tools','neuro.js'), ...args], { cwd:ROOT, stdio:['ignore','ignore','pipe'], windowsHide:true });
  c.stderr.on('data', d => { lastErr = (lastErr + d.toString()).slice(-2000); });
  return c;
}

function parse(){
  const out = { rules:null, bc:null, hist:{}, vals:{}, tests:[], tail:[] };
  if(!fs.existsSync(LOG)) return out;
  const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  out.tail = lines.slice(-14);
  let m;
  for(const l of lines){
    if((m = l.match(/doğrulama kurallı ajan: kazanma %(\d+) puan (-?[\d.]+).*?servet farkı (-?\d+)/))) out.rules = { win:+m[1], fit:+m[2], wd:+m[3] };
    else if((m = l.match(/doğrulama taklit ağı: kazanma %(\d+) puan (-?[\d.]+).*?servet farkı (-?\d+)/))) out.bc = { win:+m[1], fit:+m[2], wd:+m[3] };
    else if((m = l.match(/nesil (\d+): en iyi kazanma %(\d+) puan (-?[\d.]+).*?servet farkı (-?\d+).*?nüfus ort\. puan (-?[\d.]+)/))) out.hist[+m[1]] = { win:+m[2], fit:+m[3], wd:+m[4], mean:+m[5] };
    else if((m = l.match(/doğrulama \((\d+) sabit maç\) nesil (\d+) en iyisi: kazanma %(\d+) puan (-?[\d.]+).*?kuleye hasar (\d+)\/(\d+) servet farkı (-?\d+)/))) out.vals[+m[2]] = { n:+m[1], win:+m[3], fit:+m[4], tdA:+m[5], tdB:+m[6], wd:+m[7] };
    else if((m = l.match(/test (\S+) \((\d+) maç\): kazanma %(\d+) puan (-?[\d.]+).*?servet farkı (-?\d+)/))) out.tests.push({ who:m[1], n:+m[2], win:+m[3], fit:+m[4], wd:+m[5] });
  }
  return out;
}
function stateInfo(){
  try { const st = JSON.parse(fs.readFileSync(STATE,'utf8')); return { gen:st.gen, pop:st.pop.length, sigma:st.sigma, bestVal:st.bestVal }; } catch(e){ return null; }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const json = o => { res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
  if(u.pathname === '/'){ res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' }); res.end(PAGE); return; }
  if(u.pathname === '/api/status') return json({ running:!!train, testing:!!test, cores:CORES, err:lastErr, state:stateInfo(), ...parse() });
  if(req.method !== 'POST') { res.writeHead(404); res.end(); return; }
  if(u.pathname === '/api/start' && !train && !test){
    const q = u.searchParams, args = [];
    for(const k of ['pop','sigma','games','threads','cross']) if(q.get(k)) args.push('--'+k, q.get(k));
    lastErr = ''; train = startChild(args); train.on('exit', () => { train = null; });
    return json({ ok:true });
  }
  if(u.pathname === '/api/stop' && train){ train.kill(); return json({ ok:true }); }
  if(u.pathname === '/api/test' && !train && !test){
    const who = u.searchParams.get('who') || 'best';
    lastErr = ''; test = startChild(['--test', who]); test.on('exit', () => { test = null; });
    return json({ ok:true });
  }
  json({ ok:false });
});
server.listen(PORT, '127.0.0.1', () => {
  const url = 'http://localhost:'+PORT;
  console.log('Nöroevrim paneli: '+url+'  (bu pencereyi kapatmak paneli ve eğitimi durdurur)');
  if(!process.env.NO_OPEN){ const cmd = process.platform==='win32' ? `start "" "${url}"` : process.platform==='darwin' ? `open ${url}` : `xdg-open ${url}`; exec(cmd, ()=>{}); }
});
const bye = () => { if(train) train.kill(); if(test) test.kill(); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);

const PAGE = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Evrim Botu</title>
<style>
:root{ --bg:#f3f3f5; --card:#fff; --ink:#1b1b22; --mute:#5a5a66; --line:#d9d9e0; --blue:#3b82f6; --orange:#f08a24; --green:#2f9e44; --gray:#888; }
@media (prefers-color-scheme: dark){ :root{ --bg:#16161c; --card:#1f1f27; --ink:#ececf2; --mute:#a0a0ad; --line:#33333f; } }
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:14px system-ui,Segoe UI,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:14px 16px}
h1{font-size:17px;margin:0 0 10px} .bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}
label{display:flex;gap:6px;align-items:center} input[type=number]{width:72px;padding:4px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:4px}
button{padding:6px 14px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);cursor:pointer;font-weight:600} button:disabled{opacity:.45;cursor:default}
#go{background:var(--green);color:#fff;border-color:var(--green)} #stop{background:#c92a2a;color:#fff;border-color:#c92a2a}
.help{color:var(--mute);font-size:12.5px;line-height:1.45;margin:8px 2px}
#status{font-weight:700;margin:10px 2px;font-size:15px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px}
canvas{width:100%;height:440px;display:block}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px} @media(max-width:760px){.cols{grid-template-columns:1fr}}
pre{margin:0;white-space:pre-wrap;font:12px ui-monospace,Consolas,monospace;color:var(--mute);max-height:240px;overflow:auto}
table{border-collapse:collapse;width:100%;font-size:13px} td,th{padding:3px 6px;border-bottom:1px solid var(--line);text-align:right} th:first-child,td:first-child{text-align:left}
.err{color:#e03131}
</style></head><body><div class="wrap">
<h1>Evrim Botu: moba2d nöroevrim (ajan botu, Uzman'a karşı)</h1>
<div class="bar">
 <label>Nüfus <input id="pop" type="number" min="6" max="200" value="32"></label>
 <label>Mutasyon <input id="sigma" type="number" step="0.01" min="0.005" max="1" value="0.08"></label>
 <label>Maç/nesil <input id="games" type="number" min="1" max="20" value="4" title="kompozisyon sayısı; her biri iki tarafta oynanır"></label>
 <label>Çekirdek <input id="threads" type="number" min="1" max="64"></label>
 <label><input id="cross" type="checkbox" checked> Çaprazlama</label>
 <button id="go">▶ Başlat</button><button id="stop">■ Durdur</button>
 <button id="test" title="Şampiyonu 48 sabit maçla ölç">Sınav (şampiyon)</button><button id="testr" title="Kurallı botu aynı 48 maçla ölç">Sınav (kurallı)</button>
</div>
<div class="help">
<b>Nüfus:</b> her nesilde yarışan ağ sayısı. 10 altı az: çeşitlilik çabuk biter, şans eseri iyi görünen ağ her şeyi ele geçirir. 30+ sağlıklı.
<b>Mutasyon:</b> yavrulara eklenen rastgele değişikliğin büyüklüğü (büyük = cesur arama, küçük = ince ayar).
<b>Maç/nesil:</b> her ağ bu kadar kompozisyonu iki tarafta oynar; çok = daha az şans, daha yavaş.<br>
<b>Puan</b> = 3 × kazanma + 0,5 × (yıktığımız − kaybettiğimiz yapı) + kuleye hasar farkı/2000 + servet farkı/3000 + 0,05 × (öldürme − ölüm) + kaybedilen maçta dayanma süresi payı.
<b>Şampiyon</b>, eğitimde hiç görmediği 48 sabit DOĞRULAMA maçına göre seçilir. Kesikli çizgiler kıyas: kurallı bot ve taklit ağı (evrimin başlangıcı).
Durdurup yeniden başlatınca kaldığı yerden devam eder; ayar değişikliği devam ederken uygulanır.
</div>
<div id="status">Yükleniyor…</div>
<div class="card"><canvas id="cv"></canvas></div>
<div class="cols">
 <div class="card"><b>Doğrulama geçmişi</b><table id="vt"></table></div>
 <div class="card"><b>Son kayıtlar</b> <span id="err" class="err"></span><pre id="tail"></pre></div>
</div>
</div>
<script>
const $=id=>document.getElementById(id);
let S=null;
async function post(p){ await fetch(p,{method:'POST'}); setTimeout(poll,300); }
$('go').onclick=()=>{ const q=new URLSearchParams({pop:$('pop').value,sigma:$('sigma').value,games:$('games').value,threads:$('threads').value,cross:$('cross').checked?'1':'0'}); post('/api/start?'+q); };
$('stop').onclick=()=>post('/api/stop');
$('test').onclick=()=>post('/api/test?who=best');
$('testr').onclick=()=>post('/api/test?who=rules');
let filled=false;
async function poll(){
  try{ S=await (await fetch('/api/status')).json(); }catch(e){ $('status').textContent='Panel sunucusuna ulaşılamıyor (pencere kapandı mı?)'; return; }
  if(!filled){ filled=true; $('threads').value=Math.max(1,S.cores-(S.cores>4?1:0)); if(S.state){ $('pop').value=S.state.pop; $('sigma').value=S.state.sigma; } }
  $('go').disabled=S.running||S.testing; $('stop').disabled=!S.running; $('test').disabled=$('testr').disabled=S.running||S.testing;
  const gens=Object.keys(S.hist).map(Number).sort((a,b)=>a-b), g=gens.length?gens[gens.length-1]:0;
  const vg=Object.keys(S.vals).map(Number).sort((a,b)=>a-b);
  let champ=null; for(const k of vg){ if(!champ||S.vals[k].fit>champ.fit) champ={...S.vals[k],gen:k}; }
  const st=S.running?'ÇALIŞIYOR':S.testing?'SINAV':'DURDU';
  const f=x=>x==null?'-':x.toFixed(3);
  $('status').textContent=st+'  |  Nesil '+g+'  |  Şampiyonun doğrulama puanı '+(champ?f(champ.fit)+' (nesil '+champ.gen+', kazanma %'+champ.win+', servet farkı '+champ.wd+')':'-')+'  |  kurallı '+f(S.rules&&S.rules.fit)+', taklit '+f(S.bc&&S.bc.fit);
  $('err').textContent=S.err?'Hata: '+S.err.split('\\n').slice(-3).join(' '):'';
  $('tail').textContent=S.tail.join('\\n');
  let h='<tr><th>Nesil</th><th>Puan</th><th>Kazanma</th><th>Kuleye hasar</th><th>Servet farkı</th></tr>';
  if(S.rules) h+='<tr><td>kurallı bot</td><td>'+f(S.rules.fit)+'</td><td>%'+S.rules.win+'</td><td>-</td><td>'+S.rules.wd+'</td></tr>';
  if(S.bc) h+='<tr><td>taklit ağı</td><td>'+f(S.bc.fit)+'</td><td>%'+S.bc.win+'</td><td>-</td><td>'+S.bc.wd+'</td></tr>';
  for(const k of vg.slice().reverse()){ const v=S.vals[k]; h+='<tr><td>'+k+(champ&&champ.gen===k?' ★':'')+'</td><td>'+f(v.fit)+'</td><td>%'+v.win+'</td><td>'+v.tdA+'/'+v.tdB+'</td><td>'+v.wd+'</td></tr>'; }
  for(const t of S.tests.slice(-4).reverse()) h+='<tr><td>sınav '+t.who+'</td><td>'+f(t.fit)+'</td><td>%'+t.win+'</td><td>-</td><td>'+t.wd+'</td></tr>';
  $('vt').innerHTML=h;
  draw(gens,vg);
}
function draw(gens,vg){
  const cv=$('cv'), dpr=devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr;
  const c=cv.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,W,H);
  const css=getComputedStyle(document.documentElement), col=k=>css.getPropertyValue(k).trim();
  const L=54,R=150,T=14,B=30, pw=W-L-R, ph=H-T-B;
  const ys=[]; for(const k of gens) ys.push(S.hist[k].fit); for(const k of vg) ys.push(S.vals[k].fit); if(S.rules) ys.push(S.rules.fit); if(S.bc) ys.push(S.bc.fit);
  if(!ys.length){ c.fillStyle=col('--mute'); c.font='14px system-ui'; c.fillText('Henüz veri yok. Başlat\\'a bas.',L+10,T+30); return; }
  let y0=Math.min(...ys), y1=Math.max(...ys); const pad=(y1-y0||1)*0.12; y0-=pad; y1+=pad;
  const nx=Math.max(2,gens.length?gens[gens.length-1]:2);
  const X=g=>L+(g-1)/(nx-1)*pw, Y=v=>T+(1-(v-y0)/(y1-y0))*ph;
  c.strokeStyle=col('--line'); c.fillStyle=col('--mute'); c.font='12px system-ui'; c.lineWidth=1;
  for(let i=0;i<=5;i++){ const v=y0+(y1-y0)*i/5, y=Y(v); c.beginPath(); c.moveTo(L,y); c.lineTo(L+pw,y); c.stroke(); c.fillText(v.toFixed(2),6,y+4); }
  c.textAlign='center'; c.fillText('nesil (1 - '+nx+')',L+pw/2,H-8); c.textAlign='left';
  const hline=(v,txt)=>{ if(v==null) return; const y=Y(v); c.setLineDash([4,4]); c.strokeStyle=col('--gray'); c.beginPath(); c.moveTo(L,y); c.lineTo(L+pw,y); c.stroke(); c.setLineDash([]); c.fillStyle=col('--mute'); c.fillText(txt,L+pw+6,y+4); };
  hline(S.rules&&S.rules.fit,'kurallı bot'); hline(S.bc&&S.bc.fit,'taklit ağı');
  const line=(pts,color,w)=>{ if(!pts.length) return; c.strokeStyle=color; c.lineWidth=w; c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.stroke(); };
  line(gens.map(k=>[X(k),Y(S.hist[k].fit)]),col('--blue'),1.5);
  line(vg.map(k=>[X(k),Y(S.vals[k].fit)]),col('--orange'),2); c.fillStyle=col('--orange'); for(const k of vg){ c.beginPath(); c.arc(X(k),Y(S.vals[k].fit),3,0,7); c.fill(); }
  let best=null; const ch=[]; for(const k of vg){ const nb=(best==null||S.vals[k].fit>best) ? S.vals[k].fit : best; if(best!=null) ch.push([X(k),Y(best)]); best=nb; ch.push([X(k),Y(best)]); } if(ch.length) ch.push([X(nx),ch[ch.length-1][1]]);
  line(ch,col('--green'),2.5);
  const leg=[['en iyi eğitim puanı',col('--blue')],['doğrulama (bu nesil)',col('--orange')],['şampiyon (doğrulama)',col('--green')]];
  leg.forEach(([t,cl],i)=>{ c.fillStyle=cl; c.fillText(t,L+pw+6,T+12+i*16); });
}
poll(); setInterval(poll,3000); addEventListener('resize',()=>S&&poll());
</script></body></html>`;

/* Simülasyon arayüzü: node tools/ui.js, sonra http://localhost:8090 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { STATS } from '../data.js';
import { runSimulation, checkPath } from './runner.js';
import { ITEMS } from '../items.js';
import { jobBase, scLabel, runSingle } from './smart.js';
import { runSmartMatrix } from './smartmatrix.js';
import { runCompare } from './compare.js';
import { runRegress } from './regress.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 8090;
let job = null;   // { running, done, total, result, error }

const send = (res, code, body, type='application/json; charset=utf-8') =>
  res.writeHead(code, { 'Content-Type':type, 'Cache-Control':'no-store' }).end(typeof body==='string' ? body : JSON.stringify(body));

const readBody = req => new Promise(r=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>r(s)); });

/* Senaryo seçimi (tam maç / düello / koridor) -> worker iş tabanı */
function baseFrom(o){
  const sc = o.scenario || {}, kind = sc.kind==='duel' || sc.kind==='lane' ? sc.kind : null;
  const b = { maxTime: Number(o.maxTime) || 1200 };
  if(!kind) return b;
  const items = {};
  for(const [h,txt] of Object.entries(sc.items || {})){
    const ids = String(txt).split(/[\s,;]+/).filter(Boolean);
    for(const id of ids) if(!ITEMS[id]) throw new Error('Bilinmeyen eşya: '+id);
    if(ids.length) items[h] = ids;
  }
  const s = jobBase({ sc:kind, level:sc.level||6, minutes:sc.minutes||6 });
  s.sc.items = items;
  return { ...s, maxTime:b.maxTime };
}

function runJob(o, base, prog){
  const seed = Number(o.seed) || 1;
  if(o.mode==='matrix'){
    const heroes = (o.heroes||[]).filter(h=>STATS[h]);
    if(heroes.length<2) return Promise.reject(new Error('En az 2 kahraman seç'));
    return runSmartMatrix({ base, overrides:o._ov, heroes, seed, max:+o.max||60, min:Math.min(20,+o.max||60) }, prog)
      .then(r=>({ ...r, heroes, overrides:o._ov }));
  }
  if(o.mode==='compare') return runCompare({ base, ovBase:o._ovB, ovVariant:o._ovV, heroes:(o.heroes||[]).filter(h=>STATS[h]).length>1 ? o.heroes : undefined, seed, max:+o.max||60, min:Math.min(16,+o.max||60) }, prog);
  if(o.mode==='regress'){
    return runRegress({ base, params:(o.params||[]), matches:+o.matches||60, seed }, prog);
  }
  // tek eşleşme
  const common = { a:o.a, b:o.b, levelA:o.levelA, levelB:o.levelB, matches:o.matches, seed };
  const info = { a:o.a, b:o.b, levelA:o.levelA, levelB:o.levelB, matches:o.matches, seed:o.seed };
  if(!base.sc && !o.smart){
    return runSimulation({ ...common, maxTime:base.maxTime, overrides:o._ov, sweep:o.sweep||null, onProgress:prog })
      .then(r=>({ ...r, ran:r.rows.length*o.matches, opts:info }));
  }
  return runSingle({ ...common, base, overrides:o._ov, sweep:o.sweep||null, smart:!!o.smart }, prog).then(r=>({ ...r, opts:info, smart:!!o.smart }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if(req.method==='GET' && url.pathname==='/') return send(res, 200, fs.readFileSync(path.join(dir,'ui.html'),'utf8'), 'text/html; charset=utf-8');
  if(req.method==='GET' && url.pathname==='/api/stats'){
    const heroes = {}; for(const h in STATS) heroes[h] = Object.fromEntries(Object.entries(STATS[h]).map(([k,v])=>[k,v]));
    const items = Object.entries(ITEMS).map(([id,v])=>({ id, name:v.name, cost:v.cost }));
    return send(res, 200, { heroes, items });
  }
  if(req.method==='GET' && url.pathname==='/api/status') return send(res, 200, job || { idle:true });
  if(req.method==='POST' && url.pathname==='/api/run'){
    if(job && job.running) return send(res, 409, { error:'Zaten bir simülasyon çalışıyor' });
    let opts, base, ovs;
    try {
      opts = JSON.parse(await readBody(req));
      base = baseFrom(opts);
      ovs = k => { const l = opts[k] || []; l.forEach(checkPath); if(l.some(v=>!Number.isFinite(v.value))) throw new Error('Stat değişikliklerinde boş değer var'); return l; };
      opts._ov = opts.mode==='compare' ? null : ovs('overrides');
      if(opts.mode==='compare'){ opts._ovB = ovs('ovBase'); opts._ovV = ovs('ovVariant'); }
    } catch(e) { return send(res, 400, { error:e.message || 'Geçersiz istek' }); }
    job = { running:true, done:0, total:1, result:null, error:null, mode:opts.mode||'single' };
    const me = job, prog = (d,t)=>{ me.done=d; me.total=t; };
    runJob(opts, base, prog)
      .then(r=>{ me.result={ mode:me.mode, scenario:scLabel(base), ...r }; })
      .catch(e=>{ me.error=e.message; })
      .finally(()=>{ me.running=false; });
    return send(res, 200, { started:true });
  }
  send(res, 404, { error:'yok' });
});

server.listen(port, () => {
  const u = 'http://localhost:'+port;
  console.log('Simülasyon arayüzü: '+u+'  (kapatmak için bu pencereyi kapat)');
  if(!process.env.NO_OPEN) exec('start "" "'+u+'"');
});

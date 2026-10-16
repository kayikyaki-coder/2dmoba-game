/* Küçük yerel sunucu (bağımlılık yok): npm start, sonra http://localhost:8080 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachRelay } from './wsrelay.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8080;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.json':'application/json' };

/* --- Harita editörü kaydı: POST /api/map --- */
const inline = v => Array.isArray(v) ? '[' + v.map(inline).join(',') + ']'
  : (v && typeof v === 'object') ? '{ ' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + inline(x)).join(', ') + ' }'
  : JSON.stringify(v);
function formatMap(d) {
  const keys = ['w', 'h', 'lanes', 'walls', 'bushes', 'structs'];
  for (const k of Object.keys(d)) if (!keys.includes(k)) keys.push(k);
  const parts = keys.map(k => {
    const v = d[k];
    if (Array.isArray(v) && k !== 'structs') return v.length ? '  ' + JSON.stringify(k) + ': [\n' + v.map(x => '    ' + inline(x)).join(',\n') + '\n  ]' : '  ' + JSON.stringify(k) + ': []';
    return '  ' + JSON.stringify(k) + ': ' + inline(v);
  });
  return '{\n' + parts.join(',\n') + '\n}';
}
function validateMap(d) {
  if (!d || typeof d !== 'object') return 'gövde nesne değil';
  if (!Number.isFinite(d.w) || !Number.isFinite(d.h) || d.w <= 0 || d.h <= 0) return 'w ve h pozitif sayı olmalı';
  for (const k of ['lanes', 'walls', 'bushes', 'structs']) if (!Array.isArray(d[k])) return k + ' dizi olmalı';
  if (d.structs.length !== 4) return 'structs 4 elemanlı olmalı';
  for (const s of d.structs) if (!Array.isArray(s) || s.length !== 3 || typeof s[0] !== 'string' || !Number.isFinite(s[1]) || !Number.isFinite(s[2])) return 'structs elemanı [ad,x,y] olmalı';
  for (const l of d.lanes) if (!l || !Array.isArray(l.pts) || l.pts.length < 2) return 'koridor en az 2 nokta içermeli';
  return null;
}
function saveMap(body) {
  let d; try { d = JSON.parse(body); } catch { return 'JSON okunamadı'; }
  const err = validateMap(d); if (err) return err;
  const file = path.join(root, 'map_data.js');
  let header = '';
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, 'utf8');
    const i = old.indexOf('export const MAP_DATA');
    header = i > 0 ? old.slice(0, i) : '';
    const t = new Date(), z = n => String(n).padStart(2, '0');
    const stamp = t.getFullYear() + z(t.getMonth() + 1) + z(t.getDate()) + '_' + z(t.getHours()) + z(t.getMinutes()) + z(t.getSeconds());
    const dir = path.join(root, 'old'); fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file, path.join(dir, 'map_data_' + stamp + '.js'));
  }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, header + 'export const MAP_DATA = ' + formatMap(d) + ';\n');
  fs.renameSync(tmp, file);
  return null;
}

/* Tünel/vekil üzerinden gelen (uzaktaki arkadaş) istekler: harita kaydı ve tools/ kapalı. Yerel istek (localhost) eskisi gibi. */
const isRemote = req => !!(req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.headers['forwarded']);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && isRemote(req)) { res.writeHead(403).end(); return; }
  if (req.method === 'POST' && new URL(req.url, 'http://x').pathname === '/api/map') {
    let body = '', big = false;
    req.on('data', c => { body += c; if (body.length > 5e6) { big = true; req.destroy(); } });
    req.on('end', () => {
      if (big) return;
      let err; try { err = saveMap(body); } catch (e) { err = 'yazılamadı: ' + e.message; }
      res.writeHead(err ? 400 : 200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(err ? { ok: false, error: err } : { ok: true }));
    });
    return;
  }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  const rel = path.relative(root, file).split(path.sep);
  if (!file.startsWith(root) || file.includes(path.sep + 'old' + path.sep) || rel.some(x => x.startsWith('.')) || (isRemote(req) && ['tools', 'docs'].includes(rel[0]))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('yok'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
  });
});
attachRelay(server);   // online oda rölesi: ws://.../ws
server.listen(port, () => console.log('http://localhost:' + port));

/* Harita editörü: http://localhost:8080/tools/mapeditor.html
   Veri: ../map_data.js (MAP_DATA). Kayıt: POST /api/map (tools/serve.js). */
import { MAP_DATA } from '../map_data.js';

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));

const COL = { ground: '#2f4528', lane: '#c8b88a', wall: '#3a3530', wallEdge: '#1f1b18', bush: 'rgba(63,122,53,0.62)', bushEdge: '#2d5a26', t0: '#3b82f6', t1: '#e5484d', acc: '#5aa7ff' };
const STRUCT_NAMES = ['Dış kule', 'İç kule', 'Üs kulesi', 'Nexus'];
const STRUCT_R = { tower: 38, base: 44, nexus: 58 };
const structR = sub => STRUCT_R[sub] || 38;

/* ---------- durum ---------- */
let data = normalize(clone(MAP_DATA));
let savedJson = JSON.stringify(data);
let sel = null;            // { kind:'walls'|'bushes'|'structs', i }
let laneSel = 0, lanePt = -1;
let tool = 'select';
let undoStack = [], redoStack = [];
const view = { s: 0.25, ox: 20, oy: 20 };
let mouse = { x: 0, y: 0 };
let spaceDown = false, pan = null, drag = null, drawing = null, stroke = null;
let sketch = loadLS('moba_sketch', []);
let bgImg = null, bgData = null;
const bgOpts = Object.assign({ show: true, keep: false, alpha: 60 }, loadLS('moba_bg_opts', {}));

function normalize(d) {
  d.lanes = d.lanes || []; d.walls = d.walls || []; d.bushes = d.bushes || []; d.structs = d.structs || [];
  return d;
}
function loadLS(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } }
function saveLS(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch { return false; } }

/* ---------- araçlar ---------- */
const TOOLS = [
  ['g', 'Seçim'],
  ['select', 'Seç / Taşı (V)', 'v'],
  ['g', 'Duvar'],
  ['wallRect', 'Dikdörtgen (Q)', 'q', 'walls', 'rect'],
  ['wallCircle', 'Daire (W)', 'w', 'walls', 'circle'],
  ['wallPoly', 'Çokgen (E)', 'e', 'walls', 'poly'],
  ['g', 'Çalı'],
  ['bushRect', 'Dikdörtgen (A)', 'a', 'bushes', 'rect'],
  ['bushCircle', 'Daire (S)', 's', 'bushes', 'circle'],
  ['bushPoly', 'Çokgen (D)', 'd', 'bushes', 'poly'],
  ['g', 'Harita'],
  ['lane', 'Koridor (K)', 'k'],
  ['struct', 'Yapılar (Y)', 'y'],
  ['g', 'Eskiz'],
  ['pen', 'Kalem (B)', 'b'],
  ['eraser', 'Silgi (X)', 'x'],
];
const toolInfo = {};
for (const t of TOOLS) if (t[0] !== 'g') toolInfo[t[0]] = { kind: t[3], shape: t[4], key: t[2] };
const keyTool = {};
for (const t of TOOLS) if (t[0] !== 'g') keyTool[t[2]] = t[0];

const toolsEl = $('tools');
for (const t of TOOLS) {
  if (t[0] === 'g') { const d = document.createElement('div'); d.className = 'grp'; d.textContent = t[1]; toolsEl.appendChild(d); continue; }
  const b = document.createElement('button'); b.textContent = t[1]; b.dataset.tool = t[0];
  b.onclick = () => setTool(t[0]);
  toolsEl.appendChild(b);
}
function setTool(t) {
  drawing = null; stroke = null; drag = null;
  tool = t;
  if (!['select'].includes(t) && sel && sel.kind !== 'structs') { /* seçim kalsın */ }
  if (t === 'struct' && (!sel || sel.kind !== 'structs')) sel = null;
  for (const b of toolsEl.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tool === t);
  cv.style.cursor = t === 'select' ? 'default' : 'crosshair';
  renderProps(); draw();
}

/* ---------- geometri ---------- */
const isCircle = s => !!s.c, isPoly = s => !!s.poly;
function hitShape(s, x, y) {
  if (isCircle(s)) return Math.hypot(x - s.c[0], y - s.c[1]) <= s.r;
  if (isPoly(s)) return pointInPoly(s.poly, x, y);
  return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
}
function pointInPoly(p, x, y) {
  let ins = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function bbox(s) {
  if (isCircle(s)) return [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
  if (isPoly(s)) {
    const xs = s.poly.map(p => p[0]), ys = s.poly.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  return [s.x, s.y, s.x + s.w, s.y + s.h];
}
function anchor(s) { return isCircle(s) ? s.c : isPoly(s) ? s.poly[0] : [s.x, s.y]; }
function moved(s, dx, dy) {
  const o = clone(s);
  if (isCircle(o)) { o.c = [o.c[0] + dx, o.c[1] + dy]; }
  else if (isPoly(o)) o.poly = o.poly.map(p => [p[0] + dx, p[1] + dy]);
  else { o.x += dx; o.y += dy; }
  return o;
}
function mirrored(s, axis) {
  const o = clone(s), W = data.w, H = data.h;
  if (axis === 'v') {
    if (isCircle(o)) o.c[0] = W - o.c[0];
    else if (isPoly(o)) o.poly = o.poly.map(p => [W - p[0], p[1]]).reverse();
    else o.x = W - o.x - o.w;
  } else {
    if (isCircle(o)) o.c[1] = H - o.c[1];
    else if (isPoly(o)) o.poly = o.poly.map(p => [p[0], H - p[1]]).reverse();
    else o.y = H - o.y - o.h;
  }
  return o;
}
function distSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = a[0] + t * dx, qy = a[1] + t * dy;
  return { d: Math.hypot(px - qx, py - qy), q: [qx, qy], t };
}
const getShape = s => s && data[s.kind] ? data[s.kind][s.i] : null;
function setShape(s, v) { data[s.kind][s.i] = v; }

/* ---------- yapıştırma ---------- */
const snapOn = () => $('cSnap').checked;
const snapV = v => snapOn() ? Math.round(v / 25) * 25 : Math.round(v);
const snapP = p => [snapV(p[0]), snapV(p[1])];

/* ---------- geri al / yinele ---------- */
function pushUndo() {
  undoStack.push(JSON.stringify(data));
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
}
function popUndoIfNoChange() {
  if (undoStack.length && undoStack[undoStack.length - 1] === JSON.stringify(data)) undoStack.pop();
}
function restore(str) {
  data = JSON.parse(str);
  if (sel && !getShape(sel)) sel = null;
  laneSel = Math.min(laneSel, data.lanes.length - 1); lanePt = -1;
  renderAll();
}
function undo() { if (!undoStack.length) return; redoStack.push(JSON.stringify(data)); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(JSON.stringify(data)); restore(redoStack.pop()); }

function changed(skipProps) {
  const dirty = JSON.stringify(data) !== savedJson;
  document.title = (dirty ? '* ' : '') + 'Harita Editörü';
  if (!skipProps) renderProps();
  draw();
}
function renderAll() { $('mapW').value = data.w; $('mapH').value = data.h; renderLanes(); renderProps(); changed(true); }

/* ---------- görünüm ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let dpr = 1, needDraw = false;
function resize() {
  dpr = window.devicePixelRatio || 1;
  const r = $('cv-wrap').getBoundingClientRect();
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  draw();
}
new ResizeObserver(resize).observe($('cv-wrap'));
function fitView() {
  const r = $('cv-wrap').getBoundingClientRect();
  const s = Math.min((r.width - 40) / data.w, (r.height - 40) / data.h);
  view.s = Math.max(0.03, s); view.ox = (r.width - data.w * view.s) / 2; view.oy = (r.height - data.h * view.s) / 2;
  draw();
}
const toWorld = e => {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left - view.ox) / view.s, (e.clientY - r.top - view.oy) / view.s];
};
function draw() { if (!needDraw) { needDraw = true; requestAnimationFrame(() => { needDraw = false; render(); }); } }

/* ---------- çizim ---------- */
function pathShape(c, s) {
  c.beginPath();
  if (isCircle(s)) c.arc(s.c[0], s.c[1], s.r, 0, Math.PI * 2);
  else if (isPoly(s)) { s.poly.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); }
  else c.rect(s.x, s.y, s.w, s.h);
}
function drawLanes(c, scaleW, alpha) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const l of data.lanes) {
    if (!l.pts || l.pts.length < 2) continue;
    c.globalAlpha = (l.active ? 1 : 0.55) * alpha;
    c.strokeStyle = COL.lane; c.lineWidth = l.width * scaleW;
    c.beginPath(); l.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
  }
  c.globalAlpha = 1;
}
function structList() {
  const out = [];
  data.structs.forEach((st, i) => {
    out.push({ i, team: 0, sub: st[0], x: st[1], y: st[2] });
    out.push({ i, team: 1, sub: st[0], x: data.w - st[1], y: st[2] });
  });
  return out;
}

function render() {
  const W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, W, H);
  const k = view.s * dpr;
  ctx.setTransform(k, 0, 0, k, view.ox * dpr, view.oy * dpr);
  const s = view.s;
  const alpha = $('cDim').checked ? 0.45 : 1;

  ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, data.w, data.h);

  // arka plan görseli
  if (bgImg && bgOpts.show) {
    ctx.globalAlpha = bgOpts.alpha / 100;
    let x = 0, y = 0, w = data.w, h = data.h;
    if (bgOpts.keep) {
      const r = Math.min(data.w / bgImg.width, data.h / bgImg.height);
      w = bgImg.width * r; h = bgImg.height * r; x = (data.w - w) / 2; y = (data.h - h) / 2;
    }
    ctx.drawImage(bgImg, x, y, w, h);
    ctx.globalAlpha = 1;
  }

  // ızgara
  if ($('cGrid').checked && 100 * s >= 6) {
    const vx0 = -view.ox / s, vy0 = -view.oy / s, vx1 = vx0 + W / k, vy1 = vy0 + H / k;
    ctx.lineWidth = 1 / s;
    for (let x = Math.floor(Math.max(0, vx0) / 100) * 100; x <= Math.min(data.w, vx1); x += 100) {
      ctx.strokeStyle = x % 500 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, data.h); ctx.stroke();
    }
    for (let y = Math.floor(Math.max(0, vy0) / 100) * 100; y <= Math.min(data.h, vy1); y += 100) {
      ctx.strokeStyle = y % 500 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(data.w, y); ctx.stroke();
    }
  }
  // orta eksenler
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.setLineDash([12 / s, 8 / s]); ctx.lineWidth = 1 / s;
  ctx.beginPath(); ctx.moveTo(data.w / 2, 0); ctx.lineTo(data.w / 2, data.h); ctx.moveTo(0, data.h / 2); ctx.lineTo(data.w, data.h / 2); ctx.stroke();
  ctx.setLineDash([]);

  // koridorlar
  drawLanes(ctx, 1, alpha);
  // çalılar
  ctx.globalAlpha = alpha;
  for (const b of data.bushes) { pathShape(ctx, b); ctx.fillStyle = COL.bush; ctx.fill(); ctx.strokeStyle = COL.bushEdge; ctx.lineWidth = 2 / s; ctx.stroke(); }
  // duvarlar
  for (const w of data.walls) { pathShape(ctx, w); ctx.fillStyle = COL.wall; ctx.fill(); ctx.strokeStyle = COL.wallEdge; ctx.lineWidth = 2 / s; ctx.stroke(); }
  ctx.globalAlpha = 1;

  // yapılar
  const showStructs = true;
  if (showStructs) for (const st of structList()) {
    const r = structR(st.sub), mir = st.team === 1;
    ctx.globalAlpha = mir ? 0.4 : 1;
    ctx.beginPath(); ctx.arc(st.x, st.y, r, 0, Math.PI * 2);
    ctx.fillStyle = mir ? COL.t1 : COL.t0; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = (tool === 'struct' && sel && sel.kind === 'structs' && sel.i === st.i && !mir ? 3 : 1.5) / s; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = (13 / s) + 'px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(STRUCT_NAMES[st.i] || st.sub, st.x, st.y - r - 6 / s);
    ctx.globalAlpha = 1;
  }

  // harita sınırı
  if ($('cBorder').checked) { ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 2 / s; ctx.strokeRect(0, 0, data.w, data.h); }

  // eskiz
  if ($('skShow').checked) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const st of sketch) drawStroke(ctx, st);
  }

  // koridor noktaları
  if (tool === 'lane') {
    data.lanes.forEach((l, li) => {
      ctx.strokeStyle = li === laneSel ? '#ffffff' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = (li === laneSel ? 2 : 1) / s;
      ctx.beginPath(); l.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      if (li === laneSel) l.pts.forEach((p, i) => {
        ctx.fillStyle = i === lanePt ? '#ffd23f' : '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / s;
        ctx.beginPath(); ctx.arc(p[0], p[1], 7 / s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    });
  }

  // seçim ve tutamaçlar
  if (sel && sel.kind !== 'structs' && getShape(sel)) {
    const sh = getShape(sel);
    pathShape(ctx, sh); ctx.strokeStyle = COL.acc; ctx.lineWidth = 2.5 / s; ctx.setLineDash([8 / s, 5 / s]); ctx.stroke(); ctx.setLineDash([]);
    if (tool === 'select') for (const h of handlesOf(sh)) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / s;
      ctx.fillRect(h.x - 4.5 / s, h.y - 4.5 / s, 9 / s, 9 / s); ctx.strokeRect(h.x - 4.5 / s, h.y - 4.5 / s, 9 / s, 9 / s);
    }
  }

  // çizim önizlemesi
  if (drawing) {
    ctx.strokeStyle = COL.acc; ctx.lineWidth = 2 / s; ctx.setLineDash([8 / s, 5 / s]);
    if (drawing.shape === 'poly') {
      ctx.beginPath(); drawing.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      const m = snapP(mouse); ctx.lineTo(m[0], m[1]); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#fff';
      drawing.pts.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 4 / s, 0, Math.PI * 2); ctx.fill(); });
    } else {
      const pv = previewShape(); if (pv) { pathShape(ctx, pv); ctx.fillStyle = 'rgba(90,167,255,0.18)'; ctx.fill(); ctx.stroke(); }
    }
    ctx.setLineDash([]);
  }
  // silgi imleci
  if (tool === 'eraser') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 / s; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, eraseR(), 0, Math.PI * 2); ctx.stroke();
  }
}
function drawStroke(c, st) {
  if (!st.pts.length) return;
  c.strokeStyle = st.c; c.fillStyle = st.c; c.lineWidth = st.w;
  if (st.pts.length === 1) { c.beginPath(); c.arc(st.pts[0][0], st.pts[0][1], st.w / 2, 0, Math.PI * 2); c.fill(); return; }
  c.beginPath(); st.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
}
function previewShape() {
  if (!drawing) return null;
  const a = drawing.a, b = drawing.b;
  if (drawing.shape === 'rect') return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) };
  if (drawing.shape === 'circle') return { c: [a[0], a[1]], r: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  return null;
}

/* ---------- tutamaçlar ---------- */
function handlesOf(sh) {
  if (isCircle(sh)) return [{ id: 'r', x: sh.c[0] + sh.r, y: sh.c[1] }];
  if (isPoly(sh)) return sh.poly.map((p, i) => ({ id: 'v' + i, x: p[0], y: p[1] }));
  const l = sh.x, t = sh.y, r = sh.x + sh.w, b = sh.y + sh.h, mx = (l + r) / 2, my = (t + b) / 2;
  return [['nw', l, t], ['n', mx, t], ['ne', r, t], ['e', r, my], ['se', r, b], ['s', mx, b], ['sw', l, b], ['w', l, my]].map(a => ({ id: a[0], x: a[1], y: a[2] }));
}
function hitHandle(sh, p) {
  const tol = 9 / view.s;
  let best = null, bd = tol;
  for (const h of handlesOf(sh)) { const d = Math.hypot(h.x - p[0], h.y - p[1]); if (d <= bd) { bd = d; best = h; } }
  return best;
}
function applyHandle(orig, id, p) {
  const o = clone(orig);
  if (isCircle(o)) { o.r = Math.max(5, Math.round(Math.hypot(p[0] - o.c[0], p[1] - o.c[1]))); return o; }
  if (isPoly(o)) { o.poly[+id.slice(1)] = [p[0], p[1]]; return o; }
  let l = o.x, t = o.y, r = o.x + o.w, b = o.y + o.h;
  if (id.includes('w')) l = p[0]; if (id.includes('e')) r = p[0];
  if (id.includes('n')) t = p[1]; if (id.includes('s')) b = p[1];
  o.x = Math.min(l, r); o.y = Math.min(t, b); o.w = Math.abs(r - l); o.h = Math.abs(b - t);
  return o;
}
function pickShape(p) {
  for (const kind of ['bushes', 'walls']) {
    const arr = data[kind];
    for (let i = arr.length - 1; i >= 0; i--) if (hitShape(arr[i], p[0], p[1])) return { kind, i };
  }
  return null;
}
function pickStruct(p) {
  let best = null, bd = 1e9;
  data.structs.forEach((st, i) => {
    const d = Math.hypot(st[1] - p[0], st[2] - p[1]);
    if (d <= Math.max(structR(st[0]), 14 / view.s) && d < bd) { bd = d; best = i; }
  });
  return best;
}

/* ---------- eskiz ---------- */
const eraseR = () => Math.max(+$('skWidth').value * 1.5, 16 / view.s);
function eraseAt(p) {
  const r = eraseR(); let n = sketch.length;
  sketch = sketch.filter(st => {
    if (st.pts.length === 1) return Math.hypot(st.pts[0][0] - p[0], st.pts[0][1] - p[1]) > r + st.w / 2;
    for (let i = 1; i < st.pts.length; i++) if (distSeg(p[0], p[1], st.pts[i - 1], st.pts[i]).d <= r + st.w / 2) return false;
    return true;
  });
  if (sketch.length !== n) { saveLS('moba_sketch', sketch); draw(); }
}

/* ---------- işaretçi olayları ---------- */
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (e.button === 1 || (e.button === 0 && spaceDown)) { pan = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy }; e.preventDefault(); return; }
  const p = toWorld(e); mouse = { x: p[0], y: p[1] };
  if (e.button === 2) return rightClick(p);
  if (e.button !== 0) return;
  const sp = snapP(p);

  if (tool === 'select') {
    const sh = getShape(sel);
    if (sh && sel.kind !== 'structs') {
      const h = hitHandle(sh, p);
      if (h) { pushUndo(); drag = { type: 'handle', id: h.id, orig: clone(sh) }; return; }
    }
    sel = pickShape(p);
    if (sel) { pushUndo(); drag = { type: 'move', start: p, orig: clone(getShape(sel)) }; }
    renderProps(); draw();
  } else if (toolInfo[tool] && toolInfo[tool].shape) {
    const ti = toolInfo[tool];
    if (ti.shape === 'poly') {
      if (!drawing) drawing = { kind: ti.kind, shape: 'poly', pts: [] };
      const last = drawing.pts[drawing.pts.length - 1], first = drawing.pts[0];
      if (drawing.pts.length >= 3 && Math.hypot(first[0] - p[0], first[1] - p[1]) < 10 / view.s) { finishPoly(); return; }
      if (!last || Math.hypot(last[0] - sp[0], last[1] - sp[1]) > 4 / view.s) drawing.pts.push(sp);
    } else drawing = { kind: ti.kind, shape: ti.shape, a: sp, b: sp };
    draw();
  } else if (tool === 'lane') {
    laneDown(p, sp);
  } else if (tool === 'struct') {
    const i = pickStruct(p);
    sel = i === null ? null : { kind: 'structs', i };
    if (sel) { pushUndo(); drag = { type: 'struct', dx: data.structs[i][1] - p[0], dy: data.structs[i][2] - p[1] }; }
    renderProps(); draw();
  } else if (tool === 'pen') {
    stroke = { c: $('skColor').value, w: +$('skWidth').value, pts: [[Math.round(p[0]), Math.round(p[1])]] };
    sketch.push(stroke); draw();
  } else if (tool === 'eraser') {
    stroke = 'erase'; eraseAt(p);
  }
});

function laneDown(p, sp) {
  const tol = 10 / view.s;
  const order = data.lanes.map((_, i) => i).sort((a, b) => (a === laneSel ? -1 : 0) - (b === laneSel ? -1 : 0));
  for (const li of order) {
    const pts = data.lanes[li].pts;
    for (let i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) <= tol) {
      laneSel = li; lanePt = i; pushUndo(); drag = { type: 'lanept' }; renderLanes(); renderProps(); draw(); return;
    }
  }
  const pts = data.lanes[laneSel] && data.lanes[laneSel].pts;
  if (pts) for (let i = 1; i < pts.length; i++) {
    if (distSeg(p[0], p[1], pts[i - 1], pts[i]).d <= tol) {
      pushUndo(); pts.splice(i, 0, [snapV(p[0]), snapV(p[1])]); lanePt = i; drag = { type: 'lanept' }; changed(); return;
    }
  }
  lanePt = -1; draw();
}

function rightClick(p) {
  const tol = 10 / view.s;
  if (drawing && drawing.shape === 'poly') { drawing.pts.pop(); if (!drawing.pts.length) drawing = null; draw(); return; }
  if (tool === 'lane') {
    const pts = data.lanes[laneSel] && data.lanes[laneSel].pts;
    if (!pts) return;
    for (let i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) <= tol) {
      if (pts.length <= 2) return msg('Koridorda en az 2 nokta kalmalı.', 'err');
      pushUndo(); pts.splice(i, 1); lanePt = -1; changed(); return;
    }
  } else if (tool === 'select') {
    const sh = getShape(sel);
    if (sh && isPoly(sh)) {
      const h = hitHandle(sh, p);
      if (h) { pushUndo(); sh.poly.splice(+h.id.slice(1), 1); changed(); }
    }
  }
}

cv.addEventListener('pointermove', e => {
  if (pan) { view.ox = pan.ox + e.clientX - pan.x; view.oy = pan.oy + e.clientY - pan.y; draw(); return; }
  const p = toWorld(e); mouse = { x: p[0], y: p[1] };
  $('coord').textContent = 'x: ' + Math.round(p[0]) + '  y: ' + Math.round(p[1]);
  const sp = snapP(p);
  if (drag) {
    if (drag.type === 'move') {
      const sh = drag.orig, a = anchor(sh);
      const na = snapP([a[0] + p[0] - drag.start[0], a[1] + p[1] - drag.start[1]]);
      setShape(sel, moved(sh, na[0] - a[0], na[1] - a[1]));
    } else if (drag.type === 'handle') setShape(sel, applyHandle(drag.orig, drag.id, sp));
    else if (drag.type === 'lanept') data.lanes[laneSel].pts[lanePt] = [sp[0], sp[1]];
    else if (drag.type === 'struct') { const q = snapP([p[0] + drag.dx, p[1] + drag.dy]); data.structs[sel.i][1] = q[0]; data.structs[sel.i][2] = q[1]; }
    changed(true); updatePropValues(); return;
  }
  if (drawing && drawing.shape !== 'poly') { drawing.b = sp; draw(); return; }
  if (stroke === 'erase') { eraseAt(p); return; }
  if (stroke) {
    const l = stroke.pts[stroke.pts.length - 1];
    if (Math.hypot(l[0] - p[0], l[1] - p[1]) > 2 / view.s) { stroke.pts.push([Math.round(p[0]), Math.round(p[1])]); draw(); }
    return;
  }
  if (drawing || tool === 'eraser') draw();
});
cv.addEventListener('pointerup', e => {
  if (pan) { pan = null; return; }
  if (drag) { popUndoIfNoChange(); drag = null; changed(); return; }
  if (stroke && stroke !== 'erase') { saveLS('moba_sketch', sketch); }
  stroke = null;
  if (drawing && drawing.shape !== 'poly') {
    const sh = previewShape();
    const ok = sh && (sh.r !== undefined ? sh.r >= 10 : (sh.w >= 10 && sh.h >= 10));
    const kind = drawing.kind; drawing = null;
    if (ok) { pushUndo(); data[kind].push(sh); sel = { kind, i: data[kind].length - 1 }; changed(); }
    else draw();
  }
});
cv.addEventListener('dblclick', e => {
  if (drawing && drawing.shape === 'poly') { finishPoly(); return; }
  if (tool === 'select') {
    const sh = getShape(sel);
    if (sh && isPoly(sh)) {
      const p = toWorld(e), tol = 10 / view.s;
      for (let i = 0; i < sh.poly.length; i++) {
        const q = distSeg(p[0], p[1], sh.poly[i], sh.poly[(i + 1) % sh.poly.length]);
        if (q.d <= tol) { pushUndo(); sh.poly.splice(i + 1, 0, [Math.round(q.q[0]), Math.round(q.q[1])]); changed(); return; }
      }
    }
  }
});
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const wx = (mx - view.ox) / view.s, wy = (my - view.oy) / view.s;
  view.s = Math.max(0.03, Math.min(4, view.s * Math.pow(1.0015, -e.deltaY)));
  view.ox = mx - wx * view.s; view.oy = my - wy * view.s;
  draw();
}, { passive: false });

function finishPoly() {
  if (!drawing || drawing.shape !== 'poly') return;
  if (drawing.pts.length < 3) { msg('Çokgen için en az 3 köşe gerekli.', 'err'); return; }
  const kind = drawing.kind, pts = drawing.pts; drawing = null;
  pushUndo(); data[kind].push({ poly: pts }); sel = { kind, i: data[kind].length - 1 }; changed();
}

/* ---------- klavye ---------- */
window.addEventListener('keydown', e => {
  const t = e.target, inField = t && (t.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'range' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (ctrl && k === 's') { e.preventDefault(); save(); return; }
  if (inField) { if (k === 'escape') t.blur(); return; }
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }
  if (ctrl && k === 'd') { e.preventDefault(); duplicate(); return; }
  if (ctrl) return;
  if (e.key === ' ') { e.preventDefault(); spaceDown = true; cv.style.cursor = 'grab'; return; }
  if (k === 'enter') { finishPoly(); return; }
  if (k === 'escape') { if (drawing) { drawing = null; draw(); } else { sel = null; lanePt = -1; renderProps(); draw(); } return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSel(); return; }
  if (keyTool[k]) setTool(keyTool[k]);
});
window.addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; cv.style.cursor = tool === 'select' ? 'default' : 'crosshair'; } });
window.addEventListener('beforeunload', e => { if (JSON.stringify(data) !== savedJson) { e.preventDefault(); e.returnValue = ''; } });

function deleteSel() {
  if (tool === 'lane' && lanePt >= 0) {
    const pts = data.lanes[laneSel].pts;
    if (pts.length <= 2) return msg('Koridorda en az 2 nokta kalmalı.', 'err');
    pushUndo(); pts.splice(lanePt, 1); lanePt = -1; changed(); return;
  }
  if (!sel || sel.kind === 'structs') return;
  pushUndo(); data[sel.kind].splice(sel.i, 1); sel = null; changed();
}
function duplicate() {
  if (!sel || sel.kind === 'structs') return;
  const sh = getShape(sel); if (!sh) return;
  pushUndo(); data[sel.kind].push(moved(sh, 100, 100)); sel = { kind: sel.kind, i: data[sel.kind].length - 1 }; changed();
}

/* ---------- ayna ---------- */
function mirrorSel(axis) {
  if (!sel || sel.kind === 'structs' || !getShape(sel)) return msg('Önce bir duvar ya da çalı seç.', 'err');
  pushUndo(); data[sel.kind].push(mirrored(getShape(sel), axis)); sel = { kind: sel.kind, i: data[sel.kind].length - 1 }; changed();
  msg('Ayna kopyası oluşturuldu.', 'ok');
}
function mirrorHalf() {
  if (!confirm('Sağ yarıdaki (merkezi x = w/2 sağında kalan) bütün duvar ve çalılar silinecek, yerine sol yarının aynası konacak. Devam edilsin mi?')) return;
  pushUndo();
  const mid = data.w / 2, cx = s => { const b = bbox(s); return (b[0] + b[2]) / 2; };
  for (const kind of ['walls', 'bushes']) {
    const keep = data[kind].filter(s => cx(s) <= mid);
    const add = keep.filter(s => cx(s) < mid).map(s => mirrored(s, 'v'));
    data[kind] = keep.concat(add);
  }
  sel = null; changed(); msg('Sol yarı sağa aynalandı.', 'ok');
}

/* ---------- özellik paneli ---------- */
function numField(label, value, onSet) {
  const wrap = document.createElement('span');
  const l = document.createElement('label'); l.textContent = label + ' ';
  const inp = document.createElement('input'); inp.type = 'number'; inp.value = value; inp.step = 'any';
  inp.addEventListener('change', () => {
    const v = parseFloat(inp.value); if (!Number.isFinite(v)) { renderProps(); return; }
    pushUndo(); onSet(Math.round(v * 100) / 100); changed(true); renderProps();
  });
  wrap.appendChild(l); wrap.appendChild(inp);
  return wrap;
}
function renderProps() {
  const box = $('props'); box.innerHTML = '';
  if (tool === 'lane') {
    const l = data.lanes[laneSel];
    if (l && lanePt >= 0 && l.pts[lanePt]) {
      box.appendChild(rowEl(`Koridor "${l.name}" noktası ${lanePt + 1}/${l.pts.length}`));
      const r = document.createElement('div'); r.className = 'row';
      r.appendChild(numField('x', l.pts[lanePt][0], v => l.pts[lanePt][0] = v));
      r.appendChild(numField('y', l.pts[lanePt][1], v => l.pts[lanePt][1] = v));
      box.appendChild(r);
    } else box.appendChild(rowEl('Koridor aracı: nokta sürükle, kenara tıkla nokta ekle, sağ tık sil.', true));
    return;
  }
  if (!sel || !getShape(sel)) { box.appendChild(rowEl('Bir şekil seç.', true)); return; }
  const sh = getShape(sel);
  const nm = sel.kind === 'walls' ? 'Duvar' : sel.kind === 'bushes' ? 'Çalı' : 'Yapı';
  if (sel.kind === 'structs') {
    box.appendChild(rowEl(`${STRUCT_NAMES[sel.i]} (takım 0, ${sh[0]}); takım 1 aynası x = w - x`));
    const r = document.createElement('div'); r.className = 'row';
    r.appendChild(numField('x', sh[1], v => sh[1] = v)); r.appendChild(numField('y', sh[2], v => sh[2] = v));
    box.appendChild(r); return;
  }
  const tname = isCircle(sh) ? 'daire' : isPoly(sh) ? 'çokgen' : 'dikdörtgen';
  box.appendChild(rowEl(`${nm} ${sel.i + 1}, ${tname}`));
  const r = document.createElement('div'); r.className = 'row'; box.appendChild(r);
  if (isCircle(sh)) {
    r.appendChild(numField('x', sh.c[0], v => sh.c[0] = v)); r.appendChild(numField('y', sh.c[1], v => sh.c[1] = v)); r.appendChild(numField('r', sh.r, v => sh.r = Math.max(1, v)));
  } else if (isPoly(sh)) {
    sh.poly.forEach((p, i) => {
      const d = document.createElement('div'); d.className = 'vtx';
      const idx = document.createElement('small'); idx.textContent = (i + 1) + '.'; idx.style.width = '22px'; d.appendChild(idx);
      d.appendChild(numField('x', p[0], v => p[0] = v)); d.appendChild(numField('y', p[1], v => p[1] = v));
      const del = document.createElement('button'); del.textContent = 'Sil'; del.onclick = () => { pushUndo(); sh.poly.splice(i, 1); changed(); };
      d.appendChild(del); box.appendChild(d);
    });
    const add = document.createElement('button'); add.textContent = 'Köşe ekle';
    add.onclick = () => {
      pushUndo(); const a = sh.poly[sh.poly.length - 1], b = sh.poly[0];
      sh.poly.push(a && b ? [Math.round((a[0] + b[0]) / 2) + 50, Math.round((a[1] + b[1]) / 2) + 50] : [0, 0]); changed();
    };
    box.appendChild(add);
  } else {
    r.appendChild(numField('x', sh.x, v => sh.x = v)); r.appendChild(numField('y', sh.y, v => sh.y = v));
    r.appendChild(numField('w', sh.w, v => sh.w = Math.max(1, v))); r.appendChild(numField('h', sh.h, v => sh.h = Math.max(1, v)));
  }
}
function rowEl(text, dim) { const d = document.createElement('div'); d.className = 'row'; const s = document.createElement(dim ? 'small' : 'span'); s.textContent = text; d.appendChild(s); return d; }
function updatePropValues() {
  // sürükleme sırasında girişleri yerinde güncelle
  const ins = $('props').querySelectorAll('input');
  if (!ins.length) return;
  const vals = [];
  if (tool === 'lane') { const p = data.lanes[laneSel] && data.lanes[laneSel].pts[lanePt]; if (p) vals.push(p[0], p[1]); }
  else if (sel && getShape(sel)) {
    const sh = getShape(sel);
    if (sel.kind === 'structs') vals.push(sh[1], sh[2]);
    else if (isCircle(sh)) vals.push(sh.c[0], sh.c[1], sh.r);
    else if (isPoly(sh)) sh.poly.forEach(p => vals.push(p[0], p[1]));
    else vals.push(sh.x, sh.y, sh.w, sh.h);
  }
  if (vals.length !== ins.length) { renderProps(); return; }
  ins.forEach((inp, i) => inp.value = vals[i]);
}

/* ---------- koridor listesi ---------- */
function renderLanes() {
  const box = $('laneList'); box.innerHTML = '';
  data.lanes.forEach((l, i) => {
    const d = document.createElement('div'); d.className = 'lane' + (i === laneSel ? ' sel' : '');
    d.addEventListener('click', () => { if (laneSel !== i) { laneSel = i; lanePt = -1; renderLanes(); renderProps(); draw(); } });
    const r1 = document.createElement('div'); r1.className = 'row';
    const name = document.createElement('input'); name.type = 'text'; name.value = l.name || ''; name.style.flex = '1';
    name.addEventListener('change', () => { pushUndo(); l.name = name.value; changed(true); });
    const del = document.createElement('button'); del.textContent = 'Sil';
    del.onclick = ev => {
      ev.stopPropagation();
      if (!confirm(`"${l.name}" koridoru silinsin mi?`)) return;
      pushUndo(); data.lanes.splice(i, 1); laneSel = Math.max(0, Math.min(laneSel, data.lanes.length - 1)); lanePt = -1; renderLanes(); changed();
    };
    r1.appendChild(name); r1.appendChild(del);
    const r2 = document.createElement('div'); r2.className = 'row';
    const act = document.createElement('input'); act.type = 'checkbox'; act.checked = !!l.active;
    act.addEventListener('change', () => { pushUndo(); l.active = act.checked; changed(true); });
    const al = document.createElement('label'); al.appendChild(act); al.append(' Aktif');
    const wd = numField('Genişlik', l.width, v => l.width = Math.max(1, v)); wd.querySelector('input').style.width = '64px';
    wd.querySelector('input').addEventListener('click', ev => ev.stopPropagation());
    const idl = document.createElement('small'); idl.textContent = 'id: ' + l.id + ', ' + l.pts.length + ' nokta';
    r2.appendChild(al); r2.appendChild(wd);
    d.appendChild(r1); d.appendChild(r2); d.appendChild(idl);
    box.appendChild(d);
  });
  if (!data.lanes.length) box.appendChild(rowEl('Koridor yok.', true));
}
$('bLaneAdd').onclick = () => {
  pushUndo();
  let n = data.lanes.length + 1; while (data.lanes.some(l => l.id === 'lane' + n)) n++;
  const y = Math.round(data.h / 2 / 25) * 25;
  data.lanes.push({ id: 'lane' + n, name: 'Koridor ' + (data.lanes.length + 1), active: false, width: 400, pts: [[320, y], [Math.round(data.w / 2), y], [data.w - 320, y]] });
  laneSel = data.lanes.length - 1; lanePt = -1; renderLanes(); changed();
};

/* ---------- harita boyutu ---------- */
for (const id of ['mapW', 'mapH']) $(id).addEventListener('change', () => {
  const v = Math.round(parseFloat($(id).value));
  if (!(v >= 100)) { $(id).value = id === 'mapW' ? data.w : data.h; return; }
  pushUndo(); if (id === 'mapW') data.w = v; else data.h = v; changed(true);
});

/* ---------- arka plan ---------- */
function setBgFromBlob(blob) {
  if (!blob || !/^image\/(png|jpeg)$/.test(blob.type)) { msg('PNG ya da JPG görsel gerekli.', 'err'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      let url = fr.result, im = img;
      const MAX = 3000;
      if (img.width > MAX || img.height > MAX) {
        const r = MAX / Math.max(img.width, img.height), c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        url = c.toDataURL(blob.type, 0.9);
        const im2 = new Image(); im2.onload = () => finishBg(im2, url); im2.src = url; return;
      }
      finishBg(im, url);
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(blob);
}
function finishBg(img, url) {
  bgImg = img; bgData = url;
  const ok = saveLS('moba_bg', url);
  bgInfo(ok ? '' : 'Görsel çok büyük, tarayıcıda saklanamadı. Yalnızca bu oturumda kalır.');
  if (!ok) msg('Arka plan görseli çok büyük, kalıcı saklanamadı.', 'err');
  bgOpts.show = true; $('bgShow').checked = true; draw();
}
function bgInfo(extra) {
  $('bgInfo').innerHTML = '';
  const s = document.createElement('small');
  s.textContent = bgImg ? `${bgImg.width} x ${bgImg.height} px, harita boyutuna sığdırıldı. ${extra || ''}` : 'Görsel yok.';
  $('bgInfo').appendChild(s);
}
$('bgFile').addEventListener('change', e => { setBgFromBlob(e.target.files[0]); e.target.value = ''; });
window.addEventListener('paste', e => {
  for (const it of (e.clipboardData && e.clipboardData.items) || []) if (it.type.startsWith('image/')) { e.preventDefault(); setBgFromBlob(it.getAsFile()); return; }
});
function saveBgOpts() { saveLS('moba_bg_opts', bgOpts); }
$('bgShow').onchange = e => { bgOpts.show = e.target.checked; saveBgOpts(); draw(); };
$('bgKeep').onchange = e => { bgOpts.keep = e.target.checked; saveBgOpts(); draw(); };
$('bgAlpha').oninput = e => { bgOpts.alpha = +e.target.value; saveBgOpts(); draw(); };
$('bgClear').onclick = () => { bgImg = null; bgData = null; try { localStorage.removeItem('moba_bg'); } catch {} bgInfo(); draw(); };
$('bgShow').checked = bgOpts.show; $('bgKeep').checked = bgOpts.keep; $('bgAlpha').value = bgOpts.alpha;
{
  const u = loadLS('moba_bg', null);
  if (typeof u === 'string' && u.startsWith('data:')) { const im = new Image(); im.onload = () => { bgImg = im; bgData = u; bgInfo(); draw(); }; im.src = u; }
  else { try { const raw = localStorage.getItem('moba_bg'); if (raw && raw.startsWith('data:')) { const im = new Image(); im.onload = () => { bgImg = im; bgData = raw; bgInfo(); draw(); }; im.src = raw; } } catch {} }
}

/* ---------- eskiz düğmeleri ---------- */
$('bSkClear').onclick = () => { if (sketch.length && !confirm('Bütün eskiz silinsin mi?')) return; sketch = []; saveLS('moba_sketch', sketch); draw(); };
$('skShow').onchange = draw; $('skWidth').oninput = draw;

/* ---------- denetim, kaydetme, dışa aktarma ---------- */
function check() {
  const w = [];
  const inWall = (x, y) => data.walls.some(s => hitShape(s, x, y));
  for (const st of structList()) {
    if (inWall(st.x, st.y)) w.push(`${STRUCT_NAMES[st.i] || st.sub} (takım ${st.team}) duvarın içinde (${Math.round(st.x)}, ${Math.round(st.y)}).`);
  }
  data.lanes.forEach(l => l.pts.forEach((p, i) => { if (inWall(p[0], p[1])) w.push(`"${l.name}" koridorunun ${i + 1}. noktası duvarın içinde (${p[0]}, ${p[1]}).`); }));
  for (const kind of ['walls', 'bushes']) data[kind].forEach((s, i) => {
    const nm = (kind === 'walls' ? 'Duvar ' : 'Çalı ') + (i + 1);
    if (isPoly(s) && s.poly.length < 3) w.push(`${nm}: çokgenin 3'ten az köşesi var.`);
    const b = bbox(s), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    if (cx < 0 || cy < 0 || cx > data.w || cy > data.h) w.push(`${nm}: harita dışında.`);
  });
  data.structs.forEach((st, i) => { if (st[1] < 0 || st[1] > data.w || st[2] < 0 || st[2] > data.h) w.push(`${STRUCT_NAMES[i]}: harita dışında.`); });
  return w;
}
function showWarns(w) {
  const box = $('warns'); box.innerHTML = '';
  if (!w.length) { const d = document.createElement('div'); d.className = 'none'; d.textContent = 'Uyarı yok.'; box.appendChild(d); return; }
  for (const t of w) { const d = document.createElement('div'); d.textContent = t; box.appendChild(d); }
}
$('bCheck').onclick = () => { const w = check(); showWarns(w); msg(w.length ? w.length + ' uyarı var.' : 'Uyarı yok.', w.length ? 'err' : 'ok'); };

let msgTimer = 0;
function msg(t, cls) { const m = $('msg'); m.textContent = t; m.className = cls || ''; clearTimeout(msgTimer); msgTimer = setTimeout(() => { m.textContent = ''; m.className = ''; }, 7000); }

async function save() {
  const w = check(); showWarns(w);
  const body = JSON.stringify(data);
  try {
    const r = await fetch('/api/map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { savedJson = body; changed(true); msg('Kaydedildi.' + (w.length ? ` (${w.length} uyarı var)` : ''), 'ok'); }
    else msg('Kaydedilemedi: ' + (j.error || r.status), 'err');
  } catch (e) { msg('Kaydedilemedi: sunucuya ulaşılamadı (' + e.message + ')', 'err'); }
}
$('bSave').onclick = save;
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
$('bJson').onclick = () => download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'map_data.json');
$('bPng').onclick = () => {
  const k = 0.25, c = document.createElement('canvas');
  c.width = Math.round(data.w * k); c.height = Math.round(data.h * k);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.scale(k, k);
  const solid = { wall: '#3a3530', bush: '#3f7a35', lane: COL.lane };
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of data.lanes) {
    if (l.pts.length < 2) continue;
    g.strokeStyle = solid.lane; g.lineWidth = l.width; g.beginPath(); l.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  }
  for (const b of data.bushes) { pathShape(g, b); g.fillStyle = solid.bush; g.fill(); }
  for (const s of data.walls) { pathShape(g, s); g.fillStyle = solid.wall; g.fill(); }
  for (const st of structList()) {
    g.beginPath(); g.arc(st.x, st.y, structR(st.sub), 0, Math.PI * 2); g.fillStyle = st.team ? COL.t1 : COL.t0; g.fill();
  }
  c.toBlob(b => download(b, 'harita_paint.png'), 'image/png');
  msg(`PNG indirildi (${c.width} x ${c.height}).`, 'ok');
};

/* ---------- üst çubuk bağlantıları ---------- */
$('bUndo').onclick = undo; $('bRedo').onclick = redo;
$('bMirV').onclick = () => mirrorSel('v'); $('bMirH').onclick = () => mirrorSel('h'); $('bMirHalf').onclick = mirrorHalf;
$('bFit').onclick = fitView;
for (const id of ['cGrid', 'cBorder', 'cDim']) $(id).onchange = draw;

/* ---------- başlangıç ---------- */
renderAll(); bgInfo(); setTool('select');
requestAnimationFrame(() => { resize(); fitView(); });

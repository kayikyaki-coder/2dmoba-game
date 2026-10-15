/* Ana menü, duraklatma menüsü ve sonuç ekranı (HTML katmanları). Oyun mantığına dokunmaz, yalnız settings yazar ve main.js geri çağrılarını çalıştırır. */
import { STATS, MAX_LEVEL } from './data.js';
import { ITEMS, PARTS } from './items.js';
import { S, settings, itemsValue } from './sim.js';
import { GAME_TITLE, HERO_NAMES, HERO_INFO } from './names.js';
import { drawToken } from './art.js';
import { applyCssVars } from './palette.js';
import { openBuildEditor, autoBuyOn, isCustom } from './autobuy.js';
applyCssVars();

/* Modlar: takım başına yuva sayısı (2v2: sen + dost bot, rakip 2 bot). */
export const MODES = {
  '1v1': { label:'1v1', sub:'Tek rakip, tek koridor', perTeam:1, active:true },
  '2v2': { label:'2v2', sub:'Takım başına 2 kahraman', perTeam:2, active:true }
};
export const LEVELS = [
  { id:'easy',   label:'Kolay', sub:'Hatalı, geç tepki', active:true },
  { id:'medium', label:'Orta',  sub:'Hızlı tepki, az hata', active:true },
  { id:'hard',   label:'Zor',   sub:'Kombo, kule oyunu', active:true },
  { id:'expert', label:'Uzman', sub:'Hatırlar, kusursuza yakın', active:true }
];
const HERO_IDS = Object.keys(HERO_NAMES);
const KEY = 'moba2d_menu_v1';

/* Takım kurma seçimleri. Bot yuvalarında yuva başına zorluk (lvAlly, lvFoe, lvFoe2; varsayılan Orta). */
export const SLOTS = { hero:{ team:0, lv:null }, ally:{ team:0, lv:'lvAlly' }, foe:{ team:1, lv:'lvFoe' }, foe2:{ team:1, lv:'lvFoe2' } };
export const pick = { mode:'1v1', hero:'archer', foe:'random', ally:'random', foe2:'random', lvAlly:'medium', lvFoe:'medium', lvFoe2:'medium' };
const lvOk = v => LEVELS.some(l => l.id === v && l.active);
try {
  const o = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (o) {
    if (MODES[o.mode] && MODES[o.mode].active) pick.mode = o.mode;
    if (HERO_NAMES[o.hero]) pick.hero = o.hero;
    if (o.foe === 'random' || HERO_NAMES[o.foe]) pick.foe = o.foe;
    if (o.ally === 'random' || HERO_NAMES[o.ally]) pick.ally = o.ally;
    if (o.foe2 === 'random' || HERO_NAMES[o.foe2]) pick.foe2 = o.foe2;
    for (const k of ['lvAlly', 'lvFoe', 'lvFoe2']) { if (lvOk(o[k])) pick[k] = o[k]; else if (lvOk(o.level)) pick[k] = o.level; }   // eski kayıt: tek zorluk
    for (const k of ['fog', 'waves', 'showHit']) if (typeof o[k] === 'boolean') settings[k] = o[k];
    if (o.aimMode === 'track' || o.aimMode === 'lock') settings.aimMode = o.aimMode;
  }
} catch (e) { /* kayıt yoksa varsayılanlar */ }
function applyLevels() { settings.botLevels = { ally:pick.lvAlly, foe:pick.lvFoe, foe2:pick.lvFoe2 }; settings.botLevel = pick.lvFoe; }
applyLevels();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...pick, fog:settings.fog, waves:settings.waves, showHit:settings.showHit, aimMode:settings.aimMode })); } catch (e) { /* sorun değil */ }
}

const cb = { start(){}, resume(){}, restart(){}, toMenu(){}, levelUp(){} };
export function bindMenu(fns) { Object.assign(cb, fns); }

const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const root = document.getElementById('menuRoot');

/* ---- portreler ---- */
/* Oyundaki token çizimi (art.js drawToken; portre görseli yüklüyse onu da kullanır) */
function tokenCanvas(id, n) {
  const c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.className = 'pt-tok'; c.width = c.height = Math.round(n * dpr); c.style.width = c.style.height = n + 'px';
  const g = c.getContext('2d'); g.scale(dpr, dpr); drawToken(g, id, n / 2, n / 2, n / 2 - 2, {});
  return c;
}
/* Portre: Higgsfield görseli (assets/portre); yüklenemezse token çizimi */
function portraitEl(id, cls, n, big) {
  const im = document.createElement('img'); im.className = cls; im.alt = ''; im.src = 'assets/portre/' + (big ? 'big/' : '') + id + '.jpg';   // big: 768 px (yuva kartları)
  im.onerror = () => im.replaceWith(tokenCanvas(id, n || 46));
  return im;
}
/* ---- ayarlar bloğu (ana menü ve duraklatma menüsünde ortak) ---- */
export function settingsBlock() {
  const box = $('div', 'set');
  const chk = (key, label) => {
    const l = $('label', 'chk'), c = $('input'); c.type = 'checkbox'; c.checked = !!settings[key];
    c.addEventListener('change', () => { settings[key] = c.checked; save(); });
    l.append(c, $('span', '', label)); return l;
  };
  box.append(chk('fog', 'Savaş sisi'), chk('waves', 'Minyon dalgaları'), chk('showHit', 'Menzil ve hitbox'));
  const sel = (label, opts, get, set) => {
    const l = $('label', 'sel'); l.append($('span', '', label));
    const s = $('select');
    for (const [v, t] of opts) { const o = $('option', '', t); o.value = v; s.append(o); }
    s.value = get(); s.addEventListener('change', () => { set(s.value); save(); });
    l.append(s); return l;
  };
  box.append(sel('Nişan', [['track', 'Hazırlıkta fareyi takip'], ['lock', 'Tık anında kilitle']], () => settings.aimMode, v => { settings.aimMode = v; }));
  box.append(sel('Bot davranışı', [['lane', 'Koridor yapay zekası'], ['duel', 'Düello (direkt saldırır)'], ['idle', 'Hareketsiz']], () => settings.botMode, v => { settings.botMode = v; }));
  const lv = [];
  for (let i = 1; i <= MAX_LEVEL; i++) lv.push([String(i), String(i)]);
  box.append(sel('Başlangıç seviyesi', lv, () => String(settings.startLevel), v => { settings.startLevel = +v; }));
  const g = $('label', 'sel'); g.append($('span', '', 'Ek saldırı hızı'));
  const rg = $('input'); rg.type = 'range'; rg.min = 0; rg.max = 150; rg.step = 5; rg.value = Math.round(settings.asBonus * 100);
  const vl = $('span', 'rv', '%' + rg.value);
  rg.addEventListener('input', () => { settings.asBonus = rg.value / 100; vl.textContent = '%' + rg.value; });
  const wrap = $('span', 'rw'); wrap.append(rg, vl); g.append(wrap); box.append(g);
  return box;
}

/* ---- ana menü ---- */
let menuEl = null;
/* Menü arka plan videosu (Higgsfield MiniMax H3 Max, 5 sn döngü). Yüklenmezse ya da hareket azaltma açıksa kaldırılır, CSS görseli kalır. */
function menuVideo(el) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const v = document.createElement('video');
  v.className = 'mvid'; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto';
  v.poster = 'assets/menu_bg2.jpg';
  for (const [src, type] of [['assets/menu_loop.webm', 'video/webm'], ['assets/menu_loop.mp4', 'video/mp4']]) {
    const s = document.createElement('source'); s.src = src; s.type = type; v.append(s);
  }
  v.lastChild.addEventListener('error', () => v.remove());   // iki kaynak da açılmazsa
  el.append(v);
  const p = v.play(); if (p && p.catch) p.catch(() => {});
}
function buildMenu() {
  menuEl = $('div', 'ov menu'); menuEl.id = 'menu';
  menuVideo(menuEl);
  const side = $('aside', 'side');
  side.append($('h1', 'ttl', esc(GAME_TITLE)), $('div', 'tag', '2D MOBA prototipi'));
  // mod
  const m = $('section', 'blk'); m.append($('h2', '', 'Mod'));
  const mg = $('div', 'modes');
  for (const [id, M] of Object.entries(MODES)) {
    const b = $('button', 'mode' + (M.active ? '' : ' off')); b.dataset.mode = id; b.disabled = !M.active;
    b.innerHTML = '<b>' + esc(M.label) + '</b><small>' + esc(M.sub) + '</small>' + (M.active ? '' : '<em>Yakında</em>');
    b.addEventListener('click', () => { pick.mode = id; save(); sync(); });
    mg.append(b);
  }
  m.append(mg); side.append(m);
  // otomatik alım
  const ab = $('section', 'blk'); ab.append($('h2', '', 'Otomatik alım'));
  const abb = $('button', 'abbtn'); abb.id = 'abBtn'; abb.addEventListener('click', () => openBuildEditor(pick.hero, () => sync()));
  ab.append(abb, $('div', 'note', 'Seçtiğin kahramanın eşya sırası. Açıksa üste altın yettikçe sırayla alınır.')); side.append(ab);
  // ayarlar
  const a = $('section', 'blk'); a.append($('h2', '', 'Ayarlar'), settingsBlock()); side.append(a);

  // takım kurma: solda takımın, sağda rakip; yuvaya tıklayınca kahraman seçimi açılır
  const main = $('main', 'mainc');
  const lob = $('div', 'lobby');
  const col = (team) => { const c = $('section', 'tcol t' + team); c.append($('h2', 'th', team === 0 ? 'Takımın' : 'Rakip takım')); const l = $('div', 'slots'); l.id = 'slots' + team; c.append(l); return c; };
  lob.append(col(0), $('div', 'vs', 'VS'), col(1));
  main.append(lob, $('div', 'note lnote', 'Yuvaya tıkla: kahraman seç. Bot yuvalarında zorluk yuva başına seçilir.'));

  const foot = $('div', 'foot'), go = $('button', 'go', 'Başla'), sum = $('span', 'sum'); sum.id = 'sum';
  go.id = 'goBtn'; go.addEventListener('click', startGame);
  foot.append(sum, go);
  menuEl.append(side, main, foot);
  root.append(menuEl);
}
const slotKeys = () => MODES[pick.mode].perTeam > 1 ? [['hero', 'ally'], ['foe', 'foe2']] : [['hero'], ['foe']];
const slotTitle = k => ({ hero:'Sen', ally:'Takım arkadaşı (bot)', foe:'Rakip (bot)', foe2:'Rakip 2 (bot)' })[k];
/* Bir yuva kartı: büyük portre, ad, rol, kısa açıklama; botta zorluk düğmeleri */
function slotCard(k) {
  const v = pick[k], rnd = v === 'random', inf = rnd ? null : HERO_INFO[v];
  const c = $('div', 'slotc' + (k === 'hero' ? ' me' : '') + (rnd ? ' rnd' : '')); c.dataset.slot = k;
  if (inf) c.style.setProperty('--hc', inf.color);
  const pb = $('button', 'sl-pick'); pb.title = 'Kahraman seç';
  const pw = $('div', 'sl-pw');
  if (rnd) pw.append($('span', 'sl-q', '?')); else pw.append(portraitEl(v, 'sl-pt', 160, true));
  const st = rnd ? null : STATS[v], sv = key => st && st[key] ? Math.round(st[key].base) : '-';
  const tx = $('div', 'sl-tx');
  tx.innerHTML = '<div class="sl-who">' + esc(slotTitle(k)) + '</div><div class="sl-nm">' + esc(rnd ? 'Rastgele' : HERO_NAMES[v]) + '</div>'
    + (rnd ? '<div class="sl-ds">Başlarken rastgele seçilir.</div>' : '<span class="sl-role">' + esc(inf.role) + '</span><div class="sl-ds">' + esc(inf.desc) + '</div><div class="sl-st"><span>Can ' + sv('hp') + '</span><span>Hasar ' + sv('dmg') + '</span><span>Menzil ' + sv('range') + '</span></div>')
    + '<div class="sl-chg">Değiştir</div>';
  pb.append(pw, tx); pb.addEventListener('click', () => openPicker(k));
  c.append(pb);
  const lk = SLOTS[k].lv;
  if (lk) {
    const lv = $('div', 'sl-lv');
    for (const L of LEVELS) {
      const b = $('button', 'sl-lb' + (pick[lk] === L.id ? ' on' : ''), esc(L.label)); b.title = L.sub; b.dataset.lvl = L.id;
      b.addEventListener('click', () => { pick[lk] = L.id; applyLevels(); save(); sync(); });
      lv.append(b);
    }
    c.append(lv);
  }
  return c;
}
/* Kahraman seçim ızgarası (yuva başına açılır) */
let pickerEl = null;
function closePicker() { if (pickerEl) { pickerEl.remove(); pickerEl = null; } }
function openPicker(k) {
  closePicker();
  pickerEl = $('div', 'picker'); pickerEl.id = 'picker';
  const box = $('div', 'pk-box');
  const hd = $('div', 'pk-hd'); hd.append($('h2', '', esc(slotTitle(k)) + ' için kahraman seç'));
  const x = $('button', 'pk-x', '×'); x.title = 'Kapat (Esc)'; x.addEventListener('click', closePicker); hd.append(x);
  const grid = $('div', 'pk-grid');
  const choose = id => { pick[k] = id; save(); closePicker(); sync(); };
  if (k !== 'hero') {
    const r = $('button', 'pk-c rnd' + (pick[k] === 'random' ? ' on' : '')); r.innerHTML = '<span class="pk-q">?</span><b>Rastgele</b><small>Her seferinde farklı</small>';
    r.addEventListener('click', () => choose('random')); grid.append(r);
  }
  for (const id of HERO_IDS) {
    const inf = HERO_INFO[id], b = $('button', 'pk-c' + (pick[k] === id ? ' on' : '')); b.style.setProperty('--hc', inf.color); b.title = inf.desc;
    b.append(portraitEl(id, 'pk-pt', 120)); b.append($('b', '', esc(HERO_NAMES[id])), $('small', '', esc(inf.role)));
    b.addEventListener('click', () => choose(id)); grid.append(b);
  }
  box.append(hd, grid); pickerEl.append(box);
  pickerEl.addEventListener('click', e => { if (e.target === pickerEl) closePicker(); });
  menuEl.append(pickerEl);
}
addEventListener('keydown', e => { if (e.code === 'Escape' && pickerEl) { e.preventDefault(); closePicker(); } });
function rnd(v) { return v === 'random' ? HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)] : v; }
function startGame() {
  closePicker(); applyLevels();
  settings.playerType = pick.hero; settings.botType = rnd(pick.foe);
  settings.perTeam = MODES[pick.mode].perTeam;   // 2v2: takım arkadaşı ve ikinci rakip de seçilir (rastgeleler burada çözülür)
  settings.allyType = rnd(pick.ally); settings.foe2Type = rnd(pick.foe2); save();
  cb.start();
}
function sync() {
  if (!menuEl) return;
  menuEl.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', b.dataset.mode === pick.mode));
  const M = MODES[pick.mode];
  const abB = menuEl.querySelector('#abBtn'); if (abB) abB.innerHTML = '<b>' + esc(HERO_NAMES[pick.hero]) + ' eşya sırası</b><small>' + (autoBuyOn() ? 'Açık' : 'Kapalı') + ' · ' + (isCustom(pick.hero) ? 'kendi sıran' : 'önerilen sıra') + '</small>';
  const ks = slotKeys();
  const lb = menuEl.querySelector('.lobby'); if (lb) lb.classList.toggle('duo', M.perTeam > 1);
  for (const t of [0, 1]) { const l = menuEl.querySelector('#slots' + t); l.innerHTML = ''; for (const k of ks[t]) l.append(slotCard(k)); }
  const nmOf = v => v === 'random' ? 'Rastgele' : HERO_NAMES[v];
  const lvN = id => LEVELS.find(l => l.id === id).label;
  menuEl.querySelector('#sum').textContent = M.perTeam > 1
    ? HERO_NAMES[pick.hero] + ' + ' + nmOf(pick.ally) + ' (' + lvN(pick.lvAlly) + ') karşı ' + nmOf(pick.foe) + ' (' + lvN(pick.lvFoe) + ') + ' + nmOf(pick.foe2) + ' (' + lvN(pick.lvFoe2) + ')  ·  ' + M.label
    : HERO_NAMES[pick.hero] + ' karşı ' + nmOf(pick.foe) + ' (' + lvN(pick.lvFoe) + ')  ·  ' + M.label;
}
export function showMenu() { if (!menuEl) buildMenu(); hidePause(); hideResult(); menuEl.style.display = 'flex'; menuEl.scrollTop = 0; const v = menuEl.querySelector('.mvid'); if (v) v.play().catch(() => {}); sync(); }
export function hideMenu() { closePicker(); if (menuEl) { menuEl.style.display = 'none'; const v = menuEl.querySelector('.mvid'); if (v) v.pause(); } }

/* ---- duraklatma ---- */
let pauseEl = null;
export function showPause() {
  hidePause();
  pauseEl = $('div', 'ov pause'); const card = $('div', 'card');
  card.append($('h2', '', 'Duraklatıldı'));
  const mk = (t, cls, fn) => { const b = $('button', 'big ' + cls, t); b.addEventListener('click', fn); return b; };
  card.append(mk('Devam', 'pri', () => cb.resume()), mk('Yeniden başlat', '', () => cb.restart()), mk('Ana menü', '', () => cb.toMenu()));
  const det = $('details', 'pdet'); det.append($('summary', '', 'Ayarlar ve test'), settingsBlock());
  const lu = $('button', 'mini', 'Seviye atla (test)'); lu.addEventListener('click', () => cb.levelUp()); det.append(lu);
  card.append(det, $('div', 'note', 'Esc: devam'));
  pauseEl.append(card); root.append(pauseEl);
}
export function hidePause() { if (pauseEl) { pauseEl.remove(); pauseEl = null; } }

/* ---- sonuç ---- */
let resEl = null;
export function showResult() {
  hideResult();
  const p = S.player, win = !!S.over && S.over.winner === p.team;
  const mm = Math.floor(S.time / 60), ss = Math.floor(S.time % 60);
  const items = p.items.map(id => (ITEMS[id] || PARTS[id] || { name: id }).name);
  resEl = $('div', 'ov result'); const card = $('div', 'card ' + (win ? 'win' : 'lose'));
  card.append($('h2', 'res', win ? 'Kazandın' : 'Kaybettin'), $('div', 'note', esc(HERO_NAMES[p.type] || '')));
  const g = $('div', 'rg');
  const row = (k, v) => { g.append($('span', 'k', k), $('span', 'v', v)); };
  row('Süre', mm + ':' + String(ss).padStart(2, '0'));
  const duo = S.heroes.length > 2;
  row(duo ? 'Takım skoru' : 'Öldürme / Ölme', S.score[p.team] + ' / ' + S.score[1 - p.team]);
  if (!duo) {
    row('Altın', String(Math.floor(p.gold)));
    row('Seviye', String(p.level));
    row('Eşyalar', items.length ? esc(items.join(', ')) : 'Yok');
  }
  card.append(g);
  if (duo) { card.classList.add('wide'); card.append(resultTable(p.team)); }
  const mk = (t, cls, fn) => { const b = $('button', 'big ' + cls, t); b.addEventListener('click', fn); return b; };
  card.append(mk('Tekrar oyna', 'pri', () => cb.restart()), mk('Ana menü', '', () => cb.toMenu()));
  resEl.append(card); root.append(resEl);
}
/* Oyun sonu tablosu: iki takım, her kahramanın seviye, K/D/A, eşya değeri (15.10.2026: altın idi), eşyaları (kazanan takım vurgulu) */
function resultTable(myTeam) {
  const box = $('div', 'rtab');
  for (const team of [myTeam, 1 - myTeam]) {
    const won = S.over && S.over.winner === team;
    box.append($('div', 'rth t' + team, (team === myTeam ? 'Takımın' : 'Rakip takım') + (won ? '  ·  Kazandı' : '')));
    for (const h of S.heroes.filter(u => u.team === team)) {
      const its = h.items.map(id => (ITEMS[id] || PARTS[id] || { name: id }).name);
      const r = $('div', 'rtr' + (h === S.player ? ' me' : ''));
      r.append($('span', 'n', esc(HERO_NAMES[h.type] || h.type) + (h === S.player ? ' (sen)' : '')), $('span', 'l', 'Sv ' + h.level),
        $('span', 'kda', h.kills + ' / ' + h.deaths + ' / ' + h.assists), $('span', 'g', itemsValue(h.items) + ' eşya'),
        $('span', 'it', its.length ? esc(its.join(', ')) : 'Eşya yok'));
      box.append(r);
    }
  }
  return box;
}
export function hideResult() { if (resEl) { resEl.remove(); resEl = null; } }

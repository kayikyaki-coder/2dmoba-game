/* Ana menü, duraklatma menüsü ve sonuç ekranı (HTML katmanları). Oyun mantığına dokunmaz, yalnız settings yazar ve main.js geri çağrılarını çalıştırır. */
import { STATS, MAX_LEVEL } from './data.js';
import { ITEMS, PARTS } from './items.js';
import { S, settings } from './sim.js';
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

export const pick = { mode:'1v1', hero:'archer', foe:'random', ally:'random', foe2:'random', level:'easy' };
try {
  const o = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (o) {
    if (MODES[o.mode] && MODES[o.mode].active) pick.mode = o.mode;
    if (HERO_NAMES[o.hero]) pick.hero = o.hero;
    if (o.foe === 'random' || HERO_NAMES[o.foe]) pick.foe = o.foe;
    if (o.ally === 'random' || HERO_NAMES[o.ally]) pick.ally = o.ally;
    if (o.foe2 === 'random' || HERO_NAMES[o.foe2]) pick.foe2 = o.foe2;
    if (LEVELS.some(l => l.id === o.level && l.active)) pick.level = o.level;
    for (const k of ['fog', 'waves', 'showHit']) if (typeof o[k] === 'boolean') settings[k] = o[k];
    if (o.aimMode === 'track' || o.aimMode === 'lock') settings.aimMode = o.aimMode;
  }
} catch (e) { /* kayıt yoksa varsayılanlar */ }
settings.botLevel = pick.level;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...pick, fog:settings.fog, waves:settings.waves, showHit:settings.showHit, aimMode:settings.aimMode })); } catch (e) { /* sorun değil */ }
}

const cb = { start(){}, resume(){}, restart(){}, toMenu(){}, levelUp(){} };
export function bindMenu(fns) { Object.assign(cb, fns); }

const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const root = document.getElementById('menuRoot');

/* ---- kahraman kartı ---- */
/* Kart simgesi: oyundaki token ile aynı çizim (art.js drawToken), ekran yoğunluğuna göre keskin */
function tokenCanvas(id) {
  const c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), n = 46;
  c.className = 'hc-ic'; c.width = c.height = Math.round(n * dpr); c.style.width = c.style.height = n + 'px';
  const g = c.getContext('2d'); g.scale(dpr, dpr); drawToken(g, id, n / 2, n / 2, n / 2 - 2, {});
  return c;
}
/* Kart portresi: yerel Stable Diffusion ile üretilmiş görsel (assets/portre); yüklenemezse oyundaki token çizimi */
function portraitEl(id) {
  const im = document.createElement('img'); im.className = 'hc-pt'; im.alt = ''; im.src = 'assets/portre/' + id + '.jpg';
  im.onerror = () => im.replaceWith(tokenCanvas(id));
  return im;
}
function heroCard(id, kind) {
  const inf = HERO_INFO[id], st = STATS[id] || {};
  const b = $('button', 'hc'); b.dataset.id = id; b.style.setProperty('--hc', inf.color);
  const v = k => st[k] ? Math.round(st[k].base) : '-';
  b.innerHTML = '<div class="hc-top"><span class="hc-ic">' + esc(inf.letter) + '</span><div><div class="hc-nm">' + esc(HERO_NAMES[id]) + '</div><span class="hc-role">' + esc(inf.role) + '</span></div></div>'
    + '<div class="hc-ds">' + esc(inf.desc) + '</div><div class="hc-st"><span>Can ' + v('hp') + '</span><span>Hasar ' + v('dmg') + '</span><span>Menzil ' + v('range') + '</span></div>';
  b.querySelector('.hc-ic').replaceWith(portraitEl(id));
  b.addEventListener('click', () => { pick[kind] = id; save(); sync(); });
  return b;
}
function randomCard(kind) {
  const b = $('button', 'hc rnd'); b.dataset.id = 'random'; b.style.setProperty('--hc', '#9aa1b0');
  b.innerHTML = '<div class="hc-top"><span class="hc-ic">?</span><div><div class="hc-nm">Rastgele</div><span class="hc-role">Her seferinde farklı</span></div></div>'
    + '<div class="hc-ds">Başlarken ' + (kind === 'ally' ? 'takım arkadaşın' : 'kahraman') + ' rastgele seçilir.</div>';
  b.addEventListener('click', () => { pick[kind] = 'random'; save(); sync(); });
  return b;
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
  m.append(mg, $('div', 'roster')); side.append(m);
  // zorluk
  const d = $('section', 'blk'); d.append($('h2', '', 'Bot zorluğu'));
  const dg = $('div', 'lvls');
  for (const L of LEVELS) {
    const b = $('button', 'lvl' + (L.active ? '' : ' off')); b.dataset.lvl = L.id; b.disabled = !L.active;
    b.innerHTML = '<b>' + esc(L.label) + '</b>' + (L.active ? '<small>' + esc(L.sub) + '</small>' : '<em>Yakında</em>');
    b.addEventListener('click', () => { pick.level = L.id; settings.botLevel = L.id; save(); sync(); });
    dg.append(b);
  }
  d.append(dg, $('div', 'note', 'Seçilen zorluk rakip botlara ve takım arkadaşına uygulanır.')); side.append(d);
  // otomatik alım
  const ab = $('section', 'blk'); ab.append($('h2', '', 'Otomatik alım'));
  const abb = $('button', 'abbtn'); abb.id = 'abBtn'; abb.addEventListener('click', () => openBuildEditor(pick.hero, () => sync()));
  ab.append(abb, $('div', 'note', 'Seçtiğin kahramanın eşya sırası. Açıksa üste altın yettikçe sırayla alınır.')); side.append(ab);
  // ayarlar
  const a = $('section', 'blk'); a.append($('h2', '', 'Ayarlar'), settingsBlock()); side.append(a);

  const main = $('main', 'mainc');
  const h1 = $('section', 'blk'); h1.append($('h2', '', 'Kahramanın'));
  const g1 = $('div', 'hgrid'); g1.id = 'gHero'; for (const id of HERO_IDS) g1.append(heroCard(id, 'hero')); h1.append(g1);
  const grid = (title, gid, kind, cls) => {
    const sec = $('section', 'blk ' + cls); sec.append($('h2', '', title));
    const g = $('div', 'hgrid'); g.id = gid; g.append(randomCard(kind)); for (const id of HERO_IDS) g.append(heroCard(id, kind)); sec.append(g); return sec;
  };
  const hA = grid('Takım arkadaşın (bot)', 'gAlly', 'ally', 'only2');
  const h2 = grid('Rakip', 'gFoe', 'foe', ''), h3 = grid('Rakip 2', 'gFoe2', 'foe2', 'only2');
  main.append(h1, hA, h2, h3);

  const foot = $('div', 'foot'), go = $('button', 'go', 'Başla'), sum = $('span', 'sum'); sum.id = 'sum';
  go.id = 'goBtn'; go.addEventListener('click', startGame);
  foot.append(sum, go);
  menuEl.append(side, main, foot);
  root.append(menuEl);
}
function foeId() { return pick.foe === 'random' ? HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)] : pick.foe; }
function rnd(v) { return v === 'random' ? HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)] : v; }
function startGame() {
  settings.playerType = pick.hero; settings.botType = foeId(); settings.botLevel = pick.level;
  settings.perTeam = MODES[pick.mode].perTeam;   // 2v2: takım arkadaşı ve ikinci rakip de seçilir (rastgeleler burada çözülür)
  settings.allyType = rnd(pick.ally); settings.foe2Type = rnd(pick.foe2); save();
  cb.start();
}
function sync() {
  if (!menuEl) return;
  menuEl.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', b.dataset.mode === pick.mode));
  menuEl.querySelectorAll('.lvl').forEach(b => b.classList.toggle('on', b.dataset.lvl === pick.level));
  menuEl.querySelectorAll('#gHero .hc').forEach(b => b.classList.toggle('on', b.dataset.id === pick.hero));
  menuEl.querySelectorAll('#gFoe .hc').forEach(b => b.classList.toggle('on', b.dataset.id === pick.foe));
  menuEl.querySelectorAll('#gAlly .hc').forEach(b => b.classList.toggle('on', b.dataset.id === pick.ally));
  menuEl.querySelectorAll('#gFoe2 .hc').forEach(b => b.classList.toggle('on', b.dataset.id === pick.foe2));
  const M = MODES[pick.mode];
  const abB = menuEl.querySelector('#abBtn'); if (abB) abB.innerHTML = '<b>' + esc(HERO_NAMES[pick.hero]) + ' eşya sırası</b><small>' + (autoBuyOn() ? 'Açık' : 'Kapalı') + ' · ' + (isCustom(pick.hero) ? 'kendi sıran' : 'önerilen sıra') + '</small>';
  menuEl.querySelectorAll('.only2').forEach(e => { e.style.display = M.perTeam > 1 ? '' : 'none'; });
  // takım yuvaları: takım başına perTeam yuva
  const nmOf = v => v === 'random' ? 'Rastgele' : HERO_NAMES[v];
  const ro = menuEl.querySelector('.roster'); ro.innerHTML = '';
  for (const team of [0, 1]) {
    const row = $('div', 'rrow t' + team); row.append($('span', 'rt', team === 0 ? 'Takımın' : 'Rakip takım'));
    for (let i = 0; i < M.perTeam; i++) {
      const nm = team === 0 ? (i === 0 ? HERO_NAMES[pick.hero] : nmOf(pick.ally)) : (i === 0 ? nmOf(pick.foe) : nmOf(pick.foe2));
      row.append($('span', 'slot' + (team === 0 && i === 0 ? ' me' : ''), esc(nm)));
    }
    ro.append(row);
  }
  menuEl.querySelector('#sum').textContent = M.perTeam > 1
    ? HERO_NAMES[pick.hero] + ' + ' + nmOf(pick.ally) + ' karşı ' + nmOf(pick.foe) + ' + ' + nmOf(pick.foe2) + '  ·  ' + M.label + '  ·  ' + LEVELS.find(l => l.id === pick.level).label
    : HERO_NAMES[pick.hero] + ' karşı ' + nmOf(pick.foe) + '  ·  ' + M.label + '  ·  ' + LEVELS.find(l => l.id === pick.level).label;
}
export function showMenu() { if (!menuEl) buildMenu(); hidePause(); hideResult(); menuEl.style.display = 'flex'; menuEl.scrollTop = 0; const v = menuEl.querySelector('.mvid'); if (v) v.play().catch(() => {}); sync(); }
export function hideMenu() { if (menuEl) { menuEl.style.display = 'none'; const v = menuEl.querySelector('.mvid'); if (v) v.pause(); } }

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
/* Oyun sonu tablosu: iki takım, her kahramanın seviye, K/D/A, altın, eşyaları (kazanan takım vurgulu) */
function resultTable(myTeam) {
  const box = $('div', 'rtab');
  for (const team of [myTeam, 1 - myTeam]) {
    const won = S.over && S.over.winner === team;
    box.append($('div', 'rth t' + team, (team === myTeam ? 'Takımın' : 'Rakip takım') + (won ? '  ·  Kazandı' : '')));
    for (const h of S.heroes.filter(u => u.team === team)) {
      const its = h.items.map(id => (ITEMS[id] || PARTS[id] || { name: id }).name);
      const r = $('div', 'rtr' + (h === S.player ? ' me' : ''));
      r.append($('span', 'n', esc(HERO_NAMES[h.type] || h.type) + (h === S.player ? ' (sen)' : '')), $('span', 'l', 'Sv ' + h.level),
        $('span', 'kda', h.kills + ' / ' + h.deaths + ' / ' + h.assists), $('span', 'g', Math.floor(h.gold) + ' altın'),
        $('span', 'it', its.length ? esc(its.join(', ')) : 'Eşya yok'));
      box.append(r);
    }
  }
  return box;
}
export function hideResult() { if (resEl) { resEl.remove(); resEl = null; } }

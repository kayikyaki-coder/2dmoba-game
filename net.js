/* Online oyun, tarayıcı tarafı: WebSocket bağlantısı, oda ve lobi ekranı, ping. Maç mantığı lockstep.js'te, bağlantı main.js'te.
   Mesajlar sunucu rölesinden geçer (tools/wsrelay.js). relay verisi (d): {lobby} {pick} {start} {ping} {pong} {k,c} (komut) {h,v} (durum özeti) */
import { HERO_NAMES } from './names.js';
import { ONLINE_MODES, makeConfig } from './lockstep.js';
import { makeTransport } from './transport.js';

export const net = { tr:null, slot:-1, code:'', slots:[], rtt:0, ls:null, playing:false };
const LEVELS = [['easy','Kolay'],['medium','Orta'],['hard','Zor'],['expert','Uzman']];
let hooks = { start(){}, leave(){} };
let lobby = { mode:'coop', heroes:['archer','warrior'], bots:['random','random'], botLevel:'medium' };
let delayPick = 'auto';
let el = null, msg = '', pingT = 0;

export function initNet(h){ hooks = h; }

export function netSend(d, to){
  if(net.tr && net.tr.isOpen()) net.tr.send(to === undefined ? { t:'relay', d } : { t:'relay', d, to });
}
function sendRaw(o){ if(net.tr && net.tr.isOpen()) net.tr.send(o); }
/* Bağlantı yolu: 'p2p' doğrudan, 'sb' Supabase rölesi, 'ws' sunucu rölesi */
export const netPath = () => net.tr ? net.tr.path() : '';
const pathName = () => ({ p2p:'doğrudan', sb:'Supabase rölesi', ws:'sunucu' })[netPath()] || '';

async function connect(then){
  if(net.tr && net.tr.isOpen()){ then(); return; }
  msg = 'Bağlanıyor...'; render();
  const tr = makeTransport({
    message: m => { if(net.tr === tr) onMessage(m); },
    close: () => onClose(tr),
    path: () => { if(net.tr === tr && !net.playing) render(); }
  });
  try { await tr.open(); } catch(e){ msg = (e && e.message) || 'Bağlantı kurulamadı'; render(); return; }
  net.tr = tr; msg = ''; then(); startPing();
}
function onClose(tr){
  if(net.tr !== tr) return;
  net.tr = null; net.slot = -1; net.code = ''; net.slots = []; clearInterval(pingT);
  const was = net.playing; net.playing = false; net.ls = null;
  msg = 'Bağlantı koptu'; if(was) hooks.leave('Bağlantı koptu'); render();
}
function startPing(){
  clearInterval(pingT);
  pingT = setInterval(() => { if(net.slots.length > 1) netSend({ ping:performance.now() }); }, 1500);
}

function onMessage(m){
  if(m.t === 'room'){ net.slot = m.slot; net.code = m.code; net.slots = m.slots; if(m.slot === 0) broadcastLobby(); render(); }
  else if(m.t === 'peers'){ net.slots = m.slots; if(net.slot === 0) broadcastLobby(); render(); }
  else if(m.t === 'err'){ msg = m.msg; render(); }
  else if(m.t === 'left'){ if(net.playing){ net.playing = false; net.ls = null; hooks.leave('Arkadaşın oyundan ayrıldı'); } net.rtt = 0; msg = 'Arkadaşın ayrıldı'; render(); }
  else if(m.t === 'relay'){
    const d = m.d;
    if(d.k !== undefined || d.h !== undefined){ if(net.ls) net.ls.receive(m.from, d); }
    else if(d.ping !== undefined) netSend({ pong:d.ping }, m.from);
    else if(d.pong !== undefined){ const r = performance.now() - d.pong; net.rtt = net.rtt ? net.rtt * 0.7 + r * 0.3 : r; const pe = document.getElementById('oping'); if(pe && net.slot >= 0) pe.textContent = peerText(); }
    else if(d.lobby){ lobby = d.lobby; render(); }
    else if(d.pick !== undefined && net.slot === 0){ lobby.heroes[m.from] = d.pick; broadcastLobby(); render(); }
    else if(d.start){ closeLobby(); hooks.start(d.start, net.slot); }
  }
}
function broadcastLobby(){ netSend({ lobby }); }

/* Ana menüden: bağlantı ekranını aç */
export function openOnline(){ buildEl(); el.style.display = 'flex'; msg = ''; render(); }
export function closeLobby(){ if(el) el.style.display = 'none'; }
export function leaveRoom(){
  clearInterval(pingT);
  if(net.tr){ const t = net.tr; net.tr = null; try { t.close(); } catch(e){} }
  net.slot = -1; net.code = ''; net.slots = []; net.rtt = 0; net.playing = false; net.ls = null;
}
/* Maç bitince aynı odada lobiye dön (oda sahibi yeniden başlatabilir) */
export function backToLobby(){ net.playing = false; net.ls = null; if(net.tr){ buildEl(); el.style.display = 'flex'; render(); } }

function startMatch(){
  const oneWay = Math.max(net.rtt, 0) / 2;
  const delay = delayPick === 'auto' ? Math.max(4, Math.min(20, Math.ceil(oneWay / 16.67) + 3)) : +delayPick;
  const cfg = makeConfig(lobby, delay);
  netSend({ start:cfg }); closeLobby(); hooks.start(cfg, net.slot);
}

/* ---- arayüz ---- */
const CSS = `#online{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(10,8,26,.82);font:14px system-ui,sans-serif;color:#e8e6ff}
#online .obox{width:min(560px,94vw);max-height:92vh;overflow:auto;background:#17163a;border:1px solid #3b3a78;border-radius:14px;padding:20px 22px;box-shadow:0 12px 50px rgba(0,0,0,.6)}
#online h2{margin:0 0 4px;font-size:20px} #online .osub{color:#9c9ac8;margin-bottom:14px;font-size:13px}
#online button{font:inherit;color:inherit;cursor:pointer;background:#2a2960;border:1px solid #4b4aa0;border-radius:9px;padding:8px 14px}
#online button:hover:not(:disabled){background:#35338a} #online button:disabled{opacity:.45;cursor:default}
#online button.pri{background:#1fa89a;border-color:#27e2cd;color:#04201d;font-weight:700} #online button.pri:hover:not(:disabled){background:#27e2cd}
#online input,#online select{font:inherit;color:inherit;background:#0f0e2a;border:1px solid #4b4aa0;border-radius:8px;padding:7px 9px}
#online input{width:100px;text-transform:uppercase;letter-spacing:.2em;text-align:center}
#online .orow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0} #online .orow>label{min-width:128px;color:#9c9ac8}
#online .ocode{font-size:34px;font-weight:800;letter-spacing:.3em;color:#27e2cd;margin:4px 0}
#online .oerr{color:#ff9a8d;margin:8px 0;min-height:18px} #online .opeer{padding:8px 10px;background:#0f0e2a;border-radius:8px;margin:5px 0}
#online .omodes{display:flex;gap:8px;flex-wrap:wrap} #online .omodes button.on{background:#1fa89a;border-color:#27e2cd;color:#04201d}
#online .ofoot{display:flex;gap:10px;justify-content:space-between;margin-top:16px} #online .ohint{color:#9c9ac8;font-size:12px;margin-top:8px}
#netinfo{position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:80;font:12px system-ui,sans-serif;color:#e8e6ff;background:rgba(15,14,42,.72);border:1px solid #3b3a78;border-radius:8px;padding:3px 10px;pointer-events:none;display:none}
#netinfo.bad{background:rgba(120,30,30,.85);border-color:#ff6a58}`;

function buildEl(){
  if(el) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  el = document.createElement('div'); el.id = 'online'; document.body.append(el);
  el.addEventListener('focusout', () => setTimeout(() => { if(renderLater) render(); }, 0));
  el.addEventListener('keydown', e => { e.stopPropagation(); if(e.code === 'Escape' && !net.tr) closeLobby(); });
}
const heroSel = (value, onChange, withRandom) => {
  const s = document.createElement('select');
  if(withRandom){ const o = document.createElement('option'); o.value = 'random'; o.textContent = 'Rastgele'; s.append(o); }
  for(const [id, n] of Object.entries(HERO_NAMES)){ const o = document.createElement('option'); o.value = id; o.textContent = n; s.append(o); }
  s.value = value; s.onchange = () => { s.blur(); onChange(s.value); }; return s;
};
const row = (label, ...c) => { const r = document.createElement('div'); r.className = 'orow'; const l = document.createElement('label'); l.textContent = label; r.append(l, ...c); return r; };
const btn = (text, fn, cls) => { const b = document.createElement('button'); b.textContent = text; if(cls) b.className = cls; b.onclick = fn; return b; };

/* Açılır liste ya da kutu odaktayken lobi yeniden çizilmez (liste kapanıyordu); odak bitince çizilir */
let renderLater = false;
function typing(){ const a = document.activeElement; return !!(a && el && el.contains(a) && (a.tagName === 'SELECT' || a.tagName === 'INPUT')); }
function peerText(){ const host = net.slot === 0, two = net.slots.length >= 2; return two ? (host ? 'Arkadaşın: bağlı' : 'Sen') + (net.rtt ? '  ·  ping ' + Math.round(net.rtt) + ' ms' : '') + (pathName() ? '  ·  ' + pathName() : '') : 'Arkadaşın: bekleniyor...'; }
function render(){
  if(!el || el.style.display === 'none') return;
  if(typing()){ renderLater = true; return; }
  renderLater = false;
  el.replaceChildren();
  const box = document.createElement('div'); box.className = 'obox'; el.append(box);
  const h = document.createElement('h2'); h.textContent = 'Online (arkadaşla)'; box.append(h);
  if(net.slot < 0){
    const s = document.createElement('div'); s.className = 'osub'; s.textContent = 'Biri oda kurar, kodu arkadaşına söyler, arkadaşı kodu girip katılır.'; box.append(s);
    const code = document.createElement('input'); code.maxLength = 4; code.placeholder = 'KOD';
    code.onkeydown = e => { if(e.code === 'Enter') join(); };
    const join = () => { if(code.value.trim().length === 4) connect(() => { sendRaw({ t:'join', code:code.value.trim() }); setTimeout(() => { if(net.slot < 0 && net.tr){ msg = 'Odaya katılınamadı (kod yanlış ya da bağlantı yavaş), tekrar dene'; render(); } }, 12000); }); };
    box.append(row('Oda kur', btn('Oda kur', () => connect(() => sendRaw({ t:'create' })), 'pri')), row('Odaya katıl', code, btn('Katıl', join)));
    const e = document.createElement('div'); e.className = 'oerr'; e.textContent = msg; box.append(e);
    const f = document.createElement('div'); f.className = 'ofoot'; f.append(btn('Kapat', closeLobby)); box.append(f);
    return;
  }
  const host = net.slot === 0, two = net.slots.length >= 2;
  const c = document.createElement('div'); c.className = 'ocode'; c.textContent = net.code; box.append(c);
  const s = document.createElement('div'); s.className = 'osub';
  s.textContent = host ? 'Bu kodu arkadaşına gönder. Arkadaşın girince Başlat açılır.' : 'Oda sahibinin başlatmasını bekle. Kahramanını seçebilirsin.'; box.append(s);
  const p1 = document.createElement('div'); p1.className = 'opeer'; p1.textContent = host ? 'Sen (oda sahibi)' : 'Oda sahibi: bağlı'; box.append(p1);
  const p2 = document.createElement('div'); p2.className = 'opeer'; p2.id = 'oping'; p2.textContent = peerText(); box.append(p2);
  // mod
  const modes = document.createElement('div'); modes.className = 'omodes';
  for(const [id, M] of Object.entries(ONLINE_MODES)){
    const b = btn(M.label, () => { lobby.mode = id; broadcastLobby(); render(); }, lobby.mode === id ? 'on' : ''); b.title = M.sub; b.disabled = !host; modes.append(b);
  }
  box.append(row('Mod', modes));
  const sub = document.createElement('div'); sub.className = 'ohint'; sub.textContent = ONLINE_MODES[lobby.mode].sub; box.append(sub);
  // kahramanlar
  const mine = net.slot, other = 1 - net.slot;
  box.append(row('Senin kahramanın', heroSel(lobby.heroes[mine], v => { lobby.heroes[mine] = v; if(host) broadcastLobby(); else netSend({ pick:v }, 0); render(); }, false)));
  if(two){ const o = document.createElement('span'); o.textContent = HERO_NAMES[lobby.heroes[other]] || '?'; box.append(row('Arkadaşının kahramanı', o)); }
  if(lobby.mode !== '1v1'){
    const names = lobby.mode === 'coop' ? ['Rakip bot 1', 'Rakip bot 2'] : ['Takım botun', 'Rakip bot'];
    for(let i = 0; i < 2; i++){
      if(host) box.append(row(names[i], heroSel(lobby.bots[i], v => { lobby.bots[i] = v; broadcastLobby(); }, true)));
      else { const o = document.createElement('span'); o.textContent = lobby.bots[i] === 'random' ? 'Rastgele' : HERO_NAMES[lobby.bots[i]]; box.append(row(names[i], o)); }
    }
    const lv = document.createElement('select'); for(const [id, n] of LEVELS){ const o = document.createElement('option'); o.value = id; o.textContent = n; lv.append(o); }
    lv.value = lobby.botLevel; lv.disabled = !host; lv.onchange = () => { lobby.botLevel = lv.value; broadcastLobby(); };
    box.append(row('Bot zorluğu', lv));
  }
  if(host){
    const d = document.createElement('select');
    for(const v of ['auto', '4', '6', '8', '12', '16']){ const o = document.createElement('option'); o.value = v; o.textContent = v === 'auto' ? 'Otomatik (pinge göre)' : v + ' tik (' + Math.round(v * 16.67) + ' ms)'; d.append(o); }
    d.value = delayPick; d.onchange = () => { delayPick = d.value; };
    box.append(row('Girdi tamponu', d));
    const t = document.createElement('div'); t.className = 'ohint'; t.textContent = 'Tampon küçükse hızlı hisseder ama ağ yavaşken takılır; büyükse akıcıdır ama komutlar geç tepki verir.'; box.append(t);
  }
  const e = document.createElement('div'); e.className = 'oerr'; e.textContent = msg; box.append(e);
  const f = document.createElement('div'); f.className = 'ofoot';
  f.append(btn('Odadan çık', () => { leaveRoom(); msg = ''; render(); }));
  if(host){ const go = btn('Başlat', startMatch, 'pri'); go.disabled = !two; f.append(go); }
  box.append(f);
}

/* Oyun içi küçük bilgi çubuğu: ping, bekleme, senkron uyarısı */
let info = null;
export function netInfo(text, bad){
  if(!info){ info = document.createElement('div'); info.id = 'netinfo'; document.body.append(info); buildEl(); }
  if(!text){ info.style.display = 'none'; return; }
  info.style.display = 'block'; info.textContent = text; info.className = bad ? 'bad' : '';
}

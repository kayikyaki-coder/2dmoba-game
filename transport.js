/* Online bağlantı katmanları (net.js kullanır). İkisi de aynı arayüzü verir:
     await tr.open()        bağlantı hazır
     tr.send(obj)           {t:'create'} | {t:'join', code} | {t:'relay', d, to?}   (tools/wsrelay.js ile aynı mesaj biçimi)
     tr.isOpen(), tr.path() ('ws' | 'p2p' | 'sb'), tr.close()
     h.message(m)           {t:'room', code, slot, slots} | {t:'peers', slots} | {t:'left', slot} | {t:'relay', from, d} | {t:'err', msg}
     h.close()              bağlantı koptu
   WsTransport: oyunu sunan Node sunucusundaki röle (npm start, tünel).
   SbTransport: sabit adreste (GitHub Pages) çalışır. Eşleşme Supabase Realtime ile (oda = kanal, oyuncular = presence),
   komutlar tarayıcılar arasında doğrudan WebRTC veri kanalıyla gider (en düşük ping). Kurulamazsa komutlar Supabase üzerinden
   (30 ms'de bir toplu) akar. */
import { ONLINE } from './online_config.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
const SB_VER = '2.45.4';
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];

export class WsTransport {
  constructor(h) { this.h = h; this.ws = null; }
  open() {
    return new Promise((res, rej) => {
      const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
      let ws; try { ws = new WebSocket(url); } catch (e) { rej(new Error('Bağlantı kurulamadı')); return; }
      this.ws = ws;
      ws.onopen = () => res();
      ws.onerror = () => rej(new Error('Sunucuya bağlanılamadı (oyun sunucusu açık mı?)'));
      ws.onmessage = e => this.h.message(JSON.parse(e.data));
      ws.onclose = () => this.h.close();
    });
  }
  send(o) { if (this.isOpen()) this.ws.send(JSON.stringify(o)); }
  isOpen() { return !!this.ws && this.ws.readyState === 1; }
  path() { return 'ws'; }
  close() { const w = this.ws; this.ws = null; try { if (w) w.close(); } catch (e) { /* kapalı */ } }
}

export class SbTransport {
  constructor(h) {
    this.h = h; this.sb = null; this.ch = null; this.slot = -1; this.code = ''; this.id = Math.random().toString(36).slice(2);
    this.pc = null; this.dc = null; this.pend = []; this.queue = []; this.flushT = 0; this.lastSlots = []; this.rtcOff = false;
    this.p2p = new URLSearchParams(location.search).get('p2p') !== '0';   // ?p2p=0: doğrudan bağlantıyı kapat (yalnız Supabase rölesi)
  }
  async open() {
    if (!ONLINE.supabaseUrl || !ONLINE.supabaseKey) throw new Error('Online ayarı eksik (online_config.js)');
    const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@' + SB_VER + '/+esm');
    this.sb = m.createClient(ONLINE.supabaseUrl, ONLINE.supabaseKey, { realtime: { params: { eventsPerSecond: 50 } } });
  }
  isOpen() { return !!this.sb; }
  path() { return this.dc && this.dc.readyState === 'open' ? 'p2p' : 'sb'; }
  send(o) {
    if (o.t === 'create') { let s = ''; for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; this._enter(s, true); }
    else if (o.t === 'join') this._enter(String(o.code || '').toUpperCase().trim(), false);
    else if (o.t === 'relay') this._relay(o.d, o.to);
  }
  _enter(code, create) {
    this.code = code; this.slot = create ? 0 : -1; this.lastSlots = create ? [0] : [];
    const ch = this.sb.channel('moba-' + code, { config: { broadcast: { self: false }, presence: { key: this.id } } });
    this.ch = ch;
    ch.on('broadcast', { event: 'm' }, ({ payload }) => this._onBroadcast(payload));
    ch.on('presence', { event: 'sync' }, () => this._presence());
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        if (create) { await ch.track({ slot: 0, id: this.id }); this.h.message({ t: 'room', code, slot: 0, slots: [0] }); }
        else await ch.track({ slot: null, id: this.id });   // katılan: Supabase odadakileri ancak kendimizi kaydedince bildiriyor
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this._fail('Bağlantı hatası (' + status + '). Online ayarı ya da internet?');
      else if (status === 'CLOSED' && this.ch === ch && this.slot >= 0) this.h.close();
    });
  }
  _fail(msg) { this._leave(); this.h.message({ t: 'err', msg }); }
  _slots() {
    const st = this.ch.presenceState(), slots = [];
    for (const k in st) for (const m of st[k]) if (Number.isInteger(m.slot)) slots.push(m.slot);
    return slots.sort();
  }
  _presence() {
    if (!this.ch) return;
    const slots = this._slots();
    if (this.slot < 0) {   // katılan: odada biri var mı, hangi yuva boş
      if (!slots.length) { if (!this._retry) { this._retry = true; setTimeout(() => this._presence(), 900); } else this._fail('Oda bulunamadı'); return; }
      if (this.joining) return;
      const free = [0, 1].find(s => !slots.includes(s));
      if (free === undefined) { this._fail('Oda dolu'); return; }
      this.joining = true; this.slot = free;
      this.ch.track({ slot: free, id: this.id }).then(() => { this.lastSlots = [...slots, free].sort(); this.h.message({ t: 'room', code: this.code, slot: free, slots: this.lastSlots }); this._rtc(); });
      return;
    }
    if (!slots.includes(this.slot)) return;   // kendi kaydımız henüz yayılmadı
    const prev = this.lastSlots; this.lastSlots = slots;
    for (const s of prev) if (!slots.includes(s) && s !== this.slot) { this._peerGone(); this.h.message({ t: 'left', slot: s }); }
    if (JSON.stringify(prev) !== JSON.stringify(slots)) this.h.message({ t: 'peers', slots });
    if (slots.length >= 2) this._rtc();
  }
  _peerGone() { this._closeRtc(); this.rtcOff = false; }
  /* ---- mesaj gönderme: doğrudan kanal açıksa onunla, değilse Supabase'e toplu ---- */
  _relay(d, to) {
    const dc = this.dc;
    if (dc && dc.readyState === 'open') { try { dc.send(JSON.stringify({ f: this.slot, d })); return; } catch (e) { /* röleye düş */ } }
    this.queue.push({ d, to });
    if (!this.flushT) this.flushT = setTimeout(() => this._flush(), 30);
  }
  _flush() {
    this.flushT = 0; if (!this.ch || !this.queue.length) return;
    const b = this.queue; this.queue = [];
    this.ch.send({ type: 'broadcast', event: 'm', payload: { f: this.slot, b } });
  }
  _sig(s) { if (this.ch) this.ch.send({ type: 'broadcast', event: 'm', payload: { f: this.slot, sig: s } }); }
  _onBroadcast(p) {
    if (!p) return;
    if (p.sig) { this._onSig(p.sig).catch(() => {}); return; }
    if (p.b) for (const x of p.b) if (x.to === undefined || x.to === this.slot) this.h.message({ t: 'relay', from: p.f, d: x.d });
  }
  /* ---- WebRTC: oda sahibi (yuva 0) teklif eder, katılan cevaplar ---- */
  _rtc() {
    if (this.pc || this.rtcOff || !this.p2p || typeof RTCPeerConnection === 'undefined') return;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc = pc;
    pc.onicecandidate = e => { if (e.candidate) this._sig({ c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { this._closeRtc(); this.rtcOff = true; } };
    if (this.slot === 0) {
      this._dcSetup(pc.createDataChannel('g', { ordered: true }));
      pc.createOffer().then(o => pc.setLocalDescription(o).then(() => this._sig({ o: { type: o.type, sdp: o.sdp } }))).catch(() => {});
    } else pc.ondatachannel = e => this._dcSetup(e.channel);
  }
  _dcSetup(dc) {
    this.dc = dc;
    dc.onmessage = e => { try { const m = JSON.parse(e.data); this.h.message({ t: 'relay', from: m.f, d: m.d }); } catch (err) { /* bozuk paket */ } };
    dc.onopen = () => { if (this.h.path) this.h.path('p2p'); };
    dc.onclose = () => { if (this.h.path) this.h.path('sb'); };
  }
  async _onSig(s) {
    if (!this.p2p) return;
    if (!this.pc) this._rtc();
    const pc = this.pc; if (!pc) return;
    if (s.o) { await pc.setRemoteDescription(s.o); await this._drain(); const a = await pc.createAnswer(); await pc.setLocalDescription(a); this._sig({ a: { type: a.type, sdp: a.sdp } }); }
    else if (s.a) { await pc.setRemoteDescription(s.a); await this._drain(); }
    else if (s.c) { if (pc.remoteDescription) await pc.addIceCandidate(s.c); else this.pend.push(s.c); }
  }
  async _drain() { const p = this.pc; for (const c of this.pend.splice(0)) { try { await p.addIceCandidate(c); } catch (e) { /* eski aday */ } } }
  _closeRtc() {
    const dc = this.dc, pc = this.pc; this.dc = null; this.pc = null; this.pend = [];
    try { if (dc) dc.close(); } catch (e) { /* kapalı */ }
    try { if (pc) pc.close(); } catch (e) { /* kapalı */ }
    if (this.h.path) this.h.path('sb');
  }
  _leave() {
    this._closeRtc(); clearTimeout(this.flushT); this.flushT = 0; this.queue = [];
    const ch = this.ch; this.ch = null; this.slot = -1; this.joining = false; this._retry = false;
    if (ch && this.sb) { try { this.sb.removeChannel(ch); } catch (e) { /* kapalı */ } }
  }
  close() { this._leave(); const sb = this.sb; this.sb = null; try { if (sb) sb.realtime.disconnect(); } catch (e) { /* kapalı */ } }
}

/* Hangi katman: ?net=ws | sb ile zorlanabilir; yoksa oyunu Node sunucusu sunuyorsa (localhost, tünel) ws, sabit adreste (GitHub Pages) sb */
export function makeTransport(h) {
  const q = new URLSearchParams(location.search).get('net'), host = location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.trycloudflare.com');
  return (q === 'sb' || (!q && !local)) ? new SbTransport(h) : new WsTransport(h);
}

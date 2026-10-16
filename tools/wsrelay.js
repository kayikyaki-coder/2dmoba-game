/* Online oda rölesi (bağımlılık yok, elle yazılmış küçük WebSocket sunucusu).
   Sunucu simülasyon çalıştırmaz: odaları tutar ve mesajları odadakilere iletir (şimdilik odada en fazla 2 kişi, MAX_PLAYERS). Oyun mantığı tarayıcılarda (lockstep.js).
   İstemci -> sunucu: {t:'create'} | {t:'join', code} | {t:'relay', d, to?}
   Sunucu -> istemci: {t:'room', code, slot, slots:[...]} | {t:'peers', slots:[...]} | {t:'relay', from, d} | {t:'left', slot} | {t:'err', msg} */
import crypto from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PLAYERS = 2, MAX_PAYLOAD = 64 * 1024;
const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ23456789';

function frame(opcode, payload) {
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}

export function attachRelay(server) {
  const rooms = new Map();   // kod -> { code, players: Map(slot -> client) }
  let nextId = 1;

  function send(c, obj) { if (!c.sock.destroyed) c.sock.write(frame(0x1, Buffer.from(JSON.stringify(obj)))); }
  function slotsOf(room) { return [...room.players.keys()].sort((a, b) => a - b); }
  function leave(c) {
    const room = c.room; if (!room) return;
    c.room = null; room.players.delete(c.slot);
    if (!room.players.size) { rooms.delete(room.code); return; }
    for (const p of room.players.values()) send(p, { t: 'left', slot: c.slot });
    for (const p of room.players.values()) send(p, { t: 'peers', slots: slotsOf(room) });
  }
  function newCode() {
    for (;;) {
      let s = ''; for (let i = 0; i < 4; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
      if (!rooms.has(s)) return s;
    }
  }
  function onMessage(c, text) {
    let m; try { m = JSON.parse(text); } catch { return; }
    if (m.t === 'create') {
      if (c.room) leave(c);
      const room = { code: newCode(), players: new Map() }; rooms.set(room.code, room);
      c.room = room; c.slot = 0; room.players.set(0, c);
      send(c, { t: 'room', code: room.code, slot: 0, slots: [0] });
    } else if (m.t === 'join') {
      const room = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!room) return send(c, { t: 'err', msg: 'Oda bulunamadı' });
      if (room.players.size >= MAX_PLAYERS) return send(c, { t: 'err', msg: 'Oda dolu' });
      if (c.room) leave(c);
      let slot = 0; while (room.players.has(slot)) slot++;
      c.room = room; c.slot = slot; room.players.set(slot, c);
      send(c, { t: 'room', code: room.code, slot, slots: slotsOf(room) });
      for (const p of room.players.values()) if (p !== c) send(p, { t: 'peers', slots: slotsOf(room) });
    } else if (m.t === 'relay' && c.room) {
      const out = { t: 'relay', from: c.slot, d: m.d };
      if (m.to !== undefined) { const p = c.room.players.get(m.to); if (p) send(p, out); }
      else for (const p of c.room.players.values()) if (p !== c) send(p, out);
    }
  }

  server.on('upgrade', (req, sock) => {
    if (new URL(req.url, 'http://x').pathname !== '/ws' || !req.headers['sec-websocket-key']) { sock.destroy(); return; }
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    sock.setNoDelay(true);   // gecikme için şart: küçük paketler Nagle ile beklemesin
    const c = { id: nextId++, sock, room: null, slot: -1 };
    let buf = Buffer.alloc(0), frag = null;
    const close = () => { leave(c); if (!sock.destroyed) sock.destroy(); };
    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (buf.length < 2) return;
        const fin = !!(buf[0] & 0x80), op = buf[0] & 0x0f, masked = !!(buf[1] & 0x80);
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (len > MAX_PAYLOAD) return close();
        if (buf.length < off + (masked ? 4 : 0) + len) return;
        let payload;
        if (masked) {
          const mask = buf.subarray(off, off + 4); off += 4;
          payload = Buffer.from(buf.subarray(off, off + len));
          for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
        } else payload = Buffer.from(buf.subarray(off, off + len));
        buf = buf.subarray(off + len);
        if (op === 0x8) { if (!sock.destroyed) sock.write(frame(0x8, Buffer.alloc(0))); return close(); }
        if (op === 0x9) { sock.write(frame(0xA, payload)); continue; }
        if (op === 0xA) continue;
        if (op === 0x1 || op === 0x0) {
          if (op === 0x1) frag = []; else if (!frag) continue;
          frag.push(payload);
          if (fin) { const text = Buffer.concat(frag).toString('utf8'); frag = null; onMessage(c, text); }
        }
      }
    });
    sock.on('close', close);
    sock.on('error', close);
    c.pinger = setInterval(() => { if (!sock.destroyed) sock.write(frame(0x9, Buffer.alloc(0))); }, 25000);   // tünel ve vekiller boşta bağlantıyı kesmesin
    sock.on('close', () => clearInterval(c.pinger));
  });
  return { rooms };
}

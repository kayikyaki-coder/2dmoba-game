/* Online (lockstep) senkron testi: iki ayrı süreç gerçek röleden bağlanır, rastgele girdilerle N tik oynar, durum özetleri aynı çıkmalı.
   Kullanım: node tools/online_test.js [--mode 1v1|coop|pvp] [--ticks 7200] [--delay 6] [--lag 40] [--seed 1]
   --lag: her gelen mesaja 0..lag ms rastgele gecikme (ağ titreşimi benzetimi). Çıkış kodu 0 = iki taraf aynı. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { attachRelay } from './wsrelay.js';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const MODE = arg('mode', 'coop'), TICKS = +arg('ticks', 7200), DELAY = +arg('delay', 6), LAG = +arg('lag', 0), SEED = +arg('seed', 1);
const role = arg('role', null);

/* ---------------- istemci süreci ---------------- */
async function client() {
  const { S, canShop, attackTarget, simHash } = await import('../sim.js');
  const { ITEMS, BUILDS } = await import('../items.js');
  const { Lockstep, beginMatch, makeConfig, encodeCmd } = await import('../lockstep.js');
  const url = arg('url'), host = role === 'host';
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnd = mulberry(SEED * 7 + (host ? 1 : 2)), jit = mulberry(SEED * 13 + (host ? 3 : 4));
  const itemIds = Object.keys(ITEMS);
  const ws = new WebSocket(url);
  let slot = -1, ls = null, started = false;
  const send = d => ws.send(JSON.stringify({ t: 'relay', d }));
  const sendTo = (to, d) => ws.send(JSON.stringify({ t: 'relay', d, to }));

  /* kalıcı rastgele girdi: düşman üssüne yürü, menzildeyse vur, ara sıra yetenek/alım */
  let autoSent = false;
  function localCmd() {
    const p = S.player, dir = p.team === 0 ? 1 : -1;
    let mx = rnd() < 0.7 ? dir : (rnd() < 0.5 ? -dir : 0), my = rnd() < 0.5 ? 0 : (rnd() < 0.5 ? 1 : -1);
    const tgt = attackTarget(p, p.x + 100 * dir, p.y);
    const aim = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : (dir > 0 ? 0 : Math.PI) + (rnd() - 0.5) * 0.4;
    const c = { mx, my, aim, attack: !!tgt, target: tgt, rmb: rnd() < 0.03, e: rnd() < 0.03, space: rnd() < 0.01, recall: rnd() < 0.002, item: rnd() < 0.002,
      tx: p.x + Math.cos(aim) * 300, ty: p.y + Math.sin(aim) * 300 };
    const a = [];
    if (!autoSent) { autoSent = true; a.push(['auto', true, [...BUILDS[p.type].default]]); }   // otomatik alım komutu (tik 0)
    if (p.points > 0 && rnd() < 0.3) a.push(['learn', ['r', 'e', 's'][Math.floor(rnd() * 3)]]);
    if (canShop(p) && rnd() < 0.05) a.push(['buy', itemIds[Math.floor(rnd() * itemIds.length)]]);
    if (canShop(p) && p.items.length >= 5 && rnd() < 0.02) a.push(['sell', 0]);
    return encodeCmd(c, a);
  }

  function launch(cfg) {
    started = true;
    ls = beginMatch(cfg, slot, send, d => { console.log('DESYNC', JSON.stringify(d)); });
    const loop = () => {
      let n = 0;
      while (ls.tick < TICKS && n < 300 && ls.canAdvance()) { ls.advance(localCmd); n++; }
      if (ls.tick >= TICKS || S.over) {
        console.log('RESULT ' + JSON.stringify({ slot, tick: ls.tick, hash: simHash(), time: +S.time.toFixed(2), over: S.over ? S.over.winner : null, desync: ls.desync, stalls: ls.stalls, kills: S.heroes.map(h => h.kills), auto: S.heroes.map(h => h.autoBuy ? 1 : 0).join(''), items: S.heroes.map(h => h.items.length).join(',') }));
        setTimeout(() => process.exit(0), 300); return;
      }
      setTimeout(loop, n ? 0 : 1);
    };
    loop();
  }

  ws.onopen = () => { if (host) ws.send(JSON.stringify({ t: 'create' })); else ws.send(JSON.stringify({ t: 'join', code: arg('code') })); };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    const handle = () => {
      if (m.t === 'room') { slot = m.slot; if (host) console.log('CODE ' + m.code); if (!host) sendTo(0, { joined: 1 }); }
      else if (m.t === 'err') { console.log('ERR ' + m.msg); process.exit(2); }
      else if (m.t === 'relay') {
        const d = m.d;
        if (d.joined && host) {
          const cfg = makeConfig({ mode: MODE, heroes: ['archer', 'warrior'], bots: ['mage', 'hook'], botLevel: 'medium' }, DELAY, { seed: SEED });
          send({ start: cfg }); launch(cfg);
        } else if (d.start && !started) launch(d.start);
        else if (ls) ls.receive(m.from, d);
      }
    };
    if (LAG && started) setTimeout(handle, jit() * LAG); else handle();   // titreşim: sıra bozulabilir, anahtarlar tik numarası olduğu için sorun olmaz
  };
}

/* ---------------- ana süreç ---------------- */
if (role) { await client(); }
else {
  const server = http.createServer((q, r) => r.end('x'));
  attachRelay(server);
  await new Promise(r => server.listen(0, r));
  const url = 'ws://localhost:' + server.address().port + '/ws';
  const me = fileURLToPath(import.meta.url), base = ['--mode', MODE, '--ticks', TICKS, '--delay', DELAY, '--lag', LAG, '--seed', SEED, '--url', url].map(String);
  const out = { host: [], guest: [] };
  const run = (r, extra = []) => new Promise(res => {
    if (r === 'guest') res({});
    const p = spawn(process.execPath, [me, '--role', r, ...base, ...extra], { stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    p.stdout.on('data', d => { buf += d; if (process.env.DEBUG) process.stderr.write('[' + r + '] ' + d); for (const l of String(d).split('\n')) { if (l.startsWith('CODE ')) res({ p, code: l.slice(5).trim() }); } });
    p.on('close', () => { if (process.env.DEBUG) process.stderr.write('[' + r + '] close\n'); out[r] = buf.split('\n').filter(Boolean); out[r + 'Done']?.(); });
    p.on('error', e => { console.error(e); process.exit(2); });
    out[r + 'Proc'] = p;
  });
  const hostDone = new Promise(r => out.hostDone = r), guestDone = new Promise(r => out.guestDone = r);
  const { code } = await run('host');
  await run('guest', ['--code', code]).catch(() => {});
  await Promise.all([hostDone, guestDone]);
  const res = r => { const l = out[r].find(x => x.startsWith('RESULT ')); return l ? JSON.parse(l.slice(7)) : null; };
  const a = res('host'), b = res('guest');
  console.log('host ', JSON.stringify(a)); console.log('guest', JSON.stringify(b));
  for (const r of ['host', 'guest']) for (const l of out[r]) if (l.startsWith('DESYNC')) console.log(r, l);
  const ok = a && b && a.tick === b.tick && a.hash === b.hash && !a.desync && !b.desync;
  console.log(ok ? 'TAMAM: iki taraf ayni (mod ' + MODE + ', ' + a.tick + ' tik)' : 'HATA: senkron bozuk ya da sonuc yok');
  process.exit(ok ? 0 : 1);
}

/* Online oyun: lockstep (komut aktarımı). Her tarayıcı aynı sim.js'i çalıştırır, aralarında yalnız insan komutları gider.
   DOM yok, Node'da da çalışır (tools/online_test.js).
   Mantık: tik t'yi ancak bütün insanların t komutu geldiyse ilerletiriz. Komut, `delay` tik önceden gönderilir (girdi gecikmesi = delay/60 sn).
   Ağ ortamı send(obj) ile gelir; karşıdan gelen mesajlar receive(slot, obj) ile verilir. */
import { TICK } from './data.js';
import { S, settings, resetGame, step, learnSkill, buySmart, sell, simHash } from './sim.js';
import { ITEMS, PARTS } from './items.js';
import { botCommand, setBotLevel } from './ai.js';
import { HERO_NAMES } from './names.js';

export const HASH_EVERY = 120;   // tik: bu aralıkla iki tarafın durum özeti karşılaştırılır
const EMPTY = { mx:0, my:0, aim:0, attack:false, tid:0, rmb:false, e:false, space:false, recall:false, item:false };

/* Yerel girdiyi (playerCommand çıktısı) ağa gidecek düz nesneye çevirir */
export function encodeCmd(c, acts){
  const o = { mx:c.mx|0, my:c.my|0, aim:c.aim, attack:!!c.attack, tid:c.target ? c.target.id : 0,
    rmb:!!c.rmb, e:!!c.e, space:!!c.space, recall:!!c.recall, item:!!c.item, tx:c.tx, ty:c.ty };
  if(c.hold!==undefined) o.hold = c.hold;
  if(acts && acts.length) o.acts = acts;
  return o;
}
function findUnit(id){
  if(!id) return undefined;
  for(const list of [S.heroes, S.minions, S.monsters, S.structs]) for(const u of list) if(u.id===id) return u;
  return undefined;
}
function decodeCmd(o){
  const c = { mx:o.mx||0, my:o.my||0, aim:Number.isFinite(o.aim) ? o.aim : 0, attack:!!o.attack, target:findUnit(o.tid),
    rmb:!!o.rmb, e:!!o.e, space:!!o.space, recall:!!o.recall, item:!!o.item };
  if(Number.isFinite(o.tx) && Number.isFinite(o.ty)){ c.tx=o.tx; c.ty=o.ty; }
  if(Number.isFinite(o.hold)) c.hold=o.hold;
  return c;
}
/* Mağaza ve yetenek puanı gibi arayüz eylemleri komutla birlikte gelir, her tarayıcıda aynı tikte uygulanır */
function applyAct(h, a){
  try{
    if(a[0]==='learn' && (a[1]==='r'||a[1]==='e'||a[1]==='s')) learnSkill(h, a[1]);
    else if(a[0]==='buy' && typeof a[1]==='string' && (ITEMS[a[1]]||PARTS[a[1]])) buySmart(h, a[1]);
    else if(a[0]==='sell' && Number.isInteger(a[1])) sell(h, a[1]);
    else if(a[0]==='auto' && Array.isArray(a[2]) && a[2].length<=8 && a[2].every(x=>typeof x==='string' && (x==='DEF' || ITEMS[x] || PARTS[x]))){ h.autoBuy=!!a[1]; h.build=[...a[2]]; }   // otomatik alım: açık/kapalı + eşya sırası
  }catch(e){ /* geçersiz eylem: iki tarafta da aynı şekilde yok sayılır */ }
}

export class Lockstep {
  /* slot: bu tarayıcının oyuncu sırası; humans: slot -> kahraman sırası (S.heroes); delay: tik */
  constructor({ slot, humans, delay, send, onDesync }){
    this.slot=slot; this.humans=humans; this.delay=delay; this.send=send; this.onDesync=onDesync||(()=>{});
    this.tick=0; this.buf=new Map(); this.hashes=new Map(); this.theirs=new Map();
    this.heroSlot=new Map(); humans.forEach((hi,s)=>this.heroSlot.set(hi,s));
    this.stalls=0; this.desync=null;
    for(let t=0;t<delay;t++) for(let s=0;s<humans.length;s++) this._put(t,s,EMPTY);   // başlangıçta ilk `delay` tik boş komutla
  }
  _put(t, s, c){ let m=this.buf.get(t); if(!m){ m=new Map(); this.buf.set(t,m); } m.set(s,c); }
  receive(from, d){
    if(d.k!==undefined && d.c) this._put(d.k, from, d.c);
    else if(d.h!==undefined){
      this.theirs.set(d.h, d.v);
      this._compare(d.h);
    }
  }
  canAdvance(){
    const m=this.buf.get(this.tick);
    if(!m || m.size<this.humans.length){ this.stalls++; return false; }
    return true;
  }
  /* Bir tik ilerlet: yerel komutu (gelecek tik için) gönder, eylemleri uygula, sim'i ilerlet.
     local: () => { cmd (encodeCmd çıktısı) }  (tik başına bir kez çağrılır) */
  advance(local){
    const t=this.tick, cmds=this.buf.get(t);
    const mine=local();
    this._put(t+this.delay, this.slot, mine);
    this.send({ k:t+this.delay, c:mine });
    // eylemler: slot sırasıyla, önce hepsi
    for(let s=0;s<this.humans.length;s++){
      const c=cmds.get(s); if(c.acts) for(const a of c.acts) applyAct(S.heroes[this.humans[s]], a);
    }
    const dec=new Map();
    step(TICK, (h, dt)=>{
      const s=this.heroSlot.get(S.heroes.indexOf(h));
      if(s===undefined) return botCommand(h, dt);
      let d=dec.get(s); if(!d){ d=decodeCmd(cmds.get(s)); dec.set(s,d); }
      return d;
    });
    this.buf.delete(t); this.tick=t+1;
    if(this.tick%HASH_EVERY===0){ const v=simHash(); this.hashes.set(this.tick,v); this.send({ h:this.tick, v }); this._compare(this.tick); }
  }
  _compare(k){
    if(!this.hashes.has(k) || !this.theirs.has(k)) return;
    const a=this.hashes.get(k), b=this.theirs.get(k);
    this.hashes.delete(k); this.theirs.delete(k);
    if(a!==b && !this.desync){ this.desync={ tick:k, mine:a, theirs:b }; this.onDesync(this.desync); }
  }
}

/* ---- Maç kurulumu (lobi -> ortak yapılandırma) ---- */
export const ONLINE_MODES = {
  '1v1':  { label:'1v1',            sub:'Birbirinize karşı, botsuz' },
  'coop': { label:'2v2 ortak',      sub:'İkiniz aynı takım, karşıda 2 bot' },
  'pvp':  { label:'2v2 karşılıklı', sub:'Her takımda bir insan ve bir bot' }
};
/* lobby: { mode, heroes:[slot0 kahramanı, slot1 kahramanı], bots:[b0,b1], botLevel } ('random' olabilir). Yalnız oda sahibi çağırır; sonuç herkese gider. */
export function makeConfig(lobby, delay, overrides){
  const ids=Object.keys(HERO_NAMES), pick=v=>v==='random' || !HERO_NAMES[v] ? ids[Math.floor(Math.random()*ids.length)] : v;
  const a=pick(lobby.heroes[0]), b=pick(lobby.heroes[1]), x=pick(lobby.bots[0]), y=pick(lobby.bots[1]);
  let types, humans;
  if(lobby.mode==='1v1'){ types=[[a],[b]]; humans=[0,1]; }
  else if(lobby.mode==='coop'){ types=[[a,b],[x,y]]; humans=[0,1]; }
  else { types=[[a,x],[b,y]]; humans=[0,2]; }
  const botLevels={}; let i=0;
  for(const t of types) for(let j=0;j<t.length;j++){ if(!humans.includes(i)) botLevels[i]=lobby.botLevel||'medium'; i++; }
  return { seed:(Math.random()*4294967296)>>>0, mode:lobby.mode, types, humans, botLevels, delay,
    settings:{ fog:settings.fog, waves:settings.waves, jungle:settings.jungle, startLevel:settings.startLevel, aimMode:'track', asBonus:0, botMode:'lane' }, ...overrides };
}
/* Her tarayıcıda aynı çağrılır: simülasyonu kurar, Lockstep döndürür */
export function beginMatch(cfg, slot, send, onDesync){
  Object.assign(settings, cfg.settings);
  const sl=cfg.settings.startLevel;
  resetGame({ seed:cfg.seed, types:cfg.types, humans:cfg.humans, human:cfg.humans[slot], levels:[sl,sl], jungle:cfg.settings.jungle });
  S.heroes.forEach((h,i)=>{ if(!cfg.humans.includes(i)) setBotLevel(h, cfg.botLevels[i]||'medium'); });
  return new Lockstep({ slot, humans:cfg.humans, delay:cfg.delay, send, onDesync });
}

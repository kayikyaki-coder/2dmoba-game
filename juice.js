/* Oyun hissi (juice, 16.10.2026): atılış ve patlama efektleri, kamera tekmesi, kodla üretilen sesler.
   YALNIZ ÇİZİM VE SES. Sim durumunu (S) sadece okur, hiçbir alanına yazmaz: online lockstep ve deterministik sim etkilenmez.
   Tetikleyiciler sim'in zaten ürettiği durumdan okunur:
   - S.fx içindeki yeni olaylar (boom rengi/r0 ile tür, cone, slash), WeakSet ile bir kez işlenir
   - S.zones (Meteor, Şok Bombası, Kök Sal): patlama öncesi şişme + kırmızı yanıp sönme, listeden düşünce patlama
   - S.novas (Kan Patlaması), S.structs ölümü (kule, nexus), kahramanda h.dash başlangıç/bitiş, u.pulled.shove (itme), Gölge ışınlanması
   Ağır çekim YOK (kullanıcı kararı). Ayar: jset.fx (efektler) ve jset.sound (ses), localStorage moba2d_juice_v1.
   render.js: juiceFrame / juiceUnder / juiceOver / juiceScreen / juiceToken / juiceCamLead / juiceShake; menu.js: ayar kutuları. */
import { S, visiblePos, canSee } from './sim.js';
import { PAL, rgba } from './palette.js';
import { drawToken, tokenImg } from './art.js';

/* ================= SABİTLER (tek yerde) ================= */
export const J = {
  maxDebris:260, maxSmoke:110, maxRings:40, maxBalls:24, maxGhosts:36,   // havuz üst sınırları
  shakeMax:14, shakeDecay:9,               // ekran tekmesi: en fazla piksel, sönüm hızı (1/sn)
  kickFalloff:1500,                        // tekme oyuncudan bu uzaklıkta 0,25'e iner
  frameGap:0.5,                            // siyah-beyaz darbe karesi en sık 0,5 sn'de bir
  camLead:70, camLeadIn:12, camLeadOut:4,  // atılışta kamera öne geçme (dünya birimi) ve yaklaşma/dönüş hızları
  ghostEvery:0.028, ghostLife:0.24,        // atılış hayalet kopyası aralığı ve ömrü
  squashIn:0.06, squashOut:0.14,           // atılış başı sıkışma ve iniş sıkışması süreleri
  anticip:0.5,                             // gecikmeli alanlarda şişme ve yanıp sönme bu orandan sonra başlar (0..1)
  gravity:1500,                            // enkaz yerçekimi (yükseklik ekseni)
  // ses
  master:0.22, maxVoices:6, hearR:1900,    // ana ses düzeyi, aynı anda en çok ses, duyulma uzaklığı
};
/* Patlama türleri: r = alan yarıçapına göre ölçek. fire: ateş topu renkleri (iç -> dış), frame: siyah-beyaz darbe karesi.
   kick: ekran tekmesi (piksel), debris/sparks/smoke: parçacık sayıları, ring: zemin şok halkası kalınlığı (0 yok), snd: ses ve düzeyi */
const EX = {
  meteor:{ fire:['#fff8e0','#ffd27a','#ff7a3d','#9a2a1a'], life:0.75, frame:true, kick:10, debris:18, dcol:['#3a2c55','#5a4a80','#ff9a4d'], sparks:10, scol:'#ffd27a', smoke:9, scol2:'#3b3350', ring:5, snd:['big',1] },
  tower: { fire:['#ffffff','#fff0b0','#ffb35a','#7a3a2a'], life:0.9, frame:true, kick:12, debris:26, dcol:null, sparks:14, scol:'#fff0b0', smoke:14, scol2:'#3b3350', ring:6, snd:['big',1] },
  nexus: { fire:['#ffffff','#fff0b0','#ffb35a','#7a3a2a'], life:1.1, frame:true, kick:18, debris:40, dcol:null, sparks:22, scol:'#fff0b0', smoke:20, scol2:'#3b3350', ring:8, snd:['big',1.2] },
  bomb:  { fire:['#ffffff','#fff2a8','#ffc94a','#8a5a1a'], life:0.45, kick:5, debris:8, dcol:['#2b2b33','#4a4a58'], sparks:8, scol:'#ffe27a', smoke:4, scol2:'#3e3a4e', ring:4, snd:['mid',0.7] },
  shell: { fire:['#ffffff','#e6dcff','#a98bff','#4b3a9a'], life:0.42, kick:3, debris:6, dcol:['#4a3a8c','#2c2260'], sparks:6, scol:'#d9c2ff', smoke:3, scol2:'#40365e', ring:3, snd:['mid',0.5] },
  orb:   { fire:['#ffffff','#c9f6ff','#6fe6ff','#1f6a8a'], life:0.38, kick:3, sparks:10, scol:'#9fefff', ring:3, snd:['small',0.5] },
  spirit:{ fire:['#ffffff','#c2fff5','#5fe0c8','#14695f'], life:0.36, kick:2, sparks:8, scol:'#7ff5dc', ring:3, snd:['small',0.45] },
  blood: { fire:['#ffe0e6','#ff8aa6','#d0213f','#5a0a1e'], life:0.34, kick:2, sparks:10, scol:'#ff4f7b', ring:3, snd:['small',0.45] },
  spark: { fire:['#ffffff','#ffd58a','#ff7a3d','#7a2a10'], life:0.24, kick:0, sparks:5, scol:'#ffd58a', ring:0, snd:['tiny',0.3] },
  slam:  { dust:true, life:0.4, kick:4, debris:8, dcol:['#463e6b','#6b5fa6','#2c2260'], smoke:6, scol2:'#6a5f86', ring:4, snd:['thud',0.6] },
  roll:  { dust:true, life:0.4, kick:4, debris:8, dcol:['#463e6b','#6b5fa6','#8a6414'], smoke:6, scol2:'#6a5f86', ring:4, snd:['thud',0.6] },
  wave:  { fire:null, life:0.5, kick:4, sparks:12, scol:'#d9c2ff', ring:7, snd:['thud',0.55] },
  blink: { fire:null, life:0.3, kick:0, sparks:8, scol:'#b58cff', smoke:4, scol2:'#4b3a9a', ring:2, snd:['blink',0.4] },
};
/* Atılış türleri (h.dash.sk.type): whoosh düzeyi, hayalet, hız çizgisi, toz, sıkış-uza, duruşta kayma sesi */
const DASH = {
  dash:     { snd:0.6, ghosts:true, lines:4, dust:6, squash:1,   skid:0.5 },   // Savaşçı Atılış
  tumble:   { snd:0.4, ghosts:true, lines:3, dust:4, squash:0.7, skid:0.35 },  // İkiz Yan Atılış
  flameleap:{ snd:0.55,ghosts:true, lines:4, dust:6, squash:1,   skid:0, tint:'#ff8a3d' },  // Alevli Sıçrayış (iniş şeridi sim'de)
  roll:     { snd:0.5, ghosts:true, lines:5, dust:6, squash:0.8, skid:0 },     // Gülle Yuvarlan (iniş patlaması 'roll')
  leapslam: { snd:0.55,ghosts:true, lines:4, dust:5, squash:1,   skid:0 },     // İkili Sıçrayış Darbesi (iniş 'slam')
  duel:     { snd:0.6, ghosts:true, lines:4, dust:5, squash:1,   skid:0, hit:true },  // Gladyatör Meydan Okuma (değince çatırtı)
};

/* ================= AYAR ================= */
const KEY='moba2d_juice_v1';
export const jset = { fx:true, sound:true };
try{ const o=JSON.parse(localStorage.getItem(KEY)||'null'); if(o){ if(o.fx===false) jset.fx=false; if(o.sound===false) jset.sound=false; } }catch(e){}
export function setJuice(k, v){ jset[k]=!!v; try{ localStorage.setItem(KEY, JSON.stringify(jset)); }catch(e){} if(k==='sound' && v) audioUnlock(); if(k==='fx' && !v) clearAll(); }

/* ================= HAVUZLAR ================= */
const debris=[], smoke=[], rings=[], balls=[], ghosts=[], flashes=[];
const free={ d:[], s:[], r:[], b:[], g:[] };
function take(kind, list, max){ if(list.length>=max) return null; const o=free[kind].pop()||{}; list.push(o); return o; }
function sweep(kind, list){ let w=0; for(let i=0;i<list.length;i++){ const o=list[i]; if(o.t<o.life) list[w++]=o; else free[kind].push(o); } list.length=w; }
function clearAll(){ for(const [k,l] of [['d',debris],['s',smoke],['r',rings],['b',balls],['g',ghosts]]){ for(const o of l) free[k].push(o); l.length=0; } flashes.length=0; shake.a=0; }

/* ================= DURUM ================= */
let env=null;   // { cam, view } render.js'ten
export function juiceInit(e){ env=e; }
export const jstats = { ms:0, n:0, parts:0 };   // juice çizim + güncelleme süresi (ölçüm için)
let seenFx=new WeakSet(), seenNova=new WeakSet(), zoneMap=new Map(), structDead=new WeakMap(), heroSt=new WeakMap();
let lastHeroes=null, lastNow=0, lastSimT=-1, simStill=0, lastFrameAt=-9;
const shake={ a:0, x:0, y:0 };
const lead={ x:0, y:0 };
const R=Math.random, TAU=Math.PI*2;
const onScreen=(x,y,m)=>env && x>env.cam.x-m && x<env.cam.x+env.view.visW+m && y>env.cam.y-m && y<env.cam.y+env.view.visH+m;
const seen=(x,y,r)=>!!S.player && visiblePos(S.player.team,x,y,r||0);
function kick(px, x, y){
  if(!px) return;
  const p=S.player, d=p ? Math.hypot(x-p.x,y-p.y) : 0;
  shake.a=Math.min(J.shakeMax, Math.max(shake.a, px*Math.max(0.25, 1-d/J.kickFalloff)));
}

/* ================= SES (Web Audio, dosyasız) ================= */
let AC=null, master=null, noiseBuf=null, voices=0;
const lastPlay={};
function audioUnlock(){
  if(!jset.sound) return;
  try{
    if(!AC){
      const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
      AC=new C(); master=AC.createGain(); master.gain.value=J.master;
      const comp=AC.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=6;
      master.connect(comp); comp.connect(AC.destination);
      noiseBuf=AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    }
    if(AC.state==='suspended') AC.resume();
  }catch(e){ AC=null; }
}
if(typeof addEventListener!=='undefined'){ for(const ev of ['pointerdown','keydown']) addEventListener(ev, audioUnlock, { passive:true }); }
export const audioState=()=>AC ? AC.state : 'yok';
function voice(dur){ voices++; setTimeout(()=>{ voices--; }, dur*1000+60); }
function noise(t0, dur){ const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.start(t0, R()*0.5); s.stop(t0+dur); return s; }
function env2(g, t0, a, peak, dur){ g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(peak,t0+a); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); }
const SND = {
  whoosh(v, low){   // vınlama: band geçiren gürültü, frekans süpürmesi
    const t=AC.currentTime, d=0.26, n=noise(t,d), f=AC.createBiquadFilter(), g=AC.createGain();
    f.type='bandpass'; f.Q.value=1.4; const b=low?300:500;
    f.frequency.setValueAtTime(b,t); f.frequency.exponentialRampToValueAtTime(b*4.5,t+d*0.45); f.frequency.exponentialRampToValueAtTime(b*1.2,t+d);
    env2(g,t,0.05,0.5*v,d); n.connect(f); f.connect(g); g.connect(master); return d;
  },
  skid(v){   // duruşta kayma: kısa, alçak geçiren hışırtı
    const t=AC.currentTime, d=0.16, n=noise(t,d), f=AC.createBiquadFilter(), g=AC.createGain();
    f.type='lowpass'; f.frequency.setValueAtTime(1800,t); f.frequency.exponentialRampToValueAtTime(300,t+d);
    env2(g,t,0.01,0.35*v,d); n.connect(f); f.connect(g); g.connect(master); return d;
  },
  crack(v){   // keskin çatırtı: yüksek geçiren gürültü patlaması
    const t=AC.currentTime, d=0.09, n=noise(t,d), f=AC.createBiquadFilter(), g=AC.createGain();
    f.type='highpass'; f.frequency.value=1600; env2(g,t,0.002,0.9*v,d); n.connect(f); f.connect(g); g.connect(master); return d;
  },
  boom(v, deep){   // derin gümleme: düşen sinüs + alçak gürültü
    const t=AC.currentTime, d=deep?0.9:0.5, o=AC.createOscillator(), g=AC.createGain();
    o.type='sine'; o.frequency.setValueAtTime(deep?95:140,t); o.frequency.exponentialRampToValueAtTime(deep?32:55,t+d);
    env2(g,t,0.008,0.9*v,d); o.connect(g); g.connect(master); o.start(t); o.stop(t+d);
    const n=noise(t,d), f=AC.createBiquadFilter(), g2=AC.createGain();
    f.type='lowpass'; f.frequency.setValueAtTime(deep?500:800,t); f.frequency.exponentialRampToValueAtTime(90,t+d);
    env2(g2,t,0.005,0.6*v,d*0.8); n.connect(f); f.connect(g2); g2.connect(master); return d;
  },
  blink(v){   // ışınlanma: kısa inen sinüs
    const t=AC.currentTime, d=0.18, o=AC.createOscillator(), g=AC.createGain();
    o.type='triangle'; o.frequency.setValueAtTime(1100,t); o.frequency.exponentialRampToValueAtTime(260,t+d);
    env2(g,t,0.005,0.35*v,d); o.connect(g); g.connect(master); o.start(t); o.stop(t+d); return d;
  },
};
/* name: ses adı; v: düzey; x,y: dünya konumu (kamera ortasına uzaklıkla kısılır); gap: aynı adın en sık çalma aralığı (sn) */
function play(name, v, x, y, gap){
  if(!jset.sound || !AC || AC.state!=='running' || !env) return;
  if(voices>=J.maxVoices) return;
  const now=performance.now()/1000; if(now-(lastPlay[name]||0) < (gap||0.06)) return; lastPlay[name]=now;
  if(x!==undefined){ const cx=env.cam.x+env.view.visW/2, cy=env.cam.y+env.view.visH/2; v*=Math.max(0,1-Math.hypot(x-cx,y-cy)/J.hearR); }
  if(v<0.04) return;
  try{
    let d;
    if(name==='big'){ d=SND.crack(v); SND.boom(v,true); }
    else if(name==='mid'){ d=SND.crack(v*0.8); SND.boom(v*0.8,false); }
    else if(name==='small'){ d=SND.crack(v*0.6); SND.boom(v*0.5,false); }
    else if(name==='tiny'){ d=SND.crack(v*0.5); }
    else if(name==='thud'){ d=SND.boom(v,false); SND.skid(v*0.6); }
    else if(name==='whoosh' || name==='whooshLow'){ d=SND.whoosh(v, name==='whooshLow'); }
    else d=SND[name](v);
    voice(Math.max(0.2,d||0.3));
  }catch(e){}
}

/* ================= PARÇACIK ÜRETİCİLER ================= */
function spawnDebris(x, y, n, cols, spd, size){
  for(let i=0;i<n;i++){
    const o=take('d',debris,J.maxDebris); if(!o) return;
    const a=R()*TAU, v=spd*(0.35+R()*0.75);
    o.x=x+Math.cos(a)*6; o.y=y+Math.sin(a)*6; o.vx=Math.cos(a)*v; o.vy=Math.sin(a)*v*0.85;
    o.z=4; o.vz=220+R()*380*(spd/320); o.rot=R()*TAU; o.vr=(R()-0.5)*18; o.s=size*(0.5+R()*0.8);
    o.col=cols[(R()*cols.length)|0]; o.t=0; o.life=0.9+R()*0.6; o.spark=false; o.land=false;
  }
}
function spawnSparks(x, y, n, col, spd){
  for(let i=0;i<n;i++){
    const o=take('d',debris,J.maxDebris); if(!o) return;
    const a=R()*TAU, v=spd*(0.5+R()*0.8);
    o.x=x; o.y=y; o.vx=Math.cos(a)*v; o.vy=Math.sin(a)*v; o.z=0; o.vz=0; o.rot=a; o.vr=0; o.s=2+R()*2;
    o.col=col; o.t=0; o.life=0.22+R()*0.25; o.spark=true; o.land=false;
  }
}
function spawnSmoke(x, y, n, col, r0, r1, rise, life, spread){
  for(let i=0;i<n;i++){
    const o=take('s',smoke,J.maxSmoke); if(!o) return;
    const a=R()*TAU, d=R()*(spread||r0);
    o.x=x+Math.cos(a)*d; o.y=y+Math.sin(a)*d*0.8; o.vx=Math.cos(a)*(20+R()*40); o.vy=-rise*(0.6+R()*0.8)+Math.sin(a)*15;
    o.r0=r0*(0.6+R()*0.6); o.r1=r1*(0.7+R()*0.6); o.col=col; o.t=-R()*0.08; o.life=life*(0.7+R()*0.6); o.a=0.42+R()*0.2;
  }
}
function spawnRing(x, y, r0, r1, col, lw, life){
  const o=take('r',rings,J.maxRings); if(!o) return;
  o.x=x; o.y=y; o.r0=r0; o.r1=r1; o.col=col; o.lw=lw; o.t=0; o.life=life;
}
function spawnBall(x, y, r, cols, life){
  const o=take('b',balls,J.maxBalls); if(!o) return;
  o.x=x; o.y=y; o.r=r; o.cols=cols; o.t=0; o.life=life; o.spr=fireSprite(cols);
}
function spawnGhost(h, tint){
  const o=take('g',ghosts,J.maxGhosts); if(!o) return;
  o.type=h.type; o.team=h.team; o.x=h.x; o.y=h.y; o.r=h.r; o.aim=h.aim; o.tint=tint||null; o.t=0; o.life=J.ghostLife;
}

/* ================= OLAYLAR ================= */
function explode(kind, x, y, r, team){
  const E=EX[kind]; if(!E) return;
  if(!onScreen(x,y,r+80)){ play(E.snd[0], E.snd[1]*0.5, x, y); return; }   // ekran dışı: yalnız (kısık) ses
  const sc=Math.max(0.45, r/150);
  if(E.frame){
    const now=performance.now()/1000;
    if(now-lastFrameAt>=J.frameGap){ lastFrameAt=now; flashes.push({ x, y, r:r*0.95, frames:1 }); }
  }
  if(E.fire) spawnBall(x, y, r*1.05, E.fire, E.life);
  if(E.dust) spawnSmoke(x, y, 10, E.scol2, r*0.25, r*0.55, 10, 0.55, r*0.6);
  if(E.debris) spawnDebris(x, y, E.debris, E.dcol || [PAL.teamDark[team]||'#3a2c55', PAL.team[team]||'#a98bff', '#2a2448'], 260*sc+120, 5*Math.min(1.6,sc)+2);
  if(E.sparks) spawnSparks(x, y, E.sparks, E.scol, 380*Math.min(1.5,sc)+160);
  if(E.smoke && !E.dust) spawnSmoke(x, y, E.smoke, E.scol2, r*0.22, r*0.55, 38, 2.1, r*0.45);
  if(E.ring) spawnRing(x, y, r*0.3, r*1.35, E.fire ? E.fire[1] : '#d8ccff', E.ring, 0.42);
  kick(E.kick, x, y);
  play(E.snd[0], E.snd[1], x, y, kind==='spark'?0.12:0.05);
}
const BOOM_KIND = { '#5fe0c8':'spirit', '#6fe6ff':'orb', '#ff9a4d':'slam', '#ffd27a':'roll' };
function onFx(f){
  if(f.type==='boom'){
    if(f.r1===f.r0+110) return;   // yapı yıkılışı: structs takibinde
    const c=f.color;
    let kind=BOOM_KIND[c];
    if(c==='#ff8a3d' && f.r0===14) kind='spark';                    // Kıvılcım
    else if(c==='#9a7bff' && f.r0===20) kind='blink';               // Gölge Adımı inişi
    else if(c==='#b58cff' && f.r0!==20) kind='wave';                // Şok Dalgası (Kök Sal r0 20, zone takibinde)
    else if(c==='#5fe0c8' && f.life>=0.5) kind='spirit';            // güçlü Ruh alanının ikinci patlaması
    if(!kind || !seen(f.x,f.y,f.r1)) return;
    explode(kind, f.x, f.y, f.r1);
  } else if(f.type==='cone'){   // Ezici Darbe (renksiz) / Alev Üfleme (turuncu): koniyi rakip de net görsün
    const h=f.owner; if(!h || !canSee(S.player.team,h)) return;
    coneHits.push({ h, ang:f.ang, reach:f.reach, half:f.half, fire:!!f.color, team:h.team, t:0, life:f.color?0.42:0.38 });
    const mx=h.x+Math.cos(f.ang)*f.reach*0.6, my=h.y+Math.sin(f.ang)*f.reach*0.6;
    if(f.color){
      for(let i=0;i<14;i++){ const a=f.ang+(R()*2-1)*f.half, d=h.r+R()*(f.reach-h.r); spawnSparks(h.x+Math.cos(a)*d, h.y+Math.sin(a)*d, 1, R()<0.5?'#ffd58a':'#ff7a3d', 120); }
      play('whooshLow', 0.4, h.x, h.y, 0.1);
    } else {
      for(let i=0;i<7;i++){ const a=f.ang+(R()*2-1)*f.half, d=f.reach*(0.55+R()*0.45); spawnSmoke(h.x+Math.cos(a)*d, h.y+Math.sin(a)*d, 1, '#6a5f86', 10, 26, 8, 0.5, 4); }
      spawnDebris(mx, my, 5, ['#463e6b','#6b5fa6'], 160, 4);
      kick(3, mx, my); play('thud', 0.5, mx, my);
    }
  } else if(f.type==='slash' && f.crit && f.life===0.25){   // Gladyatör Ağır Darbe: hedefte darbe halkası + çatırtı
    const u=f.tgt; if(!u || !canSee(S.player.team,u)) return;
    spawnRing(u.x, u.y, u.r, u.r+46, PAL.gold, 4, 0.3); spawnSparks(u.x, u.y, 8, PAL.goldLight, 300);
    kick(3, u.x, u.y); play('crack', 0.55, u.x, u.y);
  }
}
const coneHits=[];   // koni vuruşu: takım rengi dış hat + parlama (kısa ömürlü, az sayıda)

function heroEvents(h, dt){
  let st=heroSt.get(h);
  if(!st){ st={ dash:null, ghostT:0, sq:null, x:h.x, y:h.y, shove:null }; heroSt.set(h,st); }
  const vis=!h.dead && canSee(S.player.team,h), mine=h===S.player;
  const d=h.dash;
  if(d && !st.dash){   // atılış başladı
    const type=d.sk && d.sk.type, C=DASH[type]||DASH.dash;
    st.dash={ d, C, dx:d.dx, dy:d.dy, sx:h.x, sy:h.y, t:0, seed:R()*100 };
    st.sq={ t:0, phase:'in', dx:d.dx, dy:d.dy, amt:C.squash };
    if(vis){
      spawnSmoke(h.x-d.dx*h.r, h.y-d.dy*h.r, C.dust, '#7a6f9a', 8, 22, 6, 0.45, h.r*0.6);   // başlangıç tozu
      play(type==='roll'?'whooshLow':'whoosh', C.snd, h.x, h.y, 0.08);
    }
  }
  if(st.dash){
    const D=st.dash; D.t+=dt;
    if(d){ D.dx=d.dx; D.dy=d.dy; if(st.sq && st.sq.phase!=='out'){ st.sq.dx=d.dx; st.sq.dy=d.dy; } }
    if(vis && D.C.ghosts){ st.ghostT-=dt; if(st.ghostT<=0){ st.ghostT=J.ghostEvery; spawnGhost(h, D.C.tint); } }
    if(mine && d){ const k=1-Math.exp(-dt*J.camLeadIn); lead.x+=(D.dx*J.camLead-lead.x)*k; lead.y+=(D.dy*J.camLead-lead.y)*k; }
    if(!d){   // atılış bitti
      if(vis && !h.dead){
        if(D.C.skid) { spawnSmoke(h.x+D.dx*h.r*0.5, h.y+D.dy*h.r*0.5, 4, '#7a6f9a', 7, 18, 4, 0.4, h.r*0.5); play('skid', D.C.skid, h.x, h.y); }
        if(D.C.hit){ spawnSparks(h.x+D.dx*h.r, h.y+D.dy*h.r, 8, PAL.gold, 280); play('crack', 0.5, h.x, h.y); kick(2, h.x, h.y); }
      }
      st.sq={ t:0, phase:'out', dx:D.dx, dy:D.dy, amt:D.C.squash };
      st.dash=null;
    }
  }
  if(st.sq){ st.sq.t+=dt; if(st.sq.phase==='in' && st.sq.t>J.squashIn && !st.dash) st.sq=null; else if(st.sq.phase==='out' && st.sq.t>J.squashOut) st.sq=null; }
  // itilme (İkili Darbe, Gülle Momentum, Bilardo): itilen arkasında toz izi
  const pl=h.pulled;
  if(pl && pl.shove && pl!==st.shove){ st.shove=pl; if(vis){ play('thud', 0.45, h.x, h.y); kick(2, h.x, h.y); } }
  if(pl && pl.shove && vis && R()<0.6) spawnSmoke(h.x-pl.dx*h.r, h.y-pl.dy*h.r, 1, '#7a6f9a', 6, 16, 4, 0.35, 4);
  if(!pl) st.shove=null;
  // Gölge Adımı (ve dönüşü, Taklit): atılışsız 90-700 birim anlık yer değişimi
  const jump=Math.hypot(h.x-st.x, h.y-st.y);
  if(h.type==='shadow' && !h.dead && !d && jump>90 && jump<700 && !st.dash){
    if(seen(st.x,st.y,h.r)){ const o=take('g',ghosts,J.maxGhosts); if(o){ o.type=h.type; o.team=h.team; o.x=st.x; o.y=st.y; o.r=h.r; o.aim=h.aim; o.tint='#9a7bff'; o.t=0; o.life=0.4; } spawnSmoke(st.x, st.y, 4, '#4b3a9a', 8, 22, 12, 0.5, h.r*0.6); }
    if(vis) play('blink', 0.4, h.x, h.y);
  }
  st.x=h.x; st.y=h.y;
}

/* ================= KARE GÜNCELLEMESİ ================= */
export function juiceFrame(){
  const t0=performance.now();
  const now=t0/1000, rdt=Math.min(0.05, Math.max(0, now-(lastNow||now))); lastNow=now;
  if(S.heroes!==lastHeroes){ lastHeroes=S.heroes; clearAll(); seenFx=new WeakSet(); seenNova=new WeakSet(); zoneMap=new Map(); structDead=new WeakMap(); heroSt=new WeakMap(); lead.x=lead.y=0;
    for(const f of S.fx) seenFx.add(f); for(const s of S.structs) structDead.set(s, s.dead); }
  // oyun duraklıysa (sim zamanı ilerlemiyorsa) efektler de durur
  if(S.time===lastSimT) simStill+=rdt; else simStill=0;
  lastSimT=S.time;
  const dt = simStill>0.12 ? 0 : rdt;
  if(!jset.fx || !S.player){ lead.x=lead.y=0; shake.a=0; return; }
  // olaylar
  for(const f of S.fx) if(!seenFx.has(f)){ seenFx.add(f); onFx(f); }
  for(const n of S.novas||[]) if(!seenNova.has(n)){ seenNova.add(n); if(seen(n.x,n.y,40)) explode('blood', n.x, n.y, 70); }
  const live=new Set();
  for(const z of S.zones){
    if(z.kind && z.kind!=='bomb' && z.kind!=='shell') continue;
    live.add(z); if(!zoneMap.has(z)) zoneMap.set(z, { kind:z.kind==='bomb'?'bomb':z.kind==='shell'?'shell':'meteor' });
  }
  for(const [z,info] of zoneMap) if(!live.has(z)){ zoneMap.delete(z); if(z.dead && seen(z.x,z.y,z.r)) explode(info.kind, z.x, z.y, z.r); }
  for(const s of S.structs){
    const was=structDead.get(s); structDead.set(s, s.dead);
    if(s.dead && was===false) explode(s.sub==='nexus'?'nexus':'tower', s.x, s.y, s.sub==='nexus'?s.r*3.2:s.r*2.6, s.team);
  }
  for(const h of S.heroes) heroEvents(h, dt);
  if(!S.player.dash){ const k=1-Math.exp(-rdt*J.camLeadOut); lead.x-=lead.x*k; lead.y-=lead.y*k; }
  // fizik
  for(const o of debris){
    o.t+=dt;
    if(o.spark){ const dr=Math.exp(-dt*5); o.vx*=dr; o.vy*=dr; o.x+=o.vx*dt; o.y+=o.vy*dt; continue; }
    if(!o.land){
      o.vz-=J.gravity*dt; o.z+=o.vz*dt; o.x+=o.vx*dt; o.y+=o.vy*dt; o.rot+=o.vr*dt;
      if(o.z<=0){ o.z=0; if(o.vz<-160){ o.vz*=-0.32; o.vx*=0.5; o.vy*=0.5; o.vr*=0.5; } else { o.land=true; o.life=Math.max(o.life, o.t+0.5); } }
    }
  }
  for(const o of smoke){ o.t+=dt; const dr=Math.exp(-dt*1.6); o.vx*=dr; o.vy*=dr; o.x+=o.vx*dt; o.y+=o.vy*dt; }
  for(const o of rings) o.t+=dt;
  for(const o of balls) o.t+=dt;
  for(const o of ghosts) o.t+=dt;
  for(const c of coneHits) c.t+=dt;
  sweep('d',debris); sweep('s',smoke); sweep('r',rings); sweep('b',balls); sweep('g',ghosts);
  for(let i=coneHits.length-1;i>=0;i--) if(coneHits[i].t>=coneHits[i].life) coneHits.splice(i,1);
  // tekme
  shake.a*=Math.exp(-rdt*J.shakeDecay); if(shake.a<0.2) shake.a=0;
  shake.x=(R()*2-1)*shake.a; shake.y=(R()*2-1)*shake.a;
  jstats.parts=debris.length+smoke.length+rings.length+balls.length+ghosts.length;
  jstats.ms+=performance.now()-t0; jstats.n++;
}
export const juiceCamLead=()=>lead;
export const juiceShake=()=>shake;

/* ================= ÇİZİM ================= */
const sprCache=new Map();
function fireSprite(cols){   // ateş topu: radyal gradyan, renk dizisine göre önbellekli
  const k=cols.join(); let c=sprCache.get(k); if(c) return c;
  c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,cols[0]); gr.addColorStop(0.22,cols[1]); gr.addColorStop(0.55,rgba(cols[2],0.85)); gr.addColorStop(0.82,rgba(cols[3],0.35)); gr.addColorStop(1,rgba(cols[3],0));
  g.fillStyle=gr; g.fillRect(0,0,128,128); sprCache.set(k,c); return c;
}
function puffSprite(col){   // duman/toz: yumuşak kenarlı daire
  const k='p'+col; let c=sprCache.get(k); if(c) return c;
  c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,rgba(col,1)); gr.addColorStop(0.55,rgba(col,0.6)); gr.addColorStop(1,rgba(col,0));
  g.fillStyle=gr; g.fillRect(0,0,64,64); sprCache.set(k,c); return c;
}
const ghostCache=new Map();
function ghostSprite(type, team, r, tint){   // hayalet kopya: token bir kez offscreen çizilir (görsel yüklenince yenilenir)
  const ok=!!tokenImg(type), k=type+'|'+team+'|'+Math.round(r)+'|'+(tint||'')+'|'+ok; let c=ghostCache.get(k); if(c) return c;
  const s=Math.ceil(r*2+8); c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d');
  drawToken(g, type, s/2, s/2, r, { team });
  if(tint){ g.globalCompositeOperation='source-atop'; g.fillStyle=rgba(tint,0.45); g.fillRect(0,0,s,s); }
  ghostCache.set(k,c); return c;
}

/* Kahraman tokeni için sıkış-uza dönüşümü (render.js drawHero, yalnız token) */
export function juiceToken(ctx, h, draw){
  const st=jset.fx && heroSt.get(h), q=st && st.sq, D=st && st.dash;
  if(!q && !D){ draw(); return; }
  let along=1, perp=1, dx, dy;
  if(q && q.phase==='in' && q.t<J.squashIn){ const k=Math.sin(Math.PI*q.t/J.squashIn); along=1-0.24*k*q.amt; perp=1+0.16*k*q.amt; dx=q.dx; dy=q.dy; }
  else if(D){ along=1+0.24*D.C.squash; perp=1-0.13*D.C.squash; dx=D.dx; dy=D.dy; }
  else if(q && q.phase==='out'){ const k=1-q.t/J.squashOut, e=Math.sin(Math.PI*Math.min(1,q.t/J.squashOut)); along=1-0.2*e*q.amt; perp=1+0.14*e*q.amt; dx=q.dx; dy=q.dy; if(k<=0){ draw(); return; } }
  else { draw(); return; }
  const a=Math.atan2(dy,dx);
  ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(a); ctx.scale(along,perp); ctx.rotate(-a); ctx.translate(-h.x,-h.y);
  try{ draw(); } finally { ctx.restore(); }
}

/* Zemin katmanı (birimlerin altında): şok halkaları, gecikmeli alan uyarısı, hayaletler, hız çizgileri, koni dış hattı */
export function juiceUnder(ctx){
  if(!jset.fx || !S.player) return;
  const t0=performance.now();
  // gecikmeli alanlar: şişme + kırmızı yanıp sönme (son yarıda hızlanır)
  for(const [z,info] of zoneMap){
    if(!seen(z.x,z.y,z.r) || !onScreen(z.x,z.y,z.r+30)) continue;
    const p=1-Math.max(0,z.t)/z.total; if(p<J.anticip) continue;
    const e=(p-J.anticip)/(1-J.anticip), fq=5+16*e, on=Math.sin(S.time*fq*TAU)>0;
    const big=info.kind==='meteor', sw=z.r*(1+(big?0.07:0.05)*e*e);
    ctx.save();
    ctx.beginPath(); ctx.arc(z.x,z.y,sw,0,TAU);
    ctx.fillStyle=`rgba(255,40,40,${(on?0.22:0.06)*e*(big?1:0.7)})`; ctx.fill();
    ctx.lineWidth=big?4:3; ctx.strokeStyle=`rgba(255,70,60,${(on?0.9:0.35)*e})`; ctx.stroke();
    ctx.restore();
  }
  for(const o of rings){
    if(!onScreen(o.x,o.y,o.r1)) continue;
    const k=o.t/o.life, r=o.r0+(o.r1-o.r0)*(1-Math.pow(1-k,3));
    ctx.globalAlpha=(1-k)*0.85; ctx.beginPath(); ctx.arc(o.x,o.y,r,0,TAU); ctx.lineWidth=o.lw*(1-k*0.6); ctx.strokeStyle=o.col; ctx.stroke();
  }
  ctx.globalAlpha=1;
  // koni vuruşu: takım rengi kalın dış hat + açılan yay (rakip de net görür)
  for(const c of coneHits){
    const h=c.h, k=c.t/c.life, col=PAL.team[c.team], rr=c.reach*(1+0.06*Math.sin(Math.PI*Math.min(1,k*2)));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.arc(h.x,h.y,rr,c.ang-c.half,c.ang+c.half); ctx.closePath();
    ctx.fillStyle=c.fire?`rgba(255,120,40,${0.28*(1-k)})`:rgba(col,0.22*(1-k)); ctx.fill();
    ctx.lineWidth=4; ctx.lineJoin='round'; ctx.strokeStyle=rgba(col,0.95*(1-k)); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x,h.y,h.r+(rr-h.r)*Math.min(1,k*2.2),c.ang-c.half,c.ang+c.half); ctx.lineWidth=6; ctx.strokeStyle=c.fire?`rgba(255,213,138,${1-k})`:`rgba(255,255,255,${0.9*(1-k)})`; ctx.stroke();
    if(!c.fire){   // zeminde çatlaklar
      ctx.lineWidth=2; ctx.strokeStyle=`rgba(20,14,40,${0.7*(1-k)})`; ctx.beginPath();
      for(let j=0;j<5;j++){ const a=c.ang+(j/4-0.5)*c.half*1.6, d0=h.r+12, d1=rr*(0.75+0.2*((j*37)%5)/5); ctx.moveTo(h.x+Math.cos(a)*d0,h.y+Math.sin(a)*d0); ctx.lineTo(h.x+Math.cos(a+0.06)*d1,h.y+Math.sin(a+0.06)*d1); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // hayalet kopyalar
  for(const o of ghosts){
    if(!onScreen(o.x,o.y,o.r+10)) continue;
    const spr=ghostSprite(o.type,o.team,o.r,o.tint), s=spr.width;
    ctx.globalAlpha=0.42*Math.pow(1-o.t/o.life,1.4); ctx.drawImage(spr,o.x-s/2,o.y-s/2);
  }
  ctx.globalAlpha=1;
  // hız çizgileri (atılış süresince, arkada)
  for(const h of S.heroes){
    const st=heroSt.get(h); if(!st || !st.dash || h.dead || !canSee(S.player.team,h) || !onScreen(h.x,h.y,200)) continue;
    const D=st.dash, dx=D.dx, dy=D.dy, px=-dy, py=dx;
    ctx.save(); ctx.lineCap='round'; ctx.strokeStyle=rgba(D.C.tint||PAL.teamLight[h.team],0.7); ctx.lineWidth=2.5;
    ctx.beginPath();
    for(let j=0;j<D.C.lines;j++){
      const o=((j+0.5)/D.C.lines-0.5)*1.6*h.r, ph=(D.seed+j*1.7+S.time*9)%1, L=40+60*ph;
      const sx=h.x-dx*(h.r+6+ph*20)+px*o, sy=h.y-dy*(h.r+6+ph*20)+py*o;
      ctx.moveTo(sx,sy); ctx.lineTo(sx-dx*L,sy-dy*L);
    }
    ctx.stroke(); ctx.restore();
  }
  jstats.ms+=performance.now()-t0;
}

/* Üst katman (birimlerin üstünde): ateş topları, enkaz, kıvılcım, duman */
export function juiceOver(ctx){
  if(!jset.fx || !S.player) return;
  const t0=performance.now();
  ctx.save();
  for(const o of smoke){
    if(o.t<0 || !onScreen(o.x,o.y,o.r1)) continue;
    const k=o.t/o.life, r=o.r0+(o.r1-o.r0)*(1-Math.pow(1-k,2)), a=o.a*Math.min(1,o.t/0.1)*(1-k);
    if(a<=0.01) continue;
    ctx.globalAlpha=a; ctx.drawImage(puffSprite(o.col),o.x-r,o.y-r,r*2,r*2);
  }
  ctx.globalCompositeOperation='lighter';
  for(const o of balls){
    if(!onScreen(o.x,o.y,o.r*1.4)) continue;
    const g=0.09, k=o.t, r = k<g ? o.r*(0.35+0.85*(1-Math.pow(1-k/g,3))) : o.r*(1.2+0.15*(k-g)/(o.life-g));
    const a = k<g ? 1 : Math.pow(1-(k-g)/(o.life-g),1.6);
    ctx.globalAlpha=a; ctx.drawImage(o.spr,o.x-r,o.y-r,r*2,r*2);
  }
  ctx.globalAlpha=1;
  ctx.lineCap='round';
  for(const o of debris){
    if(!o.spark || !onScreen(o.x,o.y,20)) continue;
    const k=o.t/o.life; ctx.strokeStyle=o.col; ctx.globalAlpha=1-k; ctx.lineWidth=o.s;
    ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(o.x-o.vx*0.035,o.y-o.vy*0.035); ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
  for(const o of debris){
    if(o.spark || !onScreen(o.x,o.y,20)) continue;
    const k=o.t/o.life, a=k>0.7 ? (1-k)/0.3 : 1;
    ctx.globalAlpha=a;
    if(o.z>2){ ctx.fillStyle='rgba(4,2,16,0.3)'; ctx.fillRect(o.x-o.s*0.5,o.y-o.s*0.3,o.s,o.s*0.6); }
    ctx.save(); ctx.translate(o.x,o.y-o.z); ctx.rotate(o.rot); ctx.fillStyle=o.col; ctx.fillRect(-o.s/2,-o.s/3,o.s,o.s*0.66);
    ctx.restore();
  }
  ctx.restore();
  jstats.ms+=performance.now()-t0;
}

/* Ekran katmanı (sisin üstünde, HUD'un altında; cihaz pikseli): 1 karelik siyah-beyaz darbe karesi */
export function juiceScreen(ctx, W, H){
  if(!flashes.length || !env) return;
  if(!jset.fx){ flashes.length=0; return; }
  const v=env.view, cam=env.cam, s=v.s*v.dpr;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffffff';
  for(const f of flashes){
    const x=(f.x-cam.x)*s, y=(v.oy+(f.y-cam.y)*v.s)*v.dpr;
    ctx.beginPath(); ctx.arc(x,y,f.r*s,0,TAU); ctx.fill();
    ctx.lineWidth=Math.max(3,8*v.dpr); ctx.strokeStyle='#ffffff'; ctx.beginPath(); ctx.arc(x,y,f.r*s*1.35,0,TAU); ctx.stroke();
  }
  ctx.restore();
  if(!juiceDebug.holdFlash) for(const f of flashes) f.frames--;   // holdFlash: yalnız test ekran görüntüsü için
  for(let i=flashes.length-1;i>=0;i--) if(flashes[i].frames<=0) flashes.splice(i,1);
}
/* test/ölçüm yardımcıları */
export const juiceDebug = { counts:()=>({ debris:debris.length, smoke:smoke.length, rings:rings.length, balls:balls.length, ghosts:ghosts.length, flashes:flashes.length, shake:shake.a, lead:Math.hypot(lead.x,lead.y), voices }), explode };

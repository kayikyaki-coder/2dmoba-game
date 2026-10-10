/* Veri: kahramanlar, STATS tablosu, sabitler. Mantık yok. */
export const TICK = 1/60;
import { MAP_W, MAP_H, MID_Y } from './map.js';
export const WORLD = { w: MAP_W, h: MAP_H };   // harita: map.js (oval, iki koridor)
export const LANE_Y = MID_Y;                   // eski kodlar için: haritanın orta yüksekliği
export const TEAM_COLORS = ['#5689e5', '#e56e56'];
export const TEAM_DARK   = ['#2c4a86', '#86382a'];
export const MAX_LEVEL = 10;
/* =========================================================
   TEMEL STAT TABLOSU
   base = 1. seviyedeki değer, per = her seviye atlamada eklenen düz miktar
   hp: maksimum can | dmg: düz vuruş hasarı | as: saniyedeki saldırı sayısı | spd: hareket hızı
   ========================================================= */
/* satır sırası: can, hasar, saldırı hızı, hareket hızı, menzil, boyut, kütle, hazırlık oranı, vuruşta yavaşlama, mermi hızı, mermi boyu, koni açısı */
export const STATS = {
  archer: {
    hp:{ base:400, per:25 },        // maksimum can (denge: 430 idi)
    regen:{ base:3, per:0.6 },        // 5 saniyede yenilenen can, seviye başına: 0 idi
    armor:{ base:10, per:0 },       // zırh: fiziksel hasar 100/(100+zırh) ile çarpılır
    mr:{ base:10, per:0 },          // büyü direnci: büyü hasarı 100/(100+mr) ile çarpılır
    ah:{ base:0, per:0 },           // yetenek hızı: bekleme süresi 100/(100+yh) ile çarpılır
    ap:{ base:0, per:0 },           // yetenek gücü (YG): eşyalardan gelir, yetenek oranlarıyla çarpılır
    dmg:{ base:35, per:3 },         // düz vuruş hasarı (denge: 45, sonra 37 idi; 2v2 tur 3: %64)
    as:{ base:1.22, per:0.06 },     // saniyedeki saldırı sayısı (denge: 1.28 idi)
    spd:{ base:200, per:3 },        // hareket hızı
    range:{ base:310, per:0 },      // düz vuruş menzili
    size:{ base:27, per:0 },        // yarıçap
    mass:{ base:1, per:0 },         // itilme direnci (kütle)
    windup:{ base:0.25, per:0 },    // vuruş süresinin ne kadarı hazırlık
    atkSlow:{ base:0.40, per:0 },   // hazırlık sırasında yavaşlama oranı
    projSpeed:{ base:950, per:0 },  // ok hızı
    projRadius:{ base:6, per:0 }    // ok kalınlığı
  },
  warrior: {
    hp:{ base:940, per:40 },        // denge: 750, sonra 900 idi (2v2 tur 3: %35)
    regen:{ base:10, per:0.9 },       // denge: 5 idi, seviye başına: 0 idi
    armor:{ base:10, per:0 },       // zırh: fiziksel hasar 100/(100+zırh) ile çarpılır
    mr:{ base:10, per:0 },          // büyü direnci: büyü hasarı 100/(100+mr) ile çarpılır
    ah:{ base:0, per:0 },           // yetenek hızı: bekleme süresi 100/(100+yh) ile çarpılır
    ap:{ base:0, per:0 },           // yetenek gücü (YG): eşyalardan gelir, yetenek oranlarıyla çarpılır
    dmg:{ base:70, per:4 },         // denge: 60 idi
    as:{ base:1.00, per:0.04 },
    spd:{ base:200, per:3 },
    range:{ base:110, per:0 },
    size:{ base:27, per:0 },
    mass:{ base:2.2, per:0 },
    windup:{ base:0.27, per:0 },
    atkSlow:{ base:0.40, per:0 },
    angle:{ base:90, per:0 }        // koni açısı (derece)
  },
  mage: {
    hp:{ base:540, per:22 },        // denge: 470 idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },       // zırh: fiziksel hasar 100/(100+zırh) ile çarpılır
    mr:{ base:10, per:0 },          // büyü direnci: büyü hasarı 100/(100+mr) ile çarpılır
    ah:{ base:0, per:0 },           // yetenek hızı: bekleme süresi 100/(100+yh) ile çarpılır
    ap:{ base:0, per:0 },           // yetenek gücü (YG): eşyalardan gelir, yetenek oranlarıyla çarpılır
    dmg:{ base:40, per:2 },         // düz vuruş zayıf, güç yeteneklerde (denge: 30 idi; kuşatma için)
    as:{ base:0.95, per:0.03 },     // denge: 0.85 idi
    spd:{ base:205, per:3 },
    range:{ base:230, per:0 },
    size:{ base:26, per:0 },
    mass:{ base:1, per:0 },
    windup:{ base:0.30, per:0 },
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:850, per:0 },
    projRadius:{ base:7, per:0 }
  },
  twin: {
    hp:{ base:450, per:25 },
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:50, per:3 },
    as:{ base:1.05, per:0.05 },     // her vuruş iki ok attığı için okçudan düşük
    spd:{ base:200, per:3 },
    range:{ base:330, per:0 },
    size:{ base:27, per:0 },
    mass:{ base:1, per:0 },
    windup:{ base:0.25, per:0 },
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:1000, per:0 },
    projRadius:{ base:6, per:0 }
  },
  bounce: {
    hp:{ base:410, per:24 },        // denge: 440 idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:41, per:3 },         // denge: 48 idi
    as:{ base:1.00, per:0.05 },     // denge: 1.15 idi
    spd:{ base:200, per:3 },
    range:{ base:310, per:0 },    // 450 idi, denge için 400
    size:{ base:27, per:0 },
    mass:{ base:1, per:0 },
    windup:{ base:0.25, per:0 },
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:950, per:0 },
    projRadius:{ base:6, per:0 }
  },
  hook: {
    hp:{ base:690, per:38 },        // denge: 800 (+45) idi
    regen:{ base:6, per:1.4 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:50, per:3 },         // denge: 55 idi
    as:{ base:0.90, per:0.03 },
    spd:{ base:195, per:3 },
    range:{ base:110, per:0 },
    size:{ base:32, per:0 },
    mass:{ base:3.0, per:0 },
    windup:{ base:0.27, per:0 },
    atkSlow:{ base:0.40, per:0 },
    angle:{ base:90, per:0 }
  },
  flame: {
    hp:{ base:680, per:30 },        // denge: 560 idi
    regen:{ base:8, per:0.9 },        // denge: 4 idi, seviye başına: 0 idi
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:56, per:2.5 },       // denge: 45 idi
    as:{ base:0.85, per:0.03 },
    spd:{ base:205, per:3 },
    range:{ base:120, per:0 },
    size:{ base:27, per:0 },
    mass:{ base:1.5, per:0 },       // tasarımda yok: büyücüden ağır, savaşçıdan hafif
    windup:{ base:0.27, per:0 },
    atkSlow:{ base:0.40, per:0 },
    angle:{ base:90, per:0 }
  },
  blood: {
    hp:{ base:490, per:28 },        // denge: 520 idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:40, per:2.5 },
    as:{ base:0.80, per:0.03 },
    spd:{ base:200, per:3 },
    range:{ base:250, per:0 },
    size:{ base:27, per:0 },
    mass:{ base:1, per:0 },
    windup:{ base:0.30, per:0 },    // tasarımda yok: büyücü ile aynı
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:850, per:0 },  // tasarımda yok: büyücü ile aynı
    projRadius:{ base:7, per:0 }
  },
  artillery: {
    hp:{ base:580, per:22 },        // denge: 440 (+20) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:50, per:2 },         // denge: 32 idi
    as:{ base:0.75, per:0.03 },
    spd:{ base:195, per:3 },
    range:{ base:230, per:0 },
    size:{ base:27, per:0 },        // tasarımda yok: diğer menzililerle aynı
    mass:{ base:1, per:0 },         // tasarımda yok
    windup:{ base:0.30, per:0 },    // tasarımda yok: büyücü ile aynı
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:850, per:0 },  // tasarımda yok: büyücü ile aynı
    projRadius:{ base:7, per:0 }
  },
  shadow: {
    hp:{ base:620, per:26 },        // denge: 480 (+24), sonra 680 idi (2v2 tur 1: %80)
    regen:{ base:3, per:0.7 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:54, per:2.5 },       // denge: 35 (+2), sonra 60 idi (2v2 tur 1: %80); kuşatma gücü yoktu (kuleye 200 hasar/maç)
    as:{ base:0.80, per:0.03 },
    spd:{ base:210, per:3 },
    range:{ base:270, per:0 },
    size:{ base:27, per:0 },        // tasarımda yok: diğer menzililerle aynı
    mass:{ base:1, per:0 },         // tasarımda yok
    windup:{ base:0.30, per:0 },    // tasarımda yok: büyücü ile aynı
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:850, per:0 },  // tasarımda yok: büyücü ile aynı
    projRadius:{ base:7, per:0 }
  },
  spirit: {
    hp:{ base:500, per:24 },
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:40, per:2.5 },
    as:{ base:0.85, per:0.03 },
    spd:{ base:205, per:3 },
    range:{ base:250, per:0 },
    size:{ base:27, per:0 },        // tasarımda yok: diğer menzililerle aynı
    mass:{ base:1, per:0 },         // tasarımda yok
    windup:{ base:0.30, per:0 },    // tasarımda yok: büyücü ile aynı
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:850, per:0 },  // tasarımda yok: büyücü ile aynı
    projRadius:{ base:7, per:0 }
  },
  dual: {   // uzak biçim temel alınır; yakın biçimin farkları HEROES.dual.melee.stats içinde
    hp:{ base:480, per:30 },        // denge: 540, sonra 450 idi (2v2 tur 3: %37)
    regen:{ base:3, per:0.8 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:10, per:0 },
    mr:{ base:10, per:0 },
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:42, per:3.2 },        // denge: 50 idi
    as:{ base:0.95, per:0.04 },
    spd:{ base:205, per:3 },
    range:{ base:330, per:0 },
    size:{ base:27, per:0 },        // tasarımda yok: diğer kahramanlarla aynı
    mass:{ base:1.2, per:0 },       // tasarımda yok: dövüşçü, menzililerden biraz ağır
    windup:{ base:0.25, per:0 },    // tasarımda yok: İkiz Ok ile aynı
    atkSlow:{ base:0.40, per:0 },
    projSpeed:{ base:950, per:0 },  // tasarımda yok: Okçu ile aynı (yalnız uzak biçimde kullanılır)
    projRadius:{ base:6, per:0 },
    angle:{ base:90, per:0 }        // koni açısı (yalnız yakın biçimde kullanılır)
  }
};
export const HEROES = {
  archer: {
    id:'archer', name:'Okçu', letter:'O',
    attack:{ type:'projectile', knock:0 },
    skills:{
      p:{ name:'Yavaş Ok', slowMin:.11, slowMax:.20, dur:1.2 },
      r:{ name:'Ok Yağmuru', max:4, type:'volley', cd:[9,8.5,8,7.5], cast:0.3, castSlow:0.4,
          count:[5,6,7,9], spread:0.7, range:400, ratio:1.15, repeat:0.30, speed:950, radius:5 },
      e:{ name:'Seri Atış', max:4, type:'haste', cd:[14,13,12,11], as:[.30,.35,.40,.45], dur:5 },
      s:{ name:'Kalın Ok', max:2, type:'bigarrow', cd:[20,16], cast:0.4, castSlow:0.5,
          ratio:2.5, ap:0.5, freeze:1, speed:770, radius:34, range:6000 }   // dev ok: harita sonuna kadar gider; kaçılabilirlik: 700 uzaktan kaçılır (hız 800 idi)
    }
  },
  twin: {
    id:'twin', name:'İkiz Ok', letter:'İ',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: her düz vuruş arka arkaya 2 güdümlü ok (gap sn arayla), her biri %40 hasar; vuruş etkileri her okta tam işler
      p:{ name:'İkiz Ok', twinPct:0.40, gap:0.09 },
      // sağ tık: imleç yönüne hasarsız kısa kayış; window sn içindeki ilk düz vuruş 3 ok atar
      r:{ name:'Yan Atılış', max:4, type:'tumble', cd:[8,7,6,5], dist:120, speed:1100, window:4 },
      // E: imlece (menzile kırpılır) bomba atılır, delay sn sonra radius yarıçapta patlar: fiziksel hasar + sersemletme (minyonlara da)
      //    hasar = dmg + ad * ek SG + ap * YG
      e:{ name:'Şok Bombası', max:4, type:'bomb', cd:[14,13,12,11], range:480, radius:100, delay:0.35, stun:0.5,
          dmg:[50,75,100,125], ad:0.30, ap:0.30 },
      // boşluk: imlece en yakın görünen rakip kahramana kilitlenir; dur sn yerinde kanallar, gap sn arayla count güdümlü mermi.
      //    mermi = dmg + ad * ek SG, hedefin eksik canına göre en fazla +missing; yoldaki rakip kahraman/kule mermiyi alır.
      //    leash'ten uzaklaşan hedef kanallamayı bitirir. Bekleme baştan harcanır.
      s:{ name:'Kilitli Yaylım', max:2, type:'lockvolley', cd:[50,40], range:1100, leash:1300, dur:2, gap:0.5, count:4,
          speed:1800, radius:6, dmg:[60,95], ad:0.40, missing:0.20 }
    }
  },
  warrior: {
    id:'warrior', name:'Savaşçı', letter:'S',
    attack:{ type:'cone', knock:0 },
    skills:{
      p:{ name:'Hasar Yayılımı', pct:.10, radius:100 },
      r:{ name:'Atılış', max:4, type:'dash', cd:[9,8.5,8,7.5], dist:300, speed:1000,
          ratio:[1.10,1.23,1.37,1.50], slow:0.10, slowDur:1, knock:250 },
      e:{ name:'Kalkan', max:4, type:'shield', cd:[16,15,14,13], shield:[.10,.13,.16,.20], dur:5, spd:0.20 },
      s:{ name:'Öfke', max:2, type:'giant', cd:[26,22], size:[.40,.50], dmg:[.40,.50], dur:[4,6] }
    }
  },
  mage: {
    id:'mage', name:'Büyücü', letter:'B',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: rakip şampiyona her vuruş 5 sn yakar (yenilenir, üst üste binmez); saniyede 3'ten 10'a, seviyeyle
      p:{ name:'Yakma', burnMin:3, burnMax:10, dur:5, ap:0.02 },   // saniyede +0,02 YG
      // sağ tık: uzun menzilli, düz giden, ilk değdiğine çarpan ateş topu; bekleme kısa
      r:{ name:'Ateş Topu', max:4, type:'fireball', cd:[5,4.5,4,3.5], cast:0.2, castSlow:0.3,
          dmg:[58,82,106,130], ap:0.6, speed:870, radius:18, range:650 },   // denge: 52,75,98,120 idi; kaçılabilirlik: hız 1100, yarıçap 12 idi
      // E: basılı tut = menzili gör, bırak = 450 menzilde imlece en yakın rakibe (şampiyon ya da minyon, kule değil) güdümlü ateş;
      //    4 sn içten yanma + aldığı hasar artar
      e:{ name:'İç Ateş', max:4, type:'ignite', hold:true, cd:[12,11,10,9], range:400, speed:900,
          dot:[80,110,140,170], ap:0.5, amp:[.20,.233,.267,.30], dur:4 },   // ap: toplam süreli hasara
      // boşluk: seçilen alana gecikmeli büyük ateş topu
      s:{ name:'Meteor', max:2, type:'meteor', cd:[24,20], range:600, radius:160, delay:1.0, dmg:[220,320], ap:0.8 }
    }
  },
  bounce: {
    id:'bounce', name:'Sekme', letter:'S',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: düz vuruş hedefe değince bounceRange içindeki başka bir görünen rakibe (kahraman, yoksa en yakın minyon; yapı değil)
      //        güdümlü bir mermi seker, hasar = ilk vuruşun bouncePct'i; vuruş etkileri (can çalma, Kraken vb.) yalnız ilk hedefte.
      //        bounceCount = sekme sayısı (Avcı Coşkusu sırasında 3)
      p:{ name:'Sekme', bouncePct:0.40, bounceRange:200, bounceCount:1 },   // denge: bouncePct 0.50 idi
      // sağ tık: cast sn hazırlık, speed hızında range kadar gider, döner ve sahibini takip ederek geri gelir. Gidiş ve dönüş ayrı vurur.
      //          hasar = dmg + ad * toplam SG (fiziksel); değdiği her rakipten sonra çarpan decay ile çarpılır (en az minMult). Yapılara vurmaz.
      r:{ name:'Bumerang', max:4, type:'boomerang', cd:[12,11,10,9], cast:0.2, castSlow:0, range:520, speed:650, radius:30,   // denge: cd 10,9,8,7 idi; kaçılabilirlik: hız 750 idi
          dmg:[30,50,70,90], ad:0.40, decay:0.85, minMult:0.40 },   // denge: dmg 50,80,110,140 / ad 0.70 idi
      // E: anında; sersemleme, yavaşlatma (ve ileride kök/susturma) kalkar, süreli hasarlara dokunmaz. Sersemken de kullanılabilir.
      e:{ name:'Arınma', max:4, type:'cleanse', cd:[18,16,14,12], spd:[.30,.35,.40,.45], dur:2 },
      // boşluk: dur sn buff; Bumerang ve Arınma beklemesi sıfırlanır, +spd hareket hızı, +ad düz SG, +as saldırı hızı, düz vuruş bounceCount kez seker
      s:{ name:'Avcı Coşkusu', max:2, type:'frenzy', cd:[40,32], dur:6, spd:[.20,.30], ad:[10,15], as:[.20,.30], bounceCount:3 }   // denge: ad 15,25 / as .30,.45 idi
    }
  },
  hook: {
    id:'hook', name:'Zincirli', letter:'Z',
    attack:{ type:'cone', knock:0 },
    skills:{
      // pasif: her 5 sn'de azami canın regenPct'i kadar ek can yenilemesi (yenilenme statına eklenir)
      p:{ name:'Demir Gövde', missPct:0.015, combatT:4, combatMult:2 },   // denge: missPct 0.03 idi (0.015 oldu); saniyede eksik canın %1,5'i, savaşta (son 4 sn kahramanla hasar alışverişi) 2 katı
      // sağ tık: cast sn hazırlık, ince bir kanca fırlar (duvarın üstünden geçer); ilk değdiği rakip birimi (kahraman ya da minyon, kule değil)
      //          yakalar: büyü hasarı (dmg + ap * YG), kahramansa freeze sn sersemler, pull sn içinde Zincirli'nin önüne çeker (gap: ek boşluk).
      r:{ name:'Kanca', max:4, type:'hook', cd:[18,16,14,12], cast:0.25, castSlow:0.5, range:600, speed:690, radius:30,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; menzil 700, hız 1600, yarıçap 20 idi
         
          dmg:[70,110,150,190], ap:0.70, freeze:0.5, pull:0.4, gap:6 },
      // E: önünde range menzilli, angle derecelik koni (kenardan ölçülür); fiziksel hasar = dmg + ad * ek SG + hpPct * ek can;
      //    slow yavaşlatma slowDur sn; minyonlara da değer, kuleye değmez
      e:{ name:'Ezici Darbe', max:4, type:'slam', cd:[8,7.5,7,6.5], cast:0.2, castSlow:0.5, range:220, angle:100,
          dmg:[60,95,130,165], ad:0.60, hpPct:0.03, slow:[.30,.35,.40,.45], slowDur:1.5 },
      // boşluk: anında; radius içindeki yalnız rakip kahramanlara büyü hasarı (dmg + ap * YG + hpPct * ek can), silence sn susturma
      //         (yetenek kullanamaz; yürüme ve düz vuruş serbest), slow oranında yavaşlatma slowDur sn boyunca doğrusal azalır
      s:{ name:'Şok Dalgası', max:2, type:'shockwave', cd:[35,28], radius:450, dmg:[150,250], ap:0.80, hpPct:0.05,
          silence:[1.5,2], slow:0.60, slowDur:2 }
    }
  },
  flame: {
    id:'flame', name:'Alev Yumruğu', letter:'A',
    attack:{ type:'cone', knock:0 },
    skills:{
      // pasif: yetenek kullanınca window sn içindeki ilk düz vuruş isabetinde hedefin konumunda sparkR yarıçaplı büyü patlaması;
      //        hasar seviyeyle sparkMin'den sparkMax'a doğrusal + ap * YG; rakip birimlere (kule hariç)
      p:{ name:'Kıvılcım', sparkMin:20, sparkMax:80, sparkR:100, window:3, ap:0.40 },
      // sağ tık: önde range menzilli, angle derecelik koni (kenardan ölçülür); büyü hasarı = dmg + ap * YG; minyonlara değer, kuleye değmez
      r:{ name:'Alev Üfleme', max:4, type:'breath', cd:[7,6.5,6,5.5], cast:0.25, castSlow:0.5, range:600, angle:20,
          dmg:[70,110,150,190], ap:0.80 },
      // E: imlece doğru dist birim sıçrar (birimlerin üstünden geçer, duvarda durur). Başladığı yerden sıçrama yönünde, GERÇEK gidilen
      //    mesafenin mult katı uzunlukta, width genişliğinde ateş şeridi (sıçrama bitince oluşur): rakiplere bir kez büyü hasarı + slow yavaşlatma
      e:{ name:'Alevli Sıçrayış', max:4, type:'flameleap', cd:[13,12,11,10], dist:300, speed:1100, width:120, mult:2,
          dmg:[60,90,120,150], ap:0.70, slow:0.25, slowDur:1 },
      // boşluk: anında; dur sn kahramanla hareket eden radius yarıçaplı halka: içindekilere saniyede dps + ap * YG büyü hasarı ve
      //         slow yavaşlatma; süre boyunca kendisi res + resAp * YG zırh ve büyü direnci kazanır
      s:{ name:'Alev Halkası', max:2, type:'firering', cd:[30,24], radius:250, dur:4, dps:[40,65], ap:0.20, slow:0.25,
          res:10, resAp:0.15 }
    }
  },
  blood: {
    id:'blood', name:'Kan Lordu', letter:'K',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: rakip birim ölünce, son vuruşu (kahramanda öldüren sayılan) Kan Lordu yaptıysa o birimin azami canının killPct'i;
      //        rakip kahramana asist ya da rakip minyon nearRange içinde ölürse nearPct. İyileşme dur sn'ye eşit yayılır (birikebilir).
      p:{ name:'Kan Hasadı', killPct:0.10, nearPct:0.05, nearRange:600, dur:5 },
      // sağ tık: menzildeki rakip kahraman ya da minyondan (kule değil) imlece en yakınına güdümlü ok (yoksa yetenek harcanmaz);
      //          büyü hasarı = dmg + ap * YG; uygulanan hasarın heal'i anında iyileşir
      r:{ name:'Kan Oku', max:4, type:'bloodbolt', hold:true, cd:[7,6.5,6,5.5], range:320, speed:900,
          dmg:[65,100,135,170], ap:0.60, heal:0.22 },   // denge: dmg 80,120,160,200 / heal 0.30 idi
      // E: anında; o anki canın pct'ini harcar (kendine hasar değil, en az 1 can kalır), çıktığı yerden range yarıçapa kadar
      //    speed hızıyla büyüyen bir kan halkası; değdiği her rakip birime (kule değil) bir kez hasar = dmg + harcanan can + ap * YG, büyü.
      e:{ name:'Kan Patlaması', max:4, type:'bloodnova', cd:[10,9,8,7], pct:0.10, range:380, speed:700,
          dmg:[15,25,35,45], ap:1.0 },
      // boşluk: anında; range'e kadar imleçteki noktada radius yarıçap, yalnız rakip kahramanlar işaretlenir: delay sn boyunca
      //         amp kadar fazla büyü hasarı alırlar, süre sonunda (ölmediyse, nerede olursa) dmg + ap * YG büyü hasarı;
      //         Kan Lordu bunun heal'i kadar iyileşir
      s:{ name:'Kan Laneti', max:2, type:'bloodcurse', cd:[30,24], range:500, radius:175, delay:3, amp:[.15,.20],
          dmg:[150,250], ap:0.70, heal:0.30 }
    }
  },
  artillery: {
    id:'artillery', name:'Topçu', letter:'T',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: timerMax sn'de bir Odak kazanır (seviyeyle doğrusal timerMin'e iner). Odak varken sağ tık ya da E kullanılırsa o kullanımın
      //        bekleme süresi (yetenek hızından sonra) cut oranında kısalır ve Odak harcanır, sayaç yeniden başlar. Boşluk'a uygulanmaz.
      p:{ name:'Odak', timerMax:15, timerMin:10, cut:0.70 },
      // sağ tık: cast sn hazırlık (hazırlıkta castSlow yavaş), bitince imleç yönünde range uzunlukta, 2 x radius genişlikte şerit, anında;
      //          şeritteki bütün rakip birimlere (kule hariç) büyü hasarı dmg + ap * YG. Hazırlık sırasında şerit önizlemesi herkese görünür.
      r:{ name:'Uzun Işın', max:4, type:'beam', cd:[9,8,7,6], cast:0.4, castSlow:0.4, range:750, radius:35,
          dmg:[75,112,150,188], ap:0.70 },   // denge: 70,110,150,190, sonra 80,120,160,200 idi (2v2 tur 3: %65)
      // E: cast sn hazırlık, düz giden mermi; ilk değdiği rakip birimde (minyon dahil, kule değil) durur. Büyü hasarı dmg + ap * YG;
      //    sersemletme gidilen mesafeyle stunMin'den (0 mesafe) stunMax'a (range) doğrusal. Minyon da sersemler.
      e:{ name:'Ağır Küre', max:4, type:'stunorb', cd:[14,13,12,11], cast:0.25, castSlow:0.4, range:700, speed:700, radius:26,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; menzil 750, yarıçap 22 idi
         
          dmg:[60,90,120,150], ap:0.45, stunMin:0.75, stunMax:1.5 },
      // boşluk: bekleme baştan harcanır. dur sn kanallama: hareket edemez (hareket komutu, sersemleme, susturma erken bitirir) ve düz vuruş,
      //         sağ tık, E yapamaz. Her Boşluk basışı (ilki dahil) imlece, range'e kırpılarak topçu atışı: delay sn sonra radius yarıçapta
      //         büyü hasarı dmg + ap * YG (minyonlara da). Toplam shots atış. Atış yeri (sightR yarıçap) takıma atıştan delay + sight sn görünür.
      s:{ name:'Kök Sal', max:2, type:'artillery', cd:[36,30], dur:6, shots:3, range:1800, radius:100, delay:0.6,
          dmg:[120,180], ap:0.40, sight:2, sightR:100 }
    }
  },
  shadow: {
    id:'shadow', name:'Gölge', letter:'G',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: oppCd sn bekleme. Canı (vuruştan önce) oppHp oranının altındaki rakip KAHRAMANA isabet eden düz vuruş ya da yetenek hasarı,
      //        ek olarak oppBase + hedefin azami canının oppMax'ı + ap * YG büyü hasarı verir. Minyon ve kulede yok, süreli hasar tetiklemez.
      p:{ name:'Fırsatçı', oppCd:6, oppHp:0.5, oppBase:15, oppMax:0.10, ap:0.15 },
      // sağ tık: cast sn hazırlık, imleç yönüne range menzilli zincir mermisi. Rakip minyon durdurur (hasar vermez, bağ kurmaz);
      //          kule durdurmaz ve hasar almaz. İlk değdiği rakip kahramana büyü hasarı (dmg + ap * YG) ve bağ: bağ süresince aradaki
      //          mesafe range'i geçerse kopar; bind sn dolunca bağ sağlamsa aynı hasar bir kez daha ve root sn kök (yürüyemez, atılış yapamaz;
      //          düz vuruş ve yetenek serbest).
      r:{ name:'Zincir', max:4, type:'tether', cd:[12,11,10,9], cast:0.2, castSlow:0.4, range:600, speed:760, radius:22,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; menzil 650, hız 1500, yarıçap 16 idi
         
          dmg:[60,90,120,150], ap:0.40, bind:2, root:1 },
      // E: anında, imlece en çok range uzağa ışınlanır (duvar içine düşerse en yakın boş noktaya). İndiği yerde radius yarıçapta
      //    rakip birimlere (kule hariç) büyü hasarı. Bekleme ilk kullanımda başlar. back sn içinde aynı tuşa tekrar basılırsa başladığı
      //    yere döner (hasarsız, kullanım sayılmaz, bekleme süresinden bağımsız).
      e:{ name:'Gölge Adımı', max:4, type:'blink', cd:[14,13,12,11], range:420, radius:140,
          dmg:[70,105,140,175], ap:0.50, back:3 },
      // boşluk: en son kullanılan sağ tık ya da E yeteneğini (dönüşler sayılmaz) bir kez daha kullanır, hasarı bonus oranında fazla;
      //         o yeteneğin bekleme süresini etkilemez. Taklit edilen Gölge Adımı'nın dönüşü Boşluk'a tekrar basılarak yapılır.
      //         Henüz yetenek kullanılmadıysa atılamaz.
      s:{ name:'Taklit', max:2, type:'mimic', cd:[30,24], bonus:[0.20,0.30] }
    }
  },
  spirit: {
    id:'spirit', name:'Ruh Rehberi', letter:'R',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: düz vuruş hedefe DEĞİNCE (kuleye vuruş dahil) r, e ve s'nin kalan bekleme süresi flowCd sn azalır; hedef rakip kahramansa flowHero sn
      p:{ name:'Ruh Akışı', flowCd:0.5, flowHero:1 },
      // sağ tık: cast sn hazırlık, speed hızında range menzilli küre. İlk değdiği rakip birimde (minyon dahil, kule değil) radius yarıçapta patlar
      //          (menzil sonuna kadar değmezse orada patlar): büyü hasarı dmg + ap * YG, slowDur sn slow yavaşlatma.
      r:{ name:'Ruh Patlaması', max:4, type:'spiritburst', cd:[7,6.5,6,5.5], cast:0.25, castSlow:0.4, range:420, speed:530, radius:22,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; hız 900, yarıçap 20 idi
         
          blast:150, dmg:[90,130,170,210], ap:0.50, slow:0.20, slowDur:1 },
      // E: anında; kendine dur sn kalkan (shield + ap * YG) ve süre boyunca (kalkan kırılsa da) spd hareket hızı
      e:{ name:'Ruh Kalkanı', max:4, type:'spiritshield', cd:[12,11,10,9], dur:2.5, shield:[80,120,160,200], ap:0.50, spd:0.30 },
      // boşluk: anında; window sn içinde kullanılan sonraki r ya da e güçlenir.
      //   Ruh Patlaması: patlama burstRadius yarıçap, field sn yerde kalan alan (fieldSlow yavaşlatma, sürekli yenilenir), süre sonunda again oranında hasarla bir kez daha patlar.
      //   Ruh Kalkanı: kalkan shieldMult katı, üstündeki yavaşlatmalar kalkar (sersemletme, kök, susturma kalmaz).
      s:{ name:'Güçlendir', max:2, type:'mantra', cd:[20,16], window:6, burstRadius:250, field:1.5, fieldSlow:0.40, again:0.50, shieldMult:1.5, allyR:550 }
    }
  },
  dual: {
    id:'dual', name:'İkili', letter:'D',
    // varsayılan tanım uzak biçimdir (h.def uzak biçimde bu nesne); yakın biçimin tanımı meleeForm içinde, FORMS ile birleştirilir
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: herhangi bir yetenek kullanımı (biçim değiştirme dahil) dur sn içinde doğrusal azalan hareket hızı verir;
      //        değer seviyeyle flowMin'den flowMax'a artar
      p:{ name:'Akış', flowMin:0.10, flowMax:0.20, dur:1 },
      // uzak sağ tık: cast sn hazırlık, range menzilli küre; gidilen mesafeyle (0..1) yarıçap radius'tan radiusEnd'e, hız speed'den speedEnd'e,
      //   hasar çarpanı 1'den multEnd'e doğrusal büyür. İlk değdiği rakip birimde (minyon dahil, kule değil) ya da menzil sonunda patlar:
      //   patlama yarıçapı blast'tan blastEnd'e. Fiziksel hasar = dmg + ad * ek SG, çarpanla.
      r:{ name:'Enerji Küresi', max:5, type:'groworb', cd:[8,7.5,7,6.5,6], cast:0.25, castSlow:0.3, range:850,   // kaçılabilirlik: menzil 1000, yarıçap 15, son hız 1600 idi
          radius:20, radiusEnd:35, speed:900, speedEnd:1300, multEnd:1.5, blast:100, blastEnd:160,
          dmg:[70,105,140,175,210], ad:0.85 },   // denge: ad 1.10 idi
      // uzak E: anında, dur sn boyunca as kadar saldırı hızı
      e:{ name:'Hızlı Ateş', max:5, type:'haste', cd:[12,11,10,9,8], as:[.15,.20,.25,.30,.35], dur:4 },
      // boşluk: anında biçim değiştirir (rank almaz, 1. seviyeden açık: fixed). Hazırlıktaki düz vuruş iptal olur.
      s:{ name:'Biçim Değiştir', max:1, fixed:true, type:'transform', cd:[6] }
    },
    meleeForm: {
      attack:{ type:'cone', knock:0 },
      // yakın biçimin stat farkları (STATS.dual yerine bunlar kullanılır)
      stats:{ spd:{ base:215, per:3 }, armor:{ base:20, per:0 }, mr:{ base:20, per:0 }, range:{ base:125, per:0 } },
      // yakın sağ tık: imlece en yakın görünen rakibe (kahraman ya da minyon; kule değil) range menzilden sıçrar (hedef yoksa harcanmaz);
      //   inişte radius yarıçapta fiziksel hasar = dmg + ad * ek SG, slowDur sn slow yavaşlatma. Duvardan geçmez.
      r:{ name:'Sıçrayış Darbesi', max:5, type:'leapslam', cd:[13,12,11,10,9], range:450, speed:1500, radius:150,
          dmg:[60,100,140,180,220], ad:1.00, slow:0.30, slowDur:1.5 },
      // yakın E: anında; range menzildeki imlece en yakın rakibe (hedef yoksa harcanmaz) fiziksel hasar = dmg + hedefin azami canının hpPct'i,
      //   push birim geri iter (pushT sn, zorla yer değiştirme); itme sırasında duvara çarparsa stun sn sersemletir.
      e:{ name:'Darbe', max:5, type:'knockblow', cd:[14,13,12,11,10], range:150, push:300, pushT:0.25, stun:0.75,
          dmg:[50,75,100,125,150], hpPct:0.08 }
    }
  }
};

/* Biçim değiştiren kahramanlar: FORMS[tür] = { ranged, melee } tam kahraman tanımları (makeHero uzak biçimle başlar;
   biçim değişince h.def ve h.formStats değişir, böylece geri kalan kod h.def.skills / h.def.attack ile aynen çalışır). */
export const FORMS = {};
for(const id of Object.keys(HEROES)){
  const d=HEROES[id], m=d.meleeForm; if(!m) continue;
  FORMS[id] = { ranged:d, melee:{ ...d, attack:m.attack, skills:{ ...d.skills, r:m.r, e:m.e }, form:'melee' }, meleeStats:m.stats };
}

/* Yapılar: kule ve üs (nexus) */
export const TOWER = { r:38, hp:1050, range:480, dmg:60, interval:1.0, boltSpeed:1000, minionMult:1.6, stack:0.25, maxStack:4,
  champMult:2.0, champStack:0.40,          // şampiyona: ilk vuruş 2 kat, aynı şampiyona art arda her vuruş +%40 (LoL gibi; denge: 1x, +%25 idi)
  minionHits:{ melee:3, ranged:2 } };       // minyona: yakın 3, menzilli 2 vuruşta ölür (azami canın 1/n'i; denge: 60*1,6 idi)   // kule mermisi güdümlü: hedefe gider, önüne giren engelleyemez
export const BASE_TOWER_HP = 1250;
export const NEXUS = { r:58, hp:1750 };
/* Takım 0 için x konumları, takım 1 aynalanır. Sıra: dış kule, iç kule, üs kulesi, nexus */
export const LAYOUT = [ ['tower',1800], ['tower',1150], ['base',420], ['nexus',160] ];
export const FOUNTAIN = { radius:260, healPct:0.125 };  // çeşme: saniyede maks canın %12,5 (0 → dolu 8 sn)

/* Minyonlar: 2 yakın dövüş, 2 menzilli */
export const MINIONS = {
  melee:{ name:'Yakın', r:16, hp:340, speed:130, mass:0.6, dmg:20, kind:'cone', xp:25, reach:38, angle:Math.PI*0.55, wind:0.25, period:1.1, aggro:260 },
  ranged:{ name:'Menzilli', r:14, hp:250, speed:130, mass:0.5, dmg:25, kind:'proj', xp:20, range:210, projSpeed:600, projR:5, wind:0.3, period:1.3, aggro:320 }
};
/* Minyonlar zamanla güçlenir: dakika başına can ve hasar artışı, en fazla cap katı */
export const MINION_SCALE = { hpPerMin:0.04, dmgPerMin:0.03, cap:2.0 };
/* Altın (şimdilik sadece minyonlar). Minyon değeri 15'ten başlar, 20. dakikaya kadar doğrusal artıp 20'de sabitlenir.
   Son vuruşu yapan kahraman tam altın alır. Yakındaki (XP_RADIUS) diğer kahramanlar, son vuruş yokmuş gibi kendi sayılarına
   göre kişi başı esas altının share[n-1] katını alır (örn. 3 kişi yakın, biri son vurdu: o %100, diğer ikisi %40'ar). */
export const GOLD = { minionStart:15, minionEnd:20, endMin:20, share:[0.60, 0.40, 0.30, 0.15, 0.10],
  firstBlood:200, heroKill:100,            // ilk kan / diğer kahraman öldürmeleri (öldürene)
  assistPct:0.30, assistWindow:10,        // asist: son 10 sn'de rakibe zarar ya da öldürene yarar; havuz öldürme altınının %30'u, eşit bölünür
  tower:300, towerSplit:true,
  passive:1.5 };                           // pasif altın: saniyede 1,5 (ölüyken de), tam sayı olarak eklenir            // kule yıkılınca 300 altın rakip takıma eşit bölünür (towerSplit:false: her birine 300)
/* Bütün altın ödülleri aşağı yuvarlanır (buçuklu altın yok). */
export const minionGold = t => GOLD.minionStart + (GOLD.minionEnd-GOLD.minionStart)*Math.min(1, t/60/GOLD.endMin);
export const WAVE_ORDER = ['melee','melee','melee','ranged','ranged'];
export const WAVE_FIRST = 4, WAVE_INTERVAL = 22, WAVE_GAP = 0.7;
export const OFF_TARGET_DMG = 0.30;   // (eski, kullanılmıyor) yakın dövüş minyonu artık koni değil tek hedefe vurur
export const MINION_CALL = 1.5, MINION_CALL_R = 450;   // minyon çağrısı: 450 içindeki dost kahramana son 1,5 sn içinde vuran, minyonun yakınındaki rakip kahramana odaklan
/* Yeniden doğma: 10 sn + dakika başına 1,5 sn, en fazla 40 sn (20. dakikada). */
/* Üsse dönüş (B): sabit 8 sn kanallanır; hareket, saldırı, yetenek ya da hasar keser */
export const RECALL = { time:8 };   // sabit 8 sn kanallama (her yerden)
export const RESPAWN = { base:10, cap:40, capMin:20 };   // 10 sn, 20. dakikada 40 sn (doğrusal), sonrası 40'ta sabit
export const respawnTime = t => Math.min(RESPAWN.cap, RESPAWN.base+(RESPAWN.cap-RESPAWN.base)*(t/60)/RESPAWN.capMin);
export const XP_NEED = lvl => 180 + 54*(lvl-1);         // seviyeden sonrakine gereken XP (10. seviye ortalama ~15 dk)
export const HERO_KILL_XP = 150, STRUCT_XP = 100, XP_RADIUS = 600;
export const KEY_LABELS = { p:'Pasif', r:'Sağ Tık', e:'E', s:'Boşluk' };
/* Savaş sisi: görüş menzilleri */
export const VISION = { hero:700, tower:700, minion:500 };
/* Kule vuruşu (sim ve bot tahmini aynı formülü kullanır) */
export const towerChampHit = st => TOWER.dmg*TOWER.champMult*(1+TOWER.champStack*Math.min(st,TOWER.maxStack));
export const towerMinionHit = m => m.maxHp/(TOWER.minionHits[m.type]||3)+0.01;

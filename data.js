/* Veri: kahramanlar, STATS tablosu, sabitler. Mantık yok. */
export const TICK = 1/60;
import { MAP_W, MAP_H, MID_Y } from './map.js';
export const WORLD = { w: MAP_W, h: MAP_H };   // harita: map.js (oval, iki koridor)
export const LANE_Y = MID_Y;                   // eski kodlar için: haritanın orta yüksekliği
export const TEAM_COLORS = ['#5689e5', '#e56e56'];
export const TEAM_DARK   = ['#2c4a86', '#86382a'];
export const MAX_LEVEL = 15;   // 14.10.2026: 10 idi
/* Seviye 15 düzeni (14.10.2026): her seviye 1 yetenek puanı (15 puan). Sağ tık ve E 7 kademe, Boşluk 3 kademe (ULT_LEVELS seviyelerinde açılır).
   Sağ tık/E kademesi en fazla ceil(seviye/2) (RANK_CAP; 13. seviyede 7). 15 puan = Boşluk 3 + sağ tık/E 12: biri 7, diğeri 5 kalır (hangisinin
   doldurulacağı seçim; bot önce sağ tıkı doldurur). İkili: Boşluk sabit, sağ tık/E 7+7 = 14 puan.
   Eski kademe dizileri 4 (Boşluk 2, İkili 5) elemandı; yeni kademeler son eğilimi sürdürür: artan değerler ortalama adımın %60'ı,
   bekleme süreleri ortalama adımın %50'si kadar ilerler (ilk 4/2/5 değer aynı).
   STATS per (seviye başına artış) LEVEL_PER katıyla uygulanır: 15. seviye statı eski 10. seviye statına eşit (9/14), böylece 15'te statlar
   şişmez; aradaki seviyeler biraz daha zayıf, fark eşya ve yetenek kademeleriyle kapanır. Tablodaki per değerleri değişmedi. */
export const ULT_LEVELS = [5, 10, 15];
export const RANK_CAP = lvl => Math.ceil(lvl/2);
export const LEVEL_PER = 9/14;
/* =========================================================
   TEMEL STAT TABLOSU
   base = 1. seviyedeki değer, per = her seviye atlamada eklenen düz miktar
   hp: maksimum can | dmg: düz vuruş hasarı | as: saniyedeki saldırı sayısı | spd: hareket hızı
   ========================================================= */
/* satır sırası: can, hasar, saldırı hızı, hareket hızı, menzil, boyut, kütle, hazırlık oranı, vuruşta yavaşlama, mermi hızı, mermi boyu, koni açısı */
export const STATS = {
  archer: {
    hp:{ base:520, per:25 },   // denge ML16 (23.10.2026, ML12-ML15 taramalarında Okçu %40-43): 500 idi // denge ML13 (23.10.2026, tarama ML12: Okçu %40): 480 idi // denge K1 (15.10.2026, kule+sis sonrası %39): 450 idi // denge O1: 470 idi //   // zırh sistemi (11.10.2026): 400 (+25) idi
    regen:{ base:3, per:0.6 },        // 5 saniyede yenilenen can, seviye başına: 0 idi
    armor:{ base:19, per:2.5 },   // denge F1 (11.10.2026, zırh sonrası): 22 (+3) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:22, per:0.8 },   // denge F2: 25 (+1) idi //   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },           // yetenek hızı: bekleme süresi 100/(100+yh) ile çarpılır
    ap:{ base:0, per:0 },           // yetenek gücü (YG): eşyalardan gelir, yetenek oranlarıyla çarpılır
    dmg:{ base:30, per:2.8 },   // denge ML16: 29 idi // denge ML13 (tarama ML12: Okçu %40): 28 idi // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: Okçu %61): 29 idi //   // denge O2: 32 idi //   // denge O1: 35 idi //   // zırh sistemi (11.10.2026): 31 (+2.8) idi
    as:{ base:1.13, per:0.06 },   // denge ML18 (23.10.2026, tarama ML17: Okçu %40, ML12-ML17 hep %40-44): 1.1 idi // denge ML2 (22.10.2026, tarama ML2: Okçu %61): 1.16 idi //     // saniyedeki saldırı sayısı (denge: 1.28, sonra 1.22 idi; 2v2 tur 7: %66)
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
    hp:{ base:860, per:32 },   // denge KD1 (30.10.2026, tarama KD3: Savaşçı %43): 835 idi // denge ML9 (23.10.2026, tarama ML8: Savaşçı %62): 855 idi // denge ML7 (23.10.2026, tarama ML6: Savaşçı %63): 880 idi // denge ML6 (23.10.2026, tarama ML5: Savaşçı %69): 920 idi // denge ML2 (22.10.2026, tarama ML2: Savaşçı %39): 880 idi //   // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: Savaşçı %37): 840 idi //   // denge A1 (13.10.2026): 870 idi // denge F4: 820 idi //   // zırh sistemi (11.10.2026): 940 (+40) idi
    regen:{ base:10, per:0.9 },       // denge: 5 idi, seviye başına: 0 idi
    armor:{ base:40, per:5 },   // denge F2: 36 (+4.5) idi //   // denge F1 (11.10.2026, zırh sonrası): 32 (+4) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:34, per:1.8 },   // denge F1 (11.10.2026, zırh sonrası): 30 (+1.5) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },           // yetenek hızı: bekleme süresi 100/(100+yh) ile çarpılır
    ap:{ base:0, per:0 },           // yetenek gücü (YG): eşyalardan gelir, yetenek oranlarıyla çarpılır
    dmg:{ base:68, per:4 },   // denge ML6 (23.10.2026, tarama ML5: Savaşçı %69): 71 idi // denge ML2 (22.10.2026, tarama ML2: Savaşçı %39): 69 idi //   // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: Savaşçı %37): 66 idi //   // denge O2: 68 idi //   // zırh sistemi (11.10.2026): 75 (+4) idi
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
    hp:{ base:665, per:22 },   // denge C2: 640 idi // zırh sistemi (11.10.2026): 540 (+22) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:20, per:3 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1.2 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },           // yetenek hızı: bekleme süresi 100/(100+yh) ile çarpılır
    ap:{ base:0, per:0 },           // yetenek gücü (YG): eşyalardan gelir, yetenek oranlarıyla çarpılır
    dmg:{ base:40, per:2 },   // zırh sistemi (11.10.2026): 40 (+2) idi
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
    hp:{ base:515, per:25 },   // denge ML20 (tarama ML19: İkiz %35): 500 idi // denge ML16 (23.10.2026, ML12-ML15 taramalarında İkiz %40-45): 475 idi // denge A1 (13.10.2026): 500 idi // denge J2 (12.10.2026): 530 idi // zırh sistemi (11.10.2026): 450 (+25) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:20, per:2.5 },   // denge F1 (11.10.2026, zırh sonrası): 22 (+3) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:43, per:3 },   // denge ML16: 42 idi // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: İkiz %59): 44 idi //   // denge J3: 45 idi // denge O2: 48 idi //   // denge O1: 50 idi //   // denge F4: 53 idi //   // zırh sistemi (11.10.2026): 47 (+3) idi
    as:{ base:1.12, per:0.05 },     // denge KD1 (30.10.2026, tarama KD3: İkiz %42): 1.09 idi // denge ML20 (24.10.2026, tarama ML19: İkiz %35): 1.05 idi // her vuruş iki ok attığı için okçudan düşük
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
    hp:{ base:515, per:24 },   // denge A1 (13.10.2026): 485 idi // denge J3: 465 idi // denge O1: 480 idi //   // zırh sistemi (11.10.2026): 410 (+24) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:18, per:2.2 },   // denge F2: 20 (+2.5) idi //   // denge F1 (11.10.2026, zırh sonrası): 22 (+3) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:26, per:2.8 },   // denge KD1 (30.10.2026, tarama KD3: Seken %59): 27 idi // denge ML2 (22.10.2026, tarama ML2: Seken %61): 29 idi //   // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: Seken %64): 31 idi //   // denge O3: 33 idi //   // denge O2: 35 idi //   // denge O1: 37 idi //   // denge F5: 44 idi //   // zırh sistemi (11.10.2026): 39 (+2.8) idi
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
    hp:{ base:645, per:32 },   // denge ML19 (24.10.2026, EB2: Zincirli %43): 620 idi // denge T2: 640 idi // denge K1 (15.10.2026, %63): 670 idi // denge C7: 690 idi // denge L1 (14.10.2026, seviye 15): 720 idi // denge A1 (13.10.2026): 770 idi // denge O2: 720 idi //   // denge O1: 680 idi //   // zırh sistemi (11.10.2026): 690 (+38) idi
    regen:{ base:6, per:1.4 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:38, per:4.5 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:32, per:1.5 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:50, per:3 },   // denge C5: 52 idi // denge O2: 48 idi //   // denge O1: 45 idi //   // zırh sistemi (11.10.2026): 50 (+3) idi
    as:{ base:0.90, per:0.03 },
    spd:{ base:195, per:3 },
    range:{ base:110, per:0 },
    size:{ base:32, per:0 },
    mass:{ base:3.0, per:0 },
    windup:{ base:0.27, per:0 },
    atkSlow:{ base:0.40, per:0 },
    angle:{ base:90, per:0 }
  },
  roller: {   // Gülle: hareket eden tank (yakın dövüş). Zincirli/Savaşçı arası can, düşük temel hız (Momentum +%28 verir)
    hp:{ base:730, per:37 },   // denge KD2 (31.10.2026, tarama KE1: Gülle %39): 700 idi // kule D (30.10.2026, tarama KD: Gülle %41): 655 idi // denge ML7 (23.10.2026, tarama ML6: Gülle %63): 680 idi // denge ML5 (23.10.2026, tarama ML4 Uzman tam ML: Gülle %68): 720 idi // denge C9: 750 idi // denge C5: 770 idi // zırh sistemi (11.10.2026): 920 (+46) idi
    regen:{ base:8, per:1.0 },
    armor:{ base:42, per:5 },   // denge F2: 38 (+4.5) idi //   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:36, per:1.8 },   // denge F1 (11.10.2026, zırh sonrası): 32 (+1.5) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:54, per:3.5 },   // denge ML9 (23.10.2026, tarama ML8: Gülle %61): 56 idi // denge ML5 (23.10.2026, tarama ML4 Uzman tam ML: Gülle %68): 59 idi // zırh sistemi (11.10.2026): 66 (+3.5) idi
    as:{ base:0.90, per:0.03 },
    spd:{ base:195, per:3 },
    range:{ base:115, per:0 },
    size:{ base:30, per:0 },
    mass:{ base:2.6, per:0 },
    windup:{ base:0.27, per:0 },
    atkSlow:{ base:0.40, per:0 },
    angle:{ base:90, per:0 }
  },
  gladiator: {   // Gladyatör: yakın dövüşçü. Savaşçı'dan az can, Kızışma yığınlarıyla saldırı hızı tırmanır
    hp:{ base:840, per:37 },   // denge ML17 (tarama ML16: Gladyatör %40): 815 idi // denge ML8 (23.10.2026, tarama ML7: Gladyatör %64): 840 idi // denge ML6 (23.10.2026, tarama ML5: Gladyatör %65): 870 idi // denge ML5 (23.10.2026, tarama ML4 Uzman tam ML: Gladyatör %65): 910 idi // denge ML2 (22.10.2026, tarama ML2: Gladyatör %43): 890 idi //   // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: Gladyatör %41): 860 idi //   // denge O1: 900 idi //   // denge F5: 860 idi //   // zırh sistemi (11.10.2026): 980 (+46) idi
    regen:{ base:9, per:0.9 },
    armor:{ base:40, per:5 },   // denge F2: 36 (+4.5) idi //   // denge F1 (11.10.2026, zırh sonrası): 32 (+4) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:34, per:1.8 },   // denge F1 (11.10.2026, zırh sonrası): 30 (+1.5) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:58, per:3.5 },   // denge ML6 (23.10.2026, tarama ML5: Gladyatör %65): 60 idi // denge ML5 (23.10.2026, tarama ML4 Uzman tam ML: Gladyatör %65): 62 idi // denge ML1 (22.10.2026, kule minyon önceliği sonrası Uzman tarama: Gladyatör %41): 60 idi //   // denge O3: 62 idi //   // denge O2: 65 idi //   // denge F3: 60 idi //   // zırh sistemi (11.10.2026): 67 (+3.5) idi
    as:{ base:0.90, per:0.025 },
    spd:{ base:200, per:3 },
    range:{ base:115, per:0 },
    size:{ base:28, per:0 },
    mass:{ base:2.3, per:0 },
    windup:{ base:0.27, per:0 },
    atkSlow:{ base:0.40, per:0 },
    angle:{ base:90, per:0 }
  },
  flame: {
    hp:{ base:780, per:21 },   // denge ML15 (23.10.2026, tarama ML14: Alev %37): 750 idi // denge ML7 (23.10.2026, tarama ML6: Alev %38): 720 idi // denge ML2 (22.10.2026, tarama ML2: Alev %43): 700 idi //   // denge T1 (16.10.2026, Uzman %74): 730 (+24) idi // denge O2: 680 idi //   // denge O1: 640 idi //   // zırh sistemi (11.10.2026): 680 (+30) idi
    regen:{ base:8, per:0.9 },        // denge: 4 idi, seviye başına: 0 idi
    armor:{ base:30, per:3.33 },   // denge T1: 32 (+4) idi // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:30, per:1.67 },   // denge T1: 33 (+1.7) idi //   // denge F1 (11.10.2026, zırh sonrası): 30 (+1.5) idi //,   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:57, per:2.5 },   // denge ML15 (tarama ML14: Alev %37): 55 idi // denge T1: 57 idi // denge O2: 53 idi //   // denge O1: 50 idi //   // zırh sistemi (11.10.2026): 56 (+2.5) idi
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
    hp:{ base:555, per:28 },   // denge KD1 (30.10.2026, tarama KD3: Kan Lordu %60): 575 idi // kule D (30.10.2026, tarama KD: Kan Lordu %62): 600 idi // denge ML17 (23.10.2026, tarama ML16: Kan Lordu %63, sg4 eşya sırasından beri 56/58/63): 630 idi // denge ML2 (22.10.2026, tarama ML2: Kan Lordu %43): 610 idi //   // denge O3: 580 idi //   // zırh sistemi (11.10.2026): 490 (+28) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:20, per:3 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1.2 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:40, per:2.5 },   // zırh sistemi (11.10.2026): 40 (+2.5) idi
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
    hp:{ base:715, per:22 },   // denge ML18 (23.10.2026, tarama ML17: Topçu %62, ML16 %59): 740 idi // denge ML9 (23.10.2026, tarama ML8: Topçu %63): 760 idi // denge T2: 790 idi // denge C5: 765 idi // denge J3: 740 idi // denge O3: 710 idi //   // denge O1: 680 idi //   // zırh sistemi (11.10.2026): 580 (+22) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:20, per:3 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1.2 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:56, per:2 },   // denge C3: 54 idi // denge O2: 50 idi //   // zırh sistemi (11.10.2026): 50 (+2) idi
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
    hp:{ base:880, per:26 },   // denge ML11 (23.10.2026, tarama EB, eşya turu sonrası: Gölge %39): 850 idi // denge ML7 (23.10.2026, tarama ML6: Gölge %39): 820 idi // denge C7: 800 idi // denge O2: 760 idi //   // denge O1: 730 idi //   // zırh sistemi (11.10.2026): 620 (+26) idi
    regen:{ base:3, per:0.7 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:20, per:3 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1.2 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:61, per:2.5 },   // denge ML11 (23.10.2026, tarama EB, eşya turu sonrası: Gölge %39): 59 idi // denge C5: 57 idi // denge O2: 54 idi //   // zırh sistemi (11.10.2026): 54 (+2.5) idi
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
    hp:{ base:765, per:24 },   // denge ML13 (23.10.2026, tarama ML12: Ruh %62): 790 idi // denge ML11 (23.10.2026, tarama EB, eşya turu sonrası: Ruh %69 (sg1 eşya sırası)): 855 idi // denge ML8 (23.10.2026, tarama ML7: Ruh %38): 830 idi // denge ML6 (23.10.2026, tarama ML5: Ruh %33): 800 idi // denge ML5 (23.10.2026, tarama ML4 Uzman tam ML: Ruh %30): 760 idi // denge L1 (14.10.2026, seviye 15): 700 idi // denge A1 (13.10.2026): 660 idi // denge O2: 620 idi //   // denge O1: 590 idi //   // zırh sistemi (11.10.2026): 500 (+24) idi
    regen:{ base:3, per:0.6 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:20, per:3 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:25, per:1.2 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:45, per:2.5 },   // denge ML11 (23.10.2026, tarama EB, eşya turu sonrası: Ruh %69): 50 idi // denge ML9 (23.10.2026, tarama ML8: Ruh %39): 47 idi // denge ML5 (23.10.2026, tarama ML4 Uzman tam ML: Ruh %30): 44 idi // denge O2: 40 idi //   // zırh sistemi (11.10.2026): 40 (+2.5) idi
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
    hp:{ base:520, per:26 },   // denge T2: 540 idi // denge C5: 520 idi // zırh sistemi (11.10.2026): 480 (+30) idi
    regen:{ base:3, per:0.8 },   // seviye başına: 0 idi (LoL gibi artan yenileme)
    armor:{ base:26, per:3.5 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    mr:{ base:28, per:1.3 },   // zırh sistemi (11.10.2026): 10 (+0) idi
    ah:{ base:0, per:0 },
    ap:{ base:0, per:0 },
    dmg:{ base:41, per:3.2 },   // denge T2: 43 idi // zırh sistemi (11.10.2026): 45 (+3.2) idi
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
      r:{ name:'Ok Yağmuru', max:7, type:'volley', cd:[9,8.5,8,7.5,7.3,7,6.8], cast:0.3, castSlow:0.4,
          count:[5,6,7,9,10,11,11], spread:0.7, range:400, ratio:1.05,   /* denge F2: ratio 1.15 idi */ repeat:0.30, speed:950, radius:5 },
      e:{ name:'Seri Atış', max:7, type:'haste', cd:[14,13,12,11,10.5,10,9.5], as:[.30,.35,.40,.45,.48,.51,.54], dur:5 },
      s:{ name:'Kalın Ok', max:3, type:'bigarrow', cd:[20,16,14], cast:0.4, castSlow:0.5,
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
      r:{ name:'Yan Atılış', max:7, type:'tumble', cd:[8,7,6,5,4.5,4,3.5], dist:120, speed:1100, window:4 },
      // E: imlece (menzile kırpılır) bomba atılır, delay sn sonra radius yarıçapta patlar: fiziksel hasar + sersemletme (minyonlara da)
      //    hasar = dmg + ad * ek SG + ap * YG
      e:{ name:'Şok Bombası', max:7, type:'bomb', cd:[15,14,13,12,11.5,11,10.5],   /* denge F4: cd 14-11 idi */ range:480, radius:100, delay:0.5, stun:0.5,   /* karşı oyun 20.10.2026: delay 0.35 idi */
          dmg:[45,68,90,113,127,140,154], ad:0.30, ap:0.30 },   // denge F1 (11.10.2026, zırh sonrası): Şok Bombası dmg 50-125 idi
      // boşluk: imlece en yakın görünen rakip kahramana kilitlenir; dur sn yerinde kanallar, gap sn arayla count güdümlü mermi.
      //    mermi = dmg + ad * ek SG, hedefin eksik canına göre en fazla +missing; yoldaki rakip kahraman/kule mermiyi alır.
      //    leash'ten uzaklaşan hedef kanallamayı bitirir. Bekleme baştan harcanır.
      s:{ name:'Kilitli Yaylım', max:3, type:'lockvolley', cd:[50,40,35], range:1100, leash:1300, dur:2, gap:0.5, count:4,
          speed:1800, radius:6, dmg:[60,95,116], ad:0.40, missing:0.20 }
    }
  },
  warrior: {
    id:'warrior', name:'Savaşçı', letter:'S',
    attack:{ type:'cone', knock:0 },
    skills:{
      p:{ name:'Hasar Yayılımı', pct:.10, radius:100 },
      r:{ name:'Atılış', max:7, type:'dash', cd:[8.5,8,7.5,7,6.8,6.5,6.3], dist:300, speed:1000,   /* denge F1: cd 9-7.5, ratio 1.10-1.50 idi */
          ratio:[1.25,1.40,1.55,1.70,1.79,1.88,1.97], slow:0.10, slowDur:1, knock:250 },
      e:{ name:'Kalkan', max:7, type:'shield', cd:[14,13,12,11,10.5,10,9.5],   /* denge F2: cd 16-13 idi */ shield:[.14,.18,.22,.26,.28,.31,.33], dur:5, spd:0.20 },   // denge: kalkan .10,.13,.16,.20 idi (2v2 tur 3: %35)
      s:{ name:'Öfke', max:3, type:'giant', cd:[22,18,16],   /* denge F2: cd 26,22 idi */ size:[.40,.50,.56], dmg:[.40,.50,.56], dur:[4,6,7] }
    }
  },
  mage: {
    id:'mage', name:'Büyücü', letter:'B',
    attack:{ type:'projectile', knock:0 },
    skills:{
      // pasif: rakip şampiyona her vuruş 5 sn yakar (yenilenir, üst üste binmez); saniyede 3'ten 10'a, seviyeyle
      p:{ name:'Yakma', burnMin:3, burnMax:10, dur:5, ap:0.02 },   // saniyede +0,02 YG
      // sağ tık: uzun menzilli, düz giden, ilk değdiğine çarpan ateş topu; bekleme kısa
      r:{ name:'Ateş Topu', max:7, type:'fireball', cd:[5,4.5,4,3.5,3.3,3,2.8], cast:0.2, castSlow:0.3,
          dmg:[65,91,118,145,161,177,193], ap:0.70,   /* denge C11: ap 0.65 idi */   /* denge C9: 62-184 idi */   /* denge C6: 58-173 idi */   /* denge C1: ap 0.6 idi */ speed:870, radius:18, range:650 },   // denge: 52,75,98,120 idi; kaçılabilirlik: hız 1100, yarıçap 12 idi
      // E: basılı tut = menzili gör, bırak = 450 menzilde imlece en yakın rakibe (şampiyon ya da minyon, kule değil) güdümlü ateş;
      //    4 sn içten yanma + aldığı hasar artar
      e:{ name:'İç Ateş', max:7, type:'ignite', hold:true, cd:[12,11,10,9,8.5,8,7.5], range:400, speed:900,
          dot:[80,110,140,170,188,206,224], ap:0.5, amp:[.20,.233,.267,.30,.32,.34,.36], dur:4 },   // ap: toplam süreli hasara
      // boşluk: seçilen alana gecikmeli büyük ateş topu
      s:{ name:'Meteor', max:3, type:'meteor', cd:[24,20,18], range:600, radius:160, delay:1.0, dmg:[220,320,380], ap:0.8 }
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
      r:{ name:'Bumerang', max:7, type:'boomerang', cd:[13,12,11,10,9.5,9,8.5],   /* denge F2: cd 12-9 idi */ cast:0.2, castSlow:0, range:520, speed:650, radius:30,   // denge: cd 10,9,8,7 idi; kaçılabilirlik: hız 750 idi
          dmg:[27,45,63,81,92,103,113], ad:0.36, decay:0.85, minMult:0.40 },   // denge F1 (11.10.2026, zırh sonrası): Bumerang dmg 30-90, ad 0.40 idi   // denge: dmg 50,80,110,140 / ad 0.70 idi
      // E: anında; sersemleme, yavaşlatma (ve ileride kök/susturma) kalkar, süreli hasarlara dokunmaz. Sersemken de kullanılabilir.
      e:{ name:'Arınma', max:7, type:'cleanse', cd:[18,16,14,12,11,10,9], spd:[.30,.35,.40,.45,.48,.51,.54], dur:2 },
      // boşluk: dur sn buff; Bumerang ve Arınma beklemesi sıfırlanır, +spd hareket hızı, +ad düz SG, +as saldırı hızı, düz vuruş bounceCount kez seker
      s:{ name:'Avcı Coşkusu', max:3, type:'frenzy', cd:[40,32,28], dur:6, spd:[.20,.30,.36], ad:[10,15,18], as:[.20,.30,.36], bounceCount:3 }   // denge: ad 15,25 / as .30,.45 idi
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
      r:{ name:'Kanca', max:7, type:'hook', cd:[19.5,17.5,15.5,13.5,12.5,11.5,10.5],   /* denge T2: cd 19-10 idi */   /* denge C10: cd 18-9 idi */ cast:0.25, castSlow:0.5, range:600, speed:690, radius:30,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; menzil 700, hız 1600, yarıçap 20 idi
         
          dmg:[70,110,150,190,214,238,262], ap:0.70, freeze:0.5, pull:0.4, gap:6 },
      // E: önünde range menzilli, angle derecelik koni (kenardan ölçülür); fiziksel hasar = dmg + ad * ek SG + hpPct * ek can;
      //    slow yavaşlatma slowDur sn; minyonlara da değer, kuleye değmez
      e:{ name:'Ezici Darbe', max:7, type:'slam', cd:[8,7.5,7,6.5,6.3,6,5.8], cast:0.2, castSlow:0.5, range:220, angle:100,
          dmg:[60,95,130,165,186,207,228], ad:0.60, hpPct:0.03, slow:[.30,.35,.40,.45,.48,.51,.54], slowDur:1.5 },
      // boşluk: anında; radius içindeki yalnız rakip kahramanlara büyü hasarı (dmg + ap * YG + hpPct * ek can), silence sn susturma
      //         (yetenek kullanamaz; yürüme ve düz vuruş serbest), slow oranında yavaşlatma slowDur sn boyunca doğrusal azalır
      s:{ name:'Şok Dalgası', max:3, type:'shockwave', windup:0.2,   /* karşı oyun 20.10.2026: anlıktı, şimdi görünür halka hazırlığı */ cd:[35,28,24.5], radius:450, dmg:[150,250,310], ap:0.80, hpPct:0.05,
          silence:[1.5,2,2.3], slow:0.60, slowDur:2 }
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
      r:{ name:'Alev Üfleme', max:7, type:'breath', cd:[7,6.5,6,5.5,5.3,5,4.8], cast:0.25, castSlow:0.5, range:500, angle:22,
          dmg:[68,106,144,182,205,227,251], ap:0.70 },   /* denge T1: range 600, angle 20, ap 0.75 idi */   /* denge C12: 72-264 idi */   // denge C7: ap 0.80 idi   // denge C1: 76-278 idi   // denge F1 (11.10.2026, zırh sonrası): Alev Üfleme dmg 70-190 idi; Yuvarlan dmg 60-150, hpPct 0.04 idi
      // E: imlece doğru dist birim sıçrar (birimlerin üstünden geçer, duvarda durur). Başladığı yerden sıçrama yönünde, GERÇEK gidilen
      //    mesafenin mult katı uzunlukta, width genişliğinde ateş şeridi (sıçrama bitince oluşur): rakiplere bir kez büyü hasarı + slow yavaşlatma
      e:{ name:'Alevli Sıçrayış', max:7, type:'flameleap', cd:[13,12,11,10,9.5,9,8.5], dist:300, speed:1100, width:120, mult:2,
          dmg:[60,90,120,150,168,186,204], ap:0.65, slow:0.25, slowDur:1 },   /* denge T1: ap 0.70 idi */
      // boşluk: anında; dur sn kahramanla hareket eden radius yarıçaplı halka: içindekilere saniyede dps + ap * YG büyü hasarı ve
      //         slow yavaşlatma; süre boyunca kendisi res + resAp * YG zırh ve büyü direnci kazanır
      s:{ name:'Alev Halkası', max:3, type:'firering', cd:[40,35,30], radius:250, dur:4, dps:[30,50,70], ap:0.15,   /* karşı oyun 20.10.2026: slow 0.25 kalktı */
          res:10, resAp:0.10 }   /* denge T1: cd 30/24/21, dps 40/65/80, ap 0.20, resAp 0.15 idi */
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
      r:{ name:'Kan Oku', max:7, type:'bloodbolt', hold:true, cd:[7,6.5,6,5.5,5.3,5,4.8], range:320, speed:900,
          dmg:[59,90,122,154,172,191,210], ap:0.60, heal:0.22 },   // denge KD2 (31.10.2026, tarama KE1: Kan Lordu %59): 62-221 idi // denge ML17: Kan Oku 65-233 idi   // denge: dmg 80,120,160,200 / heal 0.30 idi
      // E: anında; o anki canın pct'ini harcar (kendine hasar değil, en az 1 can kalır), çıktığı yerden range yarıçapa kadar
      //    speed hızıyla büyüyen bir kan halkası; değdiği her rakip birime (kule değil) bir kez hasar = dmg + harcanan can + ap * YG, büyü.
      e:{ name:'Kan Patlaması', max:7, type:'bloodnova', cd:[10,9,8,7,6.5,6,5.5], pct:0.10, range:380, speed:700,
          dmg:[15,25,35,45,51,57,63], ap:1.0 },
      // boşluk: anında; range'e kadar imleçteki noktada radius yarıçap, yalnız rakip kahramanlar işaretlenir: delay sn boyunca
      //         amp kadar fazla büyü hasarı alırlar, süre sonunda (ölmediyse, nerede olursa) dmg + ap * YG büyü hasarı;
      //         Kan Lordu bunun heal'i kadar iyileşir
      s:{ name:'Kan Laneti', max:3, type:'bloodcurse', cd:[30,24,21], range:500, radius:175, delay:3, amp:[.15,.20,.23],
          dmg:[150,250,310], ap:0.70, heal:0.30 }
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
      r:{ name:'Uzun Işın', max:7, type:'beam', cd:[9.5,8.5,7.5,6.5,6,5.5,5],   /* denge C2: cd 10-5.5 idi */   /* denge F2: cd 9-6 idi */ cast:0.6,   /* denge T2: cast 0.4 idi */ castSlow:0.4, range:750, radius:35,
          dmg:[76,113,152,189,213,235,258], /* denge ML19 (24.10.2026, Topçu ML16-EB2 59/62/56/60): Uzun Işın 79-269 idi */ ap:0.75 },   /* denge C10: 75-256 idi */   // denge C1: ap 0.70 idi   // denge: 70,110,150,190, sonra 80,120,160,200 idi (2v2 tur 3: %65)
      // E: cast sn hazırlık, düz giden mermi; ilk değdiği rakip birimde (minyon dahil, kule değil) durur. Büyü hasarı dmg + ap * YG;
      //    sersemletme gidilen mesafeyle stunMin'den (0 mesafe) stunMax'a (range) doğrusal. Minyon da sersemler.
      e:{ name:'Ağır Küre', max:7, type:'stunorb', cd:[13,12,11,10,9.5,9,8.5],   /* denge C9: cd 14-9.5 idi */ cast:0.25, castSlow:0.4, range:700, speed:700, radius:26,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; menzil 750, yarıçap 22 idi
         
          dmg:[66,98,130,162,181,200,219], ap:0.45,   /* denge C3: 60-204 idi */ stunMin:0.75, stunMax:1.5 },
      // boşluk: bekleme baştan harcanır. dur sn kanallama: hareket edemez (hareket komutu, sersemleme, susturma erken bitirir) ve düz vuruş,
      //         sağ tık, E yapamaz. Her Boşluk basışı (ilki dahil) imlece, range'e kırpılarak topçu atışı: delay sn sonra radius yarıçapta
      //         büyü hasarı dmg + ap * YG (minyonlara da). Toplam shots atış. Atış yeri (sightR yarıçap) takıma atıştan delay + sight sn görünür.
      s:{ name:'Kök Sal', max:3, type:'artillery', cd:[36,30,27], dur:6, shots:3, range:1800, radius:100, delay:0.6,
          dmg:[120,180,216], ap:0.40, sight:2, sightR:100 }
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
      r:{ name:'Zincir', max:7, type:'tether', cd:[11,10,9,8.5,8,7.5,7],   /* denge C3: cd 12-7.5 idi */ cast:0.2, castSlow:0.4, range:600, speed:760, radius:22,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; menzil 650, hız 1500, yarıçap 16 idi
         
          dmg:[70,105,139,174,195,216,237], ap:0.40,   /* denge ML12 (23.10.2026, tarama ML11: Gölge %37): 67-226 idi */   /* denge C10: 64-215 idi */   /* denge C6: 60-204 idi */ bind:2, root:1 },
      // E: anında, imlece en çok range uzağa ışınlanır (duvar içine düşerse en yakın boş noktaya). İndiği yerde radius yarıçapta
      //    rakip birimlere (kule hariç) büyü hasarı. Bekleme ilk kullanımda başlar. back sn içinde aynı tuşa tekrar basılırsa başladığı
      //    yere döner (hasarsız, kullanım sayılmaz, bekleme süresinden bağımsız).
      e:{ name:'Gölge Adımı', max:7, type:'blink', cd:[14,13,12,11,10.5,10,9.5], range:420, radius:140,
          dmg:[86,128,171,214,240,266,292], /* denge ML19 (EB2: Gölge %43): Gölge Adımı 82-278 idi */ ap:0.50, back:3 },   // denge ML12 (tarama ML11: Gölge %37): 76-257 idi   // denge C4: 70-238 idi
      // boşluk: en son kullanılan sağ tık ya da E yeteneğini (dönüşler sayılmaz) bir kez daha kullanır, hasarı bonus oranında fazla;
      //         o yeteneğin bekleme süresini etkilemez. Taklit edilen Gölge Adımı'nın dönüşü Boşluk'a tekrar basılarak yapılır.
      //         Henüz yetenek kullanılmadıysa atılamaz.
      s:{ name:'Taklit', max:3, type:'mimic', cd:[30,24,21], bonus:[0.20,0.30,.36] }
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
      r:{ name:'Ruh Patlaması', max:7, type:'spiritburst', cd:[7.5,7,6.5,6,5.8,5.5,5.3], cast:0.25, castSlow:0.4, range:420, speed:530, radius:22,   // kaçılabilirlik (10.10.2026): yarı menzildeki rakip hemen yana adım atarsa temel hızla kaçar, vururken (yavaşlamış) kaçamaz; hız 900, yarıçap 20 idi
         
          blast:115, dmg:[86,124,163,202,225,248,271],   /* denge ML11 (23.10.2026, tarama EB, eşya turu sonrası: Ruh %69): 93-293 idi (ML6 buff'ı geri) */   /* denge ML6 (23.10.2026, tarama ML5: Ruh %33): 86-271 idi */   /* denge C1: 82-258 idi */   /* denge A0 (13.10.2026): Ruh Patlaması patlama yarıçapı 150 idi */ ap:0.45,   /* denge F1: cd 7-5.5, dmg 90-210, ap 0.50 idi */ slow:0.20, slowDur:1 },
      // E: anında; kendine dur sn kalkan (shield + ap * YG) ve süre boyunca (kalkan kırılsa da) spd hareket hızı
      e:{ name:'Ruh Kalkanı', max:7, type:'spiritshield', cd:[12,11,10,9,8.5,8,7.5], dur:2.5, shield:[80,120,160,200,224,248,272], ap:0.50, spd:0.30 },
      // boşluk: anında; window sn içinde kullanılan sonraki r ya da e güçlenir.
      //   Ruh Patlaması: patlama burstRadius yarıçap, field sn yerde kalan alan (fieldSlow yavaşlatma, sürekli yenilenir), süre sonunda again oranında hasarla bir kez daha patlar.
      //   Ruh Kalkanı: kalkan shieldMult katı, üstündeki yavaşlatmalar kalkar (sersemletme, kök, susturma kalmaz).
      s:{ name:'Güçlendir', max:3, type:'mantra', cd:[20,16,14], window:6, burstRadius:200,   /* denge A0: güçlü patlama 250 idi */ field:1.5, fieldSlow:0.40, again:0.50, shieldMult:1.5, allyR:550 }
    }
  },
  roller: {
    id:'roller', name:'Gülle', letter:'G',
    attack:{ type:'cone', knock:0 },
    skills:{
      // pasif: aynı yönde yürüdükçe momentum (0-100) saniyede gain artar; her tikte komut yönünün eski yönden sapması derece başına turnLoss düşürür,
      //        breakDeg ve üstü ani dönüş sıfırlar; yürümüyorsa (ya da kontrol altında) saniyede decay söner. Momentum ms oranında hareket hızı verir.
      //        Düz vuruş ya da yetenek isabeti ek fiziksel hasar (dmgMin..dmgMax seviyeyle + ad * ek SG) * momentum/100 verir; momentum pushAt üstündeyse
      //        rakibi gidiş yönünde push birim iter (pushT sn). İsabet momentumu harcar (sıfırlar). Kahraman/minyon, kule değil.
      p:{ name:'Momentum', gain:55, decay:140, turnLoss:0.5, breakDeg:80, ms:0.28, dmgMin:32, dmgMax:75,   /* denge KD1 (30.10.2026, tarama KD3: Gülle %44): 30/70 idi */ /* kule D (30.10.2026, tarama KD2: Gülle %41): 26/62 idi */ /* denge ML8 (23.10.2026, tarama ML7: Gülle %65): dmgMin 30 dmgMax 70 idi */   /* denge C11: dmgMax 80 idi */   /* denge C8: dmgMax 90 idi */ ad:0.30, pushAt:60, push:100, pushT:0.15 },
      // sağ tık: basılı tutuldukça mesafe dMin'den dMax'a (charge sn'de) artar (bot imleç noktasına göre seçer); bırakınca o yöne speed hızıyla yuvarlanır
      //          (birimlerin içinden geçer, duvarda ve yapıda durur, kök engeller). İnişte radius yarıçapta rakiplere (kule hariç) fiziksel hasar
      //          dmg + hpPct * ek can, kahraman ve minyonlar stun sn sersemler (havaya atılır).
      r:{ name:'Yuvarlan', max:7, type:'roll', cd:[12.5,11.5,10.5,9.5,9,8.5,8],   /* denge C2: cd 12-7.5 idi */   /* denge F2: cd 13-10 idi */ dMin:0, dMax:900,   /* 17.10.2026: dMin 300 idi (basılı tutma 0'dan başlar) */ charge:1, speed:1300, radius:130,
          dmg:[70,105,140,175,196,217,238], hpPct:0.05, stun:[0.6,0.65,0.7,0.75,.78,.81,.84] },
      // E: anında, dur sn kabuk: kütle massMult katı, itilemez/çekilemez (kanca, Darbe, momentum itmesi, geri tepme), dr hasar azaltma,
      //    düz vuruş menzili +range, düz vuruşlar rakiplere ek dmg + hpPct * ek can fiziksel hasar ve slowDur sn slow yavaşlatma
      e:{ name:'Kabuk', max:7, type:'shell', cd:[14,13,12,11,10.5,10,9.5],   /* denge F2: cd 16-13 idi */ dur:2.5, massMult:3, dr:[.25,.30,.35,.40,.43,.46,.49], range:60,
          dmg:[15,25,35,45,51,57,63], hpPct:0.02, slow:0.20, slowDur:1 },
      // boşluk: dur sn durdurulamaz top: speed hızında sürekli ileri gider (imleç yönünde başlar, saniyede turn radyan imlece döner),
      //         duvar, harita sınırı ve yapılardan seker; değdiği her rakibe (kule hariç; aynı birime rehit sn'de bir) fiziksel hasar
      //         dmg + hpPct * ek can ve push birim itme (pushT sn); itilen duvara çarparsa stun sn sersemler. Topken sersemletme, itme, çekme işlemez;
      //         düz vuruş ve yetenek yok. Bitince momentum dolu.
      s:{ name:'Bilardo', max:3, type:'billiard', cd:[45,36,31.5], dur:3, speed:620, turn:1.6, hitR:8, rehit:0.8,
          dmg:[120,180,216], hpPct:0.05, push:160, pushT:0.2, stun:0.6,
          wallPct:0.25, wallR:150, wallCd:0.25, stopMin:0.25 }   // 17.10.2026: duvara/sınıra/yapıya çarpınca ve Boşluk'a tekrar basıp durdurunca wallR içine topun hasarının wallPct'i (çarpma en sık wallCd sn'de bir); stopMin sn'den önce durdurulamaz
    }
  },
  gladiator: {
    id:'gladiator', name:'Gladyatör', letter:'L',
    attack:{ type:'cone', knock:0 },
    skills:{
      // pasif: her düz vuruş isabeti dur sn süren bir yığın verir (en fazla stacks; yeni vuruş süreyi yeniler);
      //        yığın başına saldırı hızı asMin'den (1. seviye) asMax'a (10. seviye) doğrusal
      p:{ name:'Kızışma', asMin:0.04, asMax:0.10, stacks:5, dur:4 },
      // sağ tık: anında; düz vuruş beklemesi sıfırlanır, window sn içindeki sonraki düz vuruş ek fiziksel dmg + ad * ek SG,
      //          slowDur sn azalan slow yavaşlatma (applySlow decay), Gladyatör healFlat + healPct * verilen ek hasar iyileşir
      r:{ name:'Ağır Darbe', max:7, type:'heavy', cd:[7,6.5,6,5.5,5.3,5,4.8],   /* denge F3: cd 8-6.5 idi */ window:5, dmg:[45,70,95,121,136,151,166], ad:0.6,   /* denge ML10 (23.10.2026, tarama ML9: Gladyatör %64, can kesintilerine tepkisiz): dmg 50-184 idi */   /* denge F1: dmg 40-115, ad 0.5 idi */
          slow:0.40, slowDur:2, healFlat:[20,30,40,50,56,62,68], healPct:0.3 },
      // E: Gladyatör'ün kendi konumunda (Trundle W gibi) radius yarıçaplı alan dur sn onun arenası olur (S.zones kind:'arena');
      //    kimseyi engellemez; o içindeyken +adFlat SG, +as saldırı hızı, +ms hareket hızı. Rakibe doğrudan etkisi yok.
      //    15.10.2026: imleç yerinde (range 600'e kırpılır) radius 350 idi.
      e:{ name:'Arena', max:7, type:'arena', cd:[14,13,12,11,10.5,10,9.5],   /* denge F2: cd 16-13 idi */ radius:220, dur:5,
          adFlat:[8,14,20,26,30,33,37], as:[.15,.20,.25,.30,.33,.36,.39], ms:[.10,.12,.14,.16,.17,.18,.2] },
      // boşluk: range içindeki görünen rakip KAHRAMANA (imlece en yakın) atılır (hedefe yapışır, kök engeller, duvar/yapıda durur);
      //         değince dur sn: rakibin zırh ve BD'sinin steal oranını çalar, rakibe azami canının hpPct'i kadar büyü hasarını
      //         eşit dilimlerle verir, verdiği bu hasarın healPct'i kadar iyileşir. Süre bitince (ya da biri ölünce) çalınanlar döner.
      s:{ name:'Meydan Okuma', max:3, type:'duel', windup:0.25,   /* karşı oyun 20.10.2026: hedefe çizgi; sersem/susturma/kök iptal eder, beklemenin yarısı döner */ cd:[34,28,25],   /* denge F2: cd 40,32 idi */ range:400, speed:1100, dur:8, steal:[.30,.40,.46], hpPct:[.20,.30,.36], healPct:0.5 }
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
      r:{ name:'Enerji Küresi', max:7, type:'groworb', cd:[8,7.5,7,6.5,6,5.8,5.5], cast:0.25, castSlow:0.3, range:850,   // kaçılabilirlik: menzil 1000, yarıçap 15, son hız 1600 idi
          radius:20, radiusEnd:35, speed:900, speedEnd:1300, multEnd:1.5, blast:75, blastEnd:120,   /* denge A0: Enerji Küresi patlama 100-160 idi */
          dmg:[70,105,140,175,210,231,252], ad:0.85 },   // denge: ad 1.10 idi
      // uzak E: anında, dur sn boyunca as kadar saldırı hızı
      e:{ name:'Hızlı Ateş', max:7, type:'haste', cd:[12,11,10,9,8,7.5,7], as:[.15,.20,.25,.30,.35,.38,.41], dur:4 },
      // boşluk: anında biçim değiştirir (rank almaz, 1. seviyeden açık: fixed). Hazırlıktaki düz vuruş iptal olur.
      s:{ name:'Biçim Değiştir', max:1, fixed:true, type:'transform', cd:[6] }
    },
    meleeForm: {
      attack:{ type:'cone', knock:0 },
      // yakın biçimin stat farkları (STATS.dual yerine bunlar kullanılır)
      stats:{ spd:{ base:215, per:3 }, armor:{ base:36, per:3.5 }, mr:{ base:38, per:1.3 }, range:{ base:125, per:0 } },   // zırh sistemi: yakın biçim temel +10 (eski: 20/20 sabit)
      // yakın sağ tık: imlece en yakın görünen rakibe (kahraman ya da minyon; kule değil) range menzilden sıçrar (hedef yoksa harcanmaz);
      //   inişte radius yarıçapta fiziksel hasar = dmg + ad * ek SG, slowDur sn slow yavaşlatma. Duvardan geçmez.
      r:{ name:'Sıçrayış Darbesi', max:7, type:'leapslam', cd:[13,12,11,10,9,8.5,8], range:450, speed:1500, radius:150,
          dmg:[60,100,140,180,220,244,268], ad:1.00, slow:0.30, slowDur:1.5 },
      // yakın E: anında; range menzildeki imlece en yakın rakibe (hedef yoksa harcanmaz) fiziksel hasar = dmg + hedefin azami canının hpPct'i,
      //   push birim geri iter (pushT sn, zorla yer değiştirme); itme sırasında duvara çarparsa stun sn sersemletir.
      e:{ name:'Darbe', max:7, type:'knockblow', cd:[14,13,12,11,10,9.5,9], range:150, push:300, pushT:0.25, stun:0.75,
          dmg:[50,75,100,125,150,165,180], hpPct:0.08 }
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
export const TOWER = { armorPen:0.40, r:38,
  hp:1200,         /* kule D (30.10.2026, Kayra: kuleler çok hızlı düşüyordu): 780 idi; */ /* kule 15.10.2026: 620 idi (14.10.2026: 1050 idi) */
  range:520,       /* 15.10.2026 (kule gibi hissettirsin): 480 idi */
  dmg:80,          /* 60 idi */
  interval:0.9,    /* 1.0 idi */
  dmgPerMin:0, dmgCap:1.5,      // 15.10.2026: dakikalık kule hasarı artışı (denendi 0,02-0,03: maç 26-30 dk; kapalı)
  fort:{ until:12, mult:0.5 },  // kule D (30.10.2026): ilk 'until' dakika kuleler (nexus hariç) mult kat hasar alır; 0 = kapalı (0 idi)
  ward:{ mult:0.6, r:700 },     // 15.10.2026 kale koruması: 700 içinde saldıranın dost minyonu yoksa kahramanların yapılara hasarı x0,6 (yoktu)
  minionTaken:2.0,              // kule D (30.10.2026): 3 idi. 15.10.2026: minyonların yapılara hasarı x3 (dalga kuşatmanın asıl gücü; yoktu)
  boltSpeed:1000, minionMult:1.6, stack:0.25, maxStack:4,
  champMult:2.0, champStack:0.40,          // şampiyona: ilk vuruş 2 kat, aynı şampiyona art arda her vuruş +%40 (LoL gibi; denge: 1x, +%25 idi)
  minionHits:{ melee:3, ranged:2 } };       // minyona: yakın 3, menzilli 2 vuruşta ölür (azami canın 1/n'i; denge: 60*1,6 idi)   // kule mermisi güdümlü: hedefe gider, önüne giren engelleyemez
export const BASE_TOWER_HP = 1000;   // kule D (30.10.2026): 650 idi. 15.10.2026: 800 idi (14.10.2026: 1250 idi)
export const NEXUS = { r:58, hp:1400 };   // kule D (30.10.2026): 900 idi. 15.10.2026: 1100 idi (14.10.2026: 1750 idi)
/* Takım 0 için x konumları, takım 1 aynalanır. Sıra: dış kule, iç kule, üs kulesi, nexus */
export const LAYOUT = [ ['tower',1800], ['tower',1150], ['base',420], ['nexus',160] ];
export const FOUNTAIN = { radius:260, healPct:0.125 };  // çeşme: saniyede maks canın %12,5 (0 → dolu 8 sn)

/* Minyonlar: 2 yakın dövüş, 2 menzilli */
export const MINIONS = {
  melee:{ name:'Yakın', r:16, hp:340, speed:130, mass:0.6, dmg:20, kind:'cone', xp:25, reach:38, angle:Math.PI*0.55, wind:0.25, period:1.1, aggro:260 },
  ranged:{ name:'Menzilli', r:14, hp:250, speed:130, mass:0.5, dmg:25, kind:'proj', xp:20, range:210, projSpeed:600, projR:5, wind:0.3, period:1.3, aggro:320 }
};
/* Minyonlar zamanla güçlenir: dakika başına can ve hasar artışı, en fazla cap katı */
export const MINION_SCALE = { hpPerMin:0.05, dmgPerMin:0.10, cap:3.5 };   // 21.10.2026: 0.04/0.08/3.0 idi (ölüm süresi 30 sn sonrası oyun sonu, minyonlar güçlü element)
//   // 15.10.2026 (güçlü kule sonrası maç süresi): 0.06/2.5 idi; 14.10.2026: dmgPerMin 0.03, cap 2.0 idi
/* Altın (şimdilik sadece minyonlar). Minyon değeri 15'ten başlar, 20. dakikaya kadar doğrusal artıp 20'de sabitlenir.
   Son vuruşu yapan kahraman tam altın alır. Yakındaki (XP_RADIUS) diğer kahramanlar, son vuruş yokmuş gibi kendi sayılarına
   göre kişi başı esas altının share[n-1] katını alır (örn. 3 kişi yakın, biri son vurdu: o %100, diğer ikisi %40'ar). */
export const GOLD = { minionStart:24, minionEnd:32, endMin:15,   // 14.10.2026 (10-15 dk maçta 4-5 eşya): 15 -> 20, 20. dk idi
  share:[0.60, 0.40, 0.30, 0.15, 0.10],
  firstBlood:250, heroKill:150,            // 14.10.2026: 200/100 idi; ilk kan / diğer kahraman öldürmeleri (öldürene)
  assistPct:0.30, assistWindow:10,        // asist: son 10 sn'de rakibe zarar ya da öldürene yarar; havuz öldürme altınının %30'u, eşit bölünür
  tower:400, towerSplit:true,             // 14.10.2026: 300 idi
  passive:2.8 };                           // pasif altın: saniyede 2,8 (14.10.2026: 1,5 idi; ölüyken de), tam sayı olarak eklenir; kule yıkılınca tower altını rakip takıma eşit bölünür (towerSplit:false: her birine)
/* Bütün altın ödülleri aşağı yuvarlanır (buçuklu altın yok). */
export const minionGold = t => GOLD.minionStart + (GOLD.minionEnd-GOLD.minionStart)*Math.min(1, t/60/GOLD.endMin);
export const WAVE_ORDER = ['melee','melee','melee','ranged','ranged'];
export const WAVE_FIRST = 4, WAVE_INTERVAL = 22, WAVE_GAP = 0.7;
export const OFF_TARGET_DMG = 0.30;   // (eski, kullanılmıyor) yakın dövüş minyonu artık koni değil tek hedefe vurur
/* Minyon tasması (LoL gibi): kahraman kovalarken koridor yolundan lane birimden fazla uzaklaşırsa kahramanları ignore sn
   boyunca bırakır ve yola döner (yolun back birim yakınına dönene kadar da kahraman hedeflemez). Minyon/yapı hedefi etkilenmez. */
export const MINION_LEASH = { lane:380, back:150, ignore:2.5 };
export const MINION_CALL = 1.5, MINION_CALL_R = 450;   // minyon çağrısı: 450 içindeki dost kahramana son 1,5 sn içinde vuran, minyonun yakınındaki rakip kahramana odaklan
/* Yeniden doğma: 10 sn + dakika başına 1,5 sn, en fazla 40 sn (20. dakikada). */
/* Üsse dönüş (B): sabit 8 sn kanallanır; hareket, saldırı, yetenek ya da hasar keser */
export const RECALL = { time:8 };   // sabit 8 sn kanallama (her yerden)
/* Yeniden doğma (21.10.2026, iki parça): erken oyun karesel ve mid'de durur (base + k*dakika², en fazla mid),
   lateStart dakikasından sonra küp ek terim (late*(dakika-lateStart)³) ile giderek hızlanan artış, en fazla cap.
   6 sn (0. dk), ~12 (5), ~30 (10-15), ~32 (20), ~45 (25), ~81 (30), ~150 (35+). Amaç: uzun maçlar bitsin. */
export const RESPAWN = { base:6, k:0.25, mid:30, lateStart:15, late:0.015, cap:150 };   // 21.10.2026: { base:6, k:0.25, cap:30 } idi (10. dk'dan sonra düz 30 sn)
//   cap 50 idi; 15.10.2026: k 0.2 idi (14.10.2026: 0.11 idi)
export const respawnTime = t => { const m=t/60; return Math.min(RESPAWN.cap, Math.min(RESPAWN.mid, RESPAWN.base+RESPAWN.k*m*m) + RESPAWN.late*Math.max(0,m-RESPAWN.lateStart)**3); };
export const XP_NEED = lvl => 140 + 38*(lvl-1);         // seviyeden sonrakine gereken XP (14.10.2026, azami seviye 15: 180 + 54*(lvl-1) idi)
export const HERO_KILL_XP = 150, STRUCT_XP = 100, XP_RADIUS = 600;
export const KEY_LABELS = { p:'Pasif', r:'Sağ Tık', e:'E', s:'Boşluk' };
/* Savaş sisi: görüş menzilleri */
export const VISION = { hero:700, tower:700, minion:500 };
/* Kule vuruşu (sim ve bot tahmini aynı formülü kullanır) */
export const towerScale = t => Math.min(TOWER.dmgCap, 1+TOWER.dmgPerMin*(t||0)/60);
export const towerChampHit = (st, t) => TOWER.dmg*towerScale(t)*TOWER.champMult*(1+TOWER.champStack*Math.min(st,TOWER.maxStack));
export const towerMinionHit = m => m.maxHp/(TOWER.minionHits[m.type]||3)+0.01;

/* ---- Orman (11.10.2026, "1 koridor + orman") ----
   Kamplar takım 0 tarafında tanımlı (x,y); side:'both' kamplar takım 1 tarafına x'te aynalanır, side:'mid' tek (ortada).
   Canavar: hp, dmg (fiziksel, tek hedef, menzil reach), period (vuruş aralığı), r, gold (son vuruşu yapan kahramana), xp (yakındaki dostlara XP_SHARE ile).
   Canavarlar yalnız kendilerine vuran kahramana karşılık verir; kampından leash'ten fazla uzaklaşınca döner ve canı dolar.
   Yeniden doğuş: respawn sn (öldürülünce). first: ilk doğuş saniyesi. Zamanla güçlenme SCALE (minyon gibi).
   buff: kampı öldürene süreli güç (BUFFS), big: öldüren takıma takım gücü (BIG_BUFF). */
// ormancı seçimi (16.10.2026, Uzman teşhisi): bu menzilli büyücüler ormancı seçilmez (Gölge maçların yarısında ormancı oluyordu; ormanda %33).
// Takımda başka bot yoksa yine ormana gider.
export const JUNGLE_AVOID = ['shadow','spirit','artillery','mage'];
export const JUNGLE = {
  // denge tur 2 (11.10.2026): canavar altın ve XP'si %15 arttı (ormancı kahramanlar %33-47'de kalıyordu)
  leash:520, aggroT:6, returnHeal:0.25,
  xpMult:1.15, goldMult:1.6,   // 14.10.2026: goldMult 1.3 idi               // canavar XP ve altın çarpanı (J 12.10.2026: 1/1 idi; orman kesmeyen takım deneyi ve 10. dk eşitliği için)
  basicMult:1.2, skillMult:1.6,            // kahramanların canavarlara hasarı: düz vuruş x1,2, yetenek ve diğer x1,6   // tasma yarıçapı (kamp merkezinden), vurmayan saldırganı bırakma süresi (sn), dönerken sn'de azami canın %25'i
  scale:{ hpPerMin:0.08, dmgPerMin:0.06, cap:2.8, rewardPerMin:0.03, rewardCap:1.6 },   // doğuş anındaki dakikaya göre can/hasar/ödül katı (14.10.2026: 0.05/0.04/2.2 idi, ödül sabitti)
  monsters:{
    wolf:     { name:'Kurt',          r:22, hp:380,  dmg:20, reach:40, period:1.2, wind:0.3, speed:240, mass:1.2, gold:34, xp:80 },
    pup:      { name:'Yavru Kurt',    r:15, hp:170,  dmg:9,  reach:34, period:1.1, wind:0.3, speed:250, mass:0.7, gold:14, xp:34 },
    golem:    { name:'Taş Golem',     r:26, hp:430,  dmg:22, reach:44, period:1.5, wind:0.4, speed:200, mass:2.0, gold:39, xp:75 },
    bird:     { name:'Gece Kuşu',     r:14, hp:160,  dmg:9,  reach:120, period:1.2, wind:0.3, speed:260, mass:0.5, gold:21, xp:37 },
    regen:    { name:'Pınar Ruhu',    r:30, hp:950,  dmg:30, reach:46, period:1.4, wind:0.35, speed:220, mass:3.0, gold:69, xp:161, buff:'regen' },
    burn:     { name:'Kor Böceği',    r:30, hp:950,  dmg:32, reach:46, period:1.4, wind:0.35, speed:220, mass:3.0, gold:69, xp:161, buff:'burn' },
    titan:    { name:'Vaha Titanı',   r:52, hp:4200, dmg:80, reach:70, period:1.6, wind:0.45, speed:200, mass:12, gold:0, xp:368, big:true, cleave:150 }
  },
  // J (12.10.2026): kamplar daha sık doğar (80/90/75/120/120 idi) ki orman sık dönülsün
  camps:[
    { id:'wolves', side:'both', x:1150, y:1065, mobs:['wolf','pup','pup'], respawn:65, first:60 },
    { id:'golems', side:'both', x:1700, y:400,  mobs:['golem','golem'],    respawn:72, first:60 },
    { id:'birds',  side:'both', x:2050, y:560,  mobs:['bird','bird','bird'], respawn:60, first:60 },
    { id:'regen',  side:'both', x:900,  y:480,  mobs:['regen'], respawn:100, first:60 },
    { id:'burn',   side:'both', x:1720, y:1100, mobs:['burn'],  respawn:100, first:60 },
    { id:'titan',  side:'mid',  x:2600, y:930,  mobs:['titan'], respawn:300, first:420 }   // 14.10.2026: 360/480 idi
  ]
};
/* Güçlendirme kampları: sahibine dur sn; sahibi rakip kahramanca öldürülürse kalan süre öldürene geçer (LoL gibi).
   regen: 5 sn'de azami canın regenPct'i ek yenilenme + ah yetenek hızı. burn: düz vuruş isabetinde slow (slowDur sn) + süreli büyü hasarı (dps, dur sn; seviyeyle). */
export const BUFFS = {
  regen:{ name:'Yenilenme', dur:90, regenPct:0.04, ah:15, color:'#5ff2c8' },
  burn: { name:'Yakıcı',    dur:90, slow:0.15, slowDur:1.5, dpsBase:6, dpsPer:2, dotDur:3, color:'#ff8a3d' }
};
/* Büyük canavar gücü: öldüren takımın bütün kahramanlarına (ölüler dahil) dur sn; takımın minyonları minionDmg/minionHp katı,
   kahraman ve minyonların yapılara hasarı structMult katı. Altın: takımın her üyesine gold. */
export const BIG_BUFF = { name:'Titan Gücü', dur:150, minionDmg:1.4, minionHp:1.4,   /* 21.10.2026: dur 120, minionHp 1.3 idi (ölüm süresi 30 sn'ye inince oyun sonunu hızlandırmak için) */ structMult:2.0,   /* 15.10.2026: 1.5 idi (14.10.2026: 1.25 idi) */ gold:120, color:'#ffd24d' };

/* ---- Geri kalma telafisi ve orman hakimiyeti (12.10.2026) ----
   CATCHUP_XP: kahramanın toplam XP'si rakip takım ortalamasından en az gap oranı kadar düşükse bütün XP kazancı +bonus (ilk eşleşen, tavan %40).
   CATCHUP_GOLD: servet (altın + eşya değeri) rakip takım ortalamasından en az gap kadar gerideyse kahraman öldürme, kule yıkımı ve
   Vaha Titanı ödüllerinde şahsi ilave altın (tavan 110). Asist alan geride kişi assistPct kadarını alır.
   JUNGLE_MASTERY: kamp temizliği (son vuruş ya da kamp ödülünü alırken yakında olmak) +1 puan (h.jm); puan başına canavar XP/altını +per, en fazla max puan. Ölünce kalır. */
export const CATCHUP_XP = [ { gap:0.40, bonus:0.40 }, { gap:0.30, bonus:0.30 }, { gap:0.20, bonus:0.20 } ];
export const CATCHUP_GOLD = { steps:[ { gap:0.50, gold:110 }, { gap:0.40, gold:90 }, { gap:0.30, gold:70 }, { gap:0.20, gold:50 } ], assistPct:0.5 };
export const JUNGLE_MASTERY = { per:0.02, max:15 };

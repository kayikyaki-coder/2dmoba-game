/* Eşya statları genel kısma ile %25 azaltıldı (pasif oranları aynı). */
/* Eşyalar: temel parçalar, büyük eşyalar ve botların eşya sıralamaları (build). Sadece veri.
   Stat anahtarları: dmg (SG), asPct (saldırı hızı %), crit (kritik şansı), ls (can çalma), ap (YG), ah (yetenek hızı),
   hp (can), armor (zırh), mr (büyü direnci), msPct (hareket hızı %), lethal (sabit zırh delme), regen (5 sn'de yenilenen can).
   cat: mağaza kategorisi. Yeni eşyaların hiçbirinin aktifi yok (aktifler ileride rün sistemi ile gelecek; yalnız Kum Saati aktifli).
   Pasifler aşağıdaki alanlarla tanımlanır, kuralları sim.js'teki eşya bölümünde uygulanır. */

export const START_GOLD = 250;     // başlangıçta tek bir temel parça alınabilir
/* Eşya fiyatları pasif altın (saniyede 1,5) gelince %30 artırıldı. */
export const SLOTS = 5;
export const CRIT_MULT = 1.5;          // kritik vuruş normal vuruşun %150'si

export const PARTS = {
  longsword:{ name:'Uzun Kılıç',    cost:225, stats:{ dmg:6 } },
  dagger:   { name:'Hançer',        cost:225, stats:{ asPct:0.07 } },
  cloak:    { name:'Çevik Pelerin', cost:250, stats:{ crit:0.06 } },
  fang:     { name:'Vampir Dişi',   cost:225, stats:{ ls:0.04 } },
  tome:     { name:'Büyü Kitabı',   cost:225, stats:{ ap:11 } },
  focus:    { name:'Odak Taşı',     cost:225, stats:{ ah:6 } },
  ruby:     { name:'Yakut Taşı',    cost:200, stats:{ hp:60 } },
  cloth:    { name:'Kumaş Zırh',    cost:200, stats:{ armor:9 } },
  mantle:   { name:'Büyü Pelerini', cost:200, stats:{ mr:11 } },
  boots:    { name:'Hafif Çizme',   cost:200, stats:{ msPct:0.05 } },
  knife:    { name:'Keskin Bıçak',  cost:225, stats:{ lethal:7 } },
  herb:     { name:'Şifa Otu',      cost:200, stats:{ regen:12 } }
};

export const ITEMS = {
  // Nişancı
  ie:       { cat:'Nişancı', name:'Sonsuzluk Kılıcı',  cost:1300, parts:['longsword','longsword','cloak'], stats:{ dmg:34, crit:0.19 }, critMult:1.75, desc:'Kritik hasarı %150 yerine %175' },
  bt:       { cat:'Nişancı', name:'Kan Emici',         cost:1175,  parts:['longsword','longsword','fang'],  stats:{ dmg:30, ls:0.14 } },
  pd:       { cat:'Nişancı', name:'Hayalet Dansçı',    cost:1175,  parts:['dagger','dagger','cloak'],       stats:{ asPct:0.26, crit:0.19, msPct:0.05 }, ghost:true, desc:'Dost minyonların içinden geçebilir' },
  botrk:    { cat:'Nişancı', name:'Yıkık Kral Kılıcı', cost:1200,  parts:['longsword','dagger','fang'],     stats:{ dmg:21, asPct:0.19, ls:0.07 }, onHitCurPct:0.05, desc:'Vuruşlar hedefin o anki canının %5\'i kadar ek fiziksel hasar verir' },
  kraken:   { cat:'Nişancı', name:'Kraken',            cost:1150,  parts:['longsword','dagger','dagger'],   stats:{ dmg:21, asPct:0.19 }, every3:25, desc:'Her 3. vuruş +25 büyü hasarı verir' },
  rfc:      { cat:'Nişancı', name:'Uzun Nişan',        cost:1200,  parts:['dagger','cloak','longsword'],    stats:{ crit:0.19, asPct:0.23 }, rangeRanged:20, rangeMelee:10, angleMult:1.15, desc:'Menzilliler: +20 menzil. Yakın dövüşçüler: saldırı açısı %15 genişler (90 dereceden 103,5\'e) ve +10 menzil' },
  windbow:  { cat:'Nişancı', name:'Rüzgar Yayı',       cost:1175,  parts:['longsword','dagger','dagger'],   stats:{ dmg:21, asPct:0.23 }, atkSlowMult:0.5, desc:'Düz vuruş hazırlığındaki yavaşlama %50 azalır' },
  ldr:      { cat:'Nişancı', name:'Zırh Yaran',        cost:1225,  parts:['longsword','longsword','cloak'], stats:{ dmg:26, crit:0.19 }, basicArmorPen:0.30, desc:'Düz vuruşlar rakibin zırhının %30\'unu yok sayar' },
  // Dövüşçü
  cleaver:  { cat:'Dövüşçü', name:'Kara Balta',        cost:1175,  parts:['longsword','ruby','focus'],      stats:{ dmg:26, hp:225, ah:11 }, shred:{ pct:0.05, max:6, dur:4 }, desc:'Fiziksel vuruş rakibin zırhını %5 azaltır (6 kata kadar, 4 sn)' },
  spear:    { cat:'Dövüşçü', name:'Yontulmuş Mızrak',  cost:1175,  parts:['longsword','longsword','ruby'],  stats:{ dmg:23, hp:188, ah:11 }, champMaxHp:{ pct:0.10, cd:10 }, desc:'Rakip şampiyona düz vuruş ek olarak onun azami canının %10\'u kadar fiziksel hasar verir. 10 sn bekleme, sadece şampiyonlarda' },
  titanic:  { cat:'Dövüşçü', name:'Dev Avcısı',        cost:1150,  parts:['longsword','ruby','ruby'],       stats:{ dmg:19, hp:225 }, onHitOwnHp:0.03, desc:'Düz vuruşlar ek olarak kendi azami canının %3\'ü kadar fiziksel hasar verir' },
  vengeance:{ cat:'Dövüşçü', name:'Öç Zırhı',          cost:1100,  parts:['longsword','ruby','cloth'],      stats:{ dmg:19, hp:263 }, store:{ pct:0.20, cap:120, decay:8 }, desc:'Alınan hasarın %20\'si birikir (en fazla 120, 8 sn\'de kullanılmazsa söner). Hasar veren sonraki yetenek bunu ek fiziksel hasar olarak verir' },
  sheen:    { cat:'Dövüşçü', name:'Tılsımlı Kılıç',    cost:1225,  parts:['longsword','ruby','focus'],      stats:{ dmg:19, hp:150, ah:11, asPct:0.11 }, spellblade:{ base:50, bonusAd:0.5, window:2, cd:1, type:'phys' }, desc:'Yetenek kullandıktan sonraki 2 sn içinde yapılan ilk saldırı ek 50 + ilave SG\'nin %50\'si kadar fiziksel hasar verir. 1 sn bekleme' },
  mace:     { cat:'Dövüşçü', name:'Kanlı Gürz',        cost:1225,  parts:['longsword','ruby','focus'],      stats:{ dmg:23, hp:188, ah:11 }, armorPen:0.30, desc:'Düz vuruşlar ve yetenekler rakibin zırhının %30\'unu yok sayar' },
  // Büyücü
  dcap:     { cat:'Büyücü', name:'Büyücü Şapkası',    cost:1300, parts:['tome','tome','tome'],            stats:{ ap:83 }, apMult:1.3, desc:'Toplam YG %30 artar' },
  void:     { cat:'Büyücü', name:'Boşluk Asası',      cost:1175,  parts:['tome','tome','mantle'],          stats:{ ap:53 }, magicPenPct:0.35, desc:'%35 büyü delme (rakibin büyü direncinin %35\'ini yok sayar)' },
  blackflame:{cat:'Büyücü', name:'Kara Alev',         cost:1175,  parts:['tome','tome','ruby'],            stats:{ ap:60, hp:150 }, skillBurn:{ pct:0.04, dur:3 } },
  time:     { cat:'Büyücü', name:'Zaman Asası',       cost:1150,  parts:['tome','focus','focus'],          stats:{ ap:56, ah:19, msPct:0.04 } },
  hourglass:{ cat:'Büyücü', name:'Kum Saati',         cost:1175,  parts:['tome','cloth','cloth'],          stats:{ ap:45, armor:30 }, stasis:{ dur:2, cd:90 }, desc:'Aktif: 2 sn dokunulmaz ve hareketsiz, 90 sn bekleme' },
  echo:     { cat:'Büyücü', name:'Yankı Asası',       cost:1175,  parts:['tome','tome','focus'],           stats:{ ap:49, ah:11 }, echo:{ base:60, ap:0.20, cd:10 }, desc:'Bir sonraki yetenek ek 60 + YG\'nin %20\'si kadar büyü hasarı verir. 10 sn bekleme' },
  lich:     { cat:'Büyücü', name:'Büyü Kılıcı',       cost:1225,  parts:['tome','tome','focus'],           stats:{ ap:60, ah:8, msPct:0.06 }, spellblade:{ base:50, apRatio:0.75, window:10, cd:1.5, type:'magic' }, desc:'Yetenek kullandıktan sonraki 10 sn içinde ilk düz vuruş ek 60 + YG\'nin %75\'i kadar büyü hasarı verir. 1,5 sn bekleme' },
  magpen:   { cat:'Büyücü', name:'Büyü Nüfuzu',       cost:1175,  parts:['tome','tome','mantle'],          stats:{ ap:53 }, magicPenFlat:15, desc:'+15 sabit büyü delme (rakibin büyü direncinden 15 düşülür, yüzdelikten önce uygulanır)' },
  fang2:    { cat:'Büyücü', name:'Ateş Dişi',         cost:1175,  parts:['tome','tome','focus'],           stats:{ ap:53, ah:11 }, onHitAp:0.20, desc:'Düz vuruşlar ek olarak YG\'nin %20\'si kadar büyü hasarı verir' },
  // Savaşçı büyücü
  bloodtome:{ cat:'Savaşçı büyücü', name:'Kanlı Kitap',       cost:1225,  parts:['tome','ruby','focus'],           stats:{ hp:188, ap:23, ah:11 }, hpToAp:0.02, desc:'Azami canının %2\'si kadar YG kazanırsın' },
  spring:   { cat:'Savaşçı büyücü', name:'Can Pınarı',        cost:1175,  parts:['tome','ruby','ruby'],            stats:{ hp:225, ap:30 }, castHeal:{ base:25, pctMax:0.02, cd:5 }, desc:'Yetenek kullanmak 25 + azami canının %2\'si kadar can yeniler. 5 sn bekleme' },
  abyss:    { cat:'Savaşçı büyücü', name:'Uçurum Maskesi',    cost:1200,  parts:['tome','ruby','mantle'],          stats:{ hp:225, ap:34 }, mrAura:{ range:400, base:9 }, desc:'400 menzildeki düşmanların büyü direnci 9 + senin seviyen kadar düşer' },
  // Tank
  thorn:    { cat:'Tank', name:'Diken Zırhı',       cost:1150,  parts:['cloth','cloth','ruby'],          stats:{ armor:45, hp:113 }, thorns:{ base:15, armorPct:0.10 }, desc:'Düz vuruş yiyince saldırana 15 + kendi zırhının %10\'u kadar büyü hasarı' },
  visage:   { cat:'Tank', name:'Ruh Örtüsü',        cost:1100,  parts:['mantle','mantle','ruby'],        stats:{ mr:41, hp:188 }, healAmp:0.20, desc:'Aldığın iyileştirme (yenilenme, çeşme) %20 artar' },
  sunfire:  { cat:'Tank', name:'Güneş Ateşi',       cost:1175,  parts:['ruby','ruby','cloth'],           stats:{ hp:263, armor:26 }, burnAura:{ range:220, base:15, pctMax:0.01 }, desc:'Yakındaki düşmanlara saniyede 15 + kendi azami canının %1\'i kadar büyü hasarı' },
  randuin:  { cat:'Tank', name:'Titan Kalkanı',     cost:1150,  parts:['cloth','cloth','ruby'],          stats:{ hp:300, armor:34 }, critReduce:0.30, attackerAsSlow:{ pct:0.15, dur:2 }, desc:'Aldığın kritik hasar %30 azalır. Sana düz vuranların saldırı hızı %15 düşer' },
  warmog:   { cat:'Tank', name:'Ölümsüz Kalp',      cost:1300, parts:['ruby','ruby','ruby'],            stats:{ hp:525 }, ooc:{ delay:6, pctPerSec:0.03 }, desc:'6 sn hasar almazsan saniyede azami canının %3\'ü kadar yenilenirsin' },
  triumph:  { cat:'Tank', name:'Zafer Zırhı',       cost:1175,  parts:['ruby','cloth','mantle'],         stats:{ hp:263, armor:23, mr:23 }, takedownHeal:{ pct:0.20, dur:5 }, desc:'Rakibi öldürmek ya da asist yapmak 5 sn içinde azami canının %20\'sini doldurur' },
  fortress: { cat:'Tank', name:'Kale Zırhı',        cost:1300, parts:['ruby','cloth','mantle'],         stats:{ hp:150, armor:15, mr:15 }, resistMult:1.10, desc:'Toplam zırhın ve büyü direncin %10 artar' },
  // ---- Yeni eşyalar (aktifsiz) ----
  // Nişancı
  nightfang:{ cat:'Nişancı', name:'Gece Avcısı',     cost:1225, parts:['longsword','knife','cloak'],     stats:{ dmg:20, crit:0.14, lethal:10 }, onHitAd:0.06, desc:'Düz vuruşlar SG\'nin %6\'sı kadar ek fiziksel hasar verir' },
  bloodbow: { cat:'Nişancı', name:'Kanlı Yay',       cost:1175, parts:['dagger','cloak','fang'],         stats:{ asPct:0.20, crit:0.15, ls:0.07 }, lsLow:{ hp:0.5, mult:2 }, desc:'Canın %50 altındayken can çalma iki katına çıkar' },
  runbow:   { cat:'Nişancı', name:'Kaçak Yayı',      cost:1150, parts:['dagger','dagger','boots'],       stats:{ dmg:12, asPct:0.28, msPct:0.07 }, onHitMs:{ amt:0.10, dur:1 }, desc:'Düz vuruşlar 1 sn %10 hareket hızı verir' },
  pierce:   { cat:'Nişancı', name:'Delici Ok',       cost:1200, parts:['longsword','knife','dagger'],    stats:{ dmg:19, asPct:0.17, lethal:14 }, basicArmorPen:0.12, desc:'Düz vuruşlar rakibin zırhının %12\'sini yok sayar' },
  redhunt:  { cat:'Nişancı', name:'Kızıl Av',        cost:1175, parts:['longsword','dagger','fang'],     stats:{ dmg:17, asPct:0.14, ls:0.06 }, champMaxHp:{ pct:0.06, cd:6 }, desc:'Rakip şampiyona düz vuruş ek olarak onun azami canının %6\'sı kadar fiziksel hasar verir. 6 sn bekleme, sadece şampiyonlarda' },
  // Dövüşçü
  typhoon:  { cat:'Dövüşçü', name:'Kasırga Baltası', cost:1225, parts:['longsword','ruby','focus'],      stats:{ dmg:19, hp:170, ah:11 }, castAs:{ amt:0.25, dur:3 }, desc:'Yetenek kullanınca 3 sn boyunca saldırı hızın %25 artar' },
  bullstr:  { cat:'Dövüşçü', name:'Boğa Gücü',       cost:1175, parts:['longsword','ruby','ruby'],       stats:{ dmg:10, hp:250 }, hpToAd:0.015, desc:'Azami canının %1,5\'i kadar SG kazanırsın' },
  bloodclaw:{ cat:'Dövüşçü', name:'Kanlı Pençe',     cost:1175, parts:['longsword','fang','ruby'],       stats:{ dmg:19, hp:188, ls:0.05 }, spellVamp:0.15, desc:'Yetenek hasarının %15\'i kadar can yenilenir' },
  predator: { cat:'Dövüşçü', name:'Yırtıcı Pençe',   cost:1200, parts:['longsword','ruby','boots'],      stats:{ dmg:19, hp:188, msPct:0.05 }, champMaxHp:{ pct:0.05, cd:8 }, desc:'Rakip şampiyona düz vuruş ek olarak onun azami canının %5\'i kadar fiziksel hasar verir. 8 sn bekleme, sadece şampiyonlarda' },
  ironheart:{ cat:'Dövüşçü', name:'Demir Yürek',     cost:1175, parts:['longsword','cloth','mantle'],    stats:{ dmg:13, hp:150, armor:13, mr:13 }, onHitOwnHp:0.02, desc:'Düz vuruşlar ek olarak kendi azami canının %2\'si kadar fiziksel hasar verir' },
  // Suikastçı / vur-kaç
  duskknife:{ cat:'Suikastçı', name:'Gölge Hançeri', cost:1200, parts:['longsword','knife','boots'],     stats:{ dmg:24, lethal:12, msPct:0.06 }, execDmg:{ hp:0.30, pct:0.08 }, desc:'Canı %30 altındaki rakip şampiyona %8 ek hasar verirsin' },
  quietblade:{cat:'Suikastçı', name:'Sessiz Bıçak',  cost:1150, parts:['longsword','knife','dagger'],    stats:{ dmg:19, asPct:0.14, lethal:10 }, hurtMs:{ amt:0.12, dur:2 }, desc:'Hasar alınca 2 sn %12 hareket hızı kazanırsın' },
  reaper:   { cat:'Suikastçı', name:'Hasat Kılıcı',  cost:1300, parts:['longsword','longsword','knife'], stats:{ dmg:32, lethal:15 }, execDmg:{ hp:0.35, pct:0.10 }, desc:'Canı %35 altındaki rakip şampiyona %10 ek hasar verirsin' },
  windwalk: { cat:'Suikastçı', name:'Rüzgar Yürüyüşü', cost:1150, parts:['boots','knife','longsword'],   stats:{ dmg:19, lethal:11, msPct:0.10 }, castMs:{ amt:0.15, dur:1.5 }, desc:'Yetenek kullanınca 1,5 sn %15 hareket hızı kazanırsın' },
  nightmask:{ cat:'Suikastçı', name:'Gece Maskesi',  cost:1175, parts:['cloak','knife','boots'],         stats:{ dmg:12, crit:0.12, lethal:10, msPct:0.06 }, skillSlow:{ amt:0.15, dur:1 }, desc:'Yetenek isabeti rakibi 1 sn %15 yavaşlatır' },
  // Büyücü
  frostrod: { cat:'Büyücü', name:'Buz Asası',        cost:1175, parts:['tome','tome','focus'],           stats:{ ap:53, ah:11 }, skillSlow:{ amt:0.15, dur:1 }, desc:'Yetenek isabeti rakibi 1 sn %15 yavaşlatır' },
  glassbreak:{cat:'Büyücü', name:'Cam Kırıcı',       cost:1175, parts:['tome','tome','boots'],           stats:{ ap:49, msPct:0.06 }, magicPenFlat:12, desc:'+12 sabit büyü delme (rakibin büyü direncinden 12 düşülür, yüzdelikten önce uygulanır)' },
  witchblade:{cat:'Büyücü', name:'Cadı Bıçağı',      cost:1200, parts:['tome','dagger','tome'],          stats:{ ap:43, asPct:0.17 }, onHitAp:0.25, desc:'Düz vuruşlar ek olarak YG\'nin %25\'i kadar büyü hasarı verir' },
  finalrod: { cat:'Büyücü', name:'Son Darbe Asası',  cost:1225, parts:['tome','tome','focus'],           stats:{ ap:53, ah:11 }, execDmg:{ hp:0.30, pct:0.10 }, desc:'Canı %30 altındaki rakip şampiyona %10 ek hasar verirsin' },
  // Savaşçı büyücü
  bloodcup: { cat:'Savaşçı büyücü', name:'Kan Kasesi', cost:1175, parts:['tome','ruby','fang'],           stats:{ hp:200, ap:34 }, spellVamp:0.12, desc:'Yetenek hasarının %12\'si kadar can yenilenir' },
  emberward:{ cat:'Savaşçı büyücü', name:'Ateş Kalkanı', cost:1200, parts:['tome','ruby','cloth'],        stats:{ hp:175, ap:26, armor:13 }, castShield:{ base:40, pctMax:0.04, dur:2, cd:8 }, desc:'Yetenek kullanınca 2 sn boyunca 40 + azami canının %4\'ü kadar kalkan kazanırsın. 8 sn bekleme' },
  lifestone:{ cat:'Savaşçı büyücü', name:'Yaşam Taşı', cost:1150, parts:['tome','ruby','herb'],           stats:{ hp:225, ap:30, regen:12 }, healAmp:0.15, desc:'Aldığın iyileştirme %15 artar' },
  // Tank
  stonebelt:{ cat:'Tank', name:'Taş Kuşak',          cost:1100, parts:['ruby','herb','cloth'],           stats:{ hp:225, armor:26, regen:12 }, lowHpRes:{ hp:0.30, armor:0.25 }, desc:'Canın %30 altındayken zırhın %25 artar' },
  ironwall: { cat:'Tank', name:'Demir Duvar',        cost:1150, parts:['cloth','cloth','cloth'],         stats:{ armor:55, hp:75 }, basicReduce:0.10, desc:'Düz vuruşlardan aldığın hasar %10 azalır' },
  spellwall:{ cat:'Tank', name:'Büyü Duvarı',        cost:1150, parts:['mantle','mantle','mantle'],      stats:{ mr:64, hp:75 }, magicReduce:0.08, desc:'Büyü hasarından aldığın hasar %8 azalır' },
  steelboot:{ cat:'Tank', name:'Çelik Çizme',        cost:1150, parts:['cloth','boots','ruby'],          stats:{ hp:188, armor:28, msPct:0.06 }, slowResist:0.35, desc:'Üzerindeki yavaşlatma etkileri %35 azalır' },
  lastshield:{cat:'Tank', name:'Son Nefes Kalkanı',  cost:1250, parts:['ruby','cloth','mantle'],         stats:{ hp:188, armor:20, mr:20 }, lowShield:{ hp:0.30, base:80, pct:0.12, dur:3, cd:60 }, desc:'Canın %30 altına düşünce 3 sn boyunca 80 + azami canının %12\'si kadar kalkan kazanırsın. 60 sn bekleme' },
  rootheart:{ cat:'Tank', name:'Kök Kalbi',          cost:1200, parts:['ruby','ruby','herb'],            stats:{ hp:375, regen:18 }, ooc:{ delay:4, pctPerSec:0.015 }, desc:'4 sn hasar almazsan saniyede azami canının %1,5\'i kadar yenilenirsin' },
  woundmail:{ cat:'Tank', name:'Yara Zırhı',         cost:1150, parts:['cloth','cloth','ruby'],          stats:{ armor:40, hp:150 }, antiHeal:{ pct:0.40, dur:3 }, desc:'Sana düz vuran rakibin iyileşmesi 3 sn boyunca %40 azalır' },
  windcloak:{ cat:'Tank', name:'Rüzgar Pelerini',    cost:1100, parts:['mantle','mantle','boots'],       stats:{ mr:38, hp:150, msPct:0.06 }, hurtMs:{ amt:0.10, dur:2 }, desc:'Hasar alınca 2 sn %10 hareket hızı kazanırsın' },
  silverguard:{cat:'Tank', name:'Gümüş Zırh',        cost:1200, parts:['cloth','mantle','herb'],         stats:{ hp:150, armor:20, mr:20, regen:12 }, lowHpRes:{ hp:0.30, armor:0.20, mr:0.20 }, desc:'Canın %30 altındayken zırhın ve büyü direncin %20 artar' },
  // Destek
  amulet:   { cat:'Destek', name:'Koruyucu Muska',   cost:1150, parts:['tome','ruby','focus'],           stats:{ hp:188, ap:23, ah:11 }, shieldAmp:0.20, healAmp:0.15, desc:'Kalkanların %20, aldığın iyileştirme %15 güçlenir' },
  breeze:   { cat:'Destek', name:'Esinti Asası',     cost:1150, parts:['tome','boots','focus'],          stats:{ ap:38, ah:11, msPct:0.06 }, castMs:{ amt:0.12, dur:2 }, desc:'Yetenek kullanınca 2 sn %12 hareket hızı kazanırsın' },
  healbell: { cat:'Destek', name:'Şifa Çanı',        cost:1150, parts:['tome','herb','focus'],           stats:{ hp:125, ap:26, ah:11, regen:12 }, castHeal:{ base:30, pctMax:0.015, cd:6 }, desc:'Yetenek kullanmak 30 + azami canının %1,5\'i kadar can yeniler. 6 sn bekleme' },
  wingward: { cat:'Destek', name:'Kanat Kalkanı',    cost:1150, parts:['mantle','boots','ruby'],         stats:{ hp:188, mr:26, msPct:0.06 }, castShield:{ base:50, pctMax:0.04, dur:2, cd:10 }, desc:'Yetenek kullanınca 2 sn boyunca 50 + azami canının %4\'ü kadar kalkan kazanırsın. 10 sn bekleme' },
  // ---- Eşya turu 2 (20 eşya, aktifsiz; esya-plani.md) ----
  // Nişancı
  fury:     { cat:'Nişancı', name:'Hız Çarkı',        cost:1175, parts:['longsword','dagger','cloak'],    stats:{ dmg:12, asPct:0.14, crit:0.10 }, asStack:{ amt:0.04, max:5, dur:3 }, desc:'Düz vuruş isabeti saldırı hızını %4 artırır (5 kata kadar, 3 sn vurmazsan söner)' },
  luck:     { cat:'Nişancı', name:'Talih Kılıcı',     cost:1175, parts:['longsword','longsword','cloak'], stats:{ dmg:24, crit:0.12 }, critStack:{ step:0.05, max:0.35 }, desc:'Kritik vurmayan her düz vuruş +%5 ilave kritik şansı biriktirir (en fazla %35). Kritik vuruş gerçekleşince bu bonus sıfırlanır' },
  coil:     { cat:'Nişancı', name:'Yük Bobini',       cost:1200, parts:['longsword','dagger','cloak'],    stats:{ dmg:14, asPct:0.12, crit:0.10 }, coil:{ perDist:15, perHit:10, max:100, base:55, ad:0.20 }, desc:'Hareket etmek ve düz vurmak yük biriktirir. Yük 100\'e ulaşınca sonraki düz vuruş 55 + SG\'nin %20\'si kadar ek büyü hasarı verir' },
  crystal:  { cat:'Nişancı', name:'Kristal Hançer',   cost:1150, parts:['longsword','longsword','cloak'], stats:{ dmg:20, crit:0.15 }, critSlow:{ amt:0.10, dur:1 }, desc:'Kritik vuruşlar hedefi 1 sn %10 yavaşlatır' },
  thornboot:{ cat:'Nişancı', name:'Dikenli Çizme',    cost:1100, parts:['boots','dagger','dagger'],       stats:{ asPct:0.23, msPct:0.10 }, hitMsStack:{ amt:0.03, max:3, dur:2 }, desc:'Rakip kahramana düz vurdukça %3 hareket hızı birikir (3 kata kadar, 2 sn sürer)' },
  bloodbond:{ cat:'Nişancı', name:'Kan Bağı',         cost:1100, parts:['longsword','fang','fang'],       stats:{ dmg:19, ls:0.08 }, lsShare:0.20, desc:'Can çalmayla kazandığın canın %20\'si kadarı yakındaki dost kahramana da gider (700 menzil)' },
  // Dövüşçü
  skillblade:{cat:'Dövüşçü', name:'Hüner Bıçağı',     cost:1175, parts:['longsword','longsword','focus'], stats:{ dmg:24, ah:11 }, skillAd:0.10, desc:'Yetenek hasarı toplam SG\'nin %10\'u kadar ek hasar verir' },
  stride:   { cat:'Dövüşçü', name:'Fırtına Adımı',    cost:1150, parts:['ruby','ruby','boots'],           stats:{ hp:250, msPct:0.06 }, stride:{ perDist:20, max:50, msPer:0.002 }, desc:'Hareket etmek yük biriktirir (en fazla 50). Yük başına %0,2 ek hareket hızı. Düz vuruş yük kadar büyü hasarı verir ve yükü sıfırlar' },
  cleave:   { cat:'Dövüşçü', name:'Kesici Vuruş',     cost:1100, parts:['longsword','longsword','herb'],  stats:{ dmg:26, regen:18 }, cleave:{ pct:0.40, reach:260, half:0.8 }, desc:'Yakın dövüşçünün düz vuruşu hedefin arkasındaki koniye %40 hasar yayar. Menzillilerde çalışmaz' },
  siege:    { cat:'Dövüşçü', name:'Kuşatma Çekici',   cost:1175, parts:['longsword','longsword','ruby'],  stats:{ dmg:26, hp:150 }, siege:0.20, desc:'Yapılara ve minyonlara %20 ek hasar verirsin (kahramanlara etkisi yok)' },
  // Suikastçı
  sunderer: { cat:'Suikastçı', name:'Zırh Paralayıcı', cost:1200, parts:['longsword','knife','knife'],    stats:{ dmg:21, lethal:14 }, skillSunder:{ pct:0.15, dur:3 }, desc:'Rakip şampiyona yetenek tutturmak zırhını 3 sn boyunca %15 düşürür' },
  deathmap: { cat:'Suikastçı', name:'Ölüm Haritası',   cost:1100, parts:['longsword','longsword','longsword'], stats:{ dmg:34 }, shredFlat:{ amt:8, dur:5 }, desc:'Düz vuruş hedefin zırhını 5 sn boyunca 8 azaltır (birikmez)' },
  // Büyücü
  collapse: { cat:'Büyücü', name:'Çöküş Asası',       cost:1175, parts:['tome','tome','focus'],           stats:{ ap:49, ah:11 }, lowBoom:{ hp:0.30, base:60, ap:0.40, radius:220, cd:30 }, desc:'Canı %30 altındaki rakip şampiyona büyü hasarı vermek onun çevresinde 60 + YG\'nin %40\'ı kadar büyü hasarlı patlama yaratır. 30 sn bekleme' },
  timeglass:{ cat:'Büyücü', name:'Zaman Kumu',        cost:1150, parts:['tome','focus','focus'],          stats:{ ap:41, ah:11 }, takedownCd:0.50, desc:'Rakip şampiyonu öldürmek ya da asist yapmak sağ tık ve E\'nin kalan bekleme süresini %50 azaltır (Boşluk hariç)' },
  // Savaşçı büyücü
  agetome:  { cat:'Savaşçı büyücü', name:'Çağ Kitabı', cost:1175, parts:['tome','tome','ruby'],            stats:{ ap:38, hp:113 }, scale:{ ap:4, hp:18, max:10 }, desc:'Satın aldıktan sonra her dakika +4 YG ve +18 can kazanırsın (10 kata kadar)' },
  // Tank
  shockplate:{cat:'Tank', name:'Şok Zırhı',             cost:1150, parts:['herb','cloth','mantle'],         stats:{ hp:150, armor:15, mr:15, regen:12 }, quake:{ base:30, hpPct:0.03, radius:250, cd:6 }, desc:'Düz vuruş yapmak etrafındaki düşmanlara 30 + azami canının %3\'ü kadar büyü hasarı vurur. 6 sn bekleme' },
  godshield:{ cat:'Tank', name:'Tanrı Kalkanı',         cost:1175, parts:['cloth','mantle','ruby'],         stats:{ hp:75, armor:26, mr:26 }, ccShield:{ pct:0.15, dur:3 }, desc:'Kitle kontrolü (sersemleme, kök, susturma, yavaşlatma) yiyince 3 sn boyunca aldığın hasar %15 azalır' },
  chimebell:{ cat:'Tank', name:'Muska Çanı',            cost:1100, parts:['ruby','ruby','cloth'],           stats:{ hp:225, armor:20 }, lowRegen:{ hp:0.25, pct:0.05, dur:3, cd:60 }, desc:'Canın %25 altına inince 3 sn boyunca saniyede azami canının %5\'ini yenilersin. 60 sn bekleme' },
  loadcarry:{ cat:'Tank', name:'Yük Taşıyıcı',          cost:1175, parts:['ruby','ruby','focus'],           stats:{ hp:300, ah:11 }, carry:{ gold:1500, red:0.10 }, lvlStats:1, desc:'Seviyen kadar zırh, büyü direnci, yetenek hızı ve hareket hızı kazanırsın. Taşıdığın altın arttıkça (en fazla 1500) aldığın hasar %10\'a kadar azalır; alışveriş yapınca sıfırlanır' },
  // Destek
  wavesong: { cat:'Destek', name:'Dalga Şarkısı',       cost:1100, parts:['ruby','ruby','mantle'],          stats:{ hp:200, mr:26 }, minionAs:0.10, desc:'600 menzildeki dost minyonların saldırı hızı %10 artar' }
};
/* Katmanlı dövüş (10.10.2026): canı olmayan her büyük eşyaya (nişancı ve büyücü dahil) küçük düz can. Fiyat değişmedi. */
export const ITEM_BASE_HP = 100;
for (const it of Object.values(ITEMS)) if (!it.stats.hp) it.stats.hp = ITEM_BASE_HP;


/* Mağazada ortada gösterilen önerilen 8 eşya (kahraman başına) */
export const RECOMMENDED = {
  archer:  ['kraken','botrk','windbow','bt','ldr','pd','fury','luck'],
  warrior: ['cleaver','spear','randuin','titanic','visage','stonebelt','ironheart','godshield'],
  mage:    ['blackflame','echo','dcap','void','finalrod','frostrod','collapse','hourglass'],
  twin:    ['kraken','botrk','pd','ie','ldr','bt','runbow','fury'],
  bounce:  ['ie','pd','botrk','ldr','bt','bloodbow','nightfang','luck'],
  hook:    ['sunfire','warmog','randuin','visage','spellwall','ironwall','lastshield','godshield'],
  roller:  ['sunfire','warmog','randuin','visage','titanic','stonebelt','godshield','fortress'],
  flame:   ['lich','spring','abyss','bloodtome','bloodcup','emberward','silverguard','agetome'],
  blood:   ['spring','blackflame','dcap','void','bloodcup','lifestone','abyss','agetome'],
  artillery:['blackflame','echo','dcap','void','glassbreak','frostrod','time','hourglass'],
  shadow:  ['echo','blackflame','dcap','finalrod','glassbreak','void','timeglass','breeze'],
  spirit:  ['echo','amulet','breeze','healbell','dcap','timeglass','void','wingward'],
  dual:    ['sheen','cleaver','typhoon','predator','mace','nightfang','ie','skillblade']
};

/* ---- Uyarlamalı savunma yuvası ----
   Build listesinde 'DEF' (DEF sabiti) esnek savunma yuvasıdır: alım anında rakibin hasar profiline göre zırh ya da
   büyü direnci eşyasına çözülür (sim.js defPick). Fiziksel oran > %60: zırh eşyası, < %40: BD eşyası, arada: karışık
   (ikisini de veren), karışık kalmadıysa elde az olan direnç. */
export const DEF = 'DEF';
/* Kahramanın savunma havuzu: 'tank' (can ağırlıklı, dövüşçü/tank) ya da 'caster' (menzilli/büyücü) */
export const DEF_CLASS = { hook:'tank', roller:'tank', warrior:'tank', dual:'tank', flame:'tank' };   // diğerleri 'caster'
export const DEF_POOLS = {
  tank:   { armor:['randuin','thorn','ironwall','woundmail','stonebelt','steelboot','sunfire'],
            mr:   ['visage','spellwall','windcloak'],
            mix:  ['triumph','lastshield','silverguard','fortress'] },
  caster: { armor:['hourglass','emberward','stonebelt','woundmail'],
            mr:   ['windcloak','visage','spellwall'],
            mix:  ['silverguard','lastshield','triumph'] }
};
/* Kahramanın verdiği hasarın tahmini fiziksel oranı (düz vuruş fiziksel; yetenekler türüne göre). Maçın başında,
   henüz hasar verisi yokken kullanılır; veri biriktikçe ölçülen oran öne geçer (sim.js foePhysShare). */
export const DMG_PHYS = { archer:0.85, twin:0.95, warrior:1.0, mage:0.15, bounce:0.95, hook:0.70, flame:0.35, blood:0.10,
  artillery:0.40, shadow:0.40, spirit:0.20, dual:0.65, roller:1.0 };

/* Botların eşya sıralamaları. default = seçilen ideal sıralama (tools/builds.js ile denenir). 'DEF' = esnek savunma yuvası.
   Not: yuva 5, yani her listenin ilk 5 büyük eşyası alınır; 6. giriş yedektir. */
export const BUILDS = {
  archer: {
    default:['kraken','botrk','windbow','bt',DEF,'pd'],   // testte en iyi (eski adı: hiz); 5. yuva esnek savunma
    kraken: ['kraken','ie','pd','ldr','bt','rfc'],
    krit:   ['ie','pd','rfc','ldr','bt','kraken'],
    yikik:  ['botrk','kraken','ie','pd','ldr','bt']
  },
  warrior: {
    default:['cleaver',DEF,'spear',DEF,DEF,'titanic'],   // dayanıklı: yuvaların çoğu esnek savunma
    hasar:  ['cleaver','spear','mace','titanic','sheen','bt'],
    tank:   ['cleaver',DEF,DEF,DEF,DEF,'fortress'],
    tilsim: ['sheen','cleaver','spear','randuin','visage','titanic']
  },
  twin: {
    default:['kraken','botrk','pd','ie',DEF,'ldr'],   // her ok vuruş etkisi taşıdığı için okçuya benzer nişancı eşyaları (denenmedi)
    krit:   ['ie','pd','rfc','ldr','bt','kraken'],
    yikik:  ['botrk','kraken','ie','pd','ldr','bt']
  },
  bounce: {
    default:['ie','pd','botrk','ldr',DEF,'bt'],   // vuruş etkileri yalnız ilk hedefte işlediği için kritik, saldırı hızı ve SG ağırlıklı nişancı eşyaları (denenmedi)
    krit:   ['ie','pd','rfc','ldr','bt','botrk'],
    yikik:  ['botrk','ie','pd','ldr','bt','kraken']
  },
  hook: {
    default:['sunfire',DEF,'warmog',DEF,DEF,DEF],   // can ağırlıklı çekirdek + esnek direnç yuvaları
    tank:   [DEF,'warmog',DEF,DEF,DEF,DEF],
    buyu:   ['abyss','sunfire','visage','warmog','randuin','fortress']
  },
  roller: {
    default:['sunfire',DEF,'warmog',DEF,DEF,'titanic'],   // Gülle: Zincirli gibi can çekirdeği + esnek direnç yuvaları (3 esnek)
    tank:   [DEF,'warmog',DEF,DEF,DEF,'sunfire']
  },
  flame: {
    default:['lich','spring',DEF,'bloodtome',DEF,'dcap'],   // yetenek sonrası vuruşlar, can ve YG ağırlıklı yakın dövüş büyücüsü (denenmedi)
    buyu:   ['lich','blackflame','dcap','void','abyss','hourglass'],
    savas:  ['spring','abyss','bloodtome','lich','hourglass','void']
  },
  blood: {
    default:['spring','blackflame','dcap','void',DEF,'hourglass'],   // can, YG ve direnç ağırlıklı büyücü (can harcayan E, can çalan yetenekler; denenmedi)
    buyu:   ['blackflame','echo','dcap','void','magpen','time'],
    savas:  ['spring','abyss','bloodtome','dcap','void','hourglass']
  },
  artillery: {
    default:['blackflame','echo','dcap','void',DEF,'magpen'],   // uzak menzilli büyücü eşyaları, Büyücü ile aynı (denenmedi)
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','fang2','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme
    hiz:    ['time','echo','dcap','void','blackflame','hourglass']
  },
  shadow: {
    default:['spring','witchblade','fang2','dcap',DEF,'hourglass'],   // denge: kuşatma için düz vuruş etkili AP eşyaları, 6%->15% (testte) (eski: ['echo','blackflame','dcap','void',DEF,'magpen'])
    eski:   ['echo','blackflame','dcap','void',DEF,'magpen'],
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','fang2','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme
    hiz:    ['time','echo','blackflame','dcap','void','hourglass']
  },
  spirit: {
    default:['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı, 42%->54% (testte)
    eski:   ['echo','blackflame','dcap','void',DEF,'time'],
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','fang2','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme
    hiz:    ['time','echo','dcap','blackflame','void','hourglass']
  },
  dual: {
    default:['sheen','cleaver',DEF,'mace',DEF,'spear'],   // iki biçimde de ek SG ile büyüyen yetenekler (Enerji Küresi %110, Sıçrayış %100), vuruş/yetenek sonrası Tılsımlı Kılıç, can ve yetenek hızı (denenmedi)
    nisanci:['ie','pd','ldr','bt','botrk','kraken'],
    dovuscu:['cleaver','spear','mace','sheen','randuin','bt']
  },
  mage: {
    default:['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı, 27%->36% (testte) (eski: ['blackflame','echo','dcap','void',DEF,'magpen'])
    eski:   ['blackflame','echo','dcap','void',DEF,'magpen'],
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','fang2','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme
    yanki:  ['echo','dcap','void','blackflame','time','hourglass'],
    hiz:    ['time','echo','dcap','void','blackflame','hourglass'],
    savas:  ['spring','abyss','bloodtome','dcap','visage','hourglass']
  }
};

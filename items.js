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

/* Rünler (17.10.2026): yuva kaplamayan, istiflenen küçük stat alımları. Her zaman alınabilir ama verimsiz
   (500 altına parça fiyatıyla ~170-200 altınlık stat); asıl kullanım: 5 yuva dolunca kalan altın. Satılmaz. */
export const RUNES = {
  rad:{ name:'Güç Rünü',  cost:500, max:10, stats:{ dmg:5 } },
  rap:{ name:'Büyü Rünü', cost:500, max:10, stats:{ ap:10 } },
  rhp:{ name:'Can Rünü',  cost:500, max:10, stats:{ hp:50 } }
};

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
  titanic:  { cat:'Dövüşçü', name:'Dev Avcısı',        cost:1150,  parts:['longsword','ruby','ruby'],       stats:{ dmg:19, hp:225 }, onHitOwnHp:0.03, desc:'Düz vuruşlar ek olarak kendi azami canının %3\'ü kadar fiziksel hasar verir' },
  vengeance:{ cat:'Dövüşçü', name:'Öç Zırhı',          cost:1100,  parts:['longsword','ruby','cloth'],      stats:{ dmg:19, hp:263 }, store:{ pct:0.20, cap:120, decay:8 }, desc:'Alınan hasarın %20\'si birikir (en fazla 120, 8 sn\'de kullanılmazsa söner). Hasar veren sonraki yetenek bunu ek fiziksel hasar olarak verir' },
  sheen:    { cat:'Dövüşçü', name:'Tılsımlı Kılıç',    cost:1225,  parts:['longsword','ruby','focus'],      stats:{ dmg:19, hp:150, ah:11, asPct:0.11 }, spellblade:{ base:50, bonusAd:0.5, window:2, cd:1, type:'phys' }, desc:'Yetenek kullandıktan sonraki 2 sn içinde yapılan ilk saldırı ek 50 + ilave SG\'nin %50\'si kadar fiziksel hasar verir. 1 sn bekleme' },
  mace:     { cat:'Dövüşçü', name:'Kanlı Gürz',        cost:1225,  parts:['longsword','ruby','focus'],      stats:{ dmg:23, hp:188, ah:11 }, armorPen:0.30, desc:'Düz vuruşlar ve yetenekler rakibin zırhının %30\'unu yok sayar' },
  // Büyücü
  /* YG eşyaları (16.10.2026, docs/esya_ap_plan.md; eski hali old/esya_ap_yedek/items.js). Kural: eşya pasif hasarı kahramanın
     yetenek hasarına yaklaşmaz (metayı kahramanlar belirler). Büyü Nüfuzu ve Ateş Dişi kalktı (Akkor Asası, Cam Kırıcı). */
  dcap:     { cat:'Büyücü', name:'Büyücü Şapkası',    cost:1300, parts:['tome','tome','tome'],            stats:{ ap:70, hp:150 }, apAmp:{ base:0.15, per:0.05, max:0.35 }, desc:'Toplam YG %15 artar, elindeki her başka YG eşyası için +%5 (en fazla %35)' },   // 83 YG, YG x1,3 idi
  void:     { cat:'Büyücü', name:'Boşluk Asası',      cost:1200,  parts:['tome','tome','mantle'],          stats:{ ap:65 }, magicPenPct:0.35, desc:'%35 büyü delme (rakibin büyü direncinin %35\'ini yok sayar)' },   // 53 YG, 1175 idi
  blackflame:{cat:'Büyücü', name:'Kara Alev',         cost:1225,  parts:['tome','tome','ruby'],            stats:{ ap:40, hp:225 }, skillBurn:{ pct:0.03, dur:3, wound:0.25 }, desc:'Yetenek isabeti rakip şampiyonu 3 sn boyunca azami canının %3\'ü kadar yakar, yanarken iyileşmesi %25 azalır' },   // 60 YG 150 can, %4, 1175 idi
  emberrod: { cat:'Büyücü', name:'Akkor Asası',       cost:1200,  parts:['tome','tome','focus'],           stats:{ ap:60, ah:8 }, ember:{ base:20, ap:0.15, dur:4, jump:300 }, desc:'Yetenek isabeti hedefi 4 sn boyunca 20 + YG\'nin %15\'i kadar yakar; yanan ölürse yanma yakındaki rakibe sıçrar' },
  time:     { cat:'Büyücü', name:'Zaman Asası',       cost:1150,  parts:['tome','focus','focus'],          stats:{ ap:26, ah:25 }, rhythm:{ win:4, cut:0.15, recall:2 }, desc:'Sağ tık ve E\'yi art arda kullanınca ikincinin beklemesi %15 kısalır; üsse dönerken beklemeler 2 kat hızlı akar' },   // 56 YG 19 YH %4 hız, pasifsiz idi
  hourglass:{ cat:'Büyücü', name:'Kum Saati',         cost:1275,  parts:['tome','cloth','cloth'],          stats:{ ap:45, armor:30 }, stasis:{ dur:1.5, hp:0.05, cd:150 }, desc:'Ölümcül hasarda ölmezsin: 1,5 sn kum heykeli olursun, sonra azami canının %5\'iyle kalkarsın. 150 sn bekleme' },   // aktif 2 sn stasis 90 sn, 1175 idi
  echo:     { cat:'Büyücü', name:'Yankı Asası',       cost:1175,  parts:['tome','tome','focus'],           stats:{ ap:49, ah:11 }, echo:{ base:40, ap:0.20, cd:10, bounce:0.5, range:300 }, desc:'10 sn\'de bir yetenek isabeti rakip şampiyona ek 40 + YG\'nin %20\'si kadar büyü hasarı verir ve yarısı yakındaki rakibe seker' },   // 60 + %20, ilk isabet (minyon dahil) idi
  lich:     { cat:'Büyücü', name:'Büyü Kılıcı',       cost:1225,  parts:['tome','tome','focus'],           stats:{ ap:53, ah:8, msPct:0.05 }, spellbladeM:{ base:30, apRatio:0.4, window:10, cd:1.5, dual:{ mult:1.3, push:80, pushT:0.2, stun:0.5 } }, desc:'Yetenek sonrası ilk düz vuruş ek büyü hasarı verir; iki farklı yetenekten sonra güçlenir ve iter' },   // 60 YG %6 hız, 50 + %75 YG idi
  horizon:  { cat:'Büyücü', name:'Ufuk Merceği',      cost:1100,  parts:['tome','focus','boots'],          stats:{ ap:38, ah:10, msPct:0.04 }, horizon:{ range:600, pct:0.10, reveal:2 }, desc:'600 birimden uzaktaki rakip şampiyona yetenek hasarın %10 fazla' },
  embermask:{ cat:'Büyücü', name:'Kor Maskesi',       cost:1200,  parts:['tome','tome','ruby'],            stats:{ ap:50, hp:150 }, kor:{ range:500, max:5, per:0.02, ally:0.04, fade:3 }, desc:'Yakındaki rakip şampiyonla Kor biriktirirsin; Kor başına büyü hasarın %2 artar' },
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
  pierce:   { cat:'Nişancı', name:'Delici Ok',       cost:1175, parts:['longsword','ruby','focus'],      stats:{ dmg:22, hp:150, ah:10 }, armorPen:0.25 },   // 17.10.2026: SG 19, SH %17, delme 14, düz vuruş %12 zırh yarma, 1200 idi
  // Dövüşçü
  typhoon:  { cat:'Dövüşçü', name:'Kasırga Baltası', cost:1225, parts:['longsword','ruby','focus'],      stats:{ dmg:19, hp:170, ah:11 }, castAs:{ amt:0.25, dur:3 }, desc:'Yetenek kullanınca 3 sn boyunca saldırı hızın %25 artar' },
  bullstr:  { cat:'Dövüşçü', name:'Boğa Gücü',       cost:1175, parts:['longsword','ruby','ruby'],       stats:{ dmg:10, hp:250 }, hpToAd:0.015, desc:'Azami canının %1,5\'i kadar SG kazanırsın' },
  bloodclaw:{ cat:'Dövüşçü', name:'Kanlı Pençe',     cost:1175, parts:['longsword','fang','ruby'],       stats:{ dmg:19, hp:188, ls:0.05 }, spellVamp:0.15, desc:'Yetenek hasarının %15\'i kadar can yenilenir' },
  predator: { cat:'Dövüşçü', name:'Yırtıcı Pençe',   cost:1200, parts:['longsword','ruby','boots'],      stats:{ dmg:19, hp:188, msPct:0.05 }, skillMaxHp:{ pct:0.05, cd:5 } },   // 17.10.2026: düz vuruş %5/8 sn idi
  ironheart:{ cat:'Dövüşçü', name:'Demir Yürek',     cost:1175, parts:['longsword','cloth','mantle'],    stats:{ dmg:13, hp:150, armor:13, mr:13 }, onHitOwnHp:0.02, desc:'Düz vuruşlar ek olarak kendi azami canının %2\'si kadar fiziksel hasar verir' },
  // Suikastçı / vur-kaç
  duskknife:{ cat:'Suikastçı', name:'Gölge Hançeri', cost:1200, parts:['longsword','knife','boots'],     stats:{ dmg:24, lethal:12, msPct:0.06 }, killInvis:{ dur:1 } },   // 17.10.2026: İnfaz (%30 altına %8) idi
  quietblade:{cat:'Suikastçı', name:'Sessiz Bıçak',  cost:1150, parts:['longsword','knife','dagger'],    stats:{ dmg:19, asPct:0.14, lethal:10 }, hurtMs:{ amt:0.12, dur:2 }, desc:'Hasar alınca 2 sn %12 hareket hızı kazanırsın' },
  reaper:   { cat:'Suikastçı', name:'Hasat Kılıcı',  cost:1300, parts:['longsword','longsword','knife'], stats:{ dmg:32, lethal:15 }, execDmg:{ hp:0.35, pct:0.10 }, desc:'Canı %35 altındaki rakip şampiyona %10 ek hasar verirsin' },
  windwalk: { cat:'Suikastçı', name:'Rüzgar Yürüyüşü', cost:1150, parts:['boots','knife','longsword'],   stats:{ dmg:19, lethal:11, msPct:0.10 }, castMs:{ amt:0.15, dur:1.5 }, desc:'Yetenek kullanınca 1,5 sn %15 hareket hızı kazanırsın' },
  nightmask:{ cat:'Suikastçı', name:'Gece Maskesi',  cost:1175, parts:['cloak','knife','boots'],         stats:{ dmg:12, crit:0.12, lethal:10, msPct:0.06 }, skillSlow:{ amt:0.15, dur:1 }, desc:'Yetenek isabeti rakibi 1 sn %15 yavaşlatır' },
  // Büyücü
  frostrod: { cat:'Büyücü', name:'Buz Asası',        cost:1200, parts:['tome','ruby','ruby'],            stats:{ ap:34, hp:250 }, frost:{ amt:0.20, step:0.05, max:0.30, dur:1, win:2 }, desc:'Yetenek isabeti rakibi 1 sn %20 yavaşlatır, art arda isabetlerde %30\'a kadar artar' },   // 53 YG 11 YH, Kitap+Kitap+Odak, skillSlow %15 idi
  glassbreak:{cat:'Büyücü', name:'Cam Kırıcı',       cost:1150, parts:['tome','mantle','focus'],         stats:{ ap:40, ah:10 }, mrBreak:{ pen:0.25, pct:0.25, dur:2 }, desc:'%25 büyü delme; büyü hasarın rakip şampiyonun büyü direncini 2 sn %25 düşürür (takımın da yararlanır)' },   // 49 YG %6 hız 12 sabit delme (Kitap+Kitap+Çizme) idi
  witchblade:{cat:'Büyücü', name:'Cadı Bıçağı',      cost:1200, parts:['tome','dagger','tome'],          stats:{ ap:43, asPct:0.17 }, witch:{ base:0.18, step:0.04, max:0.30 }, desc:'Düz vuruşlar YG\'nin %18\'i kadar büyü hasarı verir, aynı hedefe art arda %30\'a kadar artar' },   // onHitAp %25 idi
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
  luck:     { cat:'Nişancı', name:'Talih Kılıcı',     cost:1100, parts:['longsword','longsword','cloak'], stats:{ dmg:30 }, critStack:{ step:0.05, max:0.40 } },   // 17.10.2026: SG 24, kritik %12, en fazla %35, 1175 idi
  coil:     { cat:'Nişancı', name:'Yük Bobini',       cost:1200, parts:['longsword','dagger','cloak'],    stats:{ dmg:14, asPct:0.12, crit:0.10 }, coil:{ perDist:15, perHit:10, max:100, base:55, ad:0.20 }, desc:'Hareket etmek ve düz vurmak yük biriktirir. Yük 100\'e ulaşınca sonraki düz vuruş 55 + SG\'nin %20\'si kadar ek büyü hasarı verir' },
  crystal:  { cat:'Nişancı', name:'Kristal Hançer',   cost:1150, parts:['longsword','longsword','cloak'], stats:{ dmg:20, crit:0.15 }, critSlow:{ amt:0.10, dur:1 }, desc:'Kritik vuruşlar hedefi 1 sn %10 yavaşlatır' },
  thornboot:{ cat:'Nişancı', name:'Dikenli Çizme',    cost:1100, parts:['boots','dagger','dagger'],       stats:{ asPct:0.23, msPct:0.05 }, hitAsStack:{ amt:0.06, max:3, dur:3 } },   // 17.10.2026: hız %10, vuruşta %3 hareket hızı x3 (2 sn) idi
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
  timeglass:{ cat:'Büyücü', name:'Ganimet Mührü',        cost:1150, parts:['tome','focus','focus'],          stats:{ ap:41, ah:11 }, takedownCd:0.50, desc:'Rakip şampiyonu öldürmek ya da asist yapmak sağ tık ve E\'nin kalan bekleme süresini %50 azaltır (Boşluk hariç)' },   // adı Zaman Kumu idi (Zaman Asası ile karışıyordu)
  // Savaşçı büyücü
  agetome:  { cat:'Savaşçı büyücü', name:'Çağ Kitabı', cost:1175, parts:['tome','tome','ruby'],            stats:{ ap:38, hp:113 }, scale:{ ap:4, hp:18, max:10 }, desc:'Satın aldıktan sonra her dakika +4 YG ve +18 can kazanırsın (10 kata kadar); öldürme, asist, güçlendirme kampı ve Titan sıradaki katı hemen verir' },
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
  warrior: ['cleaver','predator','randuin','titanic','visage','stonebelt','ironheart','godshield'],
  mage:    ['emberrod','blackflame','dcap','void','echo','frostrod','hourglass','horizon'],
  twin:    ['kraken','botrk','pd','ie','ldr','bt','runbow','fury'],
  bounce:  ['ie','pd','botrk','ldr','bt','bloodbow','nightfang','luck'],
  hook:    ['sunfire','warmog','randuin','visage','spellwall','ironwall','lastshield','godshield'],
  gladiator:['cleaver','botrk','predator','titanic','randuin','visage','typhoon','godshield'],
  roller:  ['sunfire','warmog','randuin','visage','titanic','stonebelt','godshield','fortress'],
  flame:   ['lich','spring','embermask','blackflame','bloodtome','bloodcup','emberward','agetome'],
  blood:   ['spring','blackflame','dcap','void','bloodcup','embermask','abyss','agetome'],
  artillery:['emberrod','echo','dcap','horizon','void','glassbreak','time','hourglass'],
  shadow:  ['echo','lich','witchblade','dcap','blackflame','void','timeglass','hourglass'],
  spirit:  ['echo','amulet','breeze','healbell','dcap','time','glassbreak','wingward'],
  dual:    ['sheen','cleaver','typhoon','predator','mace','nightfang','ie','skillblade']
};

/* ---- Uyarlamalı savunma yuvası ----
   Build listesinde 'DEF' (DEF sabiti) esnek savunma yuvasıdır: alım anında rakibin hasar profiline göre zırh ya da
   büyü direnci eşyasına çözülür (sim.js defPick). Fiziksel oran > %60: zırh eşyası, < %40: BD eşyası, arada: karışık
   (ikisini de veren), karışık kalmadıysa elde az olan direnç. */
export const DEF = 'DEF';
/* Esnek yakma yuvası (16.10.2026): alım anında Kara Alev ya da Akkor Asası'na çözülür (sim.js burnPick). Rakiplerin ortalama
   azami canından Kara Alev'in yakması (pct x can), kendi YG'nden Akkor'un yakması (base + ap x YG) hesaplanır, büyüğü alınır:
   canlı rakip ve az YG -> Kara Alev, çok YG ve az canlı rakip -> Akkor. */
export const BURN = 'BURN';
/* Kahramanın savunma havuzu: 'tank' (can ağırlıklı, dövüşçü/tank) ya da 'caster' (menzilli/büyücü) */
export const DEF_CLASS = { hook:'tank', roller:'tank', gladiator:'tank', warrior:'tank', dual:'tank', flame:'tank' };   // diğerleri 'caster'
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
  artillery:0.40, shadow:0.40, spirit:0.20, dual:0.65, roller:1.0, gladiator:0.70 };

/* Botların eşya sıralamaları. default = seçilen ideal sıralama (tools/builds.js ile denenir). 'DEF' = esnek savunma yuvası.
   Not: yuva 5, yani her listenin ilk 5 büyük eşyası alınır; 6. giriş yedektir. */
export const BUILDS = {
  archer: {
    default:['kraken','botrk','windbow','bt',DEF,'pd'],   // testte en iyi (eski adı: hiz); 5. yuva esnek savunma
    kraken: ['kraken','ie','pd','ldr','bt','rfc'],
    krit:   ['ie','pd','rfc','ldr','bt','kraken'],
    yikik:  ['botrk','kraken','ie','pd','ldr','bt'],
    nodef:  ['kraken','botrk','windbow','bt','pd','ie'],   // deneme: DEF yok
    yikik2: ['botrk','kraken','windbow','ie','pd','bt']    // deneme: Kanlı Kılıç önce, DEF yok
  },
  warrior: {
    default:['cleaver','predator','mace','titanic','sheen','bt'],   // 23.10.2026 (eşya A/B C2/C6, 2v2 Uzman, 160 maç x 4 tohum): hasar eski varsayılana karşı %76/%77/%75/%58 -> varsayılan
    eskiDef:['cleaver',DEF,'predator',DEF,DEF,'titanic'],   // dayanıklı: yuvaların çoğu esnek savunma
    hasar:  ['cleaver','predator','mace','titanic','sheen','bt'],
    tank:   ['cleaver',DEF,DEF,DEF,DEF,'fortress'],
    tilsim: ['sheen','cleaver','predator','randuin','visage','titanic']
  },
  twin: {
    default:['botrk','kraken','ie','pd','ldr','bt'],   // 23.10.2026 (eşya A/B B5/B7, 2v2 Uzman, 160 maç x 3 tohum): yikik eski varsayılana karşı %59/%59/%63 -> varsayılan
    eskiDef:['kraken','botrk','pd','ie',DEF,'ldr'],   // her ok vuruş etkisi taşıdığı için okçuya benzer nişancı eşyaları
    krit:   ['ie','pd','rfc','ldr','bt','kraken'],
    yikik:  ['botrk','kraken','ie','pd','ldr','bt']
  },
  bounce: {
    default:['botrk','ie','pd','ldr','bt','kraken'],   // 23.10.2026 (eşya A/B C1/C5, 2v2 Uzman, 160 maç x 3 tohum): yikik eski varsayılana karşı %61/%64/%63 -> varsayılan
    eskiDef:['ie','pd','botrk','ldr',DEF,'bt'],   // vuruş etkileri yalnız ilk hedefte işlediği için kritik, saldırı hızı ve SG ağırlıklı nişancı eşyaları (denenmedi)
    krit:   ['ie','pd','rfc','ldr','bt','botrk'],
    yikik:  ['botrk','ie','pd','ldr','bt','kraken']
  },
  hook: {
    default:['sunfire','cleaver','titanic','warmog','predator','bt'],   // 23.10.2026 (eşya A/B C8, 2v2 Uzman, 160 maç x 3 tohum): hasar (DEF yok) eski varsayılana karşı %64/%69/%68 -> varsayılan
    eskiDef:['sunfire',DEF,'warmog',DEF,DEF,DEF],   // can ağırlıklı çekirdek + esnek direnç yuvaları
    tank:   [DEF,'warmog',DEF,DEF,DEF,DEF],
    buyu:   ['abyss','sunfire','visage','warmog','randuin','fortress'],
    az:     ['sunfire',DEF,'warmog','titanic','cleaver','predator'],   // 23.10.2026 deneme: tek DEF + hasar
    hasar:  ['sunfire','cleaver','titanic','warmog','predator','bt']   // 23.10.2026 deneme: DEF yok
  },
  gladiator: {
    default:['cleaver','predator','botrk','titanic','sheen','bt'],   // 23.10.2026 (eşya A/B, 2v2 Uzman, 160 maç x 3 tohum): hasar (DEF yok) eski varsayılana karşı %64/%64/%61 -> varsayılan
    eskiDef:['cleaver',DEF,'botrk',DEF,DEF,'titanic'],   // Gladyatör: Savaşçı gibi dövüşçü çekirdeği; saldırı hızı Kızışma ile katlanır (3 esnek)
    tank:   ['cleaver',DEF,DEF,DEF,DEF,'predator'],
    hasar:  ['cleaver','predator','botrk','titanic','sheen','bt'],   // 23.10.2026 deneme: Savaşçı hasar sırası gibi (DEF yok)
    hasar2: ['cleaver','botrk',DEF,'predator','titanic','bt']   // 23.10.2026 deneme: tek DEF
  },
  roller: {
    default:['sunfire',DEF,'warmog','titanic','cleaver','predator'],   // 23.10.2026 (eşya A/B C8, 2v2 Uzman, 160 maç x 2 tohum): az (tek DEF) eski varsayılana karşı %60/%57 -> varsayılan
    eskiDef:['sunfire',DEF,'warmog',DEF,DEF,'titanic'],   // Gülle: Zincirli gibi can çekirdeği + esnek direnç yuvaları (3 esnek)
    tank:   [DEF,'warmog',DEF,DEF,DEF,'sunfire'],
    az:     ['sunfire',DEF,'warmog','titanic','cleaver','predator'],   // 23.10.2026 deneme: tek DEF + hasar
    hasar:  ['sunfire','cleaver','titanic','warmog','predator','bt']   // 23.10.2026 deneme: DEF yok
  },
  flame: {
    default:['lich',BURN,'dcap','void','abyss','hourglass'],   // 23.10.2026 (eşya A/B B2/B8, 2v2 Uzman, 160 maç x 3 tohum): buyu eski varsayılana karşı %67/%63/%59 -> varsayılan
    eskiDef:['lich','spring',DEF,'bloodtome',DEF,'dcap'],   // yetenek sonrası vuruşlar, can ve YG ağırlıklı yakın dövüş büyücüsü (denenmedi)
    buyu:   ['lich',BURN,'dcap','void','abyss','hourglass'],
    savas:  ['spring','abyss','bloodtome','lich','hourglass','void']
  },
  blood: {
    default:['spring','witchblade','lich','dcap',DEF,'hourglass'],   // 23.10.2026 (eşya A/B C4/C7, 2v2 Uzman, 160 maç x 3 tohum): sg1 eski varsayılana karşı %61/%58/%56 -> varsayılan
    eskiDef:['spring',BURN,'dcap','void',DEF,'hourglass'],   // 16.10.2026: Kara Alev -> esnek yakma. can, YG ve direnç ağırlıklı büyücü (can harcayan E, can çalan yetenekler; denenmedi)
    buyu:   [BURN,'echo','dcap','void','glassbreak','time'],
    savas:  ['spring','abyss','bloodtome','dcap','void','hourglass'],
    sg1:    ['spring','witchblade','lich','dcap',DEF,'hourglass'],   // 23.10.2026: Büyücü'de en iyi çıkan sıra (deneme)
    sg4:    ['witchblade','lich','dcap','void','spring','hourglass']   // deneme: Gölge sg4 (DEF yok)
  },
  artillery: {
    default:['emberrod','echo','dcap','void',DEF,'horizon'],   // 16.10.2026: Kara Alev -> Akkor Asası (uzaktan dürtme), Büyü Nüfuzu -> Ufuk Merceği (eski: ['blackflame','echo','dcap','void',DEF,'glassbreak'])
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','lich','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme (Ateş Dişi -> Büyü Kılıcı)
    hiz:    ['time','echo','dcap','void','blackflame','hourglass'],
    sg4:    ['witchblade','lich','dcap','void','spring','hourglass']   // deneme: Gölge sg4 (DEF yok)
  },
  shadow: {
    default:['witchblade','lich','dcap','void','spring','hourglass'],   // 23.10.2026: eşya A/B sg4 %56/%58/%56 (DEF yok, Cadı Bıçağı önce)
    eskiDef:['spring','witchblade','lich','dcap',DEF,'hourglass'],
    eski:   ['echo','blackflame','dcap','void',DEF,'glassbreak'],
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','lich','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme (Ateş Dişi -> Büyü Kılıcı)
    hiz:    ['time','echo','blackflame','dcap','void','hourglass'],
    sg4:    ['witchblade','lich','dcap','void','spring','hourglass'],   // deneme: DEF yok, Cadı Bıçağı önce
    sg5:    ['spring','witchblade','lich','dcap','horizon','hourglass']    // deneme: DEF yerine Ufuk Merceği
  },
  spirit: {
    default:['spring','witchblade','lich','dcap',DEF,'hourglass'],   // 23.10.2026 (eşya A/B B4, 2v2 Uzman, 160 maç): sg1 eski varsayılana karşı %84/%81 (tohum 1/4) -> varsayılan
    eskiDef:['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı, 42%->54% (testte)
    eski:   ['echo','blackflame','dcap','void',DEF,'time'],
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','lich','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme (Ateş Dişi -> Büyü Kılıcı)
    hiz:    ['time','echo','dcap','blackflame','void','hourglass']
  },
  dual: {
    default:['sheen','cleaver',DEF,'mace',DEF,'predator'],   // iki biçimde de ek SG ile büyüyen yetenekler (Enerji Küresi %110, Sıçrayış %100), vuruş/yetenek sonrası Tılsımlı Kılıç, can ve yetenek hızı (denenmedi)
    nisanci:['ie','pd','ldr','bt','botrk','kraken'],
    dovuscu:['cleaver','predator','mace','sheen','randuin','bt'],
    hasar:  ['sheen','cleaver','predator','mace','titanic','bt']    // deneme: DEF yok
  },
  mage: {
    default:['spring','witchblade','lich','dcap',DEF,'hourglass'],   // 23.10.2026 (eşya A/B B1/B6, 2v2 Uzman, 160 maç x 3 tohum): sg1 eski varsayılana karşı %68/%65/%64 -> varsayılan
    eskiDef:['spring',BURN,'dcap','void',DEF,'hourglass'],   // 16.10.2026: Kara Alev -> esnek yakma. denge: can ağırlıklı, 27%->36% (testte) (eski: ['blackflame','echo','dcap','void',DEF,'glassbreak'])
    eski:   ['blackflame','echo','dcap','void',DEF,'glassbreak'],
    hp1:    ['spring','blackflame','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    hp2:    ['bloodtome','spring','dcap','void',DEF,'hourglass'],   // denge: can ağırlıklı deneme
    sg1:    ['spring','witchblade','lich','dcap',DEF,'hourglass'],   // denge: düz vuruş (kuşatma) ağırlıklı deneme (Ateş Dişi -> Büyü Kılıcı)
    yanki:  ['echo','dcap','void','blackflame','time','hourglass'],
    hiz:    ['time','echo','dcap','void','blackflame','hourglass'],
    savas:  ['spring','abyss','bloodtome','dcap','visage','hourglass'],
    sg2:    ['spring','witchblade','lich','dcap','void','hourglass'],   // 23.10.2026 deneme: sg1, DEF yerine Boşluk Asası
    sg3:    ['witchblade','spring','lich','dcap',DEF,'hourglass'],   // 23.10.2026 deneme: sg1, Cadı Bıçağı önce
    sg4:    ['witchblade','lich','dcap','void','spring','hourglass']   // deneme: Gölge sg4 (DEF yok)
  }
};

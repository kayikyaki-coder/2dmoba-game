# Saldırı Gücü (SG), nişancı, kritik, zırh delme ve suikastçı eşyaları planı (taslak, 16.10.2026)

Yalnız tasarım taslağı: hiçbir kod ya da sayı değişmedi. Kaynaklar: items.js, itemdesc.js, sim.js (computeBonus, damage, onBasicHit, itemTick, releaseAttack, collideUnits), ai.js (lastHitInfo, dps), data.js (STATS, TOWER, JUNGLE), docs/esya_cakisma.md, docs/esya_ap_plan.md (ilkeler ve biçim aynı).

## İlkeler (YG planıyla ortak, SG'ye özel ekler)

1. **Aktif yok, her şey pasif tetik** (vuruş, isabet, ölüm, mesafe, sis, kütle).
2. **Beceri atışı kaçılabilir, düz vuruş kaçılamaz** (güdümlü, hedefli). Yavaşlamış rakip yan adımla kaçamaz: düz vuruşla yavaşlatmak yetenek isabetini garantiye yaklaştırır. Bu, düz vuruş eşyalarını yetenek eşyalarına bağlayan köprümüz.
3. **Fizik gerçek:** kütle (okçu 1, Savaşçı 2,2, Zincirli 3,0, Gülle Kabuk x3), çarpışma, minyon kahramana karşı 6x ağır (dalga gövde engeli), itme, duvara çarpma.
4. **Sis ve çalı:** görmemek, görünmemek, görünür kılmak eşya etkisi olabilir (canSee, visiblePos, S.sights, BUSH_REVEAL 1,5 sn).
5. **Harita ve takım:** 2v2, orman (düz vuruş canavara x1,2, yetenek x1,6), Titan, kule kale koruması (dalgasız kahraman hasarı x0,6), 8 sn üsse dönüş.
6. **Eşya pasif hasarı ölçülü:** metayı kahramanlar belirlesin. Hedef: tek bir eşya pasifinin 10. seviyede nişancının dövüş DPS'ine katkısı **%8-12**, yalnız koşullu/bekleme gerektirenlerde en fazla **%15**. Gücün çoğu statta ya da mekanikte (menzil, hız, görünmezlik), düz hasarda değil.
7. **Her eşya tek bir soruya cevap;** aynı soruyu yanıtlayan iki eşya olmaz.
8. **Pasif anahtarı eşsiz** (computeBonus `B[k]=v`): yeni rollerde ortak anahtar kullanılmaz.

## Oyuna özgü kısıtlar ve bulgular

- **Kritik:** büyük eşya başına en fazla %25; toplam şans %100'de kesilir (computeBonus). Kritik %150, Sonsuzluk %175 (critMult, eşsiz). Kritik vuruş başına bir kez belirlenir (İkiz'in 2-3 oku aynı sonucu taşır; Sekme sekmesi kritiği taşır).
- **Bulgu 1, yapıya kritik:** releaseAttack bugün hedef yapı olsa da kritik atar (kurallarda "kuleye kritik yok" denmiş ama kodda yok). Öneri: **genel kural "yapılara kritik yok"** (LoL gibi; sim.js releaseAttack'ta hedef `struct` ise `crit=false`, Talih birikimi de harcanmaz). Tek istisna Dolunay Kılıcı (C).
- **Bulgu 2, İkiz Ok vuruş etkileri her okta:** onBasicHit her okta çalışır (Yıkık Kral, Kraken sayacı, Hız Çarkı katı 2-3 kat). Yeni yığın/yük/evre pasifleri **"düz vuruş başına"** sayılmalı (yalnız `idx===0` ok sayar); hasar ekleyen vuruş etkileri her okta kalabilir (ok %40 hasar olduğu için).
- **Bulgu 3, eski nişancı eşyaları çok verimli:** stat değeri/bedel (parça fiyatlarından): Kan Emici 1,63, Sonsuzluk 1,59, Hayalet Dansçı 1,55, Yıkık Kral 1,49, Zırh Yaran 1,44; tur 1 yeni eşyalar ~1,27-1,42; tur 2 eşyaları 1,03-1,26 (Hız Çarkı 1,12, Talih 1,19, Yük Bobini 1,11, Dikenli Çizme 1,03). Botlar ve oyuncular hep eski eşyaları alır, tur 2 eşyaları tuzak. Bu planda nişancı ailesi **1,30-1,40** (pasifi güçlü olan 1,15-1,25, "statça üstün" Hayalet Dansçı ~1,50) hedeflenir. Eski çekirdek hafif kısılır (Kan Emici, Sonsuzluk); nişancılar Uzman taramasında zaten zayıf (T3: Okçu %44, Seken %48, İkiz %49), bu yüzden kısma küçük tutuldu (açık soru 1).
- **Bulgu 4, bot son vuruşu:** ai.js lastHitInfo `atkDmg*hitMult` ile minyon canını tahmin eder; Kuşatma Çekici'nin minyon çarpanını bilmiyor (bugün de). Minyon hasarını değiştiren eşya (Dalga Kıran) bu tahmine girmeli, yoksa bot son vuruşu erken bırakır.
- **Zırh delme sırası** (damage): sabit delme (lethal, toplanır) önce, sonra yüzdelik (eşsiz anahtarlardan EN BÜYÜĞÜ: `armorPen` bütün fiziksel, `basicArmorPen` düz vuruş, kule %40). Sabit delme seviyeyle ölçeklenmez (LoL'den farkı: erken oyunda güçlü, geçte zayıf; tanka karşı yüzdelik).

### Birim stat değerleri (parça fiyatından)

| Stat | Parça | Birim değer |
|---|---|---|
| SG | Uzun Kılıç 225 / 6 | 37,5 |
| Saldırı hızı %1 | Hançer 225 / 7 | 32,1 |
| Kritik %1 | Çevik Pelerin 250 / 6 | 41,7 |
| Can çalma %1 | Vampir Dişi 225 / 4 | 56,3 |
| Sabit zırh delme | Keskin Bıçak 225 / 7 | 32,1 |
| Yetenek hızı | Odak Taşı 225 / 6 | 37,5 |
| Hareket hızı %1 | Hafif Çizme 200 / 5 | 40 |
| Can | Yakut 200 / 60 | 3,33 |
| Büyü direnci | Büyü Pelerini 200 / 11 | 18,2 |
| Yenilenme | Şifa Otu 200 / 12 | 16,7 |

Taban can (+100, ITEM_BASE_HP) hesaplara katılmadı.

### 10. seviye ölçüsü (pasif hasar karşılaştırması için)

Seviye statı = base + per x 9/14 x 9. 10. dakikada servet ~4600: 2 büyük eşya + parça.

| Kahraman (10. sv) | SG | Saldırı hızı | Not |
|---|---|---|---|
| Okçu | 45 | 1,51 | Kalın Ok 2,5 x SG, Ok Yağmuru ok başına 1,05 x SG |
| İkiz Ok | 61 | 1,34 | vuruş başına 2 ok x %40 = 0,8 x SG |
| Sekme | 47 | 1,29 | sekme %40 |

Örnek Okçu, Sonsuzluk + Hız Çarkı (5 kat): SG 85, saldırı hızı 2,13, kritik %38 x1,75 → dövüş DPS ~**233** (zırhtan önce). Bu tablodaki "pasif payı" bu DPS'e göre.

## Mevcut SG / kritik / saldırı hızı / delme eşyaları ve öneri

| Eşya | Bedel | Statlar | Pasif | Değer/bedel | Öneri |
|---|---|---|---|---|---|
| Sonsuzluk Kılıcı (ie) | 1300 | 34 SG, %19 krit | kritik %175 | 1,59 | **Hafif değiş** (B) |
| Kan Emici (bt) | 1175 | 30 SG, %14 CÇ | yok | 1,63 | **Değiştir**: kritikli CÇ eşyası (F) |
| Hayalet Dansçı (pd) | 1175 | %26 SH, %19 krit, %5 hız | dost minyon içinden geçme | 1,55 | **Değiştir** (A1) |
| Yıkık Kral Kılıcı (botrk) | 1200 | 21 SG, %19 SH, %7 CÇ | anlık canın %5'i | 1,49 | **Koru**, pasife küçük ek (tank avcısı) |
| Kraken (kraken) | 1150 | 21 SG, %19 SH | her 3. vuruş 25 büyü | 1,22 | **Değiştir** (D yerine) |
| Uzun Nişan (rfc) | 1200 | %19 krit, %23 SH | +20 menzil, ölü koni verisi | 1,28 | **Değiştir** (A4) |
| Rüzgar Yayı (windbow) | 1175 | 21 SG, %23 SH | hazırlık yavaşlaması -%50 | 1,30 | **Değiştir** (pasife ek) |
| Zırh Yaran (ldr) | 1225 | 26 SG, %19 krit | düz vuruş %30 delme | 1,44 | **Değiştir** (G2) |
| Gece Avcısı (nightfang) | 1225 | 20 SG, %14 krit, 10 delme | vuruş SG %6 | 1,35 | **Değiştir** (G3) |
| Kanlı Yay (bloodbow) | 1175 | %20 SH, %15 krit, %7 CÇ | can azken CÇ x2 | 1,41 | **Kaldır**, Kan Emici'ye birleşir |
| Kaçak Yayı (runbow) | 1150 | 12 SG, %28 SH, %7 hız | vuruşta %10 hız 1 sn | 1,42 | **Değiştir** (kritiksiz vur-kaç) |
| Delici Ok (pierce) | 1200 | 19 SG, %17 SH, 14 delme | düz vuruş %12 delme | 1,42 | **Kaldır** (çakışma #6; sabit delme nişancıda Gece Avcısı'nda) |
| Kızıl Av (redhunt) | 1175 | 17 SG, %14 SH, %6 CÇ | azami can %6 | 1,21 | **Kaldır**, Yıkık Kral'a birleşir (çakışma #21) |
| Hız Çarkı (fury) | 1175 | 12 SG, %14 SH, %10 krit | vuruşta SH %4 x5 | 1,12 | **Değiştir** (A2) |
| Talih Kılıcı (luck) | 1175 | 24 SG, %12 krit | kritik birikimi | 1,19 | **Kaldır** ya da C seçenek a (açık soru 3) |
| Yük Bobini (coil) | 1200 | 14 SG, %12 SH, %10 krit | yük, 55 + %20 SG | 1,11 | **Kaldır**, mekanizması Uzun Nişan'a geçer |
| Kristal Hançer (crystal) | 1150 | 20 SG, %15 krit | kritikte %10 yavaş | 1,20 | **Değiştir** → Ayaz Hançeri (G1) |
| Dikenli Çizme (thornboot) | 1100 | %23 SH, %10 hız | vuruşta hız x3 | 1,03 | **Kaldır**, Hız Çarkı'na birleşir (çakışma #22) |
| Kan Bağı (bloodbond) | 1100 | 19 SG, %8 CÇ | CÇ'nin %20'si dosta | 1,06 | **Koru** (2v2 eşyası) |
| Kuşatma Çekici (siege) | 1175 | 26 SG, 150 can | minyon + yapı %20 | 1,26 | **Değiştir** (yalnız yapı, dalgasız kuşatma) |
| Hüner Bıçağı (skillblade) | 1175 | 24 SG, 11 YH | yetenek +%10 SG | 1,12 | **Değiştir** (yetenek SG dövüşçü) |
| Hasat Kılıcı (reaper) | 1300 | 32 SG, 15 delme | infaz <%35 +%10 | 1,29 | **Değiştir** (S1) |
| Gölge Hançeri (duskknife) | 1200 | 24 SG, 12 delme, %6 hız | infaz <%30 +%8 | 1,27 | **Değiştir** (S2) |
| Sessiz Bıçak (quietblade) | 1150 | 19 SG, %14 SH, 10 delme | hasar alınca hız | 1,29 | **Değiştir** (S3) |
| Rüzgar Yürüyüşü (windwalk) | 1150 | 19 SG, 11 delme, %10 hız | yetenekte hız | 1,27 | **Değiştir** (S4) |
| Gece Maskesi (nightmask) | 1175 | 12 SG, %12 krit, 10 delme, %6 hız | yetenekte %15 yavaş | 1,29 | **Değiştir** (S5) |
| Zırh Paralayıcı (sunderer) | 1200 | 21 SG, 14 delme | yetenekte zırh -%15 | 1,03 | **Değiştir** (S6) |
| Ölüm Haritası (deathmap) | 1100 | 34 SG | vuruşta -8 zırh | 1,16 | **Değiştir** (S7, 2v2) |
| Kanlı Gürz (mace) | 1225 | 23 SG, 188 can, 11 YH | %30 delme (hepsi) | 1,55 | **Hafif değiş**: delme %20 (Zırh Yaran'la çakışma #6) |

Net: **6 eşya kaldırılır** (Kanlı Yay, Delici Ok, Kızıl Av, Talih Kılıcı, Yük Bobini, Dikenli Çizme; Talih seçime bağlı), **4 yeni** eklenir (Dalga Kıran, Dolunay Kılıcı, Yakamoz Kılıcı, Kum Kurdu Dişi; sonuncusu isteğe bağlı). Büyük eşya sayısı 88 → 86. Gelecekte 40-50 kahraman için: aynı soruyu yanıtlayan eşyalar yerine arketip boşlukları dolduruldu (sondaki kapsama tablosu).

## Kritik birleşme kuralları (önerilen, net)

1. **Şans toplanır**, %100'de kesilir. Büyük eşya başına en fazla %25 (bu planda %15-20).
2. **Kritik vuruş başına bir kez** belirlenir (İkiz okları, Sekme sekmesi aynı sonucu taşır).
3. **Çarpan:** en büyük `critMult` (Sonsuzluk 1,75), yoksa 1,5. Kesin kritik (Dolunay) de aynı çarpanı kullanır.
4. **Yapılara kritik yok** (yeni genel kural). Tek istisna Dolunay'ın 5. evresi.
5. **Kesin kritik ile şans karışmaz:** Dolunay sayacı doğal kritiklerden bağımsız ilerler; doğal kritik sayacı sıfırlamaz, 5. evre zaten kritikse çifte kritik olmaz (evre yine harcanır).
6. **Kritik tetikli pasifler** (Ayaz yavaşlatması, Yakamoz bekleme kısaltması, Titan Kalkanı -%30) doğal ve kesin kritikte aynı işler, yapıda işlemez (Dolunay'ın yapı kritiği bunları tetiklemez).

## Eşyalar

### A1. Hayalet Dansçı (değişir; statça üstün, pasifi yalnız geçiş)
- **Tarif:** Hançer + Hançer + Çevik Pelerin (700) + 550 = **1250** (1175'ten).
- **Statlar:** %28 SH, %20 krit, %4 hız.
- **Maliyet:** 899 + 833 + 160 = 1892 / 1250 = **1,51** (bilerek üstün; pasifinde hasar yok).
- **Pasif (Serap Adımı):** **bütün minyonların** (dost ve rakip) içinden geçersin. Canavar, kahraman ve yapı katı kalır. Bugünkü `ghost` yalnız dost minyon.
- **İkinci pasif seçeneği (B, isteğe bağlı):** rakip minyonun içindeyken (gövdeyle örtüşürken) rakip kahramanların ilk birimde duran mermileri (Kanca, Ağır Küre, Zincir) **sana değil o minyona çarpar** (bugün de çarpabilir; seçenek B bunu "örtüşmede kesin" yapar). Dalga siperini hareket hâlinde kullanmak.
- **Seçim sorusu:** "Dalga içinde sıkışıp kaçamıyor ya da kovalayamıyor muyum?" Statça en verimli kritik eşyası, pasifi yalnız hareket.
- **Özgün dokunuş:** *Fizik.* Bizde minyon kahramana karşı 6x ağır: rakip dalga gerçek bir duvar. Seken, Okçu ve ileride yakın nişancılar dalganın içinden geçerek kanca/küre açısı değiştirir, kovalayan yakın dövüşçü (Gülle, Gladyatör) dalgaya takılırken sen geçersin. Gülle Momentumu dalgada sıfırlanır, seninki sıfırlanmaz.
- **Yerini aldığı:** kendisi.
- **sim.js:** collideUnits'te `a.team===b.team` şartını kaldırıp `ghost` için takım bağımsız (bir satır). Bot navigasyonu (nav.js slideDir) minyonları zaten engel saymıyorsa değişiklik yok. Seçenek B: updateProjectiles'ta kahraman minyonla örtüşüyorsa önce minyon (orta).

### A2. Hız Çarkı (değişir; savaşta kaldıkça güçlenen, vur-kaç)
- **Tarif:** Uzun Kılıç + Hançer + Çevik Pelerin (700) + 525 = **1225**.
- **Statlar:** 10 SG, %18 SH, %18 krit.
- **Maliyet:** 375 + 578 + 750 = 1703 / 1225 = **1,39**.
- **Pasif (Kum Çarkı):** rakip kahramana, canavara ya da minyona düz vuruş isabeti +1 kat (en fazla 5; **yapı kat vermez**; İkiz'de vuruş başına 1). Kat başına **%4 SH ve %2 hareket hızı** (5 katta %20 SH, %10 hız). 2 sn isabet yoksa her 0,5 sn bir kat söner (bir anda değil: kısa kaçış katları korur).
- **Özgün ek (Çark dönüşü):** 5 kat doluyken **hazırlık yavaşlaması** (atkSlow, %40) yarıya iner. Bizde yavaşken kaçılabilir atıştan kaçılamıyor; dolu çark vururken yan adım atabilmek demek.
- **Pasif payı (10. sv Okçu):** 5 katta SH +%20 → DPS'e ~%17 (233'ün ~39'u), ama 2,5 sn kesintisiz vuruş ister. Hasar değil hız: ölçülü.
- **Seçim sorusu:** "Uzun dövüşte vurup geri çekilerek mi oynuyorum?" Kısa patlamaya değil, uzun kite'a.
- **Özgün dokunuş:** *Kaçılabilir atış ve kütle.* Katlar hareket hızı da verdiği için dolu çarkla nişancı vuruş aralarında yan adımla rakip atışlarından kaçar; Gladyatör Kızışma'dan farkı hız katının hareketi de hızlandırması.
- **Yerini aldığı:** Hız Çarkı (asStack) + Dikenli Çizme (hitMsStack, kaldırılır) + Rüzgar Yayı'nın yarı pasifi (dolu katta).
- **sim.js:** mevcut `asStack` + `moveMult`'ta `ic.asStackN*ms`, söner kat için itemTick'te sayaç, `atkDefCalc` slow çarpanına `asStackN>=max`. Küçük.

### A3. Dalga Kıran (yeni; minyon ve canavara güç, dalga/kamp kurtarıcısı)
- **Tarif:** Hançer + Çevik Pelerin + Şifa Otu (675) + 550 = **1225** (koridorda kalma yenilenmesi).
- **Statlar:** 8 SG, %18 SH, %15 krit, 12 yenilenme.
- **Maliyet:** 300 + 578 + 625 + 200 = 1703 / 1225 = **1,39**.
- **Pasif (Gelgit):** düz vuruşların **minyonlara %15**, **canavarlara %10** fazla hasar verir. Dost dalga 700 içindeyken (kale koruması dalgası, waveNear) **yapılara %10** fazla.
- **İkinci pasif (Taşkın, özgün):** düz vuruşla minyon öldürünce taşan hasar (öldürücü vuruşun minyonda kalan canı aşan kısmı) 250 içindeki en yakın başka rakip minyona geçer (en fazla bir kez, vuruş etkisi yok). İtme yeteneği olmayan nişancının "alanı" budur: dalgada hiçbir vuruş boşa gitmez.
- **Örnek:** 10. dk yakın minyon ~470 can, Okçu SG 85: 6 vuruş → 5 vuruş; Taşkın son vuruşta ortalama ~40 hasar taşır. Kampta düz vuruş çarpanı 1,2 → 1,32 (yetenekçilerin 1,6'sına yaklaşır).
- **Seçim sorusu:** "Dalgayı ve kampları hızlı temizleyemiyor muyum?" Alanı olmayan nişancı, nişancı ormancı.
- **Özgün dokunuş:** *Orman çarpanı ve kale koruması.* Bizde düz vuruş canavara x1,2, yetenek x1,6: düz vuruşçu ormanda geride. Kule bonusu yalnız dalgayla çalışır: kale korumasıyla aynı dili konuşur ("dalgayla it").
- **Yerini aldığı:** yeni. Kuşatma Çekici'nin minyon kısmı buraya geçer (aşağıda).
- **sim.js:** damage içinde `opts.basic` + `e.kind` çarpanı (siege satırının yanına), Taşkın için `kill()` içinde `opts.basic && src.bonus.overflow` taşan hasar. ai.js lastHitInfo `myD`'ye minyon çarpanı (bulgu 4). Küçük.

### A3b. Kuşatma Çekici (değişir; çakışma çözümü)
- **Tarif:** aynı (Uzun Kılıç x2 + Yakut, 1175). **Statlar:** 26 SG, 150 can (aynı, 1,26).
- **Pasif (Koçbaşı):** yalnız **yapılara** %15 fazla hasar; **dalgasızken** kale koruması senin için x0,6 yerine **x0,85**. Minyon kısmı kalkar.
- **İkinci pasif seçeneği:** kuleye vururken kulenin seni hedefleme süresi değil, **kule mermisi sana %15 az** vurur (ama kule dikkatini rakip kahramana vurunca yine çekersin).
- **Seçim sorusu:** "Dalgasız, tek başıma kule mi yıkacağım (böl-it)?" Dalga Kıran ise "dalgayla it". İkisi çakışmaz.
- **sim.js:** siege satırı `e.kind==='struct'`, ward çarpanına `SB.siegeWard`. Küçük.

### A4. Uzun Nişan (değişir; yük biriktirip uzun vuruş)
- **Tarif:** Hançer + Çevik Pelerin + Hafif Çizme (675) + 550 = **1225**.
- **Statlar:** %18 SH, %18 krit, %5 hız.
- **Maliyet:** 578 + 750 + 200 = 1528 / 1225 = **1,25** (pasif mekanik olarak güçlü).
- **Pasif (Nişan Yükü):** yürümek (15 birim = 1) ve düz vuruş (+10) yük biriktirir. **100'de** sonraki düz vuruş: menzilli **+80 menzil** (yakın dövüşçü +40) ve ek **25 + SG'nin %10'u** fiziksel. Dolu yük ancak rakip kahramana ya da yapıya vurulunca harcanır (minyon ve canavar harcamaz). Sabit +20 menzil ve ölü `angleMult` verisi kalkar.
- **Özgün ek (Uzak Göz):** dolu yük varken düz vuruş menzilin (310+80=390) içinde **görünen** hedef seçilebilir; yükü harcayan vuruş hedefi 1,5 sn takımına görünür kılar (S.sights). Kaçan rakip sise girmeden son vuruş.
- **Pasif payı:** ~5 sn'de bir 33 hasar (10. sv Okçu) → DPS'e ~%3; gerçek değeri menzil (yakalama, kule menzili dışından dürtme değil: kule 520).
- **Seçim sorusu:** "Rakibe bir vuruş yetişemiyor muyum (kaçan, dürten)?"
- **Özgün dokunuş:** *Mesafe ve sis.* Uzun vuruş takip için; görünürlük 2v2'de dosta kovalamayı sürdürtür.
- **Yerini aldığı:** Uzun Nişan + Yük Bobini (coil mekanizması, kaldırılır; çakışma #22).
- **sim.js:** coil yük kodu (itemTick + onBasicHit) aynen; atkDefCalc'ta `range += ic.coil>=max ? B.rfc.range : 0` (önbellek tik başına, güvenli); inAttackRange/attackTarget otomatik. Bot (ai.js) menzili atkDef'ten okuduğu için kendiliğinden kullanır. Küçük.

### B. Sonsuzluk Kılıcı (kalır, hafif düzeltme)
- **Tarif:** Uzun Kılıç x2 + Çevik Pelerin (700) + 600 = **1300** (aynı).
- **Statlar:** **30 SG, %20 krit** (34 SG, %19'dan).
- **Maliyet:** 1125 + 833 = 1958 / 1300 = **1,51** (1,59'dan; kritik çarpanı pasif).
- **Pasif (Ay Işığı):** kritik %175 (aynı).
- **Özgün küçük ek (isteğe bağlı):** kritik vuruşun görsel/ses etkisi rakibe de görünür (çizim, sim değil). Mekanik ekleme önerilmez: Sonsuzluk "saf hasar" eşyası kalsın.
- **Seçim sorusu:** "Kritik şansım %40+ olacak mı?" 2-3. eşya.
- **sim.js:** yok (yalnız sayı).

### C. Dolunay Kılıcı (yeni; kritik kasmayan, yetenekçi, arada düz vuran)
Kullanıcının iki fikri: (a) eşya 0 kritik, kritik olmayan her vuruş +%5 (en fazla %25), kritikte sıfır; (b) her 5. vuruş kesin kritik, minyonda çalışmaz ama şampiyon, kule ve kampta çalışır. **Öneri: (b).** Gerekçe: (a) bugünkü Talih Kılıcı'nın neredeyse aynısı (critStack: taban %12, adım %5, tavan %35); rastgele olduğu için oyuncu planlayamaz, bot hesaba katamaz. (b) belirli: "4 vuruş hazırla, 5.yi yetenek kombosuna sakla" oyun kararı yaratır.
- **Tarif:** Uzun Kılıç + Odak Taşı + Hafif Çizme (650) + 525 = **1175**.
- **Statlar:** 24 SG, 11 YH, %4 hız (kritik 0).
- **Maliyet:** 900 + 413 + 160 = 1473 / 1175 = **1,25**.
- **Pasif (Ay Evreleri):** rakip kahramana, canavara ya da **yapıya** düz vuruş isabeti +1 evre (minyon sayılmaz ve harcamaz; İkiz'de vuruş başına 1). **5. evre** vuruşu kesin kritiktir (x1,5, Sonsuzluk'la x1,75) ve **yapıya da kritik** vurur (tek istisna). Evreler 8 sn vurmazsan söner (dürtme oyununda saklanabilir).
- **Özgün ek (Hilal):** 4. evredeyken kahramanın etrafında ince hilal görünür (rakip de görür): rakip 5. vuruşu bekler, bilgi savaşı.
- **Diğer kritiklerle kural:** yukarıdaki birleşme kuralı 5. Doğal kritik sayacı sıfırlamaz. Kritik eşyasıyla birlikte alınırsa yalnız "kötü şansı" kırar; esas hedef kritiksiz kahraman.
- **Pasif payı:** şampiyona sürekli vuruşta +%10 DPS (her 5 vuruşta bir +%50); kulede x0,6 kale korumasını kısmen telafi eder.
- **Seçim sorusu:** "Kritiğe yatırım yapmıyorum ama yetenek aralarında birkaç düz vuruşum önemli mi?" (Gladyatör Ağır Darbe arası, İkili yakın biçim, Zincirli, ileride yetenek SG dövüşçüleri).
- **Talih Kılıcı ile ilişkisi:** Talih = kritik kasanın şans yumuşatıcısı (fikir a'nın tabanlı hâli). Dolunay gelince ikisi aynı soruya ("kritiğim güvenilmez") yakınlaşır. **Öneri: Talih Kılıcı kaldırılsın** (çakışma #19, aynı tarif dörtlüsünü de azaltır). Kalacaksa taban kritiği %15'e çıkar, yapıda birikim yok.
- **sim.js:** releaseAttack'ta `ic.moon` sayacı, `crit = crit || moon>=5`; yapı kuralı (bulgu 1) bu eşyada atlanır. Küçük.

### D. Guinsoo benzeri (öneri: gerekmez)
- Kraken (her 3. vuruş) ve Yıkık Kral zaten kritiksiz vuruş etkisi yolu. Guinsoo'nun özü "kritiği vuruş etkisine çevirmek + hayalet vuruş"; bizde vuruş etkileri az ve İkiz'de her okta işliyor: hayalet vuruş İkiz'de 3 kat etki demek (Yıkık Kral %5 anlık can x3). Kullanıcının "10 vuruş çok güçlü" çekincesi doğru.
- **Bunun yerine Kraken değişir:**
  - **Tarif/bedel/stat:** aynı (Uzun Kılıç + Hançer x2, 1150; 21 SG, %19 SH; 1,22).
  - **Pasif (Derin Akıntı):** her 3. düz vuruş (vuruş başına sayılır) **20 + seviye x2** büyü hasarı (10. sv 40; bugün sabit 25). **Akıntı:** aynı hedefe art arda 3. vuruşlar +%25 (en fazla 2 kat, %50); hedef değişince sıfırlanır. Pasif payı 10. sv: ~%10-14.
  - **Özgün dokunuş:** *Kütle.* 3. vuruş hedefi kendi kütlesine oranla 20 birim iter (Okçu 1'e karşı Zincirli 3: 7 birim). Kaçan hafif nişancıyı geri iter, tankı kıpırdatmaz. (İsterseniz itme olmadan.)
- **İsteğe bağlı hafif Guinsoo (önerilmez):** "Yankı Yayı": her 4. vuruşta yalnız **eşya** vuruş etkileri bir kez daha işler (hasar kopyası yok, İkiz'de vuruş başına bir kez).

### E. Yakamoz Kılıcı (yeni; kritik + yetenek hızı + SG, Navori/Essence benzeri)
- **Tarif:** Uzun Kılıç + Çevik Pelerin + Odak Taşı (700) + 550 = **1250**.
- **Statlar:** 18 SG, %15 krit, 11 YH.
- **Maliyet:** 675 + 625 + 413 = 1713 / 1250 = **1,37**.
- **Pasif (Işıldama):** kritik düz vuruş sağ tık ve E'nin kalan beklemesini **0,3 sn** azaltır (rakip kahramana **0,6 sn**; Boşluk hariç; yapıda yok). 10. sv Okçu %35 kritikle: dövüşte beklemeler ~%15-20 hızlı akar.
- **İkinci pasif seçeneği (Iska Tesellisi, özgün):** kaçılabilir bir yetenek (sağ tık/E) hiçbir rakip kahramana değmezse sonraki 3 sn içinde **ilk kritik** o yeteneğin kalan beklemesini **%25** azaltır. Iskayı hızlı telafi; bizde ıska sık.
- **Seçim sorusu:** "Hasarım düz vuruş ve yetenek karışık mı, yeteneklerim kısa beklemeli mi?" (Okçu Ok Yağmuru/Seri Atış, Sekme Bumerang, İkiz Yan Atılış).
- **Özgün dokunuş:** *Kaçılabilir atış.* Ikılan Bumerang ya da Şok Bombası kritik vuruşlarla hızla geri gelir; Dolunay ile her 5. vuruş kesin kısaltma.
- **Yerini aldığı:** yeni. Ruh Rehberi'nin Ruh Akışı (düz vuruşla bekleme kısaltma) kahraman pasifi; eşya kritikle sınırlı olduğu için onunla örtüşmez.
- **sim.js:** releaseAttack'ta kritik belirlendikten sonra isabette (onBasicHit içinde `opts.crit` bilgisi gerekli: bolt `crit` alanı var) `src.cd.r/e` azalt. Seçenek iki: tryCast'ta yetenek kaydı + isabet bayrağı (orta).

### F. Kan Emici (değişir; kritik + SG + can çalma, Bloodthirster benzeri)
- **Tarif:** Uzun Kılıç + Çevik Pelerin + Vampir Dişi (700) + 600 = **1300**.
- **Statlar:** 20 SG, %15 krit, %8 CÇ.
- **Maliyet:** 750 + 625 + 450 = 1825 / 1300 = **1,40** (1,63'ten).
- **Pasif (Kızıl Kabuk):** düz vuruş can çalması canını doldurduktan sonra taşan kısmı **kalkan** olur (en fazla 50 + seviye x10; 10. sv 150). Kalkan 6 sn hasar almazsan söner. **Kritik vuruşun can çalması x1,5** (kritik kasana ödül).
- **İkinci pasif seçeneği (Kan Kokusu, özgün):** canı %40 altındaki rakip kahraman sisteyken bile 1200 içindeyse **sana görünür** (yalnız sana, takımına değil; kan izi). Kaçıp çalıya giren düşük canlı rakibi bitir.
- **Seçim sorusu:** "Dürtme savaşında canımı ve kalkanımı vuruşla mı tutacağım?" Kritik kasan nişancının hayatta kalma eşyası.
- **Özgün dokunuş:** *Dürtme ve kaçılabilir atış.* Kalkan, koridorda rakibin ilk beceri atışını emer; Seçenek B sis ve çalı.
- **Yerini aldığı:** Kan Emici + Kanlı Yay (kaldırılır; lsLow fikri kritik CÇ katına dönüştü). Kritiksiz CÇ: Yıkık Kral ve Kan Bağı.
- **sim.js:** damage içinde CÇ satırına `opts.crit` çarpanı ve taşan iyileşme → giveShield (keep). Küçük.

### G1. Ayaz Hançeri (Kristal Hançer değişir; kritik yavaşlatma → beceri atışı köprüsü)
- **Tarif:** Uzun Kılıç + Çevik Pelerin + Hafif Çizme (675) + 500 = **1175** (Uzun Kılıç x2 + Pelerin'den; çakışma #19).
- **Statlar:** 16 SG, %18 krit, %4 hız.
- **Maliyet:** 600 + 750 + 160 = 1510 / 1175 = **1,29**.
- **Pasif (Ayaz):** rakip kahramana kritik düz vuruş 1 sn **%25** yavaşlatır (%10'dan). **Donmuş Hedef:** yavaşlattığın hedefe 1 sn içinde değen ilk yeteneğin ek **%10** hasar verir (3 sn bekleme).
- **Seçim sorusu:** "Beceri atışlarımı tutturmakta zorlanıyor muyum?"
- **Özgün dokunuş:** *Kaçılabilir atış.* Bizde yavaşlamış rakip yan adımla kaçamıyor (temel hız 200 ister). Kritik → yavaş → Kalın Ok/Bumerang/Şok Bombası isabeti. Kritik eşyalarını yetenekle bağlayan tek eşya.
- **sim.js:** `critSlow` sayısı + `ic.frostHit` penceresi damage skill dalında. Küçük. Not: AP planındaki Buz Asası "Kırağı" adını kullanıyor, bu yüzden ad Ayaz.

### G2. Zırh Yaran (değişir; yüzdelik zırh delme, tank avcısı nişancı, LDR benzeri)
- **Tarif:** Uzun Kılıç x2 + Çevik Pelerin (700) + 575 = **1275** (Sonsuzluk ile aynı tarif kalır; LoL'de de ikisi aynı kökten).
- **Statlar:** 22 SG, %18 krit.
- **Maliyet:** 825 + 750 = 1575 / 1275 = **1,24** (pasif güçlü).
- **Pasif (Yarık):** **bütün fiziksel hasarın** (düz vuruş + yetenek) rakibin zırhının **%25**'ini yok sayar (düz vuruş %30'dan). Eşsiz anahtar `armorPen`: Kanlı Gürz ile en büyüğü alınır.
- **Özgün pasif (Dev Avı, kütle):** hedefin **kütlesi** seninkinden büyükse kütle farkı x **%5** ek hasar (en fazla %12). Okçu (1) → Savaşçı (2,2): %6, Zincirli (3,0): %10, Kabuk'lu Gülle (x3): %12. LoL'deki can farkı yerine bizim fiziğimiz.
- **Seçim sorusu:** "Rakipte zırh kasan ağır bir tank var mı?" Zırh < 60 hedefe karşı Gece Avcısı (sabit delme) daha iyi.
- **Yerini aldığı:** kendisi + Delici Ok'un yüzdelik pasifi (kaldırılır).
- **sim.js:** `basicArmorPen` → `armorPen`; damage'da `e.kind==='hero'` için kütle farkı çarpanı (`stat(e,'mass')`, Kabuk `st.shell`). Küçük.

### G3. Gece Avcısı (değişir; kritik + sabit delme + infaz, Collector benzeri)
- **Tarif:** Uzun Kılıç + Keskin Bıçak + Çevik Pelerin (700) + 550 = **1250**.
- **Statlar:** 20 SG, %15 krit, 10 sabit delme.
- **Maliyet:** 750 + 625 + 321 = 1696 / 1250 = **1,36**.
- **Pasif (Sis Avı):** hasarın rakip şampiyonu **azami canının %5'inin** altına indirirse onu öldürür (kalkanı varsa önce kalkan biter). Böyle bir öldürme +25 altın verir.
- **Özgün ek:** infazla öldürülen rakibin yeniden doğuş süresi **+2 sn** (yalnız bu öldürmede). Bizde 10. dk yeniden doğuş ~26 sn; 2v2'de iki saniyelik sayı üstünlüğü kule demek.
- **Seçim sorusu:** "Rakipler kağıt mı (zırh az), son vuruşu ben mi yapıyorum?"
- **Yerini aldığı:** kendisi; infaz rolü SG tarafında yalnız burada (çakışma #3: Hasat ve Gölge Hançeri'nin execDmg'si kalkar, Son Darbe Asası büyücüde kalır).
- **sim.js:** damage sonunda `e.hp < e.maxHp*0.05 && SB.cull` → `kill()`; altın awardHeroKillGold'a ek; respawn ek süre `kill()`. Küçük.

### G4. Kum Kurdu Dişi (yeni; yakın dövüş kritik dövüşçü, ileride Yasuo/Tryndamere benzerleri için)
- **Tarif:** Uzun Kılıç + Çevik Pelerin + Yakut (650) + 575 = **1225**.
- **Statlar:** 18 SG, %18 krit, 150 can.
- **Maliyet:** 675 + 750 + 500 = 1925 / 1225 = **1,57** (yüksek görünür; menzilli alırsa kritik %12'ye düşer ve pasif çalışmaz, yani yalnız yakın dövüşçüde bu değer).
- **Pasif (Kum Çeneleri):** **yakın dövüş** kritik vuruşu hedefi 60 birim **iter** (kütle oranlı; duvara çarparsa 0,4 sn sersem, 8 sn bekleme). Menzilli kahramanda pasif yok ve kritik %12'ye düşer (computeBonus'ta menzilliye ayrı değer, Uzun Nişan'ın rangeRanged/rangeMelee ayrımı gibi).
- **Seçim sorusu:** "Yakın dövüşte kritik mi kasıyorum?" Bugün 14 kahramanda kullanıcısı az (Gladyatör, İkili yakın biçim); 40-50 kahramanlık havuz için arketip yeri.
- **Özgün dokunuş:** *Fizik ve duvar.* Kesici Vuruş (koniye yayma) yakın dövüşün tek hedef istisnası; bu ise tek hedefi duvara yapıştırır. Koridor duvarı ve kayalar kenarında anlamlı.
- **sim.js:** releaseAttack yakın dalında `crit && B.critShove` → shoveStart + inWall/freezeHero (İkili Darbe kodu). Orta.
- **Not:** isteğe bağlı; "kritik alternatifi" (G) maddesi için. İstenmezse çıkarılır.

### Kaçak Yayı (değişir; kritiksiz vur-kaç)
- **Tarif/bedel:** aynı (Hançer x2 + Hafif Çizme, 1150). **Statlar:** 10 SG, %25 SH, %6 hız (12 SG, %28, %7'den). Maliyet 375 + 803 + 240 = 1418 / 1150 = **1,23**.
- **Pasif (Rüzgarla Geri):** düz vuruş isabeti 1 sn **%10 hız**, ancak **hedeften uzaklaşıyorsan** %20 (hareket yönü hedefe zıt açıda). Kite'ı ödüllendirir, kovalamayı değil.
- **Seçim sorusu:** "Kritik almadan vurup kaçacak mıyım?" Hız Çarkı'ndan farkı: birikim yok, ilk vuruştan çalışır, kritiksiz yollar (Kraken, Yıkık Kral) için.
- **sim.js:** onHitMs + yön kontrolü (`h.vx,h.vy` ile hedef vektörü). Küçük.

### Rüzgar Yayı (pasife ek)
- **Statlar/bedel:** aynı (1,30). **Pasif (Rüzgar Altında):** hazırlık yavaşlaması %50 azalır (aynı) + **çalıdan** düz vuruş yaptığında görünür olma süresi (BUSH_REVEAL 1,5 sn) **0,5 sn**'ye iner.
- **Seçim sorusu:** "Vururken hareket edip çalıyı kullanacak mıyım?" **Özgün dokunuş:** sis/çalı.
- **sim.js:** damage başında `revealT` hesabına eşya çarpanı. Küçük.

### Yıkık Kral Kılıcı (koru, küçük ek)
- Statlar aynı (1,49; Kızıl Av'ı emdiği için yüksek kalabilir). Pasif aynı (anlık canın %5'i, minyon/canavar tavanı 60). **Ek (Kral Payı):** aynı rakip kahramana 3. ardışık vuruşta 1,5 sn %20 yavaşlatma ve senin %20 hızın (8 sn bekleme). LoL'deki "hız çalma" yerine kaçılabilir atış köprüsü.
- **Not (İkiz):** %5 her okta işliyor; İkiz 1500 canlı tanka vuruş başına 2 x 75. Bunu `idx===0` ile tek oka indirmek ya da İkiz için %3 yapmak önerilir.

### Hüner Bıçağı (değişir; yetenekle SG dövüşçü)
- **Tarif:** Uzun Kılıç x2 + Odak (675) + 500 = **1175**. **Statlar:** 22 SG, 15 YH (24 SG, 11'den). Maliyet 825 + 563 = 1388 / 1175 = **1,18**.
- **Pasif (Ustalık):** yetenek hasarı ek **ilave SG'nin %15'i** (toplam SG %10'dan; ilave = eşyalardan). **Özgün ek (İsabet Serisi):** iki farklı yeteneği 3 sn içinde aynı rakip kahramana tutturursan ikincisi +%10 (5 sn bekleme). Kaçılabilir atışları art arda tutturmanın ödülü.
- **Seçim sorusu:** "Hasarım düz vuruştan değil, SG ölçekli yeteneklerden mi?" (Gladyatör Ağır Darbe 0,6, İkili Küre 0,85 / Sıçrayış 1,0, Zincirli Ezici Darbe 0,6, Sekme Bumerang 0,36).

## Suikastçı ve zırh delme (kapsam eki)

Delme kuralı özet: **sabit delme** (lethal) erken ve kağıt hedefe, **yüzdelik** tanka. Sabit delme bizde seviyeyle ölçeklenmez (Keskin Bıçak 7); bu yüzden suikastçı eşyalarında 10-14 aralığı yeterli.

### S1. Hasat Kılıcı (değişir; öldürdükçe güçlenen, Hubris benzeri)
- **Tarif:** Uzun Kılıç x2 + Keskin Bıçak (675) + 625 = **1300**.
- **Statlar:** 26 SG, 14 sabit delme. Maliyet 975 + 450 = 1425 / 1300 = **1,10** (pasif ölçeklenir).
- **Pasif (Hasat Ayı):** kahraman öldürme ya da asist +1 kat (+2 SG), **Titan ya da güçlendirme kampı son vuruşu da +1** (en fazla 10 kat, +20 SG). Ölünce 2 kat gider. **Ün:** 6+ katta rakip mini haritasında 1 sn'lik iz bırakırsın (ödülün bedeli).
- **Seçim sorusu:** "Önde miyim ve kartopu yapacak mıyım?" Geride alınmaz.
- **Özgün dokunuş:** *Orman/Titan ve sis.* Kat yalnız kahramandan değil Titan ve güçlendirmeden de gelir; ün izi sis avantajını azaltır (risk-ödül). Çağ Kitabı (güvenli, YG) ile karşıt: bu riskli SG.
- **Yerini aldığı:** Hasat'ın infazı kalkar (G3'e). Mejai benzeri SG eşyası.
- **sim.js:** `kill()` ve killMonster içinde kat, stat()'ta `dmg += n*2`, ün için S.sights benzeri rakip takıma görünürlük. Küçük.

### S2. Gölge Hançeri (değişir; öldürmeden sonra görünmezlik)
- **Tarif:** Uzun Kılıç + Keskin Bıçak + Hafif Çizme (650) + 550 = **1200**.
- **Statlar:** 22 SG, 12 sabit delme, %5 hız. Maliyet 825 + 386 + 200 = 1411 / 1200 = **1,18**.
- **Pasif (Gece Örtüsü):** rakip kahraman öldürme ya da asist: **2 sn görünmezsin** (rakip seni görmez, siste gibi; hasar verince ya da yetenek kullanınca biter) ve 2 sn %20 hız.
- **İkinci pasif seçeneği (Gölge Zinciri):** görünmezliği bozan ilk hasarın +%10 (2v2'de ikinci rakibe sıçramak için).
- **Seçim sorusu:** "2v2'de ilk öldürmeden sonra hayatta kalıp ikinciye gidebilecek miyim?"
- **Özgün dokunuş:** *Sis ve 2v2.* Görünmezlik bizim sis sistemine bağlı: kule de minyon da görmediğini hedeflemez (canSee).
- **sim.js:** `h.st.veil` ve canSee'de `veil` (çalı kuralının yanında). Orta (bot görmezse kaçar; ai.js görünürlüğü canSee'den okur, ek kod yok).

### S3. Sessiz Bıçak (değişir; çalı ve sisten pusu, Duskblade benzeri)
- **Tarif:** Uzun Kılıç + Keskin Bıçak + Yakut (650) + 550 = **1200** (Hançer'den Yakut'a).
- **Statlar:** 20 SG, 12 sabit delme, 150 can. Maliyet 750 + 386 + 500 = 1636 / 1200 = **1,36**.
- **Pasif (Pusu):** rakip seni **görmüyorken** (çalıda, siste) verdiğin ilk hasar ek **40 + ilave SG'nin %25'i** fiziksel ve 1 sn **%30 yavaşlatma**. 12 sn bekleme.
- **Pasif payı:** 10. sv ~70 hasar / 12 sn: ölçülü; asıl değer yavaşlatma (ilk beceri atışını garantiler).
- **Seçim sorusu:** "Çalıdan ve sisten açılış mı yapıyorum?" Ormancı, baskıncı.
- **Özgün dokunuş:** *Çalı + kaçılabilir atış.* Pusu yavaşlatması kombonun ilk yeteneğini kaçılmaz yapar. (AP planındaki Büyücü Şapkası "Gölgeden Büyü" ile anahtar ayrı: `ambush`.)
- **sim.js:** damage başında `canSee(e, src)` (src görünmüyor mu) atıştan önce kontrol, sonra revealT. Küçük.

### S4. Rüzgar Yürüyüşü (değişir; gezgin, Youmuu benzeri)
- **Tarif/bedel:** aynı (Hafif Çizme + Keskin Bıçak + Uzun Kılıç, 1150). **Statlar:** 19 SG, 11 delme, **%6 hız** (%10'dan). Maliyet 1305 / 1150 = **1,13**.
- **Pasif (Gezgin Rüzgar):** 4 sn rakip kahramandan hasar almadıysan **%12 hız**; rakip takım seni görmüyorken (siste) **%20**. Rakip kahramana hasar verince 1,5 sn daha sürer, sonra biter.
- **Seçim sorusu:** "Koridorlar ve orman arasında gezip baskın mı yapıyorum?"
- **Özgün dokunuş:** *Sis.* Görünmeden yürümek hızlı; gördükleri anda yavaşlarsın (bilgi savaşı). 8 sn üsse dönüşten sonra koridora dönüş de hızlanır.
- **Yerini aldığı:** castMs pasifi kalkar (Esinti Asası'nda kalır, çakışma #10 çözülür).
- **sim.js:** moveMult'ta `ic.lastHurt` ve "rakip takım görüyor mu" (S.intel/canSee). Küçük.

### S5. Gece Maskesi (değişir; büyü kalkanı, Edge of Night benzeri)
- **Tarif:** Uzun Kılıç + Keskin Bıçak + Büyü Pelerini (625) + 600 = **1225**.
- **Statlar:** 18 SG, 10 sabit delme, 15 BD. Maliyet 675 + 321 + 273 = 1269 / 1225 = **1,04** (pasif çok güçlü).
- **Pasif (Peçe):** rakip kahramanın sana değen ilk **yeteneği** (hasar ve kitle kontrolü dahil) engellenir. 30 sn bekleme. Peçe yalnız 1000 içinde görünen rakip kahraman varken **1 sn** sonra hazır olur (savaş öncesi kurulur).
- **İkinci pasif seçeneği (Gölge Tuzağı, özgün):** Peçe bir yetenek yutunca o yeteneğin sahibi 2 sn sana **görünür** olur (siste bile).
- **Seçim sorusu:** "Beni kanca, sersem ya da kökle açıp öldürüyorlar mı?" Zincirli, Topçu, Gölge karşısında.
- **Özgün dokunuş:** *Kaçılabilir atış.* Bizde yetenekler kaçılabilir; Peçe "kaçamadığın ilk atış". Bot rakip için: Peçe'li hedefe önce ucuz yetenek atmak doğal karar.
- **Yerini aldığı:** skillSlow pasifi kalkar (çakışma #8 çözülür; skillSlow S6'ya geçer).
- **sim.js:** damage içinde `opts.skill && e.bonus.spellShield` → engelle; kitle kontrolü fonksiyonları (applySlow, freezeHero, kök, susturma, hookPull) aynı bayrağı okumalı. **Orta-büyük** (kontrol birçok yerde uygulanıyor; en temiz yol yetenek isabetinde tek giriş noktası).

### S6. Zırh Paralayıcı (değişir; yetenekle SG, Serylda benzeri)
- **Tarif:** Uzun Kılıç + Keskin Bıçak + Odak Taşı (675) + 550 = **1225** (Bıçak x2'den).
- **Statlar:** 20 SG, 8 sabit delme, 11 YH. Maliyet 750 + 257 + 413 = 1420 / 1225 = **1,16**.
- **Pasif (Yarma):** **yetenek** hasarın rakibin zırhının **%25**'ini yok sayar (`skillArmorPen`, düz vuruşta yok). Yetenek isabeti rakip kahramanı 1 sn **%20** yavaşlatır.
- **İkinci pasif seçeneği (Zayıf Nokta, 2v2):** bugünkü gibi yetenek isabeti hedefin zırhını 3 sn %15 düşürür; bu düşüş **dostun** hasarına da işler (yüzdelik delme yerine takım).
- **Seçim sorusu:** "Yeteneklerimle SG hasarı veriyorum ve rakip zırh mı kasıyor?" Zırh Yaran'ın yetenekçi karşılığı.
- **Özgün dokunuş:** *Kaçılabilir atış zinciri.* Yavaşlatma ikinci yeteneği garantiler (Buz Asası'nın SG karşılığı; AP planı Buz Asası'nı `frost` anahtarına taşıdığı için `skillSlow` burada eşsiz kalır).
- **sim.js:** damage phys dalında `opts.skill && SB.skillArmorPen` (pen'lerin en büyüğü). Küçük.

### S7. Ölüm Haritası (değişir; 2v2 av işareti)
- **Tarif/bedel:** aynı (Uzun Kılıç x3, 1100). **Statlar:** 28 SG (34'ten). Maliyet 1050 / 1100 = **0,95** (takım pasifi).
- **Pasif (Av İşareti):** düz vuruş ya da yetenek isabeti rakip kahramanı 4 sn işaretler. İşaretli hedefe **dostlarının** hasarı %6 fazla (senin değil); işaret ilk 2 sn hedefi takımına görünür kılar (çalı, sis). Yenilenir, birikmez.
- **Seçim sorusu:** "2v2'de dostumla aynı hedefe mi oynuyorum?" 1v1'de alınmaz (açık uyarı mağazada).
- **Özgün dokunuş:** *2v2 ve sis.* Bizim ilk "dosta SG" eşyası; Kan Bağı (CÇ paylaşımı) ile takım nişancı yolu.
- **Yerini aldığı:** shredFlat (-8 zırh, zayıf) kalkar (çakışma #7).
- **sim.js:** `e.ic.markBy/markT`, damage sonunda src takımı farklı ve markBy!==src ise çarpan; görünürlük S.sights. Küçük.

### Kanlı Gürz (hafif değiş)
- Yüzdelik delme %30 → **%20** (bütün fiziksel). Zırh Yaran %25 ile en büyüğü alınır; dövüşçü ve nişancı eşyası aynı anda alınırsa fazlası boşa gitmez çünkü ayrı yetenek dalı yok (açık uyarı: "Benzersiz: Zırh delme").

## Özet tablo

| Eşya | Durum | Tarif | Bedel | Statlar | Pasif (kısa) | Değer/bedel | Özgün bağ |
|---|---|---|---|---|---|---|---|
| Hayalet Dansçı | değişir | Hançer, Hançer, Pelerin | 1250 | %28 SH, %20 kr, %4 hız | bütün minyonlardan geç | 1,51 | fizik, dalga |
| Hız Çarkı | değişir | Kılıç, Hançer, Pelerin | 1225 | 10 SG, %18 SH, %18 kr | 5 kat SH %4 + hız %2, dolu katta atkSlow /2 | 1,39 | kite, kaçış |
| Dalga Kıran | yeni | Hançer, Pelerin, Şifa Otu | 1225 | 8 SG, %18 SH, %15 kr, 12 yen. | minyon +%15, canavar +%10, dalgayla yapı +%10, taşkın | 1,39 | orman çarpanı, kale koruması |
| Kuşatma Çekici | değişir | Kılıç x2, Yakut | 1175 | 26 SG, 150 can | yapı +%15, dalgasız x0,85 | 1,26 | böl-it |
| Uzun Nişan | değişir | Hançer, Pelerin, Çizme | 1225 | %18 SH, %18 kr, %5 hız | yük 100: +80 menzil, 25 + %10 SG, görünürlük | 1,25 | mesafe, sis |
| Sonsuzluk Kılıcı | sayı | Kılıç x2, Pelerin | 1300 | 30 SG, %20 kr | kritik %175 | 1,51 | (saf) |
| Dolunay Kılıcı | yeni | Kılıç, Odak, Çizme | 1175 | 24 SG, 11 YH, %4 hız | 5. evre kesin kritik, yapıya da | 1,25 | kule, bilgi |
| Kraken | değişir | Kılıç, Hançer x2 | 1150 | 21 SG, %19 SH | 3. vuruş 20 + sv x2, art arda +%25, kütle itmesi | 1,22 | kütle |
| Yakamoz Kılıcı | yeni | Kılıç, Pelerin, Odak | 1250 | 18 SG, %15 kr, 11 YH | kritik r/e -0,3 sn (kahramana 0,6) | 1,37 | ıska telafisi |
| Kan Emici | değişir | Kılıç, Pelerin, Diş | 1300 | 20 SG, %15 kr, %8 CÇ | taşan CÇ kalkan, kritik CÇ x1,5 | 1,40 | dürtme |
| Ayaz Hançeri | değişir (Kristal) | Kılıç, Pelerin, Çizme | 1175 | 16 SG, %18 kr, %4 hız | kritik %25 yavaş, sonraki yetenek +%10 | 1,29 | kaçılabilir atış |
| Zırh Yaran | değişir | Kılıç x2, Pelerin | 1275 | 22 SG, %18 kr | fiziksel %25 delme, kütle farkı x%5 | 1,24 | kütle |
| Gece Avcısı | değişir | Kılıç, Bıçak, Pelerin | 1250 | 20 SG, %15 kr, 10 delme | %5 altını infaz, +25 altın, +2 sn doğuş | 1,36 | 2v2 sayı üstünlüğü |
| Kum Kurdu Dişi | yeni (isteğe bağlı) | Kılıç, Pelerin, Yakut | 1225 | 18 SG, %18 kr, 150 can | yakın kritik iter, duvarda sersem | 1,57 | fizik, duvar |
| Kaçak Yayı | değişir | Hançer x2, Çizme | 1150 | 10 SG, %25 SH, %6 hız | vuruşta hız, uzaklaşırken x2 | 1,23 | kite |
| Rüzgar Yayı | ek | Kılıç, Hançer x2 | 1175 | 21 SG, %23 SH | atkSlow /2, çalıdan görünme 0,5 sn | 1,30 | çalı |
| Yıkık Kral | ek | Kılıç, Hançer, Diş | 1200 | 21 SG, %19 SH, %7 CÇ | anlık can %5, 3. vuruşta yavaş | 1,49 | kaçılabilir atış |
| Hüner Bıçağı | değişir | Kılıç x2, Odak | 1175 | 22 SG, 15 YH | yetenek +%15 ilave SG, isabet serisi | 1,18 | atış zinciri |
| Hasat Kılıcı | değişir | Kılıç x2, Bıçak | 1300 | 26 SG, 14 delme | öldürme/Titan katı +2 SG (10), ün izi | 1,10 | orman/Titan, sis |
| Gölge Hançeri | değişir | Kılıç, Bıçak, Çizme | 1200 | 22 SG, 12 delme, %5 hız | öldürünce 2 sn görünmez + hız | 1,18 | sis, 2v2 |
| Sessiz Bıçak | değişir | Kılıç, Bıçak, Yakut | 1200 | 20 SG, 12 delme, 150 can | görünmezken ilk hasar + %30 yavaş | 1,36 | çalı |
| Rüzgar Yürüyüşü | değişir | Çizme, Bıçak, Kılıç | 1150 | 19 SG, 11 delme, %6 hız | savaş dışı %12, siste %20 hız | 1,13 | sis |
| Gece Maskesi | değişir | Kılıç, Bıçak, Pelerin(BD) | 1225 | 18 SG, 10 delme, 15 BD | ilk yetenek isabetini yutar (30 sn) | 1,04 | kaçılabilir atış |
| Zırh Paralayıcı | değişir | Kılıç, Bıçak, Odak | 1225 | 20 SG, 8 delme, 11 YH | yetenek %25 delme + %20 yavaş | 1,16 | atış zinciri |
| Ölüm Haritası | değişir | Kılıç x3 | 1100 | 28 SG | işaret: dost hasarı +%6, görünürlük | 0,95 | 2v2, sis |
| Kanlı Gürz | sayı | Kılıç, Yakut, Odak | 1225 | aynı | delme %30 → %20 | 1,55 | |
| Kaldırılan | | Kanlı Yay, Delici Ok, Kızıl Av, Talih Kılıcı, Yük Bobini, Dikenli Çizme | | | | | |

Korunanlar (değişmez): Kan Bağı.

## Eşya pasif hasarı ve nişancı hasarı (10. seviye Okçu, SG ~85, dövüş DPS ~233)

| Kaynak | Hasar | DPS'e katkı |
|---|---|---|
| Okçu düz vuruş | 85 / vuruş, 2,1 vuruş/sn | taban |
| Kalın Ok (Boşluk) | 2,5 x SG = ~212 + YG | tek atış, 14-20 sn |
| Ok Yağmuru | ok başına ~89, isabet kısmi | 7-9 sn |
| Kraken (yeni) | 40 / 3 vuruş | ~%10-14 |
| Dolunay | 5 vuruşta +%50 | ~%10 |
| Uzun Nişan yükü | 33 / ~5 sn | ~%3 (+menzil) |
| Dalga Kıran | yalnız minyon/canavar | kahramana 0 |
| Gece Avcısı infaz | ~%5 can (50 civarı) bitirme | yalnız son an |
| Sessiz Bıçak pusu | ~70 / 12 sn | ~%3 + yavaşlatma |
| Yıkık Kral (1500 canlı tanka) | 75 / vuruş | **~%35** (tank avcısı; İkiz'de x2: düzeltilmeli) |
| Hız Çarkı (5 kat) | hasar değil SH | ~%17 (hız) |

Sonuç: yeni pasiflerin hasar payı %3-14; en büyük hasar payı bugün de Yıkık Kral'da (bilinçli tank avcısı, ama İkiz'deki her ok kuralı düzeltilmeli). Kahraman yetenekleri (Kalın Ok tek atışla ~212) eşya pasiflerinden büyük kalır.

## Botların BUILDS etkisi

- Varsayılanlar: archer `kraken, botrk, windbow, bt, DEF, pd`; twin `kraken, botrk, pd, ie, DEF, ldr`; bounce `ie, pd, botrk, ldr, DEF, bt`; dual `nisanci` yedeği. Kaldırılan eşyaların hiçbiri BUILDS'te yok; yalnız RECOMMENDED (archer fury/luck, bounce bloodbow/nightfang/luck, twin runbow/fury, dual nightfang/skillblade) güncellenmeli.
- **Kan Emici kritikli** olunca Okçu varsayılanı (kritiksiz yol + 4. eşya Kan Emici) %15 kritik kazanır, SG kaybeder; küçük etki. **Hayalet Dansçı** 6. (yedek) yuvada, etkisi yok.
- Twin ve bounce varsayılanında **Zırh Yaran** artık bütün fiziksel hasarı deler (Bumerang, Şok Bombası da): hafif güçlenme.
- **Sonsuzluk** 34 → 30 SG ve **yapıya kritik yok** kuralı: kritik nişancıların kule hasarı düşer (İkiz %26 kritik). Kale koruması x0,6 ile birlikte kuşatma yavaşlar; Dolunay ve Dalga Kıran bunu telafi etmek için.
- Denenecek yeni sıralar (tools/builds.js): archer `fury, ie, pd, ldr, DEF`; bounce `dalga, ie, pd, ldr, DEF`; twin `kraken, botrk, rfc, ie, DEF`; gladiator `cleaver, DEF, dolunay, DEF, DEF`; dual `sheen, cleaver, DEF, skillblade, DEF`.
- **ai.js gerekenler:** lastHitInfo minyon çarpanı (Dalga Kıran), `dps()` kesin kritiği (Dolunay %10), Gece Maskesi Peçe'si (bot rakibin peçesi açıkken önce ucuz yetenek atar ya da bekler; yoksa kanca boşa gider), Gölge Hançeri görünmezliği canSee'den kendiliğinden.
- **autobuy.js:** localStorage'daki kayıtlı sıralar kaldırılan id'leri içerebilir; yüklenirken bilinmeyen id atlanmalı.
- Değişiklikler 1v1 ve 2v2 sonuçlarını bozar. Sonra kısa tarama: `teams2v2.js --fast 1`, 4 bulut parçası, `--diff expert`.

## Arketip x eşya kapsama (40-50 kahramanlık havuz için)

Satırlar arketip, ✓ birincil seçim, · uygun.

| Arketip | Çekirdek (✓) | Durum/karşı (·) |
|---|---|---|
| Kritik nişancı | Sonsuzluk, Hayalet Dansçı, Hız Çarkı, Zırh Yaran | Kan Emici, Uzun Nişan, Ayaz, Gece Avcısı |
| Vuruş etkili nişancı (kritiksiz) | Kraken, Yıkık Kral, Rüzgar Yayı | Kaçak Yayı, Hız Çarkı, Kan Bağı |
| Vur-kaç / kite | Hız Çarkı, Kaçak Yayı | Hayalet Dansçı, Uzun Nişan, Rüzgar Yayı |
| Yetenekçi nişancı (Ezreal/Caitlyn benzeri) | Yakamoz, Ayaz, Dolunay | Hüner Bıçağı, Zırh Paralayıcı |
| Alanı olmayan nişancı / nişancı ormancı | Dalga Kıran | Kraken |
| Suikastçı (sabit delme, patlama) | Sessiz Bıçak, Gölge Hançeri, Hasat Kılıcı | Gece Avcısı, Gece Maskesi, Rüzgar Yürüyüşü |
| Yetenekle SG dövüşçü | Hüner Bıçağı, Zırh Paralayıcı, Dolunay | Kara Balta, Tılsımlı Kılıç, Kasırga Baltası |
| Yakın kritik dövüşçü | Kum Kurdu Dişi, Sonsuzluk | Hayalet Dansçı, Kan Emici |
| Tank avcısı | Zırh Yaran, Yıkık Kral | Kanlı Gürz, Kara Balta, Yontulmuş Mızrak |
| Kağıt avcısı (erken) | Gece Avcısı, Sessiz Bıçak | Hasat Kılıcı |
| Gezgin / baskıncı | Rüzgar Yürüyüşü, Sessiz Bıçak | Gölge Hançeri |
| Böl-it | Kuşatma Çekici | Dolunay (yapı kritiği) |
| Dalgayla it | Dalga Kıran | Kraken |
| 2v2 takım SG | Ölüm Haritası, Kan Bağı | Gece Avcısı (+2 sn doğuş) |
| Kontrole karşı (SG) | Gece Maskesi | (savunma: Tanrı Kalkanı) |

Boşluklar (bilerek ileriye bırakıldı): yakın dövüşte kritiksiz saldırı hızı dövüşçüsü (bugün Kasırga Baltası), SG destek (yok; ileride "dost kalkanına SG" gibi), menzilli yakın-arası "orta menzil" nişancı.

## sim.js iş yükü özeti

- Küçük: yapıya kritik yok, Hayalet Dansçı geçiş, Hız Çarkı hız/sönme, Dalga Kıran çarpan + taşkın, Kuşatma Çekici ward, Uzun Nişan menzil (coil kodu taşınır), Dolunay sayacı, Kraken ölçek, Yakamoz bekleme, Kan Emici kalkan, Ayaz, Zırh Yaran kütle, Gece Avcısı infaz, Kaçak Yayı yön, Rüzgar Yayı revealT, Hüner seri, Hasat katı, Sessiz Bıçak pusu, Rüzgar Yürüyüşü sis hızı, Zırh Paralayıcı yetenek delmesi, Ölüm Haritası işareti.
- Orta: Gölge Hançeri görünmezlik (canSee), Kum Kurdu Dişi itme, Kraken kütle itmesi, Hayalet Dansçı seçenek B.
- Orta-büyük: Gece Maskesi Peçe (kontrol uygulayan her fonksiyon).
- Ek kural: yeni yığın/yük pasifleri İkiz'de vuruş başına (`idx===0`).
- itemdesc.js PASSIVES şablonları her yeni anahtar için; assets/items simgeleri yeni 4 eşya için.

## Açık sorular (Kayra)

1. Eski çekirdeği kısalım mı (Kan Emici 1,63 → 1,40, Sonsuzluk 1,59 → 1,51), yoksa nişancılar zayıf olduğu için yeni eşyaları mı eskiler seviyesine çıkaralım?
2. "Yapılara kritik yok" genel kuralı olsun mu (bugün kodda kritik kuleye işliyor)?
3. Kritiksizler için Dolunay (her 5. vuruş, önerim) mi, senin (a) fikrin mi? Talih Kılıcı kaldırılsın mı?
4. Hayalet Dansçı rakip minyonların da içinden geçsin mi (önerim evet), seçenek B (minyon siperi) eklensin mi?
5. Dalga Kıran'ın kule bonusu yalnız dalgayla mı (önerim), her zaman mı?
6. Gece Maskesi Peçe'si (büyü kalkanı) bizde çok güçlü olabilir (kaçılabilir atış az isabet ediyor); 30 sn mi, 45 sn mi?
7. Kum Kurdu Dişi (yakın kritik dövüşçü) şimdi mi eklensin, kahramanı gelince mi?
8. Kaldırılacak 6 eşya (Kanlı Yay, Delici Ok, Kızıl Av, Talih, Yük Bobini, Dikenli Çizme) onaylı mı?

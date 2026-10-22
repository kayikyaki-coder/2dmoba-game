# Tank ve savunma eşyaları planı (taslak, 16.10.2026)

Yalnız tasarım taslağı: hiçbir kod ya da sayı değişmedi. Kaynaklar: items.js, itemdesc.js, sim.js "eşyalar" bölümü (stat, damage, computeBonus, onCast, onBasicHit, itemTick, defPick), docs/esya_cakisma.md, docs/esya_ap_plan.md.

## Bizi LoL'den ayıran ilkeler (tank sürümü)

Genel ilkeler docs/esya_ap_plan.md'deki gibi (aktif yok, kaçılabilir atış, fizik, sis/çalı, harita ve takım, her eşya tek soru). Tanklar için ek olarak:

1. **Tank dövüşün başını ve sonunu belirler, hasarını değil.** Pasif hasar küçük kalır (Güneş Ateşi, Diken, Şok Zırhı düzeyinde). Metayı kahramanlar belirler.
2. **Kaçılabilir atış iki yönlü.** Tank yavaşlatarak dostunun atışını garantiler (yavaş rakip yan adımla kaçamaz), ıskalanan atış da tankı ödüllendirebilir.
3. **Kütle ve itme gerçek.** Kanca, Darbe, Bilardo, Büyü Kılıcı itmesi ve duvar sersemi var; bunlara karşı ve bunlarla oynayan eşyalar olabilir.
4. **Kule ve 8 sn üsse dönüş.** Tank kule altında tutunur, üsse dönmeden koridorda kalabilir.
5. **2v2 dost.** Destek tank dosta kalkan verir ya da kontrol ettiği hedefi dostu için işaretler.

## Oyuna özgü kısıtlar (kısa)

- **Pasifler eşsiz** (computeBonus `B[k]=v`): aynı anahtar birikmez, sonraki eşya geçerli. Her yeni rol yeni anahtar.
- **Taban can:** canı olmayan her büyük eşyaya +100 can (ITEM_BASE_HP). "Cansız" eşya için `noBaseHp:true` bayrağı gerekir (items.js döngüsünde atlanır).
- **Birim değerler** (parça fiyatından): can 3,33; zırh 22,2; BD 18,2; YH 37,5; %1 hız 40; 5 sn yenilenme 16,67 (Şifa Otu 200/12). Hedef oran stat değeri / bedel ~1,27; pasifi güçlü olanda düşük.
- **Can ölçeği:** tanklar 15. seviyede yaklaşık 900-1250 temel can, eşyalarla 2000-2800. Kahraman yenilenmesi 15. seviyede 5 sn'de ~10-20 (saniyede 2-4): eşyasız koridorda kalmak zor, üsse dönüş zorunlu. Çeşme saniyede %12,5.
- **Savaşta mı:** `h.combatT` (rakip kahramanla son hasar alışverişi, Demir Gövde kullanıyor) ve `h.ic.lastHurt` (her hasar) hazır.
- **Kitle kontrolü kancası:** `ccHit(e)` (applySlow, freezeHero, susturma, kök, itme, çekme) hazır; kaynağı (src) bilmiyor, bazı yeni pasifler için `ccHit(e, src)` gerekir.

## Mevcut tank/savunma eşyaları: kontrol

| Eşya | Bedel | Pasif | İsteğe göre durum |
|---|---|---|---|
| Ölümsüz Kalp (warmog) | 1300 | 6 sn hasarsız: sn'de %3 | İstek 1 var ama yenilenme statı yok, her hasar (minyon dahil) sayacı sıfırlıyor |
| Kök Kalbi (rootheart) | 1200 | 4 sn hasarsız: sn'de %1,5 | Ölümsüz Kalp ile aynı pasif (çakışma #15) |
| Titan Kalkanı (randuin) | 1150 | kritik hasar -%30, düz vurana saldırı hızı -%15 2 sn | **İstek 2 zaten var** (kritik azaltma + saldırı hızı düşürme). Statları ucuz (1,53) |
| Demir Duvar (ironwall) | 1150 | düz vuruş hasarı -%10 | Titan/Diken ile aynı rol |
| Büyü Duvarı (spellwall) | 1150 | büyü hasarı -%8 | İstek 6'nın "yüksek BD az can" örneği zaten |
| Kale Zırhı (fortress) | 1300 | direnç x1,10 | İstek 7 var ama zayıf ve pahalı (çakışma #18) |
| Taş Kuşak, Gümüş Zırh | 1100, 1200 | can <%30 direnç | Aynı pasif (#16) |
| Muska Çanı | 1100 | can <%25 yenilenme | Düşük can grubunun dördüncüsü (#16) |
| Yara Zırhı, Diken Zırhı | 1150 | iyileşme azaltma / yansıma | Aynı tarif, aynı rol (#17) |
| Rüzgar Pelerini | 1100 | hasar alınca %10 hız | Sessiz Bıçak ile aynı pasif (#11) |
| Tanrı Kalkanı, Son Nefes, Zafer, Güneş Ateşi, Şok Zırhı, Çelik Çizme, Yük Taşıyıcı, Ruh Örtüsü, Dalga Şarkısı | | | Ayrışık, korunur |

Eksikler: dürtmeye karşı eşya (İstek 3), yavaşlatan tank (İstek 4), savaşta biriken direnç (İstek 5), cansız direnç (İstek 6), çok YH veren tank (İstek 8; şu an en çok 11 YH), dosta kalkan veren tank, itilmeye karşı eşya, orman/Titan tankı.

## Özet: ne olur

| # | Eşya | Durum | Tarif | Bedel | Statlar | Pasif (kısa) | Oran |
|---|---|---|---|---|---|---|---|
| 1 | Ölümsüz Kalp | Değiştir | Yakut+Yakut+Şifa | 1250 | 375 can, 20 yen. | savaş dışı %2,5/sn; kule/çalıda daha erken | 1,27 |
| 2 | Kök Kalbi | Değiştir | Yakut+Şifa+Şifa | 1100 | 225 can, 30 yen. | yerinde durunca yenilenme x3 | 1,14 |
| 3 | Titan Kalkanı | Koru, sayı | Kumaş+Kumaş+Yakut | 1150 | 250 can, 30 zırh | kritik -%30, saldırana SH -%15 (aynı) | 1,30 |
| 4 | Diken Zırhı | Değiştir (Yara'yı emer) | Kumaş+Kumaş+Şifa | 1150 | 45 zırh, 12 yen. | yansıma + iyileşme -%40 | 1,04 |
| 5 | Serap Örtüsü | **Yeni** | Pelerin+Yakut+Şifa | 1100 | 30 BD, 175 can, 12 yen. | uzaktan ilk yetenek isabetine kalkan, atanı açığa çıkarır | 1,21 |
| 6 | Kum Batağı | **Yeni** | Kumaş+Yakut+Odak | 1275 | 175 can, 30 zırh, 10 YH | girişte ve sana vurana yavaşlatma | 1,27 |
| 7 | Obsidyen Deri | **Yeni** | Kumaş+Pelerin+Çizme | 1100 | 20 zırh, 20 BD, %4 hız | savaşta biriken zırh/BD, doluyken kontrol süresi kısa | 0,88-1,47 |
| 8 | Ay Kalkanı | **Yeni** | Kumaş+Pelerin+Odak | 1100 | 22 zırh, 22 BD, 12 YH, cansız | yetenek kullanınca dosta kalkan | 1,22 |
| 9 | Kale Zırhı | Değiştir | Kumaş+Kumaş+Pelerin | 1300 | 25 zırh, 25 BD, 150 can | toplam direnç +%12, kule altında +%24 | 1,16 (geç 1,6) |
| 10 | Kelepçe Mührü | **Yeni** | Yakut+Odak+Odak | 1150 | 200 can, 20 YH | kontrol ettiğin hedef dostlardan fazla hasar alır | 1,23 |
| 11 | Demir Çapa | Değiştir (Demir Duvar) | Kumaş x3 | 1050 | 50 zırh | itilmeye/çekilmeye direnç, duvar sersemi yok, gövde engeli | 1,06 |
| 12 | Rüzgar Pelerini | Değiştir (pasif) | Pelerin+Pelerin+Çizme | 1100 | 38 BD, 150 can, %6 hız | ıskalanan atış hız + kalkan | 1,30 |
| 13 | Vaha Mührü | **Yeni** | Yakut+Şifa+Kumaş | 1100 | 200 can, 20 zırh, 12 yen. | canavar hasarı az, kamp sonu iyileşme, Titan yarmasını üstlenir | 1,19 |
| - | Yara Zırhı | **Kaldır** | | | | Diken Zırhı'na | |
| - | Taş Kuşak | **Kaldır** | | | | Gümüş Zırh'a (#16) | |
| - | Muska Çanı | **Kaldır** | | | | düşük can grubu kalabalık; yenilenme rolü Kök Kalbi'nde | |

Net: 3 eşya kalkar, 6 yeni eklenir, 7 eşya değişir. Büyük eşya sayısı 88'den 91'e.

## Eşyalar

### 1. Ölümsüz Kalp (savaş dışı yenilenme, Warmog benzeri; değişir) - İstek 1
- **Tarif:** Yakut + Yakut + **Şifa Otu** (600) + 650 = **1250** (Yakut x3, 1300'den).
- **Statlar:** 375 can, 20 yenilenme (525 can, yenilenmesiz idi).
- **Maliyet:** 375 x 3,33 = 1250 + 20 x 16,67 = 333 → 1583 / 1250 = **1,27**.
- **Pasif (Kalp Atışı):** **5 sn** rakip şampiyon ya da kule hasarı almazsan saniyede azami canının **%2,5**'ini yenilersin. Minyon ve canavar hasarı sayacı sıfırlamaz ama vurulurken oran yarıya iner (%1,25). Dost kule menzilinde ya da bir çalının içindeyken bekleme **3 sn**.
- **Örnek:** 2400 canlı tank saniyede 60 can, yarı candan dolmaya 20 sn (çeşme 4 sn). Üsse dönüş (8 sn kanal + yürüyüş ~25-35 sn) yerine kule altında 20 sn beklemek bir seçenek olur, ama dalga ve XP kaybı yine var.
- **Seçim sorusu:** "Üsse dönmeden koridorda kalabilmek istiyor muyum?" Uzun koridor, dürtülen tank, ormancı tank.
- **Özgün dokunuş:** *Kule ve çalı.* Kule altında ya da çalıda saklanarak daha erken dolarsın; minyonlar yenilenmeni kesmez (koridorda dalga varken de çalışır), rakip kahramanın bir dürtmesi keser. Rakip için açık cevap: dürtme ya da Kara Alev (yanma iyileşmeyi %25 azaltır).
- **Yerini aldığı:** kendisi (sayılar ve sayaç kuralı). Kök Kalbi ile ortak `ooc` anahtarı biter (çakışma #15).
- **sim.js:** damage içinde `src.kind==='hero'||src.kind==='struct'` iken `e.ic.lastHurtHero=S.time`; itemTick'te `ooc` kontrolü bu sayaçla, `S.time-lastHurt<1` ise oran yarı. Kule menzili için `S.lane[team]` canlı yapılarından dist, çalı için `bushOf(h)`. Küçük.

### 2. Kök Kalbi (savaşta, yerinde yenilenme; değişir) - İstek 1
- **Tarif:** Yakut + **Şifa + Şifa** (600) + 500 = **1100** (Yakut+Yakut+Şifa'dan; tarif Ölümsüz Kalp'e verildi).
- **Statlar:** 225 can, 30 yenilenme (375 can, 18 yenilenme idi).
- **Maliyet:** 750 + 500 = 1250 / 1100 = **1,14** (pasif payı).
- **Pasif (Kök Salma):** **1 sn** yer değiştirmezsen (köklenmiş ya da sersem iken de) can yenilemen (5 sn'deki yenilenme statı) **3 katına** çıkar. Hareket edince hemen biter.
- **Örnek:** 15. seviye tank (18 yen.) + bu eşya (30) + Ölümsüz Kalp (20) = 68 → saniyede 13,6; yerinde 41. Dövüşte yerinde dururken tanka saniyede ~40 can: Zincirli Demir Gövde düzeyinin altında.
- **Seçim sorusu:** "Yerimi tutacak mıyım (kule savunması, kapıda durma, Kabuk ile oturma)?" Ölümsüz Kalp savaş dışında, Kök Kalbi savaşın içinde çalışır.
- **Özgün dokunuş:** *Kök ve fizik.* Rakibin kökü (Gölge Zincir) ve sersemi seni yenilemeye zorlar; tank kule kapısında durup minyon dalgasını karşılar. Kovalayan tankta işe yaramaz (bilerek).
- **Yerini aldığı:** kendisi. Muska Çanı'nın yenilenme rolünü alır.
- **sim.js:** updateHero yenilenme satırında (`heal(h, stat(h,'regen')/5*dt + ex)`) `B.rootRegen && h.ic.stillT>=1` ise regen x3. `ic.stillT` itemTick'te konum farkıyla (Yük Bobini `ic.px/py` gibi). Küçük.

### 3. Titan Kalkanı (kritik ve saldırı hızı azaltma, Randuin benzeri; koru, sayı) - İstek 2
- **Durum:** İstenen eşya **zaten var**: kritik hasarı %30 azaltır ve sana düz vuranın saldırı hızını 2 sn %15 düşürür (`critReduce`, `attackerAsSlow` → `st.titanSlow`). Yeni eşya eklenmez.
- **Tarif:** Kumaş + Kumaş + Yakut (600) + 550 = **1150** (aynı).
- **Statlar:** **250 can, 30 zırh** (300 can, 34 zırh: oran 1,53 ile en ucuz tank eşyasıydı).
- **Maliyet:** 833 + 666 = 1499 / 1150 = **1,30**.
- **Pasif:** aynı (kritik hasar -%30; sana düz vuran rakibin saldırı hızı 2 sn -%15, menzilli ve yakın aynı).
- **Seçim sorusu:** "Rakipte kritikli nişancı var mı?"
- **Özgün dokunuş:** *Ad.* "Titan" Vaha Titanı ve Titan Gücü ile karışıyor; ad değişikliği önerisi açık sorularda.
- **Bot:** defPick bugün yalnız fiziksel oranına bakıyor. Öneri: rakipte kritik eşyası (`crit>0`, S.intel ile görülen envanter) varsa zırh havuzunda Titan Kalkanı öne geçsin (tek satır).
- **sim.js:** yalnız sayı.

### 4. Diken Zırhı (yansıma + iyileşme azaltma; değişir, Yara Zırhı'nı emer)
- **Tarif:** Kumaş + Kumaş + **Şifa** (600) + 550 = **1150** (Titan Kalkanı ile aynı tarif olmasın diye Yakut yerine Şifa).
- **Statlar:** 45 zırh, 12 yenilenme (+100 taban can).
- **Maliyet:** 999 + 200 = 1199 / 1150 = **1,04** (iki pasif).
- **Pasif:** düz vuruş yiyince saldırana 15 + zırhının %10'u büyü hasarı (aynı) **ve** saldıranın iyileşmesi 3 sn **%40** azalır (Yara Zırhı'ndan).
- **Seçim sorusu:** "Rakip düz vurarak iyileşiyor mu (can çalma, Kan Lordu)?"
- **Özgün dokunuş:** yok, bilerek LoL ile aynı (oyunun temel "iyileşmeye karşı" cevabı; büyü tarafı Kara Alev).
- **sim.js:** `antiHeal` alanı Diken'e taşınır, `woundmail` silinir. Çakışma #17 çözülür.

### 5. Serap Örtüsü (dürtmeye karşı; yeni) - İstek 3, İstek 6
- **Tarif:** Büyü Pelerini + Yakut + Şifa Otu (600) + 500 = **1100** (tarifte çakışma yok).
- **Statlar:** 30 BD, 175 can, 12 yenilenme.
- **Maliyet:** 546 + 583 + 200 = 1329 / 1100 = **1,21**.
- **Pasif (Serap):** isabet anında senden **550**'den uzaktaki rakip şampiyonun yetenek hasarı gelmeden önce **40 + azami canının %7'si** kalkan kazanırsın (2 sn, kalkan önce bu vuruşu emer). **12 sn** bekleme. Ayrıca bu atışı yapan rakip 2 sn takımına görünür olur (sis ve çalı dahil).
- **Örnek:** 2000 canlı tank: 180 kalkan. Topçu Uzun Işın, Okçu Kalın Ok, Ateş Topu uç menzil, Ruh Patlaması gibi tek dürtme büyük ölçüde emilir; ikinci dürtme 12 sn içinde tam gelir.
- **Seçim sorusu:** "Beni uzaktan mı dürtüyorlar?" Yakın dövüş rakibe karşı boşa.
- **Özgün dokunuş:** *Mesafe ve sis.* Ufuk Merceği'nin (uzaktan isabete +%10) tam karşılığı: aynı 550-600 eşiği. Siste ya da çalıdan atan topçu açığa çıkar; tankın dostu ona yürüyebilir. Fiziksel ve büyü yetenekleri ikisi de sayılır (Kalın Ok büyü, Enerji Küresi fiziksel).
- **Yerini aldığı:** yeni. Büyü Duvarı (her büyüye -%8) ile ayrı soru: Büyü Duvarı "büyücüye karşı", Serap "mesafeye karşı".
- **sim.js:** damage içinde, kalkan emiminden önce: `EB.mirage && opts.skill && !opts.dot && src.kind==='hero' && dist(src,e)>=R && cd hazır` → `giveShield`; görünürlük Ufuk Merceği'nin `ic.markTeam/markUntil` alanıyla (src üzerinde). Küçük.

### 6. Kum Batağı (girişte ve vurulunca yavaşlatma; yeni) - İstek 4, İstek 8
- **Tarif:** Kumaş + Yakut + Odak Taşı (625) + 650 = **1275** (tarifte çakışma yok).
- **Statlar:** 175 can, 30 zırh, 10 YH.
- **Maliyet:** 583 + 666 + 375 = 1624 / 1275 = **1,27**.
- **Pasif (Batak):**
  - **Giriş:** atılış, sıçrama, yuvarlanma, ışınlanma ya da Meydan Okuma bitince, ya da Kanca ile rakip çekince, 250 içindeki rakip şampiyonlar **1 sn %15** yavaşlar. 6 sn bekleme.
  - **Karşılık:** sana düz vuran rakip şampiyon **1 sn %10** yavaşlar (aynı rakibe 3 sn'de bir).
- **Seçim sorusu:** "Dövüşü ben mi başlatıyorum, dostum beceri atışçısı mı?"
- **Özgün dokunuş:** *Kaçılabilir atış.* Yavaşlamış rakip yan adımla kaçamıyor (temel hız 200 ister). Tankın girişi dostun Ateş Topu, Kanca ya da Ağır Küre atışını neredeyse garantiye çevirir. Karşılık yavaşlatması kaçan nişancıyı da yakalatır.
- **Yerini aldığı:** yeni. Gece Maskesi ve Buz Asası (yetenek isabetinde) ile anahtar ayrı (`mire`); Titan Kalkanı saldırı hızını, Batak hareket hızını düşürür (ikisi birlikte alınabilir).
- **sim.js:** giriş için `h.dash` bitiş satırı (leapStrip/rollLand/duelHit'in yanında) ve `blinkLanding`, `hookPull`; tek fonksiyon `mireBurst(h)`. Karşılık damage içinde Titan Kalkanı satırının yanında `applySlow(src, 0.10, 1)` + `src.ic.mireT`. Tanrı Kalkanı ccHit'i tetiklenir (rakibin Tanrı Kalkanı varsa ona fayda: bilinçli etkileşim). Küçük.

### 7. Obsidyen Deri (savaşta biriken direnç; yeni) - İstek 5
- **Tarif:** Kumaş + Büyü Pelerini + Hafif Çizme (600) + 500 = **1100** (tarifte çakışma yok).
- **Statlar:** 20 zırh, 20 BD, %4 hız.
- **Maliyet:** 444 + 364 + 160 = 968 / 1100 = **0,88**; dolu katla (+16/+16) 1614 / 1100 = **1,47**; ortalama ~1,17.
- **Pasif (Taşlaşma):** rakip şampiyonun yeteneği sana isabet ettikçe **1 kat**; rakip şampiyonla savaştayken (son 3 sn'de hasar alışverişi, `combatT`) her **2 sn** 1 kat. Kat başına **+2 zırh, +2 BD** (en fazla **8 kat**: +16/+16). 5 sn savaş dışında saniyede 2 kat söner.
  - **Dolu Kabuk:** 8 katta sana uygulanan kitle kontrolü süreleri (sersem, kök, susturma, yavaşlatma) **%20 kısalır**.
- **Seçim sorusu:** "Dövüşler uzun mu sürüyor, ilk 3-4 saniyeyi atlatabilir miyim?" Patlama hasarına karşı zayıf (bilerek): o iş Son Nefes ve Kum Saati'nin.
- **Özgün dokunuş:** *Kaçılabilir atış.* Kat yalnız isabetle gelir: rakibin ıskaladığı atış seni sertleştirmez, tutturduğu her atış seni zorlaştırır. Dolu Kabuk oyunda olmayan bir stat (kontrol direnci) getirir; Tanrı Kalkanı (kontrolden sonra hasar azaltma) ile birlikte "kontrol yemeye hazır tank" yolu.
- **Yerini aldığı:** yeni. Gümüş Zırh (düşük canda direnç) ile ayrışır: biri süreye, biri cana bağlı.
- **sim.js:** `ic.obsN/obsT`; isabet: damage içinde `opts.skill && src.kind==='hero'`; savaş: itemTick'te `combatT`. stat() içinde zırh/BD ekleme (Yük Taşıyıcı satırı gibi). Kontrol süresi: applySlow, freezeHero, kök ve susturma atamalarında `t*=tenacity(e)` (tek yardımcı). Orta.

### 8. Ay Kalkanı (cansız direnç + YH + dosta kalkan; yeni) - İstek 6, İstek 8, destek
- **Tarif:** Kumaş + Büyü Pelerini + Odak Taşı (625) + 475 = **1100** (tarifte çakışma yok).
- **Statlar:** 22 zırh, 22 BD, 12 YH, **can yok** (`noBaseHp`).
- **Maliyet:** 488 + 400 + 450 = 1338 / 1100 = **1,22**.
- **Pasif (Ay Işığı):** yetenek kullanınca 500 içindeki en yakın **dost** kahramana **30 + senin zırh ve BD toplamının %60'ı** kalkan (2,5 sn). 10 sn bekleme. Dost yoksa çalışmaz (kendine vermez).
- **Örnek:** 15. seviye tank 140 zırh + 80 BD (eşyalarla) → 30 + 132 = 162 kalkan.
- **Seçim sorusu:** "2v2'de dostumu koruyacak mıyım?" 1v1'de yalnız statları.
- **Özgün dokunuş:** *Direnç dosta akar.* Tankın kendi dirençleri dostunun kalkanına çevrilir: zırh/BD yığan tank destekleşir. Can vermemesi Ruh Rehberi gibi büyücü desteklere de açık.
- **Yerini aldığı:** yeni. Kanat Kalkanı (kendine kalkan, `castShield`) ile çakışma #12'nin önerdiği "dosta kalkan" bu eşyaya verilir; Kanat Kalkanı kendine kalkan olarak kalabilir.
- **sim.js:** onCast içinde `B.allyShield` → `nearestAlly` (ai.js'te var, sim'de basit döngü) + `giveShield(ally, ...)`. Koruyucu Muska'nın `shieldAmp`'ı veren tarafta uygulanır. items.js ITEM_BASE_HP döngüsüne `noBaseHp` istisnası. Küçük.

### 9. Kale Zırhı (yüzdelik direnç, geç oyun; değişir) - İstek 7, İstek 9 (kule)
- **Tarif:** **Kumaş + Kumaş + Pelerin** (600) + 700 = **1300** (Yakut+Kumaş+Pelerin'den; çakışma #18'deki dörtlü tariften çıkar).
- **Statlar:** 25 zırh, 25 BD, 150 can (15/15/150 idi).
- **Maliyet:** 555 + 455 + 500 = 1510 / 1300 = **1,16**. Geç oyunda (180 zırh, 100 BD): +%12 = +22 zırh, +12 BD ≈ 700 altın değeri → **~1,6**.
- **Pasif (Sur):** toplam zırhın ve BD'n **%12** artar (%10 idi). Dost yapı (kule, üs kulesi, nexus) menzilindeyken **%24**.
- **Seçim sorusu:** "Elimde zaten çok direnç var mı?" 4. ya da 5. eşya; ilk eşya olarak kötü (bilerek).
- **Özgün dokunuş:** *Kule.* Kalesini savunan tank kule altında iki kat sağlam; kale korumasıyla (dalgasız kuşatma x0,6) birlikte son savunma hattı.
- **sim.js:** stat() içinde `resistMult` satırı: `1+R.pct*(nearOwnStruct(h)?2:1)`. `nearOwnStruct` tik başına önbellek (stat sık çağrılıyor). Küçük.

### 10. Kelepçe Mührü (kontrolcü tank, çok YH; yeni) - İstek 8, 2v2
- **Tarif:** Yakut + Odak + Odak (650) + 500 = **1150** (tarifte çakışma yok).
- **Statlar:** 200 can, **20 YH**.
- **Maliyet:** 667 + 750 = 1417 / 1150 = **1,23**.
- **Pasif (Mühür):** rakip şampiyona sersem, kök, susturma, çekme ya da itme uyguladığında hedef **3 sn** mühürlenir: **senin dışındaki** dost kahramanlardan aldığı hasar **%8** artar. Mühürlü hedefe senin ilk düz vuruşun ek olarak onun azami canının **%2**'si kadar büyü hasarı verir (yalnız 1v1'de de işe yarasın diye küçük pay).
- **Seçim sorusu:** "Benim işim kontrol, hasarı dostum mu veriyor?" Zincirli, Gülle, ileride kontrol tankları.
- **Özgün dokunuş:** *2v2 ve kontrol zinciri.* Uzman bot zaten sersemlemiş hedefe kontrol atmıyor; mühür bu zinciri dosta hasar penceresine çevirir. Yavaşlatma tetiklemez (Batak ile döngü olmasın).
- **Yerini aldığı:** yeni. Tanrı Kalkanı (kontrol YİYİNCE) ile ayna: bu kontrol VERİNCE.
- **sim.js:** `ccHit(e, src)` kaynak parametresi (freezeHero, kök, susturma, hookPull, shoveStart çağrıları); damage içinde `e.ic.sealT>S.time && src.team===e.ic.sealTeam && src!==e.ic.sealBy` çarpanı. Orta (çağrı yerleri çok).

### 11. Demir Çapa (itilmeye karşı, gövde engeli; değişir, Demir Duvar yerine) - İstek 9
- **Tarif:** Kumaş x3 (600) + 450 = **1050** (aynı tarif, 1150'den).
- **Statlar:** 50 zırh (+100 taban can) (55 zırh, 75 can idi).
- **Maliyet:** 1110 / 1050 = **1,06** (pasif payı).
- **Pasif (Çapa):**
  - Sana uygulanan itme ve çekme mesafesi **%35 kısalır** (Kanca, Darbe, Bilardo, Büyü Kılıcı, Gülle Momentum itmesi).
  - İtilip duvara çarpınca **sersemlemezsin** (hasarı yine alırsın).
  - **Gövde:** 200 içindeki rakip kahramanla çarpışmada kütlen **2 kat** sayılır: onu itersin, o seni itemez (kapı tutma, kaçanın önünü kesme).
- **Seçim sorusu:** "Rakipte Kanca, Darbe ya da Gülle var mı? Yolu ben mi tutacağım?"
- **Özgün dokunuş:** *Fizik.* Oyunun gerçek kütle ve itme sistemine doğrudan cevap; LoL'de karşılığı olmayan rol. Kabuk/Bilardo gibi tam itilmezlik değil (onlar kahramanın imzası kalsın).
- **Yerini aldığı:** Demir Duvar (düz vuruş -%10; Titan ve Diken ile aynı soruyu yanıtlıyordu).
- **sim.js:** shoveStart ve pullStep mesafesinde `*(1-B.anchor.push)`; duvar sersemi `freezeHero` çağrısında koşul; çarpışma `collideUnits` içinde kahraman-kahraman kütle çarpanı (minyonun x6'sı gibi). Orta.

### 12. Rüzgar Pelerini (ıskalanan atış ödülü; pasif değişir) - İstek 9
- **Tarif:** Pelerin + Pelerin + Çizme (600) + 500 = **1100** (aynı).
- **Statlar:** 38 BD, 150 can, %6 hız (aynı). Maliyet 692 + 500 + 240 = 1432 / 1100 = **1,30**.
- **Pasif (Esinti):** rakip şampiyonun beceri atışı (mermi ya da kaçılabilir şerit) **350** içinden geçip **sana değmezse** 2 sn **%15 hareket hızı** ve **30 + azami canının %3'ü** kalkan kazanırsın. 5 sn bekleme.
- **Seçim sorusu:** "Rakip beceri atışına mı dayanıyor, ben yan adım atabiliyor muyum?"
- **Özgün dokunuş:** *Kaçılabilir atış.* Iska bizde gerçek; yan adımı ödüllendiren eşya. Yavaşken kaçamadığın için Batak ve Buz Asası'nın doğal karşılığı.
- **Yerini aldığı:** kendi `hurtMs` pasifi (Sessiz Bıçak ile çakışma #11 çözülür).
- **sim.js:** updateProjectiles: mermi her tik rakip kahramanlara en yakın geçişi `p.near[id]` olarak yazar; mermi bittiğinde (menzil sonu, patlama) `p.hit` içinde olmayan ve near<=350 olanlara `dodgeProc`. Şerit atışları (Uzun Işın) hazırlık sonunda aynı kontrol. Orta.

### 13. Vaha Mührü (ormancı tank ve Titan; yeni) - İstek 9
- **Tarif:** Yakut + Şifa + Kumaş (600) + 500 = **1100** (Taş Kuşak'ın tarifi; o kalkıyor).
- **Statlar:** 200 can, 20 zırh, 12 yenilenme.
- **Maliyet:** 667 + 444 + 200 = 1311 / 1100 = **1,19**.
- **Pasif (Vaha Bekçisi):**
  - Canavarlardan aldığın hasar **%20** azalır.
  - Kamp temizlenince (son vuruş ya da kampta XP alan) azami canının **%6**'sını yenilersin.
  - **Titan:** Vaha Titanı sana vururken onun yarma hasarı (hedef çevresine %60) 500 içindeki dostlarına **%50** az gelir.
- **Seçim sorusu:** "Ormancı tank mıyım, Titan'ı biz mi alacağız?"
- **Özgün dokunuş:** *Orman ve Titan.* Titan'ı tank tutarken dostun yarmadan korunur; Titan dövüşü takım işi olur.
- **Yerini aldığı:** Taş Kuşak'ın tarifi.
- **sim.js:** damage içinde `src.kind==='monster'` çarpanı; killMonster içinde kamp temizliği (orman hakimiyeti `h.jm` sayıldığı yer); Titan yarması (updateMonster big) hedefin `bonus.titanWard` kontrolü. Küçük.

## Mevcut eşyalarla ilişki

| Eşya | Karar | Not / çakışma |
|---|---|---|
| Ölümsüz Kalp | Değiştir | #15 çözülür (Kök Kalbi ayrı pasif) |
| Kök Kalbi | Değiştir | #15 |
| Titan Kalkanı | Koru, sayı | İstek 2 bu; ad sorusu açık |
| Diken Zırhı | Değiştir | #17: Yara Zırhı'nı emer, tarif Şifa'lı |
| Yara Zırhı | Kaldır | #17 |
| Demir Duvar | Değiştir → Demir Çapa | #17 benzeri rol çakışması |
| Büyü Duvarı | Koru | İstek 6 "çok BD, az can" |
| Ruh Örtüsü | Koru | #14 healAmp: computeBonus'a "en büyüğü" kuralı önerilir (Ölümsüz Kalp ve Kök Kalbi ile güzel çalışır) |
| Rüzgar Pelerini | Değiştir (pasif) | #11 |
| Kale Zırhı | Değiştir | #18: tarif ayrılır |
| Taş Kuşak | Kaldır | #16: Gümüş Zırh'a; tarifi Vaha Mührü'ne |
| Gümüş Zırh | Koru | #16 (tek lowHpRes) |
| Muska Çanı | Kaldır | #16 |
| Son Nefes Kalkanı | Koru | #16 (patlamaya karşı) |
| Zafer Zırhı | Koru | #18 (tarif ortak kalır, rol ayrı) |
| Tanrı Kalkanı | Koru | Obsidyen Deri ve Kelepçe ile "kontrol" üçlüsü |
| Güneş Ateşi, Şok Zırhı | Koru | Şok Zırhı ile Gümüş Zırh aynı tarif (Şifa+Kumaş+Pelerin), sorun küçük |
| Çelik Çizme | Koru | slowResist yavaşlatmaya, Obsidyen'in kontrol direnci hepsine (ikisi çarpılır) |
| Yük Taşıyıcı, Dalga Şarkısı | Koru | |
| Kanat Kalkanı (Destek) | Koru | #12: dosta kalkan Ay Kalkanı'nda; Kanat kendine kalır |

## Bot ve DEF havuzu etkisi

Önerilen havuzlar (items.js DEF_POOLS; liste sırası = öncelik, defPick ilk boş olanı alır):

```
tank:   armor: ['randuin','thorn','mire','ironwall','steelboot','sunfire']      // woundmail, stonebelt çıkar; ironwall = Demir Çapa
        mr:    ['visage','mirage','spellwall','windcloak']                     // Serap Örtüsü eklenir
        mix:   ['triumph','obsidian','lastshield','silverguard','fortress']
caster: armor: ['hourglass','emberward','randuin']                              // stonebelt, woundmail çıkar
        mr:    ['mirage','windcloak','visage','spellwall']                     // büyücüler için Serap önde (dürtme düellosu)
        mix:   ['silverguard','lastshield','triumph']
```

- Kök Kalbi, Ay Kalkanı, Kelepçe Mührü, Kale Zırhı ve Vaha Mührü havuz dışı (durum eşyası): BUILDS'e elle girer. Öneri: `hook` ve `roller` için `buyu`/`tank` dalına Kelepçe Mührü; ormancı rolündeki tank için (resetGame `h.role==='jungle'`) ilk eşya Vaha Mührü (ayrı yuva `'JG'` gibi; ileride).
- Bot, 5 yuva dolunca satmadığı için Kale Zırhı yalnız 4.-5. sırada mantıklı (`fortress` mix havuzunun sonunda kalır).
- Kritik farkındalığı: defPick'e "rakipte kritik eşyası varsa Titan Kalkanı" kuralı (S.intel görülen envanter).
- Dürtme farkındalığı (ileride): rakibin uzaktan yetenek hasarı oranı yüksekse (ic.taken'e mesafe kaydı) Serap öne geçer.
- Bot davranışı gerekmeyenler: hepsi pasif. Rüzgar Pelerini zaten botun kaçınmasından (dodgeVec) yararlanır; Kök Kalbi için "yerinde dur" davranışı eklenmez.
- Çevirisi gereken metin: itemdesc.js PASSIVES'e yeni anahtarlar (`mirage`, `mire`, `obsidian`, `allyShield`, `seal`, `anchor`, `dodgeWind`, `oasis`, `rootRegen`, Kale'nin `fortress` yapısı).
- Değişiklikler 1v1 ve 2v2 sonuçlarını bozar. Sonrasında kısa tarama: `teams2v2.js --fast 1`, 4 bulut parçası, `--diff expert`.

## Arketip x eşya kapsama

T = temel seçim, + = iyi, · = durum.

| Eşya | Tank (Zincirli, Gülle) | Dövüşçü (Savaşçı, Gladyatör, İkili) | Ön saf büyücü (Alev, Kan Lordu) | Destek (Ruh) | Ormancı |
|---|---|---|---|---|---|
| Ölümsüz Kalp | T | + | + | · | + |
| Kök Kalbi | + | · | + | · | · |
| Titan Kalkanı | + | T | · | · | · |
| Diken Zırhı | + | + | · | | · |
| Serap Örtüsü | + | + | T | T | · |
| Kum Batağı | T | + | + | · | + |
| Obsidyen Deri | + | T | + | | · |
| Ay Kalkanı | + | · | · | T | |
| Kale Zırhı | T (geç) | + (geç) | · | | · |
| Kelepçe Mührü | T | · | + | + | + |
| Demir Çapa | + | + | · | | · |
| Rüzgar Pelerini | · | + | + | + | |
| Vaha Mührü | + | + | · | | T |

İstek eşlemesi: 1 → Ölümsüz Kalp, Kök Kalbi · 2 → Titan Kalkanı (var) · 3 → Serap Örtüsü · 4 → Kum Batağı · 5 → Obsidyen Deri · 6 → Serap, Ay Kalkanı (cansız), Büyü Duvarı, Ruh Örtüsü, Rüzgar Pelerini · 7 → Kale Zırhı · 8 → Kelepçe (20 YH), Ay Kalkanı (12), Kum Batağı (10) · 9 → Demir Çapa (kütle), Ay Kalkanı (dosta kalkan), Kale Zırhı (kule), Vaha Mührü (Titan), Rüzgar Pelerini (ıska).

## Açık sorular (Kayra)

1. Ölümsüz Kalp: minyon hasarı sayacı sıfırlamasın mı (önerilen), yoksa yalnız oranı mı düşürsün? Kule/çalı erken başlama fazla mı?
2. Titan Kalkanı'nın adı Vaha Titanı ve Titan Gücü ile karışıyor. Değişsin mi (ör. "Kum Kalkanı", "Dev Kalkanı")?
3. Yara Zırhı, Taş Kuşak ve Muska Çanı kaldırılsın mı? Demir Duvar'ın yerine Demir Çapa onaylı mı?
4. Ay Kalkanı gerçekten cansız mı olsun (`noBaseHp`, taban +100 can kuralının ilk istisnası)?
5. Obsidyen Deri'nin kontrol süresi kısaltması (oyunda olmayan yeni stat) kabul mü? Yoksa doluyken yalnız ek direnç mi?
6. Kelepçe Mührü 1v1'de zayıf (yalnız %2 vuruş); bu kabul mü, yoksa yalnız 2v2 eşyası diye işaretlensin mi?
7. Rüzgar Pelerini'nin "ıska" kontrolü merminin geçiş mesafesine bağlı (orta kod). Değer mi, yoksa daha basit bir pasif mi?
8. Yeni eşyaların simgeleri (assets/items) üretilsin mi (6 yeni)?

## Diğer kategoriler için yaratıcı pasif fikirleri

1. **YG, çalı pususu:** çalıdan çıktıktan sonraki 1,5 sn içinde ilk yetenek isabeti hedefi 1 sn köklendirir (20 sn bekleme). Sis ve çalı ilkesi.
2. **YG, sekme atışı:** duvara değen mermi (yetenek) bir kez seker ve %50 hasarla devam eder. Harita duvarları oyunun parçası olur.
3. **YG, uzun kanal:** kanallanan yeteneklerde (Kilitli Yaylım, Kök Sal) her saniye +%6 hasar (en fazla %24).
4. **SG, kaçana vuruş:** senden uzaklaşan rakibe düz vuruş %8 fazla ve 0,5 sn %10 yavaşlatır (kovalamaca eşyası; yönü hız vektöründen).
5. **SG, minyon kalkanı kırıcı:** rakip kahramanın 300 içindeki her rakip minyon başına ona %3 ek hasar (dalga arkasına saklanana karşı).
6. **SG, son vuruş ritmi:** minyona son vuruş 2 sn %10 saldırı hızı ve 5 altın; kuleye 3 vuruşta bir ek 30 hasar (kuşatma nişancısı).
7. **Destek, dost kurtarma:** canı %30 altına düşen 600 içindeki dosta doğru hareket ederken %20 hız; ona ulaşınca ikinize 60 + %5 can kalkanı (40 sn).
8. **Destek, ortak dönüş:** üsse dönüş kanalına başlayan dostunun yanında (300) beklersen ikinizin dönüşü 6 sn sürer.
9. **Destek, işaret ışığı:** yetenek isabeti rakibi 3 sn görünür kılar ve dostunun ona ilk beceri atışı 1,2 kat hızlı mermiyle gider (kaçılabilirliği azaltır).
10. **Hareket, rüzgâr hattı:** aynı yönde 2 sn yürüyünce arkanda 2 sn kalan bir iz bırakırsın; izdeki dostlar %10 hızlı (Momentum'un takım sürümü).
11. **Hareket, kule geçidi:** dost kule menzilinden çıkarken 3 sn %20 hız (40 sn bekleme); kuleden kaçış değil çıkış eşyası.
12. **Orman, sessiz av:** rakip ormanındaki kampta son vuruş +%30 altın verir ve o kampın ölümü rakibin kamp bilgisine (S.intel) düşmez: rakip kampı canlı sanır.

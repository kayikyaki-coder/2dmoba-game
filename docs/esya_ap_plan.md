# Yetenek Gücü (YG) eşyaları planı (taslak, 16.10.2026)

Yalnız tasarım taslağı: hiçbir kod ya da sayı değişmedi. Kaynaklar: items.js, itemdesc.js, sim.js "eşyalar" bölümü, docs/esya_cakisma.md.

## Bizi LoL'den ayıran ilkeler

1. **Aktif yok, her şey pasif tetik.** Eşyaların tuşu yok (Kum Saati tek istisna, o da pasife dönüyor). Etkiler yetenek isabeti, düz vuruş isabeti, ölüm, düşük can, mesafe, süre ile tetiklenir.
2. **Beceri atışı kaçılabilir.** Rakip yan adımla kaçabiliyor (yavaşken kaçamıyor). Bu yüzden isabet ödüllendirilir, ıska cezalandırılmaz: yük beklemede kalır, yavaşlatma sonraki atışı kolaylaştırır.
3. **Fizik gerçek.** Kütle, çarpışma, itme ve duvara çarpma (sersem) oyunun parçası; bazı eşyalar itme verir ya da kütleyle oynar.
4. **Sis ve çalı.** Görünmeden vurmak, görünür kılmak ve çalıda pusu kurmak eşya etkisi olabilir (sim.js canSee, visiblePos, S.sights).
5. **Harita ve takım.** 2v2'de dosta etki, orman güçlendirmeleri ve Titan, kuleler (kale koruması x0,6), 8 sn üsse dönüş eşya tetiklerine bağlanır.
6. **Her eşya tek bir soruya cevap.** Mağazada "bunu ne zaman alırım" sorusu tek cümleyle yanıtlanabilmeli; aynı soruyu yanıtlayan iki eşya olmamalı.

## Oyuna özgü kısıtlar

- **Aktif yok:** yeni eşyaların hepsi pasif. Kum Saati'nin aktifi (stasis, `cmd.item`) pasife çevrilmesi öneriliyor.
- **5 yuva** (SLOTS). Temel parça da yuva kaplar. Bot 5 yuva dolunca alışverişi bırakır (satmaz).
- **Kritik sınırı** büyük eşya başına %25; YG eşyalarında kritik yok, etkilemiyor.
- **Yetenek hızı:** bekleme x 100/(100+yh). Yüzdelik bekleme azaltma yok. 25 yh: x0,80; 50 yh: x0,67. Azalan getiri formülün içinde.
- **Fiyat aralığı:** büyük eşya ~850-1000 x1,3 = **1100-1300**. Kural: stat değeri (parça fiyatlarından) / bedel ortalama **1,27** (yeni eşyalar); pasifi güçlü olanda oran düşük.
- **Taban can:** canı olmayan her büyük eşyaya +100 can (ITEM_BASE_HP); fiyata sayılmaz, aşağıdaki hesaplarda yok.
- **Düz vuruşlar hedefli** (güdümlü, ıskalamaz). Düz vuruş eşyalarında "isabet" her vuruştur; yetenek eşyalarında isabet kaçılabilir.
- **Yakma sistemi:** üç ayrı yer var. `h.st.burn/ignite/bflame` (hedef başına TEK kaynak, yenisi eskisini ezer; 2v2'de iki Kara Alev'li aynı hedefe yakarsa biri kaybolur) ve `S.dots` (kaynak başına ayrı kayıt, `{tgt,src,dps,t}`, Yakıcı güçlendirmesi). Yeni yakmalar `S.dots` üstüne, `kind` alanıyla kurulmalı. DoT hasarı `dot:true`, yetenek değil (`skill` yok), eşya tetiklerini çalıştırmaz.
- **Canavar çarpanı:** düz vuruş dışındaki kahraman hasarı (DoT dahil) canavara x1,6 (JUNGLE.skillMult). Yakma eşyası canavara çalışırsa orman hızı artar.
- **Pasifler eşsiz** (computeBonus `B[k]=v`): aynı anahtar birikmez, sonraki eşya geçerli. Yeni rollerde ortak anahtar kullanılmamalı.

### Birim stat değerleri (parça fiyatından)

| Stat | Parça | Birim değer |
|---|---|---|
| YG | Büyü Kitabı 225 / 11 | 20,45 |
| Yetenek hızı | Odak Taşı 225 / 6 | 37,5 |
| Can | Yakut 200 / 60 | 3,33 |
| Zırh | Kumaş 200 / 9 | 22,2 |
| Büyü direnci | Büyü Pelerini 200 / 11 | 18,2 |
| Hareket hızı %1 | Hafif Çizme 200 / 5 | 40 |
| Saldırı hızı %1 | Hançer 225 / 7 | 32,1 |

## Mevcut YG eşyaları ve öneri

| Eşya | Bedel | Statlar | Pasif | Değer/bedel | Öneri |
|---|---|---|---|---|---|
| Büyücü Şapkası (dcap) | 1300 | 83 YG | YG x1,3 | 1,31 | **Değiştir** (rol 4, koşullu çarpan + sis) |
| Boşluk Asası (void) | 1175 | 53 YG + Pelerin | %35 büyü delme | 0,92+ | Koru |
| Kara Alev (blackflame) | 1175 | 60 YG, 150 can | 3 sn'de azami canın %4'ü | 1,47 (ucuz) | **Değiştir** (rol 1, Yakma A) |
| Zaman Asası (time) | 1150 | 56 YG, 19 YH, %4 hız | yok | 1,75 (çok ucuz) | **Değiştir** (rol 6, az YG çok YH) |
| Kum Saati (hourglass) | 1175 | 45 YG, 30 zırh | Aktif: 2 sn stasis | 1,35 | **Değiştir** (rol 12, pasif) |
| Yankı Asası (echo) | 1175 | 49 YG, 11 YH | sonraki yetenek +60 + %20 YG | 1,20 | **Değiştir** (rol 3) |
| Büyü Kılıcı (lich) | 1225 | 60 YG, 8 YH, %6 hız | yetenek sonrası vuruş 50 + %75 YG | 1,44 (ucuz) | **Değiştir** (rol 10). Not: items.js desc "60" diyor, veri 50 |
| Büyü Nüfuzu (magpen) | 1175 | 53 YG | 15 sabit delme | | **Kaldır**, Cam Kırıcı'ya birleştir (çakışma #4) |
| Ateş Dişi (fang2) | 1175 | 53 YG, 11 YH | düz vuruş %20 YG | 1,20 | **Kaldır**, yerine Akkor Asası (rol 2; aynı tarif). Çakışma #5 |
| Kanlı Kitap (bloodtome) | 1225 | 23 YG, 188 can, 11 YH | canın %2'si YG | | Koru |
| Can Pınarı (spring) | 1175 | 30 YG, 225 can | yetenekle iyileşme | | Koru |
| Uçurum Maskesi (abyss) | 1200 | 34 YG, 225 can | 400 içi BD -(9+sv) | | Koru (takım/tank sürümü; Kor Maskesi'nden ayrı) |
| Buz Asası (frostrod) | 1175 | 53 YG, 11 YH | yetenek %15 yavaş 1 sn | 1,27 | **Değiştir** (rol 7, can ekle) |
| Cam Kırıcı (glassbreak) | 1175 | 49 YG, %6 hız | 12 sabit delme | 1,06 | Koru, delme 15'e çıkar (Nüfuz'u emer) |
| Cadı Bıçağı (witchblade) | 1200 | 43 YG, %17 SH | düz vuruş %25 YG | 1,19 | **Değiştir** (rol 9) |
| Son Darbe Asası (finalrod) | 1225 | 53 YG, 11 YH | can <%30 rakibe +%10 | | Koru |
| Çöküş Asası (collapse) | 1175 | 49 YG, 11 YH | düşük canlı rakipte patlama | | Koru |
| Zaman Kumu (timeglass) | 1150 | 41 YG, 11 YH | öldürmede r/e beklemesi -%50 | | Koru |
| Çağ Kitabı (agetome) | 1175 | 38 YG, 113 can | dakikada +4 YG +18 can | 0,98 | **Değiştir** (rol 5, küçük ek) |
| Kan Kasesi, Ateş Kalkanı, Yaşam Taşı | | savaşçı büyücü | | | Koru |
| Koruyucu Muska, Esinti Asası, Şifa Çanı | | destek | | | Koru |
| (yeni) Ufuk Merceği | | | | | **Ekle** (rol 8) |
| (yeni) Kor Maskesi | | | | | **Ekle** (rol 11) |

Net: 2 eşya kaldırılır (Büyü Nüfuzu, Ateş Dişi), 2 yeni eklenir (Ufuk Merceği, Kor Maskesi), 1 yeni Ateş Dişi'nin yerine girer (Akkor Asası). Büyük eşya sayısı 88'den 88'e (değişmez).

## Eşyalar

### 1. Kara Alev (Yakma A, azami can yüzdesi; değişir)
- **Tarif:** Büyü Kitabı + Büyü Kitabı + Yakut (650) + 525 birleştirme = **1175**.
- **Statlar:** 50 YG, 150 can (60 YG'den düşer).
- **Maliyet:** 50 x 20,45 = 1023 + 150 x 3,33 = 500 → 1523 / 1175 = **1,30**.
- **Pasif (Kara Alev):** yetenek isabeti rakip şampiyonu 3 sn boyunca toplam **azami canının %5'i** kadar büyü hasarıyla yakar (%4'ten). Yanan rakibin iyileşmesi ve can yenilenmesi **%25 azalır**. Yeni isabet süreyi yeniler, birikmez. Yalnız şampiyon.
- **Seçim sorusu:** "Rakip canlı mı (tank, can eşyası)?" Evet ise Kara Alev. Kural: rakibin canı **400 + 5 x YG**'nden fazlaysa Kara Alev, azsa Akkor Asası.
- **Özgün dokunuş:** *Tank yenilenmesine karşı.* Bizim tanklar yenilenmeyle yaşıyor (Zincirli Demir Gövde, Kök Kalbi, Ölümsüz Kalp, Yenilenme güçlendirmesi). Yenilenme `heal()` içinden geçtiği için yanma onu da keser. Ayrıca yalnız yetenek isabetiyle tetiklenir: kaçılabilir beceri atışını tutturmanın ödülü.
- **Yerini aldığı:** kendisi (sayılar). Yara Zırhı'nın (antiHeal) büyücü karşılığı gibi çalışır, ayrı eşya gerekmez.
- **sim.js:** mevcut `skillBurn` + `st.bflame`. Yeni kod: (a) yakmayı `S.dots`'a taşı (2v2'de iki kaynak ezmesin), (b) yanarken `e.ic.woundUntil/woundPct` (Yara Zırhı mekanizması, büyük olanı al). Küçük.

### 2. Akkor Asası (Yakma B, YG ölçekli; yeni, Ateş Dişi'nin yerine)
- **Tarif:** Büyü Kitabı + Büyü Kitabı + Odak Taşı (675) + 475 = **1150** (Ateş Dişi'nin tarifi; yeni tarif çakışması yok).
- **Statlar:** 49 YG, 11 YH.
- **Maliyet:** 1002 + 413 = 1415 / 1150 = **1,23** (pasif payı).
- **Pasif (Akkor):** yetenek isabeti hedefi 3 sn boyunca toplam **20 + YG'nin %25'i** kadar büyü hasarıyla yakar. Şampiyon, minyon ve canavarda çalışır (yapıda yok). Yenilenir, birikmez. **Yanan hedef ölürse** kalan süreyle 300 içindeki en yakın rakibe sıçrar (kahraman öncelikli, bir kez).
- **Örnek karşılaştırma** (3 sn'de toplam):

| | YG 100 | YG 250 |
|---|---|---|
| Akkor | 45 | 82 |
| Kara Alev, rakip 1000 can | 50 | 50 |
| Kara Alev, rakip 2800 can | 140 | 140 |

- **Seçim sorusu:** "Çok YG'm olacak mı, rakip canı az mı?" İkisi de evetse Akkor. Akkor ayrıca dalga ve kamp temizler, Kara Alev temizlemez.
- **Özgün dokunuş:** *Ölümde sıçrama ve sis.* Dalgada ya da kampta ölen birimden yanma bir sonrakine geçer; 2v2'de ölen rakipten dostuna atlar. Yanan rakip çalıda ya da siste olsa da yanma süresince görünür kalır (çalıya kaçana karşı).
- **Yerini aldığı:** Ateş Dişi (kaldırılır; düz vuruş YG rolü Cadı Bıçağı'nda kalır).
- **sim.js:** `S.dots` (burnHit'teki gibi `{tgt,src,dps,t,kind:'ember'}`), sıçrama için `kill()` içinde yanan hedef kontrolü (bounceTarget benzeri arama), görünürlük için `visiblePos`/`S.sights` (Kök Sal görüşünün aynısı). Yeni kod: orta.

### 3. Yankı Asası (ani hasar, Luden benzeri; değişir)
- **Tarif:** Kitap + Kitap + Odak (675) + 500 = **1175** (aynı).
- **Statlar:** 49 YG, 11 YH (aynı). Maliyet 1415 / 1175 = **1,20**.
- **Pasif (Yankı):** 10 sn'de bir yük dolar. Yüklüyken bir sonraki yetenek isabeti rakip şampiyona ek **50 + YG'nin %25'i** büyü hasarı verir (60 + %20'den) ve isabet noktasından 300 içindeki en yakın başka rakibe (kahraman öncelikli, yoksa minyon) **%50**'si kadar seker.
- **Seçim sorusu:** "Tek atışla dürtüp çekilecek miyim?" Kısa beklemeli dürtme yeteneği olana.
- **Özgün dokunuş:** *Iska tesellisi ve 2v2.* Yük yalnız rakip şampiyona isabette harcanır: ıskalanan beceri atışı ya da minyona çarpan mermi yükü yakmaz, sonraki atışta bekler. Sekme 2v2'de ikinci rakibe gider (dost yanındaki rakibe ikili dürtme).
- **Yerini aldığı:** kendisi.
- **sim.js:** `echo` + `ic.pendMagic`. Değişen: harcama koşuluna `e.kind==='hero'`, sekme için Sekme'nin `bounceTarget` mantığı. Küçük.

### 4. Büyücü Şapkası (YG çarpanı, Rabadon benzeri; değişir)
- **Tarif:** Kitap x3 (675) + 625 = **1300**.
- **Statlar:** 83 YG (aynı). Maliyet 1697 / 1300 = **1,31**.
- **Pasif (Taşkınlık):** toplam YG **%15** artar, envanterdeki her başka YG veren büyük eşya için **+%5** (en fazla %35).
- **İkinci pasif (Gölgeden Büyü):** seni göremeyen rakip şampiyona (sen siste ya da çalıdasın, ya da rakip seni görmüyor) yaptığın ilk yetenek isabeti **%10** fazla hasar verir. 6 sn bekleme.
- **Seçim sorusu:** "Bu maç tam YG mi gideceğim?" 3. eşya ve sonrasında; erken alınınca zayıf.
- **Özgün dokunuş:** *Sis ve çalı.* Görünmeden açılan ilk atış güçlüdür (çalıdan pusu, sisten uzun atış).
- **Yerini aldığı:** kendisi.
- **sim.js:** `apMult` (stat içinde) koşullu yapılır (`computeBonus` YG'li eşya sayısını yazar). Görünmezlik için `canSee(e, src)` atış anında. Küçük.

### 5. Çağ Kitabı (zamanla güçlenen; küçük ek)
- **Tarif:** Kitap + Kitap + Yakut (650) + 525 = **1175** (aynı).
- **Statlar:** 38 YG, 113 can. Maliyet 1154 / 1175 = **0,98** (10 kat sonrası 78 YG, 293 can: 2572 / 1175 = 2,19).
- **Pasif (Çağlar):** satın aldıktan sonra dakikada +4 YG ve +18 can (10 kat). **Ek:** kahraman öldürme ya da asist, Titan ölümü (takım) ya da güçlendirme kampında son vuruş sıradaki katı hemen verir ve dakika sayacı baştan başlar. Ölünce kat kaybı yok (Mejai'den farkı: güvenli).
- **Seçim sorusu:** "Maç uzun mu sürecek, erken alabilir miyim?" İlk ya da ikinci eşya olarak.
- **Özgün dokunuş:** *Orman ve Titan.* Kamp ve Titan kontrolü kitabı hızlandırır; ormancı büyücüye ya da Titan'a giden takıma ödül.
- **Yerini aldığı:** kendisi. Mejai benzeri ayrı eşya gerekmez.
- **sim.js:** `scale` + `ic.scaleAt`. `kill()` ve `killMonster()` içinde `scaleAt -= 60`. Küçük.

### 6. Zaman Asası (az YG, çok yetenek hızı; değişir)
- **Tarif:** Kitap + Odak + Odak (675) + 475 = **1150** (aynı).
- **Statlar:** **26 YG, 25 YH** (56 YG, 19 YH, %4 hızdan).
- **Maliyet:** 26 x 20,45 = 532 + 25 x 37,5 = 938 → 1470 / 1150 = **1,28** (eskisi 1,75: çok ucuzdu).
- **Pasif (Ritim):** sağ tık ve E'yi sırayla kullanınca (r sonra e ya da e sonra r, 4 sn içinde) ikincinin beklemesi **%15** kısalır (Boşluk hariç). **Kum Akışı:** üsse dönüş kanallarken beklemeler 2 kat hızlı akar.
- **Seçim sorusu:** "Hasarım yetenek sayısından mı geliyor?" Kısa beklemeli, çok atışlı kahramanlar (Ruh, Topçu Odak, Kan Lordu).
- **Özgün dokunuş:** *8 sn üsse dönüş.* Dönüş kanalında 8 sn'lik beklemenin 16 sn'si erir; üsten hazır yeteneklerle çıkarsın.
- **Yerini aldığı:** kendisi. Zaman Kumu (öldürmede bekleme) ile ad yakın; Zaman Kumu adı değişebilir (açık soru).
- **sim.js:** yeni kod: `tryCast` sonrasında `ic.lastKey/lastT`, `updateHero` bekleme akışında `recallCh` çarpanı. Küçük.

### 7. Buz Asası (YG + can + yavaşlatma, Rylai benzeri; değişir)
- **Tarif:** **Kitap + Yakut + Yakut** (625) + 575 = **1200** (Kitap+Kitap+Odak'tan; çakışma #24'ü azaltır, Can Pınarı ile aynı tarif olur).
- **Statlar:** **34 YG, 250 can** (53 YG, 11 YH'den).
- **Maliyet:** 695 + 833 = 1528 / 1200 = **1,27**.
- **Pasif (Kırağı):** yetenek isabeti rakip şampiyonu 1 sn **%20** yavaşlatır. Aynı hedefe 2 sn içinde her yeni isabet +%5 (en fazla %30). DoT ve alan tikleri tetiklemez.
- **Seçim sorusu:** "Rakibim kaçıyor mu, takip ya da kaçış için yavaşlatma lazım mı?"
- **Özgün dokunuş:** *Kaçılabilir beceri atışı.* Bizde yavaşlamış rakip yan adımla kaçamıyor (kaçış temel hız 200 ister). İlk isabet ikinci atışı garantiye yaklaştırır; yığın bu zinciri ödüllendirir.
- **Yerini aldığı:** kendisi. Gece Maskesi ile ortak `skillSlow` anahtarı ayrılır (çakışma #8 çözülür).
- **sim.js:** yeni anahtar `frost` (damage içinde `skillSlow` satırının yanına), `e.ic.frostN/frostT`. Küçük.

### 8. Ufuk Merceği (uzaktan bonus; yeni)
- **Tarif:** Kitap + Odak + Hafif Çizme (650) + 500 = **1150** (Esinti Asası ile aynı tarif; o Destek kategorisinde).
- **Statlar:** 41 YG, 11 YH, %4 hareket hızı.
- **Maliyet:** 838 + 413 + 160 = 1411 / 1150 = **1,23**.
- **Pasif (Ufuk):** isabet anında senden **600**'den uzaktaki rakip şampiyona yetenek hasarın **%10** fazla. Böyle bir isabet hedefi 2 sn boyunca takımına görünür kılar (sis ve çalı dahil).
- **Seçim sorusu:** "Uzaktan mı oynuyorum?" Yararlananlar: Okçu Kalın Ok (6000), Topçu Uzun Işın (1200) ve Kök Sal (1800), İkiz Kilitli Yaylım (1100), İkili Enerji Küresi (850), Ateş Topu uç menzilde (650). Yakın büyücüler (Alev, Gölge) için boşa.
- **Özgün dokunuş:** *Mesafe ve savaş sisi.* Sisin içine atılan uzun atış hedefi açığa çıkarır; dost takip edebilir.
- **Yerini aldığı:** yeni. Çakışma yok.
- **sim.js:** damage içinde `opts.skill && dist(src,e)>=600` çarpanı; görünürlük `S.sights`. Küçük.

### 9. Cadı Bıçağı (düz vuruşa YG, Nashor benzeri; değişir)
- **Tarif:** Kitap + Hançer + Kitap (675) + 525 = **1200** (aynı).
- **Statlar:** 43 YG, %17 saldırı hızı (aynı). Maliyet 879 + 546 = 1425 / 1200 = **1,19**.
- **Pasif (Cadı Dokunuşu):** düz vuruşlar ek **YG'nin %20'si** büyü hasarı verir; aynı hedefe art arda her vuruş +%5 (en fazla %35), hedef değişince sıfırlanır.
- **Seçim sorusu:** "Düz vuruşla kuşatacak, dövüşte vuracak mıyım?"
- **Özgün dokunuş:** *Kuleler.* Yapılara verdiği ek büyü hasarı kale korumasından (dalgasız kuşatma x0,6) etkilenmez. Düz vuruşu zayıf büyücülerin kule sorunu (Denge turu 10.10.2026) için doğrudan cevap.
- **Yerini aldığı:** Ateş Dişi'nin düz vuruş rolü (çakışma #5 çözülür).
- **sim.js:** `onHitAp` + yeni `ic.whN/whTgt`; kale koruması için damage çağrısına `noWard` bayrağı. Küçük.

### 10. Büyü Kılıcı (yetenek sonrası güçlü vuruş, Lich Bane benzeri; değişir)
- **Tarif:** Kitap + Kitap + Odak (675) + 550 = **1225** (aynı).
- **Statlar:** **53 YG, 8 YH, %5 hız** (60 YG, %6'dan).
- **Maliyet:** 1084 + 300 + 200 = 1584 / 1225 = **1,29** (eskisi 1,44).
- **Pasif (Büyü Kılıcı):** yetenek kullandıktan sonraki 10 sn içinde ilk düz vuruş ek **50 + YG'nin %75'i** büyü hasarı (1,5 sn bekleme). **Çift Mühür:** pencere içinde iki farklı yetenek kullanıldıysa vuruş **x1,4** olur ve hedefi 80 birim iter (kütle oranlı); duvara çarparsa 0,5 sn sersem.
- **Seçim sorusu:** "Yetenek ile düz vuruşu iç içe kullanıyor muyum?" Alev Yumruğu, Ruh, Gölge.
- **Özgün dokunuş:** *Fizik.* Mühürlü vuruş iter, duvar kenarında sersemletir; hafif hedef daha uzağa gider.
- **Yerini aldığı:** kendisi. Tılsımlı Kılıç ile ortak `spellblade` anahtarı ayrılmalı (`spellbladeM`), ikisi birlikte alınabilsin (çakışma #25).
- **sim.js:** `spellblade` + `onCast` sayaç, itme için `shoveStart` ve duvar sersemi (İkili Darbe'deki `inWall` + `freezeHero`). Orta.

### 11. Kor Maskesi (yakın rakibe büyü artışı, Cehennem Maskesi benzeri; yeni)
- **Tarif:** Kitap + Kitap + Yakut (650) + 575 = **1225** (Kara Alev ve Çağ Kitabı ile aynı tarif; LoL'de de Liandry ailesi).
- **Statlar:** 45 YG, 200 can.
- **Maliyet:** 920 + 667 = 1587 / 1225 = **1,30**.
- **Pasif (Kor):** 500 içinde görünen rakip şampiyon varken saniyede 1 Kor birikir (en fazla 5). Kor başına büyü hasarın **%2** artar (en fazla %10). 3 sn yakında rakip yoksa saniyede 1 söner, ölünce sıfırlanır. **Dolu Kor:** 500 içindeki dost kahramanların büyü hasarı da **%4** artar.
- **Seçim sorusu:** "Uzun dövüşte rakibin dibinde mi kalıyorum?" Alev Yumruğu, Kan Lordu, Zincirli büyü yolu.
- **Özgün dokunuş:** *2v2 takım.* Dolu Kor dosta da güç verir; yakın büyücü ile büyücü dost ikilisini ödüllendirir.
- **Yerini aldığı:** yeni. Uçurum Maskesi (rakip BD'sini düşüren tank/takım sürümü) korunur; ikisi farklı: Uçurum herkesin hasarını, Kor yalnız büyü hasarını artırır ve yığın ister.
- **sim.js:** `itemTick` içinde yakın rakip sayımı (`burnAura` döngüsü gibi), damage büyü dalında çarpan. Küçük.

### 12. Kum Saati (Zhonya karşılığı, pasif; değişir)
- **Tarif:** Kitap + Kumaş + Kumaş (625) + 575 = **1200** (1175'ten).
- **Statlar:** 45 YG, 30 zırh (aynı). Maliyet 920 + 667 = 1587 / 1200 = **1,32**.
- **Pasif, önerilen (Kum Heykeli):** ölümcül hasar alınca ölmezsin: 1,5 sn kum heykeline dönersin (dokunulmaz, hareketsiz; kanallama ve üsse dönüş iptal), sonra **azami canın %10'u** ile kalkarsın. **150 sn** bekleme. Kalkarken 250 yarıçaptaki rakipleri iter (kütle oranlı) ve sonraki 6 sn içinde üsse dönüş **4 sn** sürer.
- **Seçenek B (kullanıcının örneği):** öldükten 1,5 sn sonra yerinde %5 canla dirilme. Ölüm sayılır (öldürme altını ve XP verilir), yeniden doğuş sayacı iptal. %5 can çok az: dirildikten hemen sonra 1 sn dokunulmazlık önerilir.
- **Seçenek C (Kum Perdesi):** can %25 altına inince 2 sn aldığın hasar %50 azalır, ama hareket hızın %40 düşer. 90 sn.
- **Seçim sorusu:** "Rakip beni anlık hasarla tek kombo ile mi öldürüyor?"
- **Özgün dokunuş:** *Aktif yok, ölüm tetiği; fizik ve 8 sn üsse dönüş.* Tuş yerine ölüm anı tetikler; kalkış iterek kaçış alanı açar, kısa üsse dönüş kaçışı tamamlar.
- **Yerini aldığı:** kendi aktifi. Botun `stasisHp` kuralı (ai.js) gereksizleşir; botlar `e.stasis>0` hedefini zaten tanıyor (heykele saldırmazlar).
- **sim.js:** önerilen biçim mevcut `stasis` alanını kullanır: damage içinde `kill()` çağrısından önce (satır ~496) bekleme hazırsa `hp=1, stasis=1,5, ic.reviveAt`; stasis bitince %10 can. Seçenek B `kill()` sonrası `respawn` yerine yerinde doğuş ister (daha çok kod). Orta.

## Bot BUILDS etkisi (kısa)

- **Kum Saati** pasifleşince bot için en kolay değişiklik: ai.js `stasisHp`/`cmd.item` kalkar, eşya kendiliğinden çalışır. mage, blood, artillery, shadow, spirit varsayılanlarında 6. (yedek) yuvada; etkisi küçük.
- **Ateş Dişi** kalkınca Gölge varsayılanı (`spring, witchblade, fang2, dcap, DEF, hourglass`) değişmeli. Şu an Cadı Bıçağı ile Ateş Dişi aynı anahtarı taşıdığı için biri boşa gidiyor; yerine Akkor Asası ya da Büyü Kılıcı.
- **Büyü Nüfuzu** kalkınca artillery varsayılanının 6. girişi (`magpen`) Cam Kırıcı olur.
- **Büyücü Şapkası** 3. sırada alınıyor; o anda elde 2 YG eşyası (Can Pınarı, Kara Alev) var: x1,25, son hali x1,30-1,35. Bugünkü x1,3 ile hemen hemen aynı.
- **Kara Alev / Akkor seçimi:** yeni esnek yuva önerisi `'BURN'` (DEF gibi, alım anında çözülür): rakiplerin ortalama azami canı > 400 + 5 x kendi YG ise Kara Alev, değilse Akkor. Bot için tek satırlık kural, oyuncuya da mağazada ipucu olur.
- **Zaman Asası, Ufuk Merceği, Kor Maskesi:** bot davranışı gerekmeden çalışır (Ufuk için ileride menzilli botlara "uzak dur" tercihi eklenebilir). Hiçbiri varsayılan BUILDS'te yok; önce `tools/builds.js` ile denenmeli.
- Değişiklikler 1v1 ve 2v2 sonuçlarını bozar (bit bit aynı kalmaz). Sonrasında kısa tarama: `teams2v2.js --fast 1`, 4 bulut parçası, `--diff expert`.

## Açık sorular (Kayra)

1. Kara Alev ile Akkor aynı anda alınabilsin mi (iki ayrı yanma), yoksa "Benzersiz: Yakma" mı olsun?
2. Akkor minyon ve canavarda çalışsın mı? Çalışırsa orman ve dalga temizliği belirgin artar (canavara DoT x1,6).
3. Kum Saati: önerilen Kum Heykeli mi, Seçenek B (ölüp %5 dirilme) mi, C mi? Heykelde öldürme altını verilmesin mi?
4. Ufuk Merceği eşiği 600 mü 700 mü? 700'de Ateş Topu (650) yararlanamaz.
5. Büyücü Şapkası'nın ikinci pasifi (sisten ilk atış) fazla mı? İstenirse yalnız koşullu çarpan kalsın.
6. Zaman Asası ile Zaman Kumu adları karışıyor; Zaman Kumu'nun adı değişsin mi (ör. "Av Kumu")?
7. Büyü Kılıcı ile Tılsımlı Kılıç birlikte alınabilsin mi (ayrı anahtar)?
8. Kaldırılacak iki eşya (Büyü Nüfuzu, Ateş Dişi) onaylı mı? Simgeleri (assets/items) yeni eşyalara (Akkor, Ufuk, Kor) yeniden üretilmeli mi?

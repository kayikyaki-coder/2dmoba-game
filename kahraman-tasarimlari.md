# Gelecek kahraman tasarımları (taslak, oyuna eklenmedi)

Support şimdilik yok. Space yetenekleri, aksi yazmıyorsa 5. seviyede açılır.

| Kahraman | Menzil | Pasif | Sağ tık | E | Space |
|---|---|---|---|---|---|
| İkiz Ok (nişancı) | Uzun | Her düz vuruş arka arkaya iki ok atar; ikisi de %40 hasar verir ama vuruş etkilerini (Kraken, Yıkık Kral, can çalma, kritik) tam uygular. | Yan Atılış: kısa bir yana kayış, sonraki düz vuruş iki yerine üç ok atar. | Hızlı Gerdirme: 4 sn saldırı hızı kazanır, bu sürede her iki oktan biri rakibi kısa süre yavaşlatır. | Çifte Mızrak: düz çizgide yan yana iki dev ok; ikisi de aynı rakibe değerse rakip 1 sn sabitlenir. |
| Sekme (nişancı) | Uzun | Düz vuruşları vurduğu hedeften yakındaki bir başka rakibe %50 hasarla seker (kahramanı önceler). | Duvar Atışı: duvara çarpınca seken bir mermi, her sekmede hasarı artar (en fazla 2 sekme). | Zincirli Atış: sonraki 3 düz vuruş bir yerine iki kez seker. | Sekme Fırtınası: bir alana bıraktığı küre 3 sn boyunca içindeki rakipler arasında mermi sektirir. |
| Zincirli (tank) | Yakın | Canı %30'un altına inince kısa süreli büyük bir kalkan kazanır (90 sn bekleme). | Kanca: ilk değdiği rakibi kendine çeker. | Yumruk: sonraki düz vuruş rakibi havaya kaldırır (0,75 sn sersem). | Şok Dalgası: çevresindeki rakiplerin kalkanlarını kırar ve onları 0,5 sn susturur (yetenek kullanamazlar). |
| Alev Yumruğu (yakın büyücü) | Yakın | Yetenek kullandıktan sonraki düz vuruşu küçük bir alanda büyü patlaması yapar. | Alev Üfleme: kısa ve geniş bir koni içinde büyü hasarı. | Alevli Sıçrayış: kısa atılış, vardığı yerde patlama. | Alev Halkası: 4 sn çevresinde dönen ateş halkası, içindekilere süreli hasar ve yavaşlatma. |
| Kan Lordu (vampir büyücü) | Orta | Verdiği büyü hasarının bir kısmı kadar can kazanır. | Kan Oku: hedefli büyü, hasar verir ve onu iyileştirir. | Kan Dalgası: canından ödeyerek çevresine dalga; basılı tuttukça büyür ve güçlenir. | Kan Havuzu: 2 sn dokunulmaz ve hızlı olur, üstünden geçtiği rakiplerden can çalar. |
| Topçu (sabit büyücü) | Uzun | Hareketsiz durduğu her saniye sonraki yeteneği güçlenir (en fazla %30). | Uzun Işın: basılı tuttukça menzili uzayan ışın, bırakınca atılır. | Ağır Küre: yavaş giden küre, değdiği rakibi 1 sn sersemletir. | Kök Sal: kendini 6 sn yere sabitler, o sürede çok uzağa üç topçu atışı yapar ve hedef bölgeyi görür. |
| Gölge (vur-kaç büyücü) | Orta | Canı %40'ın altına inince 1 sn görünmez olur ve yerinde sahte bir kopya bırakır (60 sn bekleme). | İşaret Küresi: hasar verir ve işaretler; işaretli rakibe 1,5 sn içinde başka yetenek değerse ek hasar. | Gölge Adımı: atılış; 3 sn içinde tekrar basarsa başladığı yere döner. | Zincir: ilk değdiği rakibe bağ atar, bağ 1,5 sn kopmazsa rakip 1,5 sn köklenir. |
| Ruh Rehberi (Karma gibi) | Kısa | Yetenekleri rakibe her değdiğinde Space bekleme süresi 1 sn azalır. | Ruh Patlaması: kısa menzilli, oyun başında çok güçlü alan hasarı. | Ruh Kalkanı: kendine (ileride yakın dostlara da) kalkan ve hız. | Güçlendir: sonraki yeteneği güçlenir; Ruh Patlaması büyür ve yavaşlatır, Ruh Kalkanı çevredeki dostlara da yayılır. |
| İkili (Jayce gibi) | Orta / Yakın | Biçim değiştirdikten sonraki düz vuruşu ek hasar verir. | Uzak biçim: enerji küresi. Yakın biçim: hedefe sıçrayıp vurma. | Uzak biçim: kısa süre saldırı hızı. Yakın biçim: rakibi geri iten darbe. | Biçim Değiştir: uzak ve yakın biçim arasında geçiş (1. seviyeden açık). |

## İkiz Ok: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 450 (+25), hasar 50 (+3), saldırı hızı 1,05 (+0,05), menzil 420, hareket 230, mermi hızı 1000.
- Pasif (İkiz Ok): her düz vuruş arka arkaya 2 güdümlü ok (0,09 sn arayla), her biri %40 hasar; vuruş etkileri (can çalma, Yıkık Kral, Kraken, Kara Balta vb.) her okta tam işler. Kritik vuruş başına bir kez belirlenir.
- Sağ tık (Yan Atılış): bekleme 8/7/6/5 sn. İmleç yönüne 170 birim hasarsız kayış; sonraki 4 sn içindeki ilk düz vuruş 3 ok atar.
- E (Şok Bombası): bekleme 14/13/12/11 sn. 600 menzile kadar imlece atılır, 0,35 sn sonra 100 birim yarıçapta patlar. 0,5 sn sersemletir. Hasar 50/75/100/125 + ek SG %30 + YG %30, fiziksel. Minyonlara da değer.
- Space (Kilitli Yaylım): bekleme 50/40 sn (diğer ultiler 20-26 sn; uzun tutuldu, denenecek). Görünen rakip kahramana 1500 menzile kadar kilitlenir, 2 sn yerinde durur, 0,5 sn arayla 4 güdümlü mermi. Süre boyunca hedefi görür (sis/çalı dahil). Mermi başına 60/95 + ek SG %40, fiziksel; hedefin eksik canına göre doğrusal en fazla +%20. Yoldaki başka rakip kahraman ya da kule mermiyi kendine alır (kule altına kaçmak kurtarabilir); minyon ve duvar engellemez. Hareket, saldırı ya da yetenek kullanmak kanallamayı iptal eder; sersemleme/sabitlenme, hedefin ölmesi ya da 1800'den uzaklaşması da bitirir. Bekleme her durumda harcanır.

## Sekme: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 440 (+24), hasar 48 (+3), saldırı hızı 1,15 (+0,05), menzil 450, hareket 230, mermi hızı 950.
- Pasif (Sekme): düz vuruş hedefe değdikten sonra 300 birim içindeki başka bir rakibe seker, %50 hasar (güdümlü). Kahramanı önceler, sonra en yakın minyon. Seken mermi kritik uygular ama vuruş etkilerini (Kraken, Yıkık Kral, can çalma vb.) uygulamaz; vuruş etkileri sadece ilk hedefte.
- Sağ tık (Bumerang): bekleme 10/9/8/7 sn, 0,2 sn hazırlık. Geniş (30 yarıçap), yavaş (750/sn) bumerang; 650 birimde döner, sahibini takip ederek geri gelir. Gidişte ve dönüşte ayrı vurur. Hasar 50/80/110/140 + SG %70, fiziksel; değdiği her rakipten sonra %15 azalır (en az %40'a kadar, yani en fazla %60 azalma). Birimlerden ve duvardan geçer.
- E (Arınma): bekleme 18/16/14/12 sn, anında. Bütün kitle kontrol etkilerini kaldırır (sersemleme, yavaşlatma, ileride kök/susturma); süreli hasarlara dokunmaz. 2 sn %30/35/40/45 hareket hızı. Sersemken de kullanılabilir (tek istisna).
- Space (Avcı Coşkusu): bekleme 40/32 sn (sonra bakılacak). 6 sn: kullanınca Bumerang ve Arınma beklemesi sıfırlanır; +%20/30 hareket hızı, +15/25 SG, +%30/45 saldırı hızı; düz vuruş 1 yerine 3 kez seker (her sekme %50). Sekme o an vurduğu birime dönemez; önce o vuruşta değmediği rakiplere gider, menzilde herkese değdiyse daha önce değdiği (ama o an vurduğu olmayan) birine gider. Etrafta başka rakip yoksa sekme durur.

## Zincirli: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 800 (+45), yenileme 6, zırh/BD 10/10, hasar 55 (+3), saldırı hızı 0,90 (+0,03), hareket 225, menzil 110, boyut 32, kütle 3,0, koni açısı 90.
- Pasif (Demir Gövde): her 5 sn'de azami canının %1'i kadar ek can yenilemesi.
- Sağ tık (Kanca): bekleme 18/16/14/12 sn, 0,25 sn hazırlık. 900 menzil, 1600/sn, ince (yarıçap 14). İlk değdiği rakibi (kahraman ya da minyon) 0,4 sn içinde önüne çeker; kahramanı 0,5 sn sersemletir. Hasar 70/110/150/190 + YG %70, büyü. Duvarın üstünden geçer (çekilen birim duvarın içinde kalırsa dışarı itilir).
- E (Ezici Darbe): bekleme 8/7,5/7/6,5 sn, 0,2 sn hazırlık. Önünde 220 menzilli, 100 derecelik koni. Hasar 60/95/130/165 + ek SG %60 + ek can %3, fiziksel. 1,5 sn %30/35/40/45 yavaşlatma. Minyonlara da değer.
- Space (Şok Dalgası): bekleme 35/28 sn, anında. 450 yarıçapta sadece kahramanlara: hasar 150/250 + YG %80 + ek can %5, büyü. 1,5/2 sn susturma (yetenek yok, yürüme ve düz vuruş serbest). 2 sn %60'tan azalan yavaşlatma. Susturma yeni kitle kontrolü (Arınma kaldırır).

## Alev Yumruğu: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 560 (+30), yenileme 4, hasar 45 (+2,5), saldırı hızı 0,85 (+0,03), hareket 235, menzil 120, boyut 27. Düz vuruş fiziksel.
- Pasif (Kıvılcım): yetenek kullandıktan sonraki 3 sn içindeki ilk düz vuruş 100 yarıçapta patlar: seviyeyle 20'den 80'e + YG %30, büyü.
- Sağ tık (Alev Üfleme): bekleme 7/6,5/6/5,5 sn, 0,25 sn hazırlık. 300 menzil, 70 derece koni. 70/110/150/190 + YG %60, büyü. Minyonlara da değer.
- E (Alevli Sıçrayış): bekleme 13/12/11/10 sn. İmlece doğru 300 birim sıçrar (birimlerin üstünden geçer, duvarda durur). Aynı anda başladığı yerden sıçrama yönünde, sıçrama mesafesinin iki katı uzunlukta (başlangıçtan bitişe + bitişin önüne bir o kadar) 120 genişliğinde bir ateş şeridi: şeritteki rakiplere 60/90/120/150 + YG %50 büyü hasarı ve 1 sn %25 yavaşlatma. Duvarda erken durursa şerit gerçek gidilen mesafenin iki katı.
- Space (Alev Halkası): bekleme 30/24 sn, anında. 4 sn kendisiyle hareket eden 250 yarıçaplı halka: içindekilere saniyede 40/65 + YG %15 büyü (toplam 160/260 + YG %60), %25 yavaşlatma. Süre boyunca kendisi 10 + YG %10 kadar zırh ve büyü direnci kazanır (100 YG ile +20).

## Kan Lordu: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 520 (+28), yenileme 3 (normal), hasar 40 (+2,5), saldırı hızı 0,80 (+0,03), menzil 380 (güdümlü düz vuruş, fiziksel), hareket 230.
- Pasif (Kan Hasadı): kendisi bir rakip birimi öldürürse o birimin azami canının %10'u, 5 sn'ye yayılarak dolar. Rakip kahramana asist ya da 600 içinde ölen rakip minyon: %5. Sadece rakip birimler.
- Sağ tık (Kan Oku): bekleme 7/6,5/6/5,5 sn. 550 menzilde seçilen rakibe (kahraman ya da minyon, kule değil) ıskalamayan ok: 80/120/160/200 + YG %60 büyü. Verilen hasarın (direnç sonrası) %30'u anında iyileşir.
- E (Kan Patlaması): bekleme 10/9/8/7 sn. O anki canının %10'unu harcar, 360 derece 12 kan topu (450 birim, ilk değdiği rakipte durur). Top hasarı: 15/25/35/45 + harcanan can + YG %100, büyü. Bir rakibe birden fazla top değse de hasar bir kez.
- Space (Kan Laneti): bekleme 30/24 sn. 700 menzile kadar bir alana anında (250 yarıçap); sadece rakip kahramanları işaretler. 3 sn boyunca %15/20 fazla büyü hasarı alırlar; 3 sn sonunda nerede olurlarsa 150/250 + YG %70 büyü hasarı, Kan Lordu bunun %30'u kadar iyileşir.

## Topçu: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 440 (+20), yenileme 3, hasar 32 (+2), saldırı hızı 0,75 (+0,03), menzil 480 (güdümlü, fiziksel), hareket 225.
- Pasif (Odak): 15 sn'de bir (seviyeyle doğrusal 10. seviyede 10 sn) Odak kazanır. Odak varken kullanılan sağ tık ya da E'nin bekleme süresi %70 kısalır, Odak harcanır. Space'e uygulanmaz.
- Sağ tık (Uzun Işın): bekleme 9/8/7/6 sn, 0,4 sn hazırlık (hazırlıkta %40 yavaş). Şarj yok. İmleç yönüne 1200 uzunluğunda, 70 genişliğinde şerit: yoldaki bütün rakiplere 70/110/150/190 + YG %70 büyü.
- E (Ağır Küre): bekleme 14/13/12/11 sn, 0,25 sn hazırlık. 700/sn, 1000 menzil, ilk değdiği rakipte (minyon dahil) durur. 60/90/120/150 + YG %45 büyü. Sersemletme gidilen mesafeyle 0,75 sn'den 1,5 sn'ye.
- Space (Kök Sal): bekleme 36/30 sn. En fazla 6 sn yerinde sabit; Space'e her basışta 2500 menzile kadar imlece topçu atışı (görünmeyen yere de), toplam 3 atış. Atış 0,6 sn sonra 150 yarıçapta: 120/180 + YG %40 büyü; atış yeri 2 sn görünür. Hareket tuşu erken bitirir; 3 atış bitince ya da 6 sn dolunca biter.

## Gölge: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 480 (+24), yenileme 3, hasar 35 (+2), saldırı hızı 0,80 (+0,03), menzil 350 (güdümlü, fiziksel), hareket 240.
- Pasif (Fırsatçı): bekleme 6 sn. Canı %50'nin altındaki rakip kahramana yapılan düz vuruş ya da yetenek ek olarak 15 + rakibin azami canının %10'u + YG %15 büyü hasarı verir. Minyon ve kulelerde çalışmaz.
- Sağ tık (Zincir): bekleme 12/11/10/9 sn, 0,2 sn hazırlık. İmleç yönüne 800 menzilli zincir mermisi; minyon durdurur. İlk değdiği rakip kahramana 60/90/120/150 + YG %40 büyü ve bağ. Bağ 2 sn kopmazsa (aradaki mesafe 800'ü geçerse kopar) bir kez daha aynı hasar ve 1 sn kök (yürüyemez, vurabilir ve yetenek kullanabilir).
- E (Gölge Adımı): bekleme 14/13/12/11 sn (ilk kullanımda başlar). 500 menzile kadar imlece ışınlanır, indiği yerde 140 yarıçapta 70/105/140/175 + YG %50 büyü. 3 sn içinde E'ye tekrar basarsa başladığı yere döner; basmazsa kalır.
- Space (Taklit): bekleme 30/24 sn, 5. seviyede. En son kullandığı yeteneği (Zincir ya da Gölge Adımı) bir kez daha kullanır; hasarı %20/30 fazla. Taklit Gölge Adımı'nın da kendi 3 sn'lik dönüş hakkı vardır. Henüz yetenek kullanmadıysa kullanılamaz.
- Gölge ek kararlar: yetenekleri kuleye vurmaz, hepsi büyü hasarı. Taklit edilen yetenek pasifi (Fırsatçı) tetikleyebilir (6 sn bekleme yine geçerli).
- İkiz Ok: Kraken her okta sayılır (sık patlaması istenen davranış).
- Topçu Odak: kullanılan yeteneğin kendi beklemesi %70 kısalır (10 sn -> 3 sn), sağ tık ve E için.

## Ruh Rehberi: kesinleşen tasarım (oyuna eklenmedi)

- Statlar: can 500 (+24), yenileme 3, hasar 40 (+2,5), saldırı hızı 0,85 (+0,03), menzil 330 (güdümlü, fiziksel), hareket 235. Erken güçlü: yüksek taban hasar, düşük seviye ve YG ölçeklemesi.
- Pasif (Ruh Akışı): düz vuruş isabeti bütün yeteneklerin (Space dahil) kalan bekleme süresini 0,5 sn, rakip kahramana isabet 1 sn azaltır.
- Sağ tık (Ruh Patlaması): bekleme 7/6,5/6/5,5 sn, 0,25 sn hazırlık. 450 menzilli küre, ilk değdiği rakipte 150 yarıçapta patlar: 90/130/170/210 + YG %50 büyü, 1 sn %20 yavaşlatma.
- E (Ruh Kalkanı): bekleme 12/11/10/9 sn, anında. Kendine 2,5 sn 80/120/160/200 + YG %50 kalkan, kalkan sürerken +%30 hareket hızı. İleride dosta da atılabilecek.
- Space (Güçlendir): 5. seviyede açılır, bekleme 20/16 sn. 6 sn içindeki sonraki yeteneği güçlenir. Ruh Patlaması: alan 250, yerde 1,5 sn kalan alan (%40 yavaşlatma), süre sonunda %50 hasarla ikinci patlama. Ruh Kalkanı: kalkan %50 büyük, yavaşlatmaları kaldırır (sersemletmeye dokunmaz); 550 yarıçaptaki yaşayan dostlara da aynı kalkan, hız ve yavaşlatma temizliği (2v2, eklendi).

## İkili: kesinleşen tasarım (oyuna eklendi)

- Seviye: Space (Biçim Değiştir) 1. seviyeden açık, kademe almaz. Sağ tık ve E 5'er kademe (10 seviye = 10 puan). Kademe iki biçimde ortak, bekleme süreleri biçim başına ayrı (diğer biçimdeyken de akar).
- Statlar: can 540 (+30), yenileme 3, hasar 50 (+3,2), saldırı hızı 0,95 (+0,04). Uzak biçim: menzil 420 (güdümlü), hareket 235, zırh/BD 10/10. Yakın biçim: menzil 125 (koni 90 derece, savaşçı gibi), hareket 245, zırh/BD 20/20.
- Pasif (Akış): yetenek kullanmak (biçim değiştirme dahil) 1 sn'de azalarak biten hareket hızı verir: seviyeyle %10'dan %20'ye.
- Space (Biçim Değiştir): bekleme 6 sn, anında.
- Uzak sağ tık (Enerji Küresi): bekleme 8/7,5/7/6,5/6 sn, 0,25 sn hazırlık. 1300 menzil; ilerledikçe büyür (yarıçap 15'ten 35'e), hızlanır (900'den 1600'e) ve hasarı artar (gidilen mesafeyle doğrusal %100'den %150'ye). İlk değdiği rakipte patlar (patlama yarıçapı topla birlikte 100'den 160'a). Hasar 70/105/140/175/210 + ek SG %110, fiziksel.
- Uzak E (Hızlı Ateş): bekleme 12/11/10/9/8 sn, anında. 4 sn +%15/20/25/30/35 saldırı hızı.
- Yakın sağ tık (Sıçrayış Darbesi): bekleme 13/12/11/10/9 sn. 550 menzilde seçilen rakibe sıçrar, 150 yarıçapta 60/100/140/180/220 + ek SG %100 fiziksel, 1,5 sn %30 yavaşlatma.
- Yakın E (Darbe): bekleme 14/13/12/11/10 sn, anında. 150 menzildeki rakibi 300 birim iter; 50/75/100/125/150 + rakibin azami canının %8'i fiziksel; duvara çarparsa 0,75 sn sersemler.

# moba2d

Haxball tarzı yuvarlak token karakterli 2D MOBA. Tarayıcıda çalışır, şimdilik botlara karşı 1v1, tek yatay koridor. Kazanma koşulu: düşman nexus'unu yıkmak.

## Çalışma tercihleri (Kayra)
- Denge testleri kısa olsun (16.10.2026): 15-20 dk'lık hızlı tarama (teams2v2.js --fast 1, 4 bulut parçası, --diff expert; kullanıcı Uzman botu önemsiyor). Uzun tam tarama yalnız istenirse.
- Her zaman Türkçe yaz, kısa ve doğrudan ol.
- Belirsiz bir iş varsa uygulamadan önce soru sor.
- Yazarken em dash ("—") kullanma.

## Mevcut durum
- Bölündü: data.js, sim.js, ai.js, render.js, main.js, index.html. Eski tek dosya old/ içinde. Çalıştır: `npm start` (http://localhost:8080). Sim seed'li (mulberry32), Math.random sim içinde yok.
- Simülasyon arayüzü: `Simulasyon-Baslat.bat` (çift tık). Oyun: `Oyunu-Baslat.bat`. Mantık `tools/runner.js`, komut satırı `tools/simulate.js`.
- Hedef yapı:
  - `data.js`: kahramanlar, `STATS` tablosu, kule/minyon/XP sabitleri
  - `sim.js`: oyun kuralları (DOM ve çizim yok, Node'da çalışabilmeli)
  - `ai.js`: bot (`botCommand`)
  - `render.js`, `main.js`: tarayıcı tarafı (çizim, girdi, HUD)
  - `tools/simulate.js`: denge simülasyonu komutu
- Uzun vadeli: online çok oyunculu (sunucu simülasyonu `sim.js`'i kullanır), dost botlar (2v2/3v3), yeni kahramanlar, altın ve eşya sistemi.

## Mimari kurallar
- step(): önce bütün kahramanların komutu aynı durumdan alınır, sonra uygulanır (güncelleme sırası taraf avantajı yaratıyordu). Minyon kule dolanma yönü dalgadaki sıraya bağlı (id'ye değil).
- Simülasyon çizimden ayrı. Sabit 60 Hz tick (`TICK=1/60`), `step(dt)` ile ilerler.
- Girdi komut nesnesine çevrilir: `{mx,my,aim,attack,rmb,e,space}`. Oyuncu ve bot aynı komutu kullanır.
- Veri odaklı: kahraman, minyon, kule değerleri sabit tablolarda. Sayıları koda gömme.
- Her kahramanın temel statları `STATS` tablosunda: `{ base, per }` (1. seviye değeri ve seviye başına düz artış). Statlar: hp, regen (5 saniyede yenilenen can; savaşçı 5, okçu 3), dmg, as (saniyedeki saldırı), spd, range, size, mass, windup, atkSlow, + kahramana özel (projSpeed, projRadius, angle).
- Saldırı durum makinesi: ready, windup, release, recovery. Saldırı hızı hazırlık ve bekleme süresini kısaltır.
- Çarpışmalar dairesel, kütle bazlı. Yapılar katı. Minyon, kahramana karşı efektif 6x ağır.

## Ayrıntı günlüğü
Oyun kurallarının, eşya/rün/kahraman kararlarının, denge ve bot turlarının, görsel üretiminin tam metni: `docs/KARAR-GUNLUGU.md` (CLAUDE.md'den taşındı, 01.11.2026, içerik silinmedi). Bir mekanik, sayı ya da geçmiş karar hakkında soru olursa, ya da kahraman/eşya/bot/harita/orman/sis/menü/online konusuna dokunmadan önce, o dosyada ilgili başlığı ara.
Kahramanlar: Okçu, Savaşçı, Büyücü, İkiz Ok, Sekme, Zincirli, Alev Yumruğu, Kan Lordu, Topçu, Gölge, Ruh Rehberi, İkili, Gülle, Gladyatör.
- Ajan botu ve nöroevrim (16-17.11.2026, Kayra; dal ajan-deney, main'e katıldı; mevcut botlara/STATS'a dokunulmadı). ai_ajan.js: sıfırdan yazılmış bot (yalnız sim.js/data.js okunarak; mevcut bot kodu okunmadı), oyuncu komut kanalı, sis dürüst (canSee), eşya oyuncunun otomatik alımıyla (h.autoBuy), kendi ızgara yol bulması (navDir/flowTo), ormancı rolü (sim'in h.role'u, kamp seçimi S.intel'den), son vuruş tahmini, takım ortak rakip hafızası, kule altı tutunma, kite, kuşatma ve itme. Araçlar: tools/ajan_vs.js (ajan vs Uzman 2v2, --comps a+b, --mirror, --full; ölüm nedeni, 10. dk seviye/servet/son vuruş, kahraman başına K/D), tools/ajan_trace.js (ölüm öncesi karar izi). Sonuç (11 tur): Uzman'a karşı %0 (ayna Okçu+Savaşçı 48 maç; 91 takım havuzunda 182 maç). En iyi sürümde ölüm 8,0 -> 2,4/maç, 10. dk servet farkı -1902 -> -988 (havuzda -259), ormancı Uzman ormancısını seviyede geçiyor (12,5'e 12,2). Asıl sorun dalga kontrolü ve kuşatma: bizim dalga rakip kuleye zamanın %2-3'ünde, Uzman'ınki %12-14'ünde ulaşıyor; kuleye kahraman hasarı biz ~70, Uzman ~2000/maç; koridorda son vuruş 22-30'a 46-63. Bulgu (öneri, uygulanmadı): basit bot elinde bile Alev/Gladyatör/Gülle pozitif K/D (güçleri mekanikte), beceri atışlı menzilliler (Okçu, Seken, Büyücü, Topçu) basit elde çok zayıf; dövüşmeden kamp kesen ormancı Uzman'ı ~1,5 seviye geçiyor (orman ödülü yüksek ya da Uzman ormancısı fazla geziyor). Nöroevrim: ai_ajan.js AJ.net (ağ varsa üst düzey kararları ağ verir, yoksa kurallar; ağsız sonuç bit bit aynı): 28 özellik -> 14 tanh -> 7 niyet (LANE, FIGHT, FLEE, SIEGE, RECALL, JUNGLE, GROUP) + koridor kayması (shiftMax 300), 0,25 sn'de bir karar; vuruş/yetenek/yol bulma kuralda kalır. tools/neuro.js: önce taklit (kurallı ajanın kararlarından, AJ.sink; Kayra'nın PC'sinde 62k örnek, uyum %82), sonra GA (nüfus 32, nesil başına 4 ayna kompozisyon x 2 taraf Uzman'a karşı, ortak tohum, seçkin + turnuva + çaprazlama + Gauss mutasyon sigma 0,08), puan = 3 x kazanma + 0,5 x yapı farkı + kuleye hasar farkı/2000 + servet farkı/3000 + 0,05 x (K-D) + kayıpta süre payı; her 5 nesilde 48 sabit maçla doğrulama, şampiyon tools/neuro/best.json. Çıktılar tools/neuro/ (log.txt, state.json, bc.json, best.json; gitignore), kaldığı yerden devam eder; --pop/--sigma/--cross devam ederken değişir; --test best|rules|bc. Panel: tools/neuro_ui.js (Noroevrim-Panel.bat, http://localhost:8090: canlı grafik, ayarlar, Başlat/Durdur/Sınav; veriyi log.txt'den okur). Başlangıç ölçümü (Kayra PC, 48 doğrulama maçı): kurallı puan -2,222 (servet farkı -1716), taklit ağı -2,329 (-1879). Hız: 11 çekirdekte nesil ~3-5 dk. Not: Windows konsolunda fareyle seçim yazmayı dondurur (Esc), log artık önce dosyaya yazılır. Olası sonraki adımlar: dalga durumu özellikleri ve niyetleri (dalga tut/biriktir/it), kendi kopyalarına karşı öz oyun, daha büyük nüfus/maç.

## Açık sorular
- Savaşçı atılışı dost minyonlar tarafından engellensin mi (şu an içinden geçiyor)?

## Denge simülasyonu planı
- "simüle et" denince `tools/simulate.js` ile iki botu ekransız binlerce kez oynat.
- Çıktı: kazanma oranı, ortalama maç süresi, ilk kule ve ilk kill zamanı, seviye eğrisi. Tablo olarak göster.
- Parametreler: kahramanlar, başlangıç seviyeleri, `STATS` değişiklikleri, maç sayısı, rastgele tohum (seed).
- Not: iki bot da aynı yapay zekayla oynar, sonuçlar insan oyununu değil göreli dengeyi ölçer.

## Git
- github.com/kayikyaki-coder/2dmoba-game (main). Masaüstü\Oyunu-Guncelle.bat: git pull --ff-only (yerel değişiklik varsa stash'e alır) ve oyunu açar. old/, assets/sd/, *.log gitignore'da. Her işten sonra commit + push.

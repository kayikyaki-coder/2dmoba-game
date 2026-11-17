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

## Açık sorular
- Savaşçı atılışı dost minyonlar tarafından engellensin mi (şu an içinden geçiyor)?

## Denge simülasyonu planı
- "simüle et" denince `tools/simulate.js` ile iki botu ekransız binlerce kez oynat.
- Çıktı: kazanma oranı, ortalama maç süresi, ilk kule ve ilk kill zamanı, seviye eğrisi. Tablo olarak göster.
- Parametreler: kahramanlar, başlangıç seviyeleri, `STATS` değişiklikleri, maç sayısı, rastgele tohum (seed).
- Not: iki bot da aynı yapay zekayla oynar, sonuçlar insan oyununu değil göreli dengeyi ölçer.

## Git
- github.com/kayikyaki-coder/2dmoba-game (main). Masaüstü\Oyunu-Guncelle.bat: git pull --ff-only (yerel değişiklik varsa stash'e alır) ve oyunu açar. old/, assets/sd/, *.log gitignore'da. Her işten sonra commit + push.

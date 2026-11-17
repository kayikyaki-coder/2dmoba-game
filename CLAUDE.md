# Token Arena (moba2d)

Haxball tarzı yuvarlak token karakterli 2D MOBA. Tarayıcıda çalışır, botlara karşı 1v1/2v2, tek yatay koridor + orman. Online arkadaşla oynama var (lockstep). Kazanma: düşman nexus'unu yıkmak.

## Çalışma tercihleri (Kayra)
- Türkçe, kısa ve doğrudan yaz. Em dash ("—") kullanma.
- Belirsiz iş varsa uygulamadan önce sor.
- Denge testi kısa olsun: 15-20 dk hızlı tarama (`teams2v2.js --fast 1`, 4 bulut parçası, `--diff expert`). Uzun tarama yalnız istenirse.
- Her işten sonra commit + push. Silme kararı Kayra'nın; silmek yerine `old/`'a taşı (gitignore'da).

## Çalıştırma
- Oyun: `npm start` (http://localhost:8080) ya da `Oyunu-Baslat.bat`. Simülasyon arayüzü: `Simulasyon-Baslat.bat`. Harita editörü: `Harita-Editoru.bat`. Nöroevrim paneli: `Noroevrim-Panel.bat`.
- Komut satırı araçları ve hangisinin ne işe yaradığı: `tools/CLAUDE.md`.

## Dosya haritası (kökte, import'lar bu düzene bağlı; taşıma)
- `data.js`: kahramanlar, `STATS`, kule/minyon/XP/orman sabitleri. `items.js`: eşya + rün + BUILDS. `itemdesc.js`: eşya açıklamaları.
- `sim.js`: oyun kuralları (DOM yok, Node'da çalışır). `map.js` + `map_data.js`: harita. `nav.js`: yol bulma.
- Botlar: `ai.js` (Uzman/güncel), `ai_util.js`, `ai_model.js` (ML ağırlıkları, büyük), `ai_v1.js`/`ai_v2.js`/`ai_eski.js` (karşılaştırma için eski botlar), `ai_ajan.js` (sıfırdan deney botu).
- Tarayıcı: `index.html`, `main.js`, `render.js`, `menu.js`, `juice.js`, `art.js`, `palette.js`, `names.js`, `autobuy.js`.
- Online: `net.js`, `transport.js`, `lockstep.js`, `online_config.js` (GitHub Pages + Supabase + WebRTC).
- `assets/` görseller, `docs/` belgeler, `old/` yedekler (gitignore), `tools/` araçlar.

## Mimari kurallar
- `step(dt)`: önce bütün kahramanların komutu aynı durumdan alınır, sonra uygulanır (taraf avantajını önler). Sabit 60 Hz (`TICK=1/60`). Sim seed'li (mulberry32), sim içinde `Math.random` yok.
- Sim çizimden ayrı. Oyun durumunu değiştiren her şey `step` içinde olmalı (online senkron için); arayüzden doğrudan `S` değiştirme, komut kanalından (`main.js act()`) geçir.
- Girdi komut nesnesi: `{mx,my,aim,attack,rmb,e,space}`. Oyuncu ve bot aynı komutu kullanır.
- Veri odaklı: sayılar `data.js`/`items.js` tablolarında, koda gömme. Kahraman statı `STATS`: `{ base, per }`.
- Saldırı durum makinesi: ready, windup, release, recovery. Çarpışma dairesel, kütle bazlı, yapılar katı, minyon kahramana karşı efektif 6x ağır.

## Şu anki durum (17.11.2026)
- Denge: son tarama KL1'de kahramanlar %47-55; Kan Lordu sınırdaydı, KD turu durdu. Denge yeniden açılırsa `docs/gunluk/denge-turlari.md` en güncel tur.
- Bot: Uzman (`ai.js`) güçlü referans. Ajan botu (`ai_ajan.js`) 11 turda Uzman'a karşı %0; nöroevrim (`tools/neuro.js`) Kayra'nın PC'sinde sürüyor. Ayrıntı: `docs/gunluk/ajan-noroevrim.md`.
- Online: çalışıyor (GitHub Pages, `README.md`).
- Açık soru: Savaşçı atılışı dost minyonlar tarafından engellensin mi (şu an içinden geçiyor)?
- Planlı (uzun vadeli): dost botlar 3v3, yeni kahramanlar (`docs/tasarim/kahraman-tasarimlari.md`).

## Geçmiş kararlar: nereye bakılır (önce ilgili dosyayı aç, hepsini okuma)
Bir mekanik, sayı ya da eski karar sorulunca ya da o konuya dokunmadan önce `docs/gunluk/` altında ilgili dosyayı aç, `grep` ile başlık/anahtar kelime ara. Yeni karar/ölçüm olunca ilgili dosyanın başına tarihle ekle.

| Konu | Dosya |
|---|---|
| Kahraman yetenekleri, kahraman nerf/buff | `docs/gunluk/kahramanlar.md` |
| Eşya, rün, altın, zırh/büyü direnci, otomatik alım | `docs/gunluk/esyalar.md` |
| Yapılar, minyon, XP, ölüm süresi, 2v2, kontroller | `docs/gunluk/oyun-kurallari.md` |
| Harita, orman, kamplar, sis | `docs/gunluk/harita-orman.md` |
| Denge turları, tarama sonuçları, maç uzunluğu | `docs/gunluk/denge-turlari.md` |
| Uzman bot, zorluklar, ML dövüş modeli, evolve | `docs/gunluk/bot-ml.md` |
| Ajan botu, nöroevrim | `docs/gunluk/ajan-noroevrim.md` |
| Online (lockstep, lobi) | `docs/gunluk/online.md` |
| Menü, HUD, görsel dil, juice, görsel üretimi | `docs/gunluk/menu-gorsel.md` |
| Eski öncelik listesi | `docs/gunluk/yapilacaklar.md` |
| Tasarım taslakları (eşya planları, yeni kahramanlar, xlsx) | `docs/tasarim/` |

Kahramanlar: Okçu, Savaşçı, Büyücü, İkiz Ok, Sekme, Zincirli, Alev Yumruğu, Kan Lordu, Topçu, Gölge, Ruh Rehberi, İkili, Gülle, Gladyatör.

## Denge simülasyonu
- "simüle et" denince `tools/simulate.js` (ya da hızlı tarama için `teams2v2.js`) ile iki botu ekransız oynat; sonucu tablo ver: kazanma oranı, ortalama maç süresi, ilk kule/ilk kill, seviye eğrisi.
- 24 maçta sonuç ±10 puan oynar; karar için 60+ maç. İki bot aynı yapay zekayla oynar: sonuç insan oyununu değil göreli dengeyi ölçer.

## Git
- github.com/kayikyaki-coder/2dmoba-game (main). `Oyunu-Guncelle.bat` (masaüstü): `git pull --ff-only` + oyunu açar. `old/`, `assets/sd/`, `*.log` gitignore'da.

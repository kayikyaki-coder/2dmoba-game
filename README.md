# Token Arena (2D MOBA prototipi)

Haxball tarzı yuvarlak token karakterli 2D MOBA. Tarayıcıda çalışır, botlara karşı 1v1 ve 2v2, tek koridor.

## Çalıştırma
- `Oyunu-Baslat.bat` (ya da `npm start`), sonra http://localhost:8080
- Denge simülasyonu arayüzü: `Simulasyon-Baslat.bat`
- Harita editörü: `Harita-Editoru.bat`

Gereken: Node.js (bağımlılık yok).

## Arkadaşla online oynama
Ana menüde Online bölümünden "Arkadaşla oyna". Biri oda kurar, 4 harfli kodu arkadaşına söyler, arkadaşı kodla katılır. Modlar: 1v1, 2v2 ortak (ikiniz aynı takım, karşıda 2 bot), 2v2 karşılıklı (her takımda bir insan ve bir bot).
- Oda sahibi `Online-Baslat.bat` çalıştırır (bir kere `winget install Cloudflare.cloudflared` gerekir). Çıkan `https://....trycloudflare.com` adresini ikiniz de açar (oda sahibi de localhost değil bu adresten girer). Sahibin bilgisayarı ve bat penceresi açık kaldıkça oyun sürer.
- Yerel ağda ya da test için: `npm start`, ikinci sekmede aynı adres.
- Nasıl çalışır: lockstep. Her tarayıcı aynı `sim.js`'i çalıştırır, sunucu (`tools/wsrelay.js`) yalnız komutları iletir. Kod: `lockstep.js` (komut tamponu, durum özeti ile senkron kontrolü), `net.js` (oda ve lobi), `main.js` ("Online" işaretli yerler). Test: `node tools/online_test.js --mode coop|1v1|pvp --ticks 7200 --lag 40` (iki süreç gerçek röleden oynar, durum özetleri aynı çıkmalı).
- Sim'e yeni durum eklerken: oyun durumunu değiştiren her şey `step` içinde (komut/bot/sim) olmalı. Arayüzden doğrudan `S` değiştiren çağrı (satın alma gibi) senkronu bozar; `main.js act()` ile komut kanalından geçirin.

Ayrıntılar ve kurallar: `CLAUDE.md`. Kahraman tasarımları: `kahraman-tasarimlari.md`. Eşyalar: `esyalar.xlsx`.

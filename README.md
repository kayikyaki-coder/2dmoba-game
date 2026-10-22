# Token Arena (2D MOBA prototipi)

Haxball tarzı yuvarlak token karakterli 2D MOBA. Tarayıcıda çalışır, botlara karşı 1v1 ve 2v2, tek koridor.

## Çalıştırma
- `Oyunu-Baslat.bat` (ya da `npm start`), sonra http://localhost:8080
- Denge simülasyonu arayüzü: `Simulasyon-Baslat.bat`
- Harita editörü: `Harita-Editoru.bat`

Gereken: Node.js (bağımlılık yok).

## Arkadaşla online oynama (sabit adres, önerilen)
Oyun GitHub Pages'te yayınlanır (repo > Settings > Pages > main / root): `https://kayikyaki-coder.github.io/2dmoba-game/`. İkiniz de bu adresi açar, menüde Online > Arkadaşla oyna ile oda kurup kodla katılırsınız. Bat ve tünel gerekmez. Eşleşme Supabase Realtime ile (`online_config.js`, publishable anahtar), komutlar tarayıcılar arasında doğrudan WebRTC ile gider (ping ~20-40 ms). Doğrudan bağlantı kurulamazsa komutlar Supabase üzerinden akar (daha yüksek ping). Lobide ve oyunda bağlantı yolu yazar: doğrudan, Supabase rölesi ya da sunucu. URL parametreleri: `?net=ws` (Node sunucu rölesi), `?net=sb` (Supabase), `?p2p=0` (doğrudan bağlantıyı kapat).

## Arkadaşla online oynama (tünel, yedek yol)
Ana menüde Online bölümünden "Arkadaşla oyna". Biri oda kurar, 4 harfli kodu arkadaşına söyler, arkadaşı kodla katılır. Modlar: 1v1, 2v2 ortak (ikiniz aynı takım, karşıda 2 bot), 2v2 karşılıklı (her takımda bir insan ve bir bot).
- Oda sahibi `Online-Baslat.bat` çalıştırır (bir kere `winget install Cloudflare.cloudflared` gerekir). Çıkan `https://....trycloudflare.com` adresini ikiniz de açar (oda sahibi de localhost değil bu adresten girer). Sahibin bilgisayarı ve bat penceresi açık kaldıkça oyun sürer.
- Yerel ağda ya da test için: `npm start`, ikinci sekmede aynı adres.
- Nasıl çalışır: lockstep. Her tarayıcı aynı `sim.js`'i çalıştırır, sunucu (`tools/wsrelay.js`) yalnız komutları iletir. Kod: `lockstep.js` (komut tamponu, durum özeti ile senkron kontrolü), `net.js` (oda ve lobi), `main.js` ("Online" işaretli yerler). Test: `node tools/online_test.js --mode coop|1v1|pvp --ticks 7200 --lag 40` (iki süreç gerçek röleden oynar, durum özetleri aynı çıkmalı).
- Sim'e yeni durum eklerken: oyun durumunu değiştiren her şey `step` içinde (komut/bot/sim) olmalı. Arayüzden doğrudan `S` değiştiren çağrı (satın alma gibi) senkronu bozar; `main.js act()` ile komut kanalından geçirin.

Ayrıntılar ve kurallar: `CLAUDE.md`. Kahraman tasarımları: `kahraman-tasarimlari.md`. Eşyalar: `esyalar.xlsx`.

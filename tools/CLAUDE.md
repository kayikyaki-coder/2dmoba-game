# tools/ (komut satırı araçları)

Hepsi `node tools/<ad>.js`: kullanım satırı her dosyanın ilk yorumunda. Çalıştırmadan önce o yorumu oku. Çoğu `runner.js`/`pool.js`/`worker.js` üzerinden çok çekirdekli çalışır. Üretilen `tk_*.json`, `teams2v2_result.json`, `neuro/` gitignore'da.

## En sık kullanılanlar
- `teams2v2.js`: bütün 2v2 takım taraması (denge turunun ana aracı; `--fast 1 --diff expert`).
- `simulate.js` + `ui.js`/`ui.html`: genel simülasyon ve arayüzü (`Simulasyon-Baslat.bat`, :8090).
- `serve.js`: oyunu sunar (`npm start`, :8080). `mapeditor.js/html`: harita editörü.
- `pace.js`, `longdiag.js`, `diag.js`, `deaths2.js`, `timeuse.js`: maç uzunluğu ve ölüm teşhisi.

## Gruplar
- Denge: `matrix.js`, `smartmatrix.js`, `smart.js`, `compare.js` (aynı tohumla eşli), `tune.js`, `autobalance.js`, `regress.js`, `builds.js`, `econ.js`, `levels.js`, `duel.js`, `duo.js`, `ablate.js`.
- Bot denetimi/karşılaştırma: `aivs.js`, `aivs2.js` (yeni-eski bot), `aiaudit2.js`, `aiaudit3.js`, `botaudit.js`, `gauntlet.js`, `cstest.js`, `titanlog.js`, `trace.js`, `navtest.js`.
- ML ve öğrenme: `fightdata.js`, `mlcollect.js`, `mltrain.js`, `mlfit.js`, `calib.js`, `evolve.js` (+ `evolve_E1_hard.json`).
- Ajan ve nöroevrim: `ajan_vs.js`, `ajan_trace.js`, `neuro.js`, `neuro_ui.js` (`Noroevrim-*.bat`).
- Online: `wsrelay.js` (WebSocket rölesi), `online_test.js` (lockstep senkron testi).
- Altyapı: `runner.js`, `pool.js`, `worker.js`, `match.js`, `scenario_core.js`.
- Görsel üretim: `sdgen.mjs`, `sd_portreler.mjs` (yerel Stable Diffusion; sonuçlar `assets/sd/`, gitignore).
- `abq.sh`, `buildq.sh`, `expq.sh`, `expq2.sh`: bulut parçası toplu çalıştırma betikleri.

## Kurallar
- Araç yazarken sim'i `sim.js`/`data.js`'ten al, Math.random kullanma (seed'li).
- Sonucu tablo olarak ver; yeni ölçümü `docs/gunluk/` altında ilgili dosyaya tarihle işle.

# Simülasyon araçları notları

tools/ arayüzü ve denge araçları hakkında günlük notları. Kaynak: eski docs/KARAR-GUNLUGU.md (01.11.2026'da konuya göre bölündü, satırlar aynen). Yeni kayıt: en üste ya da ilgili maddenin altına, tarihle.

- Arayüzde (tools/ui.html) modlar: Tek eşleşme (+ akıllı durdurma), Denge tablosu (smartmatrix), Karşılaştır (compare), Toplu öğrenme (regress); her modda senaryo seçimi (tam maç, düello, koridor). Mantık runSmartMatrix/runCompare/runRegress/runSingle (smart.js) fonksiyonlarında; ui.js PORT ve NO_OPEN ortam değişkenlerini destekler. Yedekler old/ui_yedek/.

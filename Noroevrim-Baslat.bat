@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Noroevrim basliyor. Bilgisayarin butun cekirdeklerini kullanir.
echo Durdurmak icin pencereyi kapat; tekrar acinca kaldigi yerden devam eder.
echo Ilerleme: tools\neuro\log.txt
echo.
node tools\neuro.js %*
pause

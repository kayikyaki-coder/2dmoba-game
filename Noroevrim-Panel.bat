@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Noroevrim paneli aciliyor: http://localhost:8090
echo Bu pencereyi kapatmak paneli ve egitimi durdurur (kaldigi yerden devam eder).
node tools\neuro_ui.js
pause

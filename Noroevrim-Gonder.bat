@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add -f tools\neuro\log.txt tools\neuro\best.json tools\neuro\bc.json tools\neuro\state.json
git commit -m "Noroevrim sonuclari"
git push origin ajan-deney
echo Gonderildi.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Arkadasla online oynamak icin: oyun sunucusunu ve ucretsiz bir Cloudflare tunelini acar.
rem Tunelin verdigi https://....trycloudflare.com adresini arkadasina gonder; ikiniz de o adresten girin.
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared kurulu degil. Bir kere su komutla kur, sonra bu dosyayi tekrar calistir:
  echo     winget install Cloudflare.cloudflared
  pause
  exit /b 1
)
start "Oyun sunucusu" cmd /k node tools/serve.js
timeout /t 2 >nul
echo.
echo Asagida cikan https://....trycloudflare.com adresi arkadasinin girecegi adres.
echo Sen de ayni adresten gir (localhost degil). Menude "Arkadasla oyna" - "Oda kur".
echo Bu pencereyi kapatma, kapanirsa oyun biter.
echo.
cloudflared tunnel --url http://localhost:8080
pause

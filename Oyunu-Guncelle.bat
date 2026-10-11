@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Oyun guncelleniyor...
if exist ".git" (
  git stash >nul 2>&1
  git pull --ff-only origin main
) else (
  echo Git yok, son surum ZIP olarak indiriliyor...
  powershell -NoProfile -Command "$z=Join-Path $env:TEMP 'moba2d.zip'; $d=Join-Path $env:TEMP 'moba2d_guncel'; Invoke-WebRequest 'https://github.com/kayikyaki-coder/2dmoba-game/archive/refs/heads/main.zip' -OutFile $z; if(Test-Path $d){Remove-Item $d -Recurse -Force}; Expand-Archive $z $d -Force; Copy-Item (Join-Path $d '2dmoba-game-main\*') '%~dp0' -Recurse -Force; Remove-Item $z,$d -Recurse -Force"
)
echo Guncelleme bitti, oyun aciliyor...
call "%~dp0Oyunu-Baslat.bat"

@echo off
cd /d "%~dp0"
start "" http://localhost:8090
set NO_OPEN=1
node tools/ui.js
pause

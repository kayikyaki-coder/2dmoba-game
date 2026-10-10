@echo off
cd /d "%~dp0"
start "" http://localhost:8080/tools/mapeditor.html
node tools/serve.js
pause

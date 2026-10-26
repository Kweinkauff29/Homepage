@echo off
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js 20 or newer is required. & pause & exit /b 1)
if not exist node_modules call npm install
call npm start
pause

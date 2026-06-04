@echo off
title LinkGuard Launcher (LOCAL / no ngrok)
REM Work from the folder this .bat lives in (handles spaces + drive change)
cd /d "%~dp0"
set "PYTHONUTF8=1"

echo ============================================================
echo             LinkGuard - Launcher  (LOCAL mode)
echo ============================================================
echo.
echo  Backend  (Flask) ......  http://localhost:5000
echo  Frontend (Vite)  ......  http://localhost:5173
echo.
echo  BACKUP launcher: everything runs on your PC, no ngrok needed.
echo  /api proxies to localhost:5000 via vite.config.local.js
echo  (your original vite.config.js is left untouched).
echo.

REM --- 1) Backend: run Flask (app.py) via the venv's own Python on port 5000 ---
start "LinkGuard Backend" cmd /k "cd backend && venv\Scripts\python.exe app.py"

REM --- 2) Frontend: Vite dev server using the LOCAL config on port 5173 ---
start "LinkGuard Frontend" cmd /k "cd fyp-frontend && npm run dev -- --config vite.config.local.js"

REM --- 3) Give the dev servers a moment to boot, then open the app ---
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo ------------------------------------------------------------
echo  Two windows opened:
echo     "LinkGuard Backend"   - close it to stop the API
echo     "LinkGuard Frontend"  - close it to stop the website
echo ------------------------------------------------------------
echo.
echo  Press any key to close THIS launcher (servers keep running)...
pause >nul

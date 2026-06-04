@echo off
title LinkGuard Launcher
REM Work from the folder this .bat lives in (handles spaces + drive change)
cd /d "%~dp0"
set "PYTHONUTF8=1"

echo ============================================================
echo                    LinkGuard - Launcher
echo ============================================================
echo.
echo  Backend  (Flask) ......  http://localhost:5000
echo  Frontend (Vite)  ......  http://localhost:5173
echo.
echo  Launching both servers in their own windows...
echo.

REM --- 1) Backend: run Flask (app.py) via the venv's own Python on port 5000 ---
start "LinkGuard Backend" cmd /k "cd backend && venv\Scripts\python.exe app.py"

REM --- 2) Frontend: Vite dev server on port 5173 ---
start "LinkGuard Frontend" cmd /k "cd fyp-frontend && npm run dev"

REM --- 3) Give the dev servers a moment to boot, then open the app ---
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo ------------------------------------------------------------
echo  Two windows opened:
echo     "LinkGuard Backend"   - close it to stop the API
echo     "LinkGuard Frontend"  - close it to stop the website
echo.
echo  ngrok is NOT started by this script. Your frontend proxies
echo  /api to your ngrok domain (set in fyp-frontend\vite.config.js).
echo  To go public, run your ngrok command for port 5000 in a
echo  separate window (see backend\readme.md).
echo ------------------------------------------------------------
echo.
echo  Press any key to close THIS launcher (servers keep running)...
pause >nul

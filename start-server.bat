@echo off
setlocal

:: Set working directory to this script's directory
cd /d "%~dp0"

title Women of Virtue - Server & Chrome Launcher

echo ========================================================
echo       Women of Virtue - Local Server Launcher
echo ========================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Starting server via Node.js (server.js)...
    start "Women of Virtue Server" /min cmd /c "node server.js 5173"
) else (
    echo [INFO] Node.js not detected in PATH.
    echo [INFO] Starting native server via PowerShell (server.ps1)...
    start "Women of Virtue Server" /min powershell -NoProfile -ExecutionPolicy Bypass -File ".\server.ps1" -Port 5173
)

:: 2. Wait briefly for server to bind port 5173
echo [INFO] Waiting for server on http://localhost:5173...
timeout /t 2 /nobreak >nul

:: 3. Detect Google Chrome or use system default browser
set "CHROME_EXE="

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if defined CHROME_EXE (
    echo [INFO] Launching Google Chrome...
    start "" "%CHROME_EXE%" "http://localhost:5173/admin.html"
) else (
    echo [INFO] Chrome executable not in standard path. Launching default browser...
    start "" "http://localhost:5173/admin.html"
)

echo.
echo ========================================================
echo  Server is running at: http://localhost:5173/
echo  Admin page opened at: http://localhost:5173/admin.html
echo ========================================================
echo.

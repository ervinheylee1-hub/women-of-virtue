@echo off
setlocal

:: Ensure we are in this project's directory
cd /d "%~dp0"

title Women of Virtue - Node Server & Chrome

echo ========================================================
echo       Women of Virtue - Node Server Launcher
echo ========================================================
echo.

:: 1. Verify Node.js executable
set "NODE_CMD="

if exist "%~dp0node.exe" (
    set "NODE_CMD=%~dp0node.exe"
) else (
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        set "NODE_CMD=node"
    )
)

if not defined NODE_CMD (
    echo [ERROR] node.exe was not found in this folder or in system PATH.
    echo Please ensure node.exe is in "%~dp0" or install Node.js.
    pause
    exit /b 1
)

:: 2. Launch Node server in minimized background window
echo [INFO] Starting Node.js backend (server.js)...
start "Women of Virtue Server" /min "%NODE_CMD%" server.js 5173

:: 3. Wait briefly for server to bind port 5173
echo [INFO] Waiting for server on http://localhost:5173...
timeout /t 2 /nobreak >nul

:: 4. Locate Google Chrome or fallback to default browser
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
    start "" "%CHROME_EXE%" "http://localhost:5173/admin"
) else (
    echo [INFO] Launching default browser...
    start "" "http://localhost:5173/admin"
)

echo.
echo ========================================================
echo  Node server is active on: http://localhost:5173/
echo  Admin portal opened at:  http://localhost:5173/admin
echo ========================================================
echo.

@echo off
REM ===== Interview Review Assistant - one-click start =====
setlocal

cd /d "%~dp0"

REM --- Detect a usable Python interpreter ---
set "PY_CMD="
where py >nul 2>&1
if %errorlevel%==0 (
    py --version >nul 2>&1
    if %errorlevel%==0 set "PY_CMD=py"
)
if not defined PY_CMD (
    where python >nul 2>&1
    if %errorlevel%==0 (
        python --version >nul 2>&1
        if %errorlevel%==0 set "PY_CMD=python"
    )
)
if not defined PY_CMD (
    echo [ERROR] Python not found. Please run the setup script first.
    pause
    exit /b 1
)

echo Starting Interview Review Assistant...
echo Server: http://localhost:8080
echo Press Ctrl+C to stop.
echo.
start http://localhost:8080
%PY_CMD% server.py
echo.
echo Server stopped. Press any key to close...
pause >nul

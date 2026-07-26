@echo off
REM ===== Interview Review Assistant - one-click environment setup =====
setlocal

cd /d "%~dp0"

echo ============================================
echo   Interview Review Assistant - Setup
echo ============================================
echo.

REM --- 1. Detect a usable Python interpreter ---
set "PY_CMD="

where py >nul 2>&1
if %errorlevel%==0 (
    py --version >nul 2>&1
    if %errorlevel%==0 set "PY_CMD=py"
)

if not defined PY_CMD (
    where python >nul 2>&1
    if %errorlevel%==0 (
        REM Skip the Windows Store stub which prints nothing and exits 9009
        python --version >nul 2>&1
        if %errorlevel%==0 set "PY_CMD=python"
    )
)

if not defined PY_CMD (
    echo [ERROR] Python was not found.
    echo Please install Python 3.7+ from https://www.python.org/downloads/
    echo During install, tick "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo [OK] Using Python command: %PY_CMD%
%PY_CMD% --version
echo.

REM --- 2. Upgrade pip ---
echo Upgrading pip...
%PY_CMD% -m pip install --upgrade pip
echo.

REM --- 3. Install dependencies ---
echo Installing dependencies from requirements.txt...
%PY_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Dependency installation failed. See messages above.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setup complete! You can now run start.bat
echo   (or the Chinese-named startup .bat file)
echo ============================================
echo.
pause

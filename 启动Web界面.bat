@echo off
title CodeStudio Pro Ultimate - Web Interface Launcher

echo.
echo ======================================================================
echo CodeStudio Pro Ultimate - Web Interface Launcher
echo ======================================================================
echo.
echo Starting Web Interface...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found
    echo.
    echo Please install Python and add it to system PATH
    echo Download: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Check if main program file exists
if not exist "codestudio_pro_ultimate.py" (
    echo ERROR: Main program file not found
    echo.
    echo Please ensure this batch file is in the same directory as the main program
    echo.
    pause
    exit /b 1
)

REM Check if HTML interface file exists
if not exist "codestudio_cleaner_ui.html" (
    echo ERROR: HTML interface file not found
    echo.
    echo Please ensure HTML interface file is in the same directory as the main program
    echo.
    pause
    exit /b 1
)

echo Environment check passed
echo.
echo Starting Web server...
echo.
echo Tips:
echo    - Web interface will open automatically in browser
echo    - Server address: http://localhost:8080
echo    - Press Ctrl+C to stop server
echo.
echo ======================================================================
echo.

REM Start Web interface
python codestudio_pro_ultimate.py --web

echo.
echo ======================================================================
echo Web server stopped
echo ======================================================================
echo.
pause

@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Volume Gesture - Native Host Installer
echo ============================================
echo.

:: Get the directory where this script lives
set "INSTALL_DIR=%~dp0"
set "MANIFEST=%INSTALL_DIR%com.volgesture.volumemonitor.json"

:: -----------------------------------------------
:: Step 1: Check for Python
:: -----------------------------------------------
echo [1/4] Checking for Python...

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Python is not installed or not in PATH.
    echo.
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    echo IMPORTANT: Check "Add Python to PATH" during installation.
    echo.
    echo After installing Python, run this script again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo        Found: %PYVER%

:: -----------------------------------------------
:: Step 2: Install Python dependencies
:: -----------------------------------------------
echo.
echo [2/4] Installing Python dependencies...
python -m pip install --quiet -r "%INSTALL_DIR%requirements.txt"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: pip install had issues. Trying alternate method...
    python -m pip install pycaw comtypes
)
echo        Dependencies installed.

:: -----------------------------------------------
:: Step 3: Get extension ID and write manifest
:: -----------------------------------------------
echo.
echo [3/4] Configuring native messaging host...
echo.

:: Detect wrapper vs exe
if exist "%INSTALL_DIR%volume_monitor.exe" (
    set "HOST_PATH=%INSTALL_DIR%volume_monitor.exe"
    echo        Using standalone volume_monitor.exe
) else (
    set "HOST_PATH=%INSTALL_DIR%volume_monitor_wrapper.bat"
    echo        Using volume_monitor_wrapper.bat

    :: Find the Python executable path for the wrapper
    for /f "tokens=*" %%p in ('python -c "import sys; print(sys.executable)"') do set "PYTHON_PATH=%%p"

    :: Rewrite wrapper with the correct Python path
    (
        echo @echo off
        echo cd /d "%%~dp0"
        echo "!PYTHON_PATH!" volume_monitor.py 2^> "%%~dp0debug.log"
    ) > "%INSTALL_DIR%volume_monitor_wrapper.bat"
    echo        Updated wrapper with Python path: !PYTHON_PATH!
)

echo.
echo The extension ID identifies your Volume Gesture installation.
echo.
echo If you installed from the Edge Add-ons Store, your ID is:
echo   kdfcohjeeijddaekjdlnmcofadadmopc
echo.
echo If you sideloaded the extension, find your ID at edge://extensions/
echo.
set /p EXT_ID="Enter extension ID (or press Enter for store default): "

if "!EXT_ID!"=="" (
    set "EXT_ID=kdfcohjeeijddaekjdlnmcofadadmopc"
    echo        Using default store ID: !EXT_ID!
)

:: Write manifest with correct paths
(
echo {
echo   "name": "com.volgesture.volumemonitor",
echo   "description": "Volume Gesture - System volume monitor for video navigation",
echo   "path": "!HOST_PATH:\=\\!",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://!EXT_ID!/"
echo   ]
echo }
) > "%MANIFEST%"

echo        Manifest written to: %MANIFEST%

:: -----------------------------------------------
:: Step 4: Register with Edge
:: -----------------------------------------------
echo.
echo [4/4] Registering native messaging host with Microsoft Edge...
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.volgesture.volumemonitor" /ve /t REG_SZ /d "%MANIFEST%" /f >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo        Registry entry added successfully.
    echo.
    echo ============================================
    echo   Installation complete!
    echo ============================================
    echo.
    echo Next steps:
    echo   1. Open or restart Microsoft Edge
    echo   2. Go to edge://extensions/ and reload the extension
    echo   3. Open YouTube or Facebook and test with your volume buttons
    echo.
    echo Troubleshooting:
    echo   - Open DevTools (F12) ^> Console, look for [VolumeGesture] messages
    echo   - Check %INSTALL_DIR%debug.log for native host errors
    echo.
) else (
    echo.
    echo ERROR: Failed to write registry entry.
    echo Try running this script as Administrator:
    echo   Right-click install.bat ^> Run as administrator
    echo.
)

pause

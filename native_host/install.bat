@echo off
setlocal

echo === Volume Gesture - Native Host Installer ===
echo.

:: Get the directory where this script lives
set "INSTALL_DIR=%~dp0"
set "MANIFEST=%INSTALL_DIR%com.volgesture.volumemonitor.json"

:: Update the manifest path to use absolute path for the wrapper
set "WRAPPER=%INSTALL_DIR%volume_monitor_wrapper.bat"

:: Create a working copy of the manifest with the correct absolute path
:: (The path field must be absolute in the registry-referenced manifest)
echo Generating manifest with absolute paths...
(
echo {
echo   "name": "com.volgesture.volumemonitor",
echo   "description": "Volume Gesture - System volume monitor for video navigation",
echo   "path": "%WRAPPER:\=\\%",
echo   "type": "stdio",
echo   "allowed_origins": []
echo }
) > "%MANIFEST%"

echo Manifest written to: %MANIFEST%
echo.

:: Prompt for extension ID
set /p EXT_ID="Enter your extension ID (from edge://extensions): "

:: Rewrite manifest with the actual extension ID
(
echo {
echo   "name": "com.volgesture.volumemonitor",
echo   "description": "Volume Gesture - System volume monitor for video navigation",
echo   "path": "%WRAPPER:\=\\%",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://%EXT_ID%/"
echo   ]
echo }
) > "%MANIFEST%"

:: Register for Edge (Chromium-based, uses same registry path as Chrome)
echo Registering native messaging host for Microsoft Edge...
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.volgesture.volumemonitor" /ve /t REG_SZ /d "%MANIFEST%" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Native messaging host registered.
    echo.
    echo Next steps:
    echo   1. Install Python dependencies:  pip install -r requirements.txt
    echo   2. Reload the extension in edge://extensions/
    echo   3. Open YouTube or Facebook and test the volume gesture with your headset.
) else (
    echo.
    echo ERROR: Failed to register. Try running this script as Administrator.
)

echo.
pause

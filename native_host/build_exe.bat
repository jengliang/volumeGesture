@echo off
echo ============================================
echo   Build volume_monitor.exe (standalone)
echo ============================================
echo.
echo This bundles volume_monitor.py into a single .exe
echo so end users do not need Python installed.
echo.

:: Check for PyInstaller
python -m PyInstaller --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing PyInstaller...
    python -m pip install pyinstaller
    echo.
)

echo Building volume_monitor.exe...
echo.

cd /d "%~dp0"

python -m PyInstaller ^
    --onefile ^
    --name volume_monitor ^
    --console ^
    --hidden-import=pycaw ^
    --hidden-import=pycaw.pycaw ^
    --hidden-import=comtypes ^
    --hidden-import=comtypes.stream ^
    --clean ^
    volume_monitor.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo   Build successful!
    echo ============================================
    echo.
    echo Output: %~dp0dist\volume_monitor.exe
    echo.
    echo Copy volume_monitor.exe to this directory:
    copy /y "dist\volume_monitor.exe" "%~dp0volume_monitor.exe" >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo   Copied to: %~dp0volume_monitor.exe
    ) else (
        echo   Copy manually: dist\volume_monitor.exe -^> %~dp0
    )
    echo.
    echo The install.bat script will automatically detect and use the .exe
    echo instead of the Python wrapper when present.
    echo.
    echo You can now distribute the native_host folder without requiring
    echo users to install Python.
) else (
    echo.
    echo Build FAILED. Check errors above.
)

echo.
pause

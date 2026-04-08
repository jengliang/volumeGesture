@echo off
echo === Volume Gesture - Native Host Uninstaller ===
echo.
echo Removing native messaging host registration for Microsoft Edge...

reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.volgesture.volumemonitor" /f

if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Native messaging host removed.
) else (
    echo Note: Registry key not found or already removed.
)

echo.
pause

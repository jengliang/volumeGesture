@echo off
cd /d "%~dp0"
"C:\Users\jengt\AppData\Local\Programs\Python\Python314\python.exe" volume_monitor.py 2> "%~dp0debug.log"
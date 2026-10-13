@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Theme.ps1" -Action Probe
pause

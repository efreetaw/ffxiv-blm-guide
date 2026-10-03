@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-timeline.ps1"
if errorlevel 1 pause

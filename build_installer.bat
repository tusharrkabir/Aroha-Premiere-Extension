@echo off
chcp 65001 >nul
echo =======================================================
echo   AROHA PREMIERE PRO EXTENSION - 1-CLICK BUILD SCRIPT
echo =======================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_installer.ps1"
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Marca Viva - servidor local
echo.
echo Iniciando servidor local...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-local.ps1"
echo.
pause

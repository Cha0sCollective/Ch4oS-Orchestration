@echo off
rem Uses the host-tools folder beside the orchestration checkout. No downloads.
powershell.exe -NoLogo -NoProfile -File "%~dp0Start-Playground.ps1" -InstallRoot "%~dp0..\..\..\.ch4os-tools" -Application Comfy
if errorlevel 1 (
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8188"

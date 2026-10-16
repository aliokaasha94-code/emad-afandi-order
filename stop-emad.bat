@echo off
schtasks /end /tn EmadEffendiServer 2>nul
echo Server stopped. You can close this window.
pause

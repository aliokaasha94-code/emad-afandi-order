@echo off
title Emad Effendi - Smart Order Pager System
cd /d "%~dp0"
echo =====================================================================
echo       EMAD EFFENDI CAFE - SMART ORDER PAGER (NADEENI STYLE)
echo =====================================================================
echo.
echo  [+] Local Laptop URL : http://localhost:3000
echo  [+] Mobile Wi-Fi URL : http://192.168.0.28:3000
echo  [+] Cashier Dashboard: http://localhost:3000/dashboard
echo.
echo  Open http://192.168.0.28:3000 on your mobile browser to test!
echo =====================================================================
npm run dev -- -H 0.0.0.0 -p 3000

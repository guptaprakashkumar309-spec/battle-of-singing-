@echo off
title Battle of Singing Start Script
echo ===================================================
echo Starting Battle of Singing Web Server (Local Mode)
echo ===================================================
echo.

:: Check if node_modules exists, if not install
if not exist node_modules (
    echo node_modules not found. Installing packages...
    call npm install
)

:: Start Node.js backend server in a separate window
echo Starting backend server on port 3000...
start "Node Express Server" cmd /c "node server.js"

:: Wait 3 seconds for server to start
timeout /t 3 /nobreak > nul

echo.
echo ===================================================
echo Starting Public Tunnel (serveo.net)
echo ===================================================
echo.
echo ---------------------------------------------------
echo ADMIN PASSWORD: GLAAdmin2026
echo ---------------------------------------------------
echo.

:: Start SSH Tunnel to Serveo in a separate window
start "Public Link Tunnel" cmd /k "ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 serveo.net"

echo.
echo Server and Tunnel have been launched!
echo.
echo Check the new "Public Link Tunnel" window for your public HTTPS link.
echo It will look like: https://[random-letters].serveousercontent.com
echo.
echo Keep both command windows open while registrations are active.
echo.
pause

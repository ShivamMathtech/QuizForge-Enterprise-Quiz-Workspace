@echo off
setlocal
cd /d "%~dp0"
node -e "if (process.versions.node.split('.')[0] !== '24') process.exit(1)"
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
set "VITE_APP_MODE=demo"
echo Open the Local URL printed below in your browser. No backend is needed.
call npm run dev
pause

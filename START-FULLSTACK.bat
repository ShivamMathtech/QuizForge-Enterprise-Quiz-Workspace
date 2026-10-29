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
if not exist .env copy .env.example .env >nul
echo Starting the frontend and backend. Open http://localhost:5173
echo Local demo password: QuizForge!2026
call npm run dev:full
pause

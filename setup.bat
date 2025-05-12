@echo off
echo =====================================================================
echo      ProPra-2025-Gruppe-2 SQL Learning Platform Setup Script
echo =====================================================================
echo.
echo This script will set up the entire project for you, including:
echo - Installing dependencies for backend and frontend
echo - Setting up the database (requires PostgreSQL running)
echo - Starting both servers
echo.
echo Prerequisites:
echo - Node.js 18+ and npm 8+
echo - PostgreSQL running on localhost:5432
echo.
pause

REM Create .env file if it doesn't exist
if not exist backend\.env (
  echo Creating .env file in backend directory...
  copy backend\.env.example backend\.env
  echo Please update the .env file with your database credentials if needed.
  pause
)

REM Setup Backend
echo.
echo Setting up backend...
cd backend
call npm install
echo Initializing database...
call npx prisma migrate dev --name init
call npx prisma db seed

REM Start backend in new window
echo Starting backend server...
start powershell -NoExit -Command "cd '%cd%'; npm run start:dev"
cd ..

REM Setup Frontend
echo.
echo Setting up frontend...
cd frontend
call npm install

REM Start frontend in current window
echo Starting frontend server...
npm start

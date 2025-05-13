#!/bin/bash

# Exit on error
set -e

# Display introduction
echo "====================================================================="
echo "     ProPra-2025-Gruppe-2 SQL Learning Platform Setup Script"
echo "====================================================================="
echo ""
echo "This script will set up the entire project for you, including:"
echo "- Installing dependencies for backend and frontend"
echo "- Setting up the database (requires PostgreSQL running)"
echo "- Starting both servers"
echo ""
echo "Prerequisites:"
echo "- Node.js 18+ and npm 8+"
echo "- PostgreSQL running on localhost:5432"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
  echo "Creating .env file in backend directory..."
  cp backend/.env.example backend/.env
  echo "Please update the .env file with your database credentials if needed."
  read -p "Press Enter to continue after updating the .env file..."
fi

# Setup Backend
echo ""
echo "Setting up backend..."
cd backend
npm install
echo "Initializing database..."
npx prisma migrate dev --name init
npx prisma db seed

# Start backend in background
echo "Starting backend server..."
npm run start:dev &
BACKEND_PID=$!
echo "Backend server is running with PID: $BACKEND_PID"
cd ..

# Setup Frontend
echo ""
echo "Setting up frontend..."
cd frontend
npm install

# Start frontend
echo "Starting frontend server..."
npm start

# Cleanup function to kill the backend process when the script is terminated
function cleanup {
  echo "Stopping backend server (PID: $BACKEND_PID)..."
  kill $BACKEND_PID
  echo "Done."
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

#!/bin/bash

echo "===== SQL Learning Platform Docker Reset ====="
echo

echo "1. Stopping Docker containers..."
docker-compose down

echo "2. Cleaning Docker volumes..."
docker volume rm propra-2025-gruppe-2_postgres-data || true

echo "3. Building and starting Docker containers..."
docker-compose up -d --build

echo
echo "==== Setup complete! ===="
echo "The application is now available at:"
echo "- Frontend: http://localhost:4200"
echo "- Backend API: http://localhost:3000"
echo
echo "Default login credentials:"
echo "- Teacher: teacher@example.com / password123"
echo "- Tutor: tutor1@example.com / password123"
echo "- Student: student1@example.com / password123"

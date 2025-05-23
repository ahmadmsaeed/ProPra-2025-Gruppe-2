# ProPra 2025 Group 2 – SQL Learning Platform

An interactive platform for learning and practicing SQL queries with instant feedback, built with an Angular frontend, a NestJS backend, and a PostgreSQL database with Docker-based isolation.

---

## ✨ System Overview

A comprehensive SQL learning system that allows teachers and tutors to create databases and exercises while students can safely practice SQL queries in isolated containers.

---

## 🚀 Features

### 🧩 Database Management

* Upload and parse SQL files via [http://localhost:4200/databases]
* Automatic separation of schema and seed data
* Support for PostgreSQL and MySQL with automatic conversion
* Clean table detection and deletion per database
* Fix: Deleting one database no longer affects unrelated tables

### 👩‍🎓 Role and Permission System

* **Teachers**: Full access to all databases and exercises
* **Tutors**: Access only to their own content
* **Students**: Access exercises in isolated environments only

### 🔒 Security & Error Handling

* Validates dangerous SQL commands
* Logs all critical operations
* Enhanced debug logs for imports and operations
* Detailed error messages for uploads and processing

### 📏 Architecture

* Modular services:

  * `DatabaseTableManagerService`: Handles table operations
  * `DatabaseAuditService`: Logs changes
  * `DatabaseValidatorService`: Checks SQL safety
  * `DatabaseOwnershipService`: Manages permissions

---

## 🔧 Local Development (with Docker)

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop)
* Node.js (v18 or higher)
* npm (comes with Node.js)

### Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/ProPra-2025-Gruppe-2/sql-learning-platform.git
cd ProPra-2025-Gruppe-2

# 2. Start the database
docker-compose up -d
```

#### Backend Setup:

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

#### Frontend Setup (new terminal):

```bash
cd frontend
npm install
npm start
```

Access:

* Frontend: [http://localhost:4200](http://localhost:4200)
* Backend API: [http://localhost:3000](http://localhost:3000)

Test Credentials:

* **Teacher**: `teacher@example.com / password123`
* **Tutor**: `tutor1@example.com / password123`
* **Student**: `student1@example.com / password123`

---

## 📆 Useful Docker Commands

```bash
# Show logs
docker-compose logs postgres

# Stop the database
docker-compose down

# Reset the database
docker-compose down
docker volume rm propra-2025-gruppe-2_postgres_data
docker-compose up -d
```

---

## 📚 Project Structure

```
ProPra-2025-Gruppe-2/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── admin/
│       ├── auth/
│       ├── prisma/
│       ├── sql-import/
│       └── ...
├── frontend/
│   └── src/
│       ├── app/
│       └── ...
├── docker-compose.yml
└── README.md
```

---

## 🧰 Upcoming Features – Student Exercise System

### Planned Flow:

1. When a student opens an exercise, a **Docker container** is created with a copy of the database.
2. The student practices inside the container with no effect on the original data.
3. The container is removed after submission or exit.

### Benefits:

* Safe and isolated learning
* Reproducible environments for all students
* Progress tracking for teachers
* Efficient resource management with automatic cleanup

### Implementation Plan:

1. Build API endpoints for student access
2. Implement container creation/deletion logic
3. Add submission and evaluation system

---

## 🛠️ Tech Stack

* **Frontend**: Angular + Angular Material
* **Backend**: NestJS + Prisma
* **Database**: PostgreSQL (MySQL optional)
* **Isolation**: Docker
* **Authentication**: JWT

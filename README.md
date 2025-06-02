# Interactive SQL Learning Platform
## ProPra 2025 - Group 2

### Project Overview

A comprehensive web-based SQL learning management system for educational institutions. The platform provides secure, isolated Docker environments for SQL practice with role-based access control and administrative tools for instructors.

**Academic Context**: Software Engineering Project (Programmierpraktikum) 2025  
**Team**: Group 2  
**Project Type**: Full-Stack Web Application with Containerized Database Management

---

## System Architecture & Features

### Core Functionality

#### Database Management System
- **Multi-format SQL Import**: Parse and process SQL files through `/databases` endpoint
- **Schema-Data Separation**: Intelligent separation of DDL and DML statements
- **Cross-Platform Support**: Native PostgreSQL with MySQL conversion
- **Transactional Safety**: ACID-compliant operations with rollback mechanisms

#### Role-Based Access Control (RBAC)
- **Teachers**: Full administrative privileges with system-wide access
- **Tutors**: Scoped access limited to personally created content
- **Students**: Sandboxed environment access with exercise-only permissions
- **JWT Authentication**: Stateless authentication with role-based authorization

#### Security & Quality Assurance
- **SQL Injection Prevention**: Comprehensive query validation and sanitization
- **Audit Trail System**: Complete logging for all database operations
- **Service-Oriented Architecture**: Modular services for database, validation, and ownership management

---

## Development Environment Setup

### System Requirements
- Docker Desktop (Version 4.0+)
- Node.js (Version 18.x LTS+)
- npm (Version 8.x+)
- Git (Version 2.30+)

### Installation & Configuration

```bash
# Clone and initialize
git clone https://github.com/ProPra-2025-Gruppe-2/sql-learning-platform.git
cd ProPra-2025-Gruppe-2
docker-compose up -d

# Backend setup
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev

# Frontend setup (new terminal)
cd frontend
npm install
npm start
```

### Service Endpoints
- **Frontend**: `http://localhost:4200` - Angular SPA with Material Design
- **Backend API**: `http://localhost:3000` - NestJS REST API
- **API Docs**: `http://localhost:3000/api` - Swagger UI

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Teacher | `teacher@example.com` | `password123` |
| Tutor | `tutor1@example.com` | `password123` |
| Student | `student1@example.com` | `password123` |

---

## Educational Workflow

### Containerized Learning Environment
1. **Exercise Initialization**: Automatic Docker container provisioning per student
2. **Database Replication**: Complete database copy within isolated container
3. **Secure Practice**: Students execute SQL queries with full database access
4. **Reset Functionality**: Restore original database state for repeated practice
5. **Automatic Cleanup**: Container termination and resource reclamation

### Benefits
- Complete data isolation between students
- Reproducible learning environments
- Zero risk to source databases
- Efficient resource management with scaling

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Angular 17 + Material | SPA Framework & UI Components |
| **Backend** | NestJS 10 + Prisma 5 | API Framework & Database ORM |
| **Database** | PostgreSQL 15 | Primary Relational Database |
| **Containerization** | Docker 24 | Application Isolation |
| **Authentication** | JWT | Stateless Authentication |
| **Testing** | Jest 29 | Unit & Integration Testing |

---

## Docker Management

```bash
# View logs and manage services
docker-compose logs postgres
docker-compose down
docker-compose down --volumes  # Complete reset

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

---

## Project Structure

```
ProPra-2025-Gruppe-2/
├── backend/                    # NestJS Application
│   ├── prisma/                # Database Schema & Migrations
│   ├── src/                   # Application Source Code
│   │   ├── auth/              # Authentication & Authorization
│   │   ├── exercise/          # Exercise Management
│   │   ├── sql-import/        # SQL Processing Engine
│   │   └── common/            # Shared Services
│   └── test/                  # Testing Suite
├── frontend/                  # Angular Application
│   └── src/app/               # Components & Services
├── docker-compose.yml         # Container Orchestration
└── README.md                 # Documentation
```

---

## Academic Context & Learning Outcomes

This project demonstrates practical application of modern web development technologies, showcasing:
- **Full-Stack Development**: Integration of frontend and backend technologies
- **Database Design**: Relational modeling and optimization
- **Security Implementation**: Authentication, authorization, and data protection
- **Container Technology**: Docker for isolation and deployment
- **Software Engineering**: Agile practices and code quality standards

---

## License & Contact

**Project Team**: ProPra 2025 - Group 2  
**Institution**: [University Name]  
**Course**: Programmierpraktikum (Software Engineering Project)  
**Academic Year**: 2025

*Developed as part of the ProPra 2025 curriculum demonstrating modern software engineering practices in educational technology.*

# ProPra 2025 Gruppe 2

# SQL Learning Platform

Eine interaktive Plattform zum Erlernen und Üben von SQL-Abfragen mit sofortigem Feedback.

## Projektbeschreibung

Diese Lernplattform ermöglicht es Dozenten, SQL-Übungen zu erstellen und Studenten, diese Übungen zu bearbeiten. Die Anwendung besteht aus einem Angular-Frontend und einem NestJS-Backend mit einer PostgreSQL-Datenbank.

## Schnellstart mit Docker (empfohlen)

### Voraussetzungen
- [Docker](https://www.docker.com/products/docker-desktop/) und Docker Compose

### Installation und Start
1. Repository klonen:
   ```bash
   git clone https://github.com/ProPra-2025-Gruppe-2/sql-learning-platform.git
   cd ProPra-2025-Gruppe-2
   ```

2. Anwendung starten:
   ```bash
   docker-compose up -d
   ```

3. Zugriff auf die Anwendung:
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000

4. Standard-Anmeldedaten:
   - Dozent: teacher@example.com / password123
   - Tutor: tutor1@example.com / password123
   - Student: student1@example.com / password123

### Nützliche Docker-Befehle
- Logs anzeigen:
  ```bash
  docker-compose logs
  docker-compose logs backend
  docker-compose logs frontend
  ```

- Anwendung stoppen:
  ```bash
  docker-compose down
  ```

- Nach Code-Änderungen neu bauen und starten:
  ```bash
  docker-compose down
  docker-compose build
  docker-compose up -d
  ```

- Datenbank zurücksetzen (Windows):
  ```bash
  docker-reset.bat
  ```

- Datenbank zurücksetzen (Linux/Mac):
  ```bash
  ./docker-reset.sh
  ```

## Manuelle Installation (für Entwickler)

### Voraussetzungen
- Node.js (Version 18 oder höher)
- npm (wird mit Node.js installiert)
- PostgreSQL (Version 14 oder höher)

### 1. Repository klonen
```bash
git clone https://github.com/ProPra-2025-Gruppe-2/sql-learning-platform.git
cd ProPra-2025-Gruppe-2
```

### 2. Backend einrichten
```bash
cd backend

# Abhängigkeiten installieren
npm install

# .env-Datei erstellen
```

Erstellen Sie eine `.env`-Datei im `backend`-Verzeichnis:
```
DATABASE_URL="postgresql://username:password@localhost:5432/sql_learning_platform"
JWT_SECRET="super-secure-jwt-secret-for-authentication"
```
Ersetzen Sie `username` und `password` mit Ihren PostgreSQL-Zugangsdaten.

```bash
# Datenbank initialisieren
npx prisma migrate dev --name init
npx prisma db seed

# Backend-Server starten
npm run start:dev
```

### 3. Frontend einrichten
```bash
cd ../frontend

# Abhängigkeiten installieren
npm install

# Frontend-Server starten
npm start
```

## Projektstruktur

```
ProPra-2025-Gruppe-2/
├── backend/                # NestJS Backend
│   ├── prisma/             # Datenbankschema und Migrationen
│   │   ├── migrations/     # Datenbank-Migrationen
│   │   ├── schema.prisma   # Prisma-Schema
│   │   └── seed.ts         # Seed-Skript für Testdaten
│   └── src/                # Backend-Quellcode
│       ├── admin/          # Admin-Module (Benutzerverwaltung)
│       ├── auth/           # Authentifizierung
│       ├── prisma/         # Prisma-Service
│       └── ...
├── frontend/               # Angular Frontend
│   └── src/                # Frontend-Quellcode
│       ├── app/            # Angular-Komponenten
│       └── ...
├── docker-compose.yml      # Docker-Konfiguration
└── README.md               # Diese Datei
```

## Entwicklung

### Backend-Tests
```bash
cd backend
npm run test
```

### Frontend-Tests
```bash
cd frontend
npm run test
```

## Mitwirkende
- ProPra 2025 Gruppe 2


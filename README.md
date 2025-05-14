# ProPra 2025 Gruppe 2

# SQL Learning Platform

Eine interaktive Plattform zum Erlernen und Üben von SQL-Abfragen mit sofortigem Feedback.

## Projektbeschreibung

Diese Lernplattform ermöglicht es Dozenten, SQL-Übungen zu erstellen und Studenten, diese Übungen zu bearbeiten. Die Anwendung besteht aus einem Angular-Frontend und einem NestJS-Backend mit einer PostgreSQL-Datenbank.

## Lokale Entwicklung mit Docker-Datenbank (empfohlen)

### Voraussetzungen
- [Docker](https://www.docker.com/products/docker-desktop/)
- Node.js (Version 18 oder höher)
- npm (wird mit Node.js installiert)

### Installation und Start
1. Repository klonen:
   ```bash
   git clone https://github.com/ProPra-2025-Gruppe-2/sql-learning-platform.git
   cd ProPra-2025-Gruppe-2
   ```

2. PostgreSQL-Datenbank mit Docker starten:
   ```bash
   docker-compose up -d
   ```

3. Backend einrichten:
   ```bash
   cd backend
   npm install
   
   # Prisma einrichten und Datenbank initialisieren
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   
   # Backend starten
   npm run start:dev
   ```

4. Frontend einrichten (in einem neuen Terminal):
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. Zugriff auf die Anwendung:
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000

6. Standard-Anmeldedaten:
   - Dozent: teacher@example.com / password123
   - Tutor: tutor1@example.com / password123
   - Student: student1@example.com / password123

### Nützliche Docker-Befehle für die Datenbank
- Datenbank-Logs anzeigen:
  ```bash
  docker-compose logs postgres
  ```

- Datenbank stoppen:
  ```bash
  docker-compose down
  ```

- Datenbank zurücksetzen:
  ```bash
  # Datenbank Container stoppen und entfernen
  docker-compose down
  # Volume mit den Daten löschen
  docker volume rm propra-2025-gruppe-2_postgres_data
  # Datenbank neu starten
  docker-compose up -d
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


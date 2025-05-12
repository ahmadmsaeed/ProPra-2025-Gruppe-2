# ProPra 2025 Gruppe 2

SQL Learning Platform - Eine Anwendung zur Übung von SQL-Abfragen mit interaktivem Feedback.

## Projektbeschreibung

Dies ist eine Lernplattform für SQL, die es Dozenten ermöglicht, SQL-Übungen zu erstellen und Studenten diese Übungen zu bearbeiten. Die Anwendung besteht aus einem Angular-Frontend und einem NestJS-Backend mit einer PostgreSQL-Datenbank.

## Voraussetzungen

- Node.js (Version 18 oder höher) und npm - [Download hier](https://nodejs.org/)
- PostgreSQL (Version 14 oder höher) - [Download hier](https://www.postgresql.org/download/)

Diese Anwendungen müssen bereits auf Ihrem System installiert sein, bevor Sie mit dem Setup beginnen.

## Schnellstart

Für eine einfache Einrichtung können Sie das Setup-Skript verwenden.

## Manuelle Installation und Einrichtung

### 1. Klonen des Repositories

```bash
git clone https://github.com/yourusername/ProPra-2025-Gruppe-2.git
cd ProPra-2025-Gruppe-2
```

### 2. Backend-Einrichtung

```bash
cd backend

# Installieren der Abhängigkeiten
npm install

# Erstellen der .env-Datei
```

Erstellen Sie eine `.env`-Datei im `backend`-Verzeichnis mit folgendem Inhalt:

```
DATABASE_URL="postgresql://username:password@localhost:5432/sql_learning_platform"
```

Ersetzen Sie `username`, `password` (username ist normalerweise postgresql, password haben sie beim installieren festgestellt.)

```bash
# Initialisieren der Datenbank
npx prisma migrate dev --name init
npx prisma db seed

# Starten des Backend-Servers
npm run start:dev
```

### 3. Frontend-Einrichtung

```bash
# Wechseln zum Frontend-Verzeichnis
cd ../frontend

# Installieren der Abhängigkeiten
npm install

# Starten des Frontend-Servers
npm start
```

## Nutzung

Nach dem Start der Anwendung können Sie auf die folgenden URLs zugreifen:

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Prisma Studio (Datenbankverwaltung): http://localhost:5555 (Starten mit `npx prisma studio` im backend-Verzeichnis)

### Standardbenutzer

Die folgenden Benutzer werden beim Seed der Datenbank erstellt:

- Dozent: teacher@example.com (Passwort: password123)
- Tutor: tutor1@example.com (Passwort: password123)
- Student: student1@example.com (Passwort: password123)

## Entwicklung

### Backend

Das Backend basiert auf dem NestJS-Framework und verwendet Prisma als ORM für die Datenbankinteraktion.

```bash
cd backend

# Unit-Tests durchführen
npm run test



### Frontend

Das Frontend wurde mit Angular erstellt.

```bash
cd frontend

# Unit-Tests durchführen
npm run test

# Build für Produktion
npm run build
```

## Projektstruktur

- `backend/`: NestJS-Backend
  - `prisma/`: Prisma-Schema und Datenbankmigrationen
  - `src/`: Quellcode des Backends
- `frontend/`: Angular-Frontend
  - `src/`: Quellcode des Frontends
    - `app/`: Angular-Komponenten und -Dienste


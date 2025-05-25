# Temporary Database System

## Übersicht

Das Temporary Database System erstellt isolierte PostgreSQL-Container für jeden Schüler, damit sie ihre SQL-Abfragen auf Kopien der Original-Datenbank ausführen können, ohne sich gegenseitig oder die Original-Datenbank zu beeinträchtigen.

## Funktionsweise

### 1. Container-Erstellung
- Für jeden Schüler wird ein eigener PostgreSQL-Container erstellt
- Jeder Container läuft auf einem eigenen Port (5500-5600)
- Container werden automatisch mit PostgreSQL 15 gestartet

### 2. Datenbank-Kopierung
- Das Schema und die Seed-Daten der Original-Datenbank werden in den Container kopiert
- Jeder Schüler arbeitet mit einer vollständigen, isolierten Kopie

### 3. Query-Ausführung
- Schüler-Abfragen werden automatisch an den temporären Container weitergeleitet
- Lehrer/Tutor-Abfragen laufen weiterhin auf der Original-Datenbank

## Implementierung

### Neue Services

1. **DatabaseContainerService**
   - Verwaltet Docker-Container für temporäre Datenbanken
   - Erstellt, konfiguriert und löscht Container
   - Führt Abfragen auf temporären Containern aus

2. **ContainerCleanupService**
   - Räumt alte Container auf
   - Kann manuell für bestimmte Schüler ausgeführt werden

### Geänderte Services

1. **DatabaseExecutionService**
   - Neue Methode: `executeQueryForStudent()`
   - Unterscheidet zwischen Schüler- und Administrator-Abfragen

2. **SqlImportService**
   - Neue Methode: `executeQueryForStudent()`
   - Facade für die Schüler-spezifische Abfrage-Ausführung

3. **SubmissionsService**
   - Verwendet `executeQueryForStudent()` für Schüler-Abfragen
   - Vergleicht weiterhin mit der Original-Lösung

## Verwendung

### Automatische Verwendung
Das System wird automatisch verwendet, wenn Schüler Aufgaben einreichen. Keine manuelle Konfiguration erforderlich.

### Test-Endpoint
```http
POST /sql-import/test-container/{studentId}/{databaseId}
Content-Type: application/json

{
  "query": "SELECT * FROM users;"
}
```

### Container-Cleanup
Container werden automatisch nach 60 Minuten gelöscht. Für manuelles Cleanup:

```typescript
// Cleanup für einen bestimmten Schüler
await containerCleanupService.cleanupStudentContainers(studentId);

// Cleanup für alle alten Container
await containerCleanupService.cleanupOldContainers(60); // 60 Minuten
```

## Konfiguration

### Port-Bereich
Standard: 5500-5600 (kann in `DatabaseContainerService` angepasst werden)

### Container-Settings
- Image: `postgres:15`
- Auto-Remove: aktiviert
- Standard-Credentials: postgres/temppass

## Voraussetzungen

1. **Docker muss installiert und laufend sein**
2. **Ports 5500-5600 müssen verfügbar sein**
3. **npm-Pakete installieren:**
   ```bash
   npm install dockerode @types/dockerode
   ```

## Sicherheit

- Jeder Schüler hat seine eigene isolierte Datenbank
- Container werden automatisch gelöscht
- Keine Beeinträchtigung der Original-Datenbank möglich
- Temporäre Credentials pro Container

## Debugging

### Container-Status prüfen
```bash
docker ps | grep temp-db
```

### Container-Logs
```bash
docker logs [container-name]
```

### Manuelle Container-Bereinigung
```bash
docker stop $(docker ps -q --filter "name=temp-db")
```

## Performance-Überlegungen

- Container-Start dauert ca. 5-10 Sekunden
- Container werden wiederverwendet für denselben Schüler/Datenbank
- Automatische Bereinigung verhindert Ressourcen-Anhäufung
- Port-Pool begrenzt die Anzahl gleichzeitiger Container

## Troubleshooting

### Container startet nicht
- Docker-Daemon läuft?
- Genügend freie Ports verfügbar?
- Genügend Speicher/CPU verfügbar?

### Datenbank-Kopierung schlägt fehl
- Original-Datenbank-Schema gültig?
- Seed-Daten syntaktisch korrekt?
- Genügend Zeit für Container-Start?

### Query-Ausführung schlägt fehl
- Container ist bereit (Status: 'ready')?
- Query syntaktisch korrekt?
- Tabellen existieren in der kopierten Datenbank?

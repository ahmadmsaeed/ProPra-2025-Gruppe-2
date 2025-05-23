# Student-Specific Docker Database Sessions

This document explains the implementation of student-specific Docker containers for database exercises.

## Overview

When a student works on an SQL exercise, the system creates an isolated Docker container running PostgreSQL. This ensures:

1. Each student has their own isolated database environment
2. Changes made by one student don't affect others
3. Students can perform destructive operations without consequences to the main database
4. Each container is initialized with fresh schema and seed data

## Architecture

The implementation consists of several components:

### 1. DockerContainerService

This service manages Docker containers for student sessions:

- Creates containers with unique PostgreSQL instances
- Manages port allocation
- Initializes databases with schema and seed data
- Tracks container status and lifecycle

### 2. ExerciseSessionService

Coordinates student exercise sessions:

- Starts/ends student exercise sessions
- Routes SQL queries to the appropriate container
- Associates sessions with specific students and exercises

### 3. ContainerDatabaseClientService

Handles database connections to containers:

- Executes queries on specific containers
- Initializes databases with schema and seed data
- Handles error reporting

### 4. API Endpoints

New endpoints for managing exercise sessions:

- `POST /exercise-sessions/start` - Start a new exercise session
- `POST /exercise-sessions/query/:sessionId` - Execute a query in an exercise session
- `DELETE /exercise-sessions/:sessionId` - End an exercise session

## Flow

1. Student selects an exercise in the UI
2. System creates a Docker container with PostgreSQL
3. Container is initialized with the database schema and seed data
4. Student executes SQL queries against their container
5. When finished, container is stopped and removed

## Implementation Details

### Container Management

- Containers are named with pattern: `sql-exercise-{studentId}-{exerciseId}-{uuid}`
- Each container gets a unique port from a configurable range
- In-memory container tracking (can be extended to use database persistence)

### Database Initialization

- Schema and seed data from the exercise's associated database are applied to the container
- Direct PostgreSQL connection using the 'pg' library

### Query Execution

- Queries are executed directly against the container's PostgreSQL instance
- Results are returned in the same format as the shared database queries

## Requirements

- Docker must be installed on the host system
- PostgreSQL client libraries ('pg' npm package)
- Sufficient system resources to run multiple containers

## Future Improvements

- Container timeout and automatic cleanup
- Resource limiting for containers
- Persistence of container sessions
- Admin monitoring interfaces 
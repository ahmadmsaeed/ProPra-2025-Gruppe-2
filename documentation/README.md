# SQL Learning Platform Documentation

## Overview

This documentation provides information about the SQL Learning Platform, focusing on the SQL import functionality and database management.

## SQL Import Feature

The SQL Import feature allows users to upload SQL files containing table definitions and data. The system will:

1. Parse the SQL file to extract schema (CREATE TABLE statements) and seed data (INSERT statements)
2. Handle different SQL dialects (PostgreSQL, MySQL)
3. Execute the SQL statements in the appropriate order
4. Provide detailed error messages for any issues encountered

### Supported SQL Features

- CREATE TABLE statements with constraints
- INSERT statements for data population
- Comments (both single-line and multi-line)
- Basic PostgreSQL and MySQL syntax

### Error Handling

The system handles various SQL errors gracefully:

- Duplicate tables (42P07) - Treated as warnings, not errors
- Duplicate data (23505) - Treated as warnings, not errors
- Missing tables/columns - Reported as specific errors
- Syntax errors - Reported with detailed information

## Database Structure

The platform manages both system databases (for user accounts, exercises, etc.) and user-uploaded databases.

### System Database Tables

- Users - User accounts for the platform
- Exercises - SQL exercises for students to solve
- Submissions - Student submissions for exercises
- Databases - Metadata about user-uploaded databases

### Database Import Process

1. SQL file is uploaded through the API
2. File is parsed and categorized (schema vs. data)
3. Schema is executed first to create tables
4. Seed data is executed to populate tables
5. Results are stored for future reference

### Ressource Management
1. Only 100 Docker container can run simultanious
2. Docker Container gets deleted after solving an assignment
3. Every Docker Container older than 7 days gets deleted
4. After Logout the assignment container is stopped

## API Endpoints

The SQL Import API provides the following endpoints:

- `POST /sql-import/upload` - Upload and import a SQL file
- `GET /sql-import/databases` - List available databases
- `GET /sql-import/databases/:id` - Get database details
- `POST /sql-import/execute` - Execute custom SQL queries

## Development Guidelines

When working with SQL import functionality:

1. Always handle errors gracefully
2. Categorize schema and data statements properly
3. Remove or handle SQL comments appropriately
4. Be mindful of security concerns with raw SQL execution 
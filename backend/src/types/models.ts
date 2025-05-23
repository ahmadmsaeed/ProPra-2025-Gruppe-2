/**
 * Type definitions for Prisma generated models
 * This file should be used to import types instead of importing from @prisma/client directly
 */

// Role enum definition matches the Prisma schema
export enum Role {
  TEACHER = 'TEACHER',
  TUTOR = 'TUTOR',
  STUDENT = 'STUDENT',
}

// User model interface
export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  role: Role | string; // Accept string to handle Prisma's enum
  isBlocked: boolean;
}

// Exercise model interface
export interface Exercise {
  id: number;
  title: string;
  description: string;
  initialQuery: string | null;
  solutionQuery: string;
  databaseSchemaId: number;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Submission model interface
export interface Submission {
  id: number;
  query: string;
  isCorrect: boolean;
  feedback: string;
  studentId: number;
  exerciseId: number;
  createdAt: Date;
}

// Database model interface
export interface Database {
  id: number;
  name: string;
  schema: string;
  seedData: string;
  authorId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

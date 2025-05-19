/**
 * Interface for the ExerciseService, defining CRUD operations for exercises.
 */
import { User } from '@prisma/client';

/**
 * Contract for exercise service implementations.
 */
export interface IExerciseService {
  findAll(): Promise<any>;
  findOne(id: number): Promise<any>;
  create(data: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number, user: User): Promise<any>;
} 
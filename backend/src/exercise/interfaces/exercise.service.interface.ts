/**
 * Interface for the ExerciseService, defining CRUD operations for exercises.
 */

/**
 * Contract for exercise service implementations.
 */
export interface IExerciseService {
  findAll(): Promise<unknown>;
  findOne(id: number): Promise<unknown>;
  create(data: unknown): Promise<unknown>;
  update(id: number, data: unknown): Promise<unknown>;
  delete(id: number, userId: number, userRole?: string): Promise<unknown>;
}

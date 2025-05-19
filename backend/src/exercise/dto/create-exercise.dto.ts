/**
 * DTO for creating a new exercise. Used for validation and typing in controllers.
 */
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for exercise creation.
 */
export class CreateExerciseDto {
  /** Title of the exercise */
  @IsString()
  @IsNotEmpty()
  title: string;

  /** Description of the exercise */
  @IsString()
  @IsNotEmpty()
  description: string;

  /** Optional initial query for the exercise */
  @IsString()
  @IsOptional()
  initialQuery?: string;

  /** Solution query for the exercise */
  @IsString()
  @IsNotEmpty()
  solutionQuery: string;

  /** Optional database schema ID to associate with the exercise */
  @IsNumber()
  @IsOptional()
  databaseSchemaId?: number;
} 
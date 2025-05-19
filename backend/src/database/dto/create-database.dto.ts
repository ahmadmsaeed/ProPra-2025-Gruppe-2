/**
 * DTO for creating a new database schema. Used for validation and typing in controllers.
 */
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for database schema creation.
 */
export class CreateDatabaseDto {
  /** Name of the database schema */
  @IsString()
  @IsNotEmpty()
  name: string;

  /** SQL schema definition */
  @IsString()
  @IsNotEmpty()
  schema: string;

  /** SQL seed data for the schema */
  @IsString()
  @IsNotEmpty()
  seedData: string;
} 
export interface ExerciseGenerationRequest {
  prompt: string;
  databaseSchemaId: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  concept?: string;
}

export interface GeneratedExercise {
  title: string;
  description: string;
  solutionQuery: string;
  initialQuery?: string;
  difficulty: string;
  concepts: string[];
  explanation: string;
}

/**
 * Model for student exercise submissions
 */
export interface Submission {
  id: number;
  query: string;
  isCorrect: boolean;
  feedback: string;
  studentId: number;
  exerciseId: number;
  createdAt: Date;
  exercise?: {
    id: number;
    title: string;
    description: string;
    solutionQuery?: string;
    database?: {
      id: number;
      name: string;
      schema: string;
      seedData: string;
    }
  };
  student?: {
    id: number;
    name: string;
  };
} 
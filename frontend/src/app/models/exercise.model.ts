export interface Exercise {
  id: number;
  title: string;
  description: string;
  initialQuery?: string;
  solutionQuery: string;
  databaseSchemaId: number;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    name: string;
    role: 'TEACHER' | 'TUTOR' | 'STUDENT';
  };
  database: {
    id: number;
    name: string;
    schema: string;
    seedData: string;
  };
} 
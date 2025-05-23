export interface SqlDatabase {
  id: number;
  name: string;
  schema: string;
  seedData: string;
  createdAt: Date;
  updatedAt: Date;
  authorId?: number;
  uploadedBy?: string;
}

export default SqlDatabase; 
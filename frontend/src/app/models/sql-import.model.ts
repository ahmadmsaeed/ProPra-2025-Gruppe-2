export interface Database {
  id: number;
  name: string;
  schema: string;
  seedData: string;
  createdAt: Date;
  updatedAt: Date;
  authorId?: number;
  uploadedBy?: string;
}

export default Database; 
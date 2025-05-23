export interface Database {
  id: number;
  name: string;
  schema: string;
  seedData: string;
  createdAt: Date;
  updatedAt: Date;
}

export default Database; 
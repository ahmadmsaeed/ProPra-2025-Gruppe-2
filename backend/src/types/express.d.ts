/**
 * Extends Express types to support Multer file uploads in TypeScript.
 * Ensures Express.Multer.File is recognized as Multer.File.
 */

declare global {
  namespace Express {
    interface User {
      sub: number;
      email: string;
      name?: string;
      role: string;
    }
  }
}

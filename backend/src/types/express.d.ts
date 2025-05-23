/**
 * Extends Express types to support Multer file uploads in TypeScript.
 * Ensures Express.Multer.File is recognized as Multer.File.
 */
import { Multer } from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      interface File extends Multer.File {}
    }
  }
}

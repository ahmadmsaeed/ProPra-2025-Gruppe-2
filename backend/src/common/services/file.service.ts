import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for handling file operations
 */
@Injectable()
export class FileService {
  private readonly tmpDir: string;

  constructor() {
    this.tmpDir = path.join(process.cwd(), 'tmp');
    this.ensureTmpDirectoryExists();
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTmpDirectoryExists(): void {
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  /**
   * Save content to a temporary file
   */
  public async saveTempFile(
    content: string,
    filename: string,
  ): Promise<string> {
    this.ensureTmpDirectoryExists();

    const filePath = path.join(this.tmpDir, filename);
    await fs.promises.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Read content from a file
   */
  public async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf8');
  }

  /**
   * Delete a file
   */
  public deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

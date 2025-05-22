import { Injectable } from '@nestjs/common';

/**
 * Service for processing SQL content - parsing, cleaning, and categorizing statements
 */
@Injectable()
export class SqlProcessorService {
  /**
   * Check if SQL content is a PostgreSQL dump
   */
  public isPostgresDump(sqlContent: string): boolean {
    return (
      sqlContent.includes('PostgreSQL database dump') ||
      sqlContent.includes('pg_dump version') ||
      sqlContent.includes('SET client_encoding')
    );
  }

  /**
   * Check if SQL content is a MySQL dump
   */
  public isMySQLDump(sqlContent: string): boolean {
    return (
      sqlContent.includes('MySQL dump') ||
      sqlContent.includes('ENGINE=InnoDB') ||
      sqlContent.includes('ENGINE=MyISAM') ||
      sqlContent.includes('AUTO_INCREMENT') ||
      /CREATE TABLE.*`.*`/.test(sqlContent) || // Detect backtick identifiers
      sqlContent.includes('DEFAULT CHARSET=') ||
      /int\(\d+\)/.test(sqlContent)
    ); // Detect MySQL int type with size
  }

  /**
   * Remove all types of SQL comments from the input SQL
   */
  public removeComments(sql: string): string {
    // Remove single line comments (--) that are not inside strings
    let result = sql.replace(/--.*$/gm, '');

    // Remove multi-line comments (/* */) that are not inside strings
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');

    return result;
  }

  /**
   * Split SQL into individual statements, preserving statement boundaries
   * and handling multiple statement types (CREATE, INSERT, etc.)
   */
  public splitIntoStatements(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inQuote = false;
    let inComment = false;
    let copyMode = false;

    // Process each character individually
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1] || '';

      // Handle comments
      if (!inQuote && char === '-' && nextChar === '-') {
        inComment = true;
      }
      if (inComment && (char === '\n' || char === '\r')) {
        inComment = false;
      }

      // Handle quotes
      if (!inComment && char === "'" && sql[i - 1] !== '\\') {
        inQuote = !inQuote;
      }

      // Handle PostgreSQL COPY blocks
      if (
        !inQuote &&
        !inComment &&
        currentStatement.trim().toUpperCase().startsWith('COPY') &&
        !copyMode
      ) {
        copyMode = true;
      }

      if (copyMode && char === '\\' && nextChar === '.') {
        copyMode = false;
        // Add the backslash and period to complete the COPY block terminator
        currentStatement += '\\.';
        i++; // Skip the next character (the period)
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }

      // Add character to current statement
      currentStatement += char;

      // Check for statement end
      if (!inQuote && !inComment && !copyMode && char === ';') {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements.filter((s) => s.length > 0);
  }

  /**
   * Process SQL content into schema and seed data blocks,
   * completely removing all comments
   */
  public processSqlIntoBlocks(sql: string): {
    schema: string;
    seedData: string;
  } {
    // First split the SQL into clean statements without comments
    const lines = sql.split(/\r?\n/);
    const cleanStatements: string[] = [];
    let currentStatement = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comment lines entirely
      if (trimmed.startsWith('--')) {
        continue;
      }

      // For lines that might have trailing comments, clean them
      let lineWithoutComments = line;
      const commentIndex = line.indexOf('--');
      if (commentIndex >= 0) {
        lineWithoutComments = line.substring(0, commentIndex).trimEnd();
        // Skip empty lines after comment removal
        if (!lineWithoutComments) continue;
      }

      // Handle multiline comments (/* ... */)
      if (
        lineWithoutComments.includes('/*') ||
        lineWithoutComments.includes('*/')
      ) {
        lineWithoutComments = lineWithoutComments
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .trim();
        // Skip if line becomes empty after removing multiline comments
        if (!lineWithoutComments) continue;
      }

      // Add clean line to current statement
      currentStatement += lineWithoutComments + '\n';

      // End of statement detection
      if (trimmed.endsWith(';')) {
        if (currentStatement.trim()) {
          cleanStatements.push(currentStatement);
        }
        currentStatement = '';
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      cleanStatements.push(currentStatement);
    }

    // Now categorize clean statements by type
    let schemaContent = '';
    let seedDataContent = '';

    // Extract CREATE TABLE statements first to ensure they're processed before INSERTs
    const createTableStatements = cleanStatements.filter((stmt) =>
      stmt.toUpperCase().includes('CREATE TABLE'),
    );

    // Extract INSERT statements
    const insertStatements = cleanStatements.filter((stmt) =>
      stmt.toUpperCase().includes('INSERT INTO'),
    );

    // Extract other DDL statements (ALTER, CREATE INDEX, etc.)
    const otherDdlStatements = cleanStatements.filter(
      (stmt) =>
        !stmt.toUpperCase().includes('CREATE TABLE') &&
        !stmt.toUpperCase().includes('INSERT INTO') &&
        stmt.trim().length > 0,
    );

    // Build a properly ordered schema with all CREATE TABLE statements first,
    // followed by other DDL statements
    schemaContent =
      createTableStatements.join('\n') + '\n' + otherDdlStatements.join('\n');

    // All INSERT statements go into seedData
    seedDataContent = insertStatements.join('\n');

    console.log(
      `Processed SQL into ${createTableStatements.length} CREATE TABLE statements, ` +
        `${otherDdlStatements.length} other DDL statements, and ` +
        `${insertStatements.length} INSERT statements.`,
    );

    return {
      schema: schemaContent.trim().replace(/;;/g, ';'),
      seedData: seedDataContent.trim().replace(/;;/g, ';'),
    };
  }

  /**
   * Prepare PostgreSQL dump content by handling special PostgreSQL syntax
   */
  public preparePostgresDump(sqlContent: string): string {
    const lines = sqlContent.split('\n');
    const processedLines: string[] = [];
    let inCopyBlock = false;
    let currentCopyData: string[] = [];
    let currentTableDef = '';

    for (const line of lines) {
      if (
        line.startsWith('--') ||
        line.trim() === '' ||
        line.startsWith('SET statement_timeout') ||
        line.startsWith('SET lock_timeout') ||
        line.startsWith('SET idle_in_transaction_session_timeout') ||
        line.startsWith('SET standard_conforming_strings') ||
        line.startsWith('SELECT pg_catalog.set_config') ||
        line.startsWith('SET check_function_bodies') ||
        line.startsWith('SET xmloption') ||
        line.startsWith('SET client_min_messages') ||
        line.startsWith('SET row_security') ||
        line.startsWith('SET default_table_access_method')
      ) {
        // Keep crucial SET commands, skip others and comments
        if (
          line.startsWith('SET client_encoding') ||
          line.startsWith('SET search_path')
        ) {
          processedLines.push(line);
        }
        continue;
      }

      if (line.toUpperCase().startsWith('CREATE TABLE')) {
        currentTableDef = line;
        // Continue accumulating if CREATE TABLE spans multiple lines
        if (!line.endsWith(';')) {
          // Find the end of the CREATE TABLE statement
          let createTableEndIndex = lines.indexOf(line);
          for (let i = createTableEndIndex + 1; i < lines.length; i++) {
            currentTableDef += '\n' + lines[i];
            if (lines[i].includes(');')) {
              createTableEndIndex = i;
              break;
            }
          }
          processedLines.push(currentTableDef);
          // Skip lines already processed as part of multi-line CREATE TABLE
          lines.splice(
            lines.indexOf(line) + 1,
            createTableEndIndex - lines.indexOf(line),
          );
        } else {
          processedLines.push(line);
        }
        continue;
      }

      if (line.toUpperCase().startsWith('COPY ')) {
        inCopyBlock = true;
        const copyStatement = line; // Store the full COPY statement
        processedLines.push(copyStatement); // Add the COPY statement itself
        currentCopyData = []; // Reset for new COPY block
        continue;
      }

      if (inCopyBlock) {
        if (line.trim() === '\\.') {
          inCopyBlock = false;
          processedLines.push(currentCopyData.join('\n')); // Add data as a single block
          processedLines.push(line); // Add the \. terminator
          currentCopyData = [];
        } else {
          currentCopyData.push(line);
        }
        continue;
      }

      // Keep other statements like ALTER TABLE, etc.
      if (line.trim().length > 0) {
        processedLines.push(line);
      }
    }
    return processedLines.join('\n');
  }

  /**
   * Process and categorize SQL file content into a structured format
   * This will handle both MySQL and PostgreSQL formats, convert if needed,
   * and extract schema and data
   */
  public processSqlFileContent(
    sqlContent: string,
    originalFilename: string,
    mysqlConverter: any, // MySqlConverterService injected
  ): {
    processedSql: string;
    schema: string;
    seedData: string;
    fileType: string;
  } {
    let processedSql = sqlContent;
    let fileType = 'PostgreSQL';

    // Detect file type and convert if necessary
    if (this.isMySQLDump(sqlContent)) {
      console.log('Detected MySQL dump. Converting to PostgreSQL format...');
      processedSql = mysqlConverter.convertToPostgreSQL(sqlContent);
      fileType = 'MySQL';
      console.log('Conversion completed.');
    } else if (this.isPostgresDump(sqlContent)) {
      console.log('Detected PostgreSQL dump. Processing...');
      processedSql = this.preparePostgresDump(sqlContent);
    } else {
      console.log('Unknown SQL format. Assuming generic SQL...');
    }

    // Process SQL into schema and data blocks
    const processedBlocks = this.processSqlIntoBlocks(processedSql);

    return {
      processedSql,
      schema: processedBlocks.schema || processedSql,
      seedData: processedBlocks.seedData || '',
      fileType,
    };
  }

  /**
   * Generate a unique database name based on the file
   */
  public generateUniqueDatabaseName(
    originalFilename: string,
    fileType: string,
  ): string {
    // Generate unique name for the database entry
    let baseName = originalFilename.replace(/\.sql$/i, '');
    if (!baseName) {
      console.warn(
        'Original filename resulted in empty baseName. Using default.',
      );
      baseName = 'imported_database';
    }

    const timestamp = new Date().getTime();
    return `${baseName}_${fileType}_${timestamp}`;
  }
}

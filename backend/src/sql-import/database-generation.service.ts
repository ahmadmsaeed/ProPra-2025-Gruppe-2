/**
 * Service for automatically generating SQL database schemas using OpenAI
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseGenerationRequest {
  prompt: string;
  complexity: 'simple' | 'moderate' | 'complex';
  tableCount: number;
  databaseName?: string;
}

export interface GeneratedDatabase {
  name: string;
  schema: string;
  seedData: string;
  description?: string;
}

@Injectable()
export class DatabaseGenerationService {
  private readonly logger = new Logger(DatabaseGenerationService.name);
  private readonly openaiApiKey: string;
  private readonly isLlmEnabled: boolean;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.isLlmEnabled = this.configService.get<boolean>('LLM_FEEDBACK_ENABLED') || false;
  }

  /**
   * Generate a new database schema based on the provided requirements
   */
  async generateDatabase(request: DatabaseGenerationRequest): Promise<GeneratedDatabase> {
    if (!this.openaiApiKey || !this.isLlmEnabled) {
      throw new BadRequestException(
        'Database generation is not available - OpenAI API not configured'
      );
    }

    this.logger.log(`Starting database generation for: "${request.prompt}" with ${request.tableCount} tables`);

    try {
      // Build the generation prompt
      const prompt = this.buildPrompt(request);
      this.logger.debug(`Generated prompt length: ${prompt.length} characters`);
      
      // Call OpenAI API
      const responseContent = await this.callOpenAI(prompt);
      this.logger.debug(`OpenAI response length: ${responseContent.length} characters`);
      
      // Parse the response
      const generatedDatabase = this.parseResponse(responseContent, request);
      
      // Additional validation
      const actualTableCount = this.countTablesInSchema(generatedDatabase.schema);
      if (actualTableCount < request.tableCount) {
        this.logger.warn(`Generated ${actualTableCount} tables, but ${request.tableCount} were requested`);
      }
      
      this.logger.log(`Successfully generated database: ${generatedDatabase.name} with ${actualTableCount} tables`);
      this.logger.debug(`Schema length: ${generatedDatabase.schema.length} characters`);
      this.logger.debug(`Seed data length: ${generatedDatabase.seedData.length} characters`);
      
      return generatedDatabase;
      
    } catch (error) {
      this.logger.error(`Database generation failed: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Fehler bei der Datenbankgenerierung: ${error.message}`
      );
    }
  }

  /**
   * Build the prompt for OpenAI based on the request
   */
  private buildPrompt(request: DatabaseGenerationRequest): string {
    const complexityDescription = {
      simple: 'einfach - grundlegende Tabellen ohne komplexe Beziehungen',
      moderate: 'mittel - mehrere Tabellen mit Foreign Keys und Standard-Beziehungen',
      complex: 'komplex - viele Tabellen mit komplexen Beziehungen, Indizes und Constraints'
    };

    const prompt = `Erstelle ein vollständiges SQL-Datenbankschema basierend auf folgenden Anforderungen:

BESCHREIBUNG:
${request.prompt}

ANFORDERUNGEN:
- Komplexität: ${complexityDescription[request.complexity]}
- Anzahl Tabellen: ${request.tableCount}
- Datenbank-Name: ${request.databaseName || 'automatisch generieren'}
- Verwende PostgreSQL-Syntax
- Erstelle sinnvolle Beispieldaten für alle Tabellen

KRITISCHE REGELN:
1. Erstelle EXAKT ${request.tableCount} Tabellen - KEINE darf fehlen!
2. Jede Tabelle MUSS einen PRIMARY KEY haben (verwende SERIAL)
3. Verwende Foreign Keys für Beziehungen zwischen Tabellen
4. Stelle sicher, dass ALLE Tabellen syntaktisch korrekt sind
5. Erstelle mindestens 3-5 Datensätze pro Tabelle
6. Achte auf die Reihenfolge: Tabellen ohne Dependencies zuerst

ANTWORT-FORMAT (NUR gültiges JSON ohne zusätzlichen Text):
{
  "name": "database_name_ohne_leerzeichen",
  "description": "Kurze Beschreibung der Datenbank auf Deutsch",
  "schema": "CREATE TABLE tabelle1 (\\n  id SERIAL PRIMARY KEY,\\n  name VARCHAR(100) NOT NULL\\n);\\n\\nCREATE TABLE tabelle2 (\\n  id SERIAL PRIMARY KEY,\\n  tabelle1_id INTEGER REFERENCES tabelle1(id),\\n  beschreibung TEXT\\n);",
  "seedData": "INSERT INTO tabelle1 (name) VALUES ('Beispiel 1'), ('Beispiel 2');\\n\\nINSERT INTO tabelle2 (tabelle1_id, beschreibung) VALUES (1, 'Test'), (2, 'Test2');"
}

SQL-SCHEMA ANFORDERUNGEN:
- Jedes CREATE TABLE Statement muss vollständig und syntaktisch korrekt sein
- Verwende konsistente Naming-Conventions (snake_case)
- Definiere angemessene Datentypen: VARCHAR(n), INTEGER, TIMESTAMP, TEXT, BOOLEAN
- Beende jedes Statement mit Semikolon
- Verwende \\n für Zeilenumbrüche im JSON String
- Foreign Keys: "REFERENCES tabelle(spalte)" Syntax

SEED-DATA ANFORDERUNGEN:
- Erstelle realistische aber einfache Testdaten
- Achte auf Foreign Key Abhängigkeiten (Referenzierte Tabellen zuerst einfügen)
- Alle INSERT Statements müssen syntaktisch korrekt sein
- Verwende sinnvolle Werte für alle Spalten`;

    return prompt;
  }

  /**
   * Call OpenAI API for database generation
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    if (!this.openaiApiKey.startsWith('sk-')) {
      throw new Error('OpenAI API key format is invalid');
    }

    this.logger.log(`Making OpenAI API request for database generation`);

    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: `Du bist ein Experte für PostgreSQL-Datenbankdesign. 
              
WICHTIGE REGELN:
- Antworte NUR mit validem JSON - keine Erklärungen oder zusätzlicher Text
- Erstelle ALLE angeforderten Tabellen vollständig
- Verwende korrekte PostgreSQL-Syntax
- Jede Tabelle braucht einen PRIMARY KEY (SERIAL)
- Verwende Foreign Keys für Beziehungen
- Erstelle realistische Testdaten für alle Tabellen

AUSGABEFORMAT:
{
  "name": "datenbankname",
  "description": "Beschreibung",
  "schema": "CREATE TABLE statements...",
  "seedData": "INSERT statements..."
}`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 3000,
          temperature: 0.3, // Lower temperature for more consistent results
          top_p: 0.9,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      return data.choices[0].message.content;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API request timed out');
      }
      throw error;
    }
  }

  /**
   * Parse the OpenAI response and extract the database information
   */
  private parseResponse(responseContent: string, request: DatabaseGenerationRequest): GeneratedDatabase {
    try {
      this.logger.debug(`Raw OpenAI response: ${responseContent}`);
      
      // Try multiple methods to extract JSON from the response
      let parsed: any = null;
      
      // Method 1: Direct JSON parsing
      try {
        parsed = JSON.parse(responseContent);
      } catch (e) {
        // Method 2: Extract JSON from code blocks
        const codeBlockMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          parsed = JSON.parse(codeBlockMatch[1]);
        } else {
          // Method 3: Extract any JSON object from response
          const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            // Clean up the JSON string
            let jsonString = jsonMatch[0];
            // Remove any trailing text after the last }
            const lastBrace = jsonString.lastIndexOf('}');
            if (lastBrace !== -1) {
              jsonString = jsonString.substring(0, lastBrace + 1);
            }
            parsed = JSON.parse(jsonString);
          }
        }
      }

      if (!parsed) {
        throw new Error('No valid JSON found in OpenAI response');
      }

      // Validate and clean up the schema
      if (!parsed.schema) {
        throw new Error('Missing schema in generated database');
      }

      // Clean and validate the schema
      const cleanedSchema = this.cleanAndValidateSchema(parsed.schema);
      const cleanedSeedData = this.cleanAndValidateSeedData(parsed.seedData || '');

      // Set default values if missing
      const result: GeneratedDatabase = {
        name: parsed.name || request.databaseName || this.generateDefaultName(request.prompt),
        schema: cleanedSchema,
        seedData: cleanedSeedData,
        description: parsed.description || ''
      };

      // Clean up the name (remove spaces, special characters)
      result.name = result.name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');

      // Validate that we have at least the requested number of tables
      const tableCount = this.countTablesInSchema(result.schema);
      this.logger.log(`Generated database with ${tableCount} tables (requested: ${request.tableCount})`);

      return result;

    } catch (error) {
      this.logger.error(`Failed to parse OpenAI response: ${error.message}`);
      this.logger.debug(`Raw response: ${responseContent}`);
      throw new Error(`Fehler beim Verarbeiten der KI-Antwort: ${error.message}`);
    }
  }

  /**
   * Clean and validate the generated schema
   */
  private cleanAndValidateSchema(schema: string): string {
    if (!schema) {
      throw new Error('Schema ist leer');
    }

    // Remove any markdown code block markers
    let cleaned = schema.replace(/```(?:sql)?\s*/g, '').replace(/```/g, '');
    
    // Ensure proper statement termination
    const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    // Validate each CREATE TABLE statement
    const validStatements = statements.filter(statement => {
      if (statement.toUpperCase().includes('CREATE TABLE')) {
        // Basic validation for CREATE TABLE syntax
        return statement.match(/CREATE\s+TABLE\s+\w+\s*\(/i);
      }
      return true; // Keep non-CREATE TABLE statements
    });

    if (validStatements.length === 0) {
      throw new Error('Keine gültigen CREATE TABLE Statements gefunden');
    }

    return validStatements.join(';\n') + ';';
  }

  /**
   * Clean and validate the generated seed data
   */
  private cleanAndValidateSeedData(seedData: string): string {
    if (!seedData) {
      return '';
    }

    // Remove any markdown code block markers
    let cleaned = seedData.replace(/```(?:sql)?\s*/g, '').replace(/```/g, '');
    
    // Ensure proper statement termination
    const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    // Filter valid INSERT statements
    const validStatements = statements.filter(statement => {
      if (statement.toUpperCase().includes('INSERT')) {
        // Basic validation for INSERT syntax
        return statement.match(/INSERT\s+INTO\s+\w+/i);
      }
      return true; // Keep non-INSERT statements
    });

    return validStatements.length > 0 ? validStatements.join(';\n') + ';' : '';
  }

  /**
   * Count the number of tables in a schema
   */
  private countTablesInSchema(schema: string): number {
    const matches = schema.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/gi);
    return matches ? matches.length : 0;
  }

  /**
   * Generate a default database name from the prompt
   */
  private generateDefaultName(prompt: string): string {
    // Extract meaningful words from the prompt
    const words = prompt
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !['eine', 'mit', 'für', 'und', 'oder', 'das', 'die', 'der'].includes(word))
      .slice(0, 2);

    if (words.length > 0) {
      return words.join('_') + '_db';
    }

    return 'generated_db';
  }
}

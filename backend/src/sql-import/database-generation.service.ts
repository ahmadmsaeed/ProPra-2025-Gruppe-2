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

    this.logger.log(`Generating database for prompt: ${request.prompt}`);

    try {
      // Build the generation prompt
      const prompt = this.buildPrompt(request);
      
      // Call OpenAI API
      const responseContent = await this.callOpenAI(prompt);
      
      // Parse the response
      const generatedDatabase = this.parseResponse(responseContent, request);
      
      this.logger.log(`Successfully generated database: ${generatedDatabase.name}`);
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

ANTWORT-FORMAT (als JSON):
{
  "name": "database_name",
  "description": "Kurze Beschreibung der Datenbank auf Deutsch",
  "schema": "-- DDL Statements\\nCREATE TABLE users (\\n  id SERIAL PRIMARY KEY,\\n  name VARCHAR(100) NOT NULL\\n);",
  "seedData": "-- INSERT Statements\\nINSERT INTO users (name) VALUES ('Max Mustermann');"
}

WICHTIGE HINWEISE:
- Nutze sinnvolle Tabellen- und Spaltennamen auf Englisch
- Erstelle realistische Constraints und Foreign Keys
- Füge für jede Tabelle 3-5 Beispieldatensätze hinzu
- Verwende SERIAL für Auto-Increment Primary Keys
- Achte auf korrekte PostgreSQL-Syntax
- Erstelle ein zusammenhängendes, logisches Datenbankschema
- Beschreibung auf Deutsch, SQL-Code auf Englisch`;

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
              content: 'Du bist ein erfahrener Datenbankarchitekt, der hochwertige SQL-Datenbankschemas erstellt.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
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
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in OpenAI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.schema) {
        throw new Error('Missing schema in generated database');
      }

      // Set default values if missing
      const result: GeneratedDatabase = {
        name: parsed.name || request.databaseName || this.generateDefaultName(request.prompt),
        schema: parsed.schema,
        seedData: parsed.seedData || '',
        description: parsed.description || ''
      };

      // Clean up the name (remove spaces, special characters)
      result.name = result.name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');

      return result;

    } catch (error) {
      this.logger.error(`Failed to parse OpenAI response: ${error.message}`);
      this.logger.debug(`Raw response: ${responseContent}`);
      throw new Error(`Fehler beim Verarbeiten der KI-Antwort: ${error.message}`);
    }
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

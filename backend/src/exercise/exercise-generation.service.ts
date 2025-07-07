/**
 * Service for automatically generating SQL exercises using OpenAI
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface ExerciseGenerationRequest {
  prompt: string;
  databaseSchemaId: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  concept?: string;
}

export interface GeneratedExercise {
  title: string;
  description: string;
  solutionQuery: string;
  initialQuery?: string;
  difficulty: string;
  concepts: string[];
  explanation: string;
}

@Injectable()
export class ExerciseGenerationService {
  private readonly logger = new Logger(ExerciseGenerationService.name);
  private readonly openaiApiKey: string;
  private readonly isLlmEnabled: boolean;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.isLlmEnabled =
      this.configService.get<boolean>('LLM_FEEDBACK_ENABLED') || false;
  }

  /**
   * Generate a new SQL exercise based on the provided prompt and database schema
   */
  async generateExercise(request: ExerciseGenerationRequest): Promise<GeneratedExercise> {
    if (!this.openaiApiKey || !this.isLlmEnabled) {
      throw new BadRequestException(
        'Exercise generation is not available - OpenAI API not configured'
      );
    }

    this.logger.log(`Generating exercise for prompt: ${request.prompt}`);

    try {
      // Get database schema information
      const databaseSchema = await this.prisma.database.findUnique({
        where: { id: request.databaseSchemaId },
      });

      if (!databaseSchema) {
        throw new BadRequestException('Database schema not found');
      }

      // Build the prompt for OpenAI
      const prompt = this.buildPrompt(request, databaseSchema);

      // Call OpenAI API
      const response = await this.callOpenAI(prompt);

      // Parse and return the response
      return this.parseResponse(response);
    } catch (error) {
      this.logger.error('Error generating exercise:', error);
      throw new BadRequestException(`Failed to generate exercise: ${error.message}`);
    }
  }

  /**
   * Build the prompt for OpenAI based on the request and database schema
   */
  private buildPrompt(request: ExerciseGenerationRequest, databaseSchema: any): string {
    const difficultyDescriptions = {
      beginner: 'Einfache Aufgabe für Anfänger (grundlegende SELECT-Statements, einfache WHERE-Bedingungen)',
      intermediate: 'Mittelschwere Aufgabe (einfache JOINs mit 2 Tabellen, GROUP BY, ORDER BY, grundlegende Funktionen)',
      advanced: 'Fortgeschrittene Aufgabe (JOINs mit mehreren Tabellen, Unterabfragen, erweiterte WHERE-Bedingungen)'
    };

    const difficultyLevel = request.difficulty || 'intermediate';
    
    // Build the requirements section based on what's provided
    let requirements = `- Schwierigkeitsgrad: ${difficultyDescriptions[difficultyLevel]}`;
    
    if (request.prompt && request.prompt.trim()) {
      requirements += `\n- Benutzeranfrage: "${request.prompt}"`;
    }
    
    if (request.concept && request.concept.trim()) {
      requirements += `\n- SQL-Konzept-Fokus: ${request.concept}`;
    }
    
    // If neither prompt nor concept is provided, create a general exercise
    if (!request.prompt?.trim() && !request.concept?.trim()) {
      requirements += `\n- Erstelle eine allgemeine SQL-Übung passend zum Schwierigkeitsgrad`;
    }

    const prompt = `Erstelle eine SQL-Übung basierend auf folgenden Anforderungen:

DATENBANK-SCHEMA:
${databaseSchema.schema}

ANFORDERUNGEN:
${requirements}

ANTWORT-FORMAT (als JSON):
{
  "title": "Übungstitel auf Deutsch",
  "description": "Detaillierte Aufgabenbeschreibung auf Deutsch (mindestens 2-3 Sätze)",
  "solutionQuery": "Vollständige SQL-Lösung",
  "initialQuery": "Hilfsvorlage oder leer lassen",
  "difficulty": "${difficultyLevel}",
  "concepts": ["Konzept1", "Konzept2"],
  "explanation": "Kurze Erklärung der Lösung auf Deutsch"
}

WICHTIGE HINWEISE:
- Nutze nur Tabellen und Spalten aus dem gegebenen Schema
- Die Aufgabe soll lehrreich und sinnvoll sein
- Beschreibung auf Deutsch, SQL-Code auf Englisch
- Wähle realistische und interessante Szenarien
- Berücksichtige das angegebene SQL-Konzept falls vorhanden`;

    return prompt;
  }

  /**
   * Call OpenAI API for exercise generation
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    if (!this.openaiApiKey.startsWith('sk-')) {
      throw new Error('OpenAI API key format is invalid');
    }

    this.logger.log(`Making OpenAI API request with key: ${this.openaiApiKey.substring(0, 20)}...`);

    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'Du bist ein erfahrener SQL-Lehrer, der hochwertige und lehrreiche SQL-Übungen erstellt.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} - ${response.statusText}`,
        );
      }

      interface OpenAIResponse {
        choices: Array<{
          message?: {
            content?: string;
          };
        }>;
      }

      const data = (await response.json()) as OpenAIResponse;
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Error in OpenAI API call:', error);
      throw error;
    }
  }

  /**
   * Parse the OpenAI response and extract the exercise data
   */
  private parseResponse(response: string): GeneratedExercise {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = jsonMatch[0];
        const exerciseData = JSON.parse(parsedJson);

        // Validate required fields
        if (!exerciseData.title || !exerciseData.description || !exerciseData.solutionQuery) {
          throw new Error('Missing required fields in generated exercise');
        }

        return {
          title: exerciseData.title,
          description: exerciseData.description,
          solutionQuery: exerciseData.solutionQuery,
          initialQuery: exerciseData.initialQuery || '',
          difficulty: exerciseData.difficulty || 'intermediate',
          concepts: exerciseData.concepts || [],
          explanation: exerciseData.explanation || ''
        };
      }

      // If no JSON found, throw error
      throw new Error('Could not extract valid JSON from OpenAI response');
    } catch (error) {
      this.logger.error('Error parsing OpenAI response:', error);
      throw new Error(`Failed to parse OpenAI response: ${error.message}`);
    }
  }
}
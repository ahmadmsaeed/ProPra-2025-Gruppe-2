/**
 * Service for generating intelligent feedback using Large Language Models
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeedbackRequest {
  studentQuery: string;
  solutionQuery: string;
  exerciseDescription: string;
  exerciseTitle: string;
  isCorrect: boolean;
  studentResult?: Record<string, unknown>[];
  solutionResult?: Record<string, unknown>[];
  errorMessage?: string;
  databaseSchema?: string;
}

export interface FeedbackResponse {
  feedback: string;
  hints: string[];
  suggestions: string[];
  explanation: string;
}

@Injectable()
export class LlmFeedbackService {
  private readonly openaiApiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  /**
   * Generate intelligent feedback for a SQL submission
   */
  async generateFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    if (!this.openaiApiKey) {
      return this.getFallbackFeedback(request);
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callOpenAI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error('Error generating LLM feedback:', error);
      return this.getFallbackFeedback(request);
    }
  }

  /**
   * Build the prompt for the LLM
   */
  private buildPrompt(request: FeedbackRequest): string {
    let prompt = `Du bist ein hilfsbereiter SQL-Tutor. Analysiere die folgende SQL-Aufgabe und die Lösung des Studenten.

**Aufgabe:** ${request.exerciseTitle}
**Beschreibung:** ${request.exerciseDescription}

**Musterlösung:**
\`\`\`sql
${request.solutionQuery}
\`\`\`

**Studentenlösung:**
\`\`\`sql
${request.studentQuery}
\`\`\`

**Korrektheit:** ${request.isCorrect ? 'KORREKT' : 'NICHT KORREKT'}
`;

    if (request.databaseSchema) {
      prompt += `\n**Datenbankschema:**
\`\`\`sql
${request.databaseSchema.substring(0, 1000)}...
\`\`\`
`;
    }

    if (request.errorMessage) {
      prompt += `\n**Fehlermeldung:** ${request.errorMessage}`;
    }

    if (!request.isCorrect && request.studentResult && request.solutionResult) {
      prompt += `\n**Studentenergebnis:** ${JSON.stringify(request.studentResult).substring(0, 500)}
**Erwartetes Ergebnis:** ${JSON.stringify(request.solutionResult).substring(0, 500)}`;
    }

    prompt += `

Gib konstruktives Feedback in folgendem JSON-Format zurück:
{
  "feedback": "Hauptfeedback (2-3 Sätze)",
  "hints": ["Hinweis 1", "Hinweis 2"],
  "suggestions": ["Verbesserungsvorschlag 1", "Verbesserungsvorschlag 2"],
  "explanation": "Detaillierte Erklärung der Lösung"
}

Regeln:
- Sei ermutigend und konstruktiv
- Erkläre SQL-Konzepte wenn nötig
- Gib spezifische Hinweise zur Verbesserung
- Verwende deutsche Sprache
- Halte das Feedback prägnant aber hilfreich`;

    return prompt;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein hilfsbereiter SQL-Tutor, der Studenten beim Lernen unterstützt.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
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
  }

  /**
   * Parse the LLM response
   */
  private parseResponse(response: string): FeedbackResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = jsonMatch[0];
        const parsed = JSON.parse(parsedJson) as Record<string, unknown>;
        return {
          feedback:
            (parsed.feedback as string) ||
            'Feedback konnte nicht generiert werden.',
          hints: (parsed.hints as string[]) || [],
          suggestions: (parsed.suggestions as string[]) || [],
          explanation: (parsed.explanation as string) || '',
        };
      }
    } catch (error) {
      console.error('Error parsing LLM response:', error);
    }

    // Fallback: use the raw response as feedback
    return {
      feedback: response.substring(0, 200) + '...',
      hints: [],
      suggestions: [],
      explanation: response,
    };
  }

  /**
   * Generate fallback feedback when LLM is not available
   */
  private getFallbackFeedback(request: FeedbackRequest): FeedbackResponse {
    if (request.isCorrect) {
      return {
        feedback:
          'Excellent! Deine Lösung ist korrekt und liefert das erwartete Ergebnis.',
        hints: ['Du hast die Aufgabe erfolgreich gelöst!'],
        suggestions: ['Versuche als nächstes eine schwierigere Aufgabe.'],
        explanation:
          'Deine SQL-Abfrage entspricht der Musterlösung und liefert das korrekte Ergebnis.',
      };
    }

    const hints: string[] = [];
    const suggestions: string[] = [];

    if (request.errorMessage) {
      if (request.errorMessage.includes('syntax error')) {
        hints.push('Es gibt einen Syntaxfehler in deiner SQL-Abfrage.');
        suggestions.push(
          'Überprüfe die SQL-Syntax, insbesondere Anführungszeichen und Kommas.',
        );
      }
      if (request.errorMessage.includes('does not exist')) {
        hints.push('Eine Tabelle oder Spalte existiert nicht.');
        suggestions.push('Überprüfe die Tabellen- und Spaltennamen im Schema.');
      }
    }

    if (hints.length === 0) {
      hints.push('Deine Abfrage läuft, aber das Ergebnis ist nicht korrekt.');
      suggestions.push('Vergleiche dein Ergebnis mit der erwarteten Ausgabe.');
      suggestions.push('Überprüfe deine WHERE-Bedingungen und JOIN-Klauseln.');
    }

    return {
      feedback:
        'Deine Lösung ist noch nicht ganz richtig. Schau dir die Hinweise unten an!',
      hints,
      suggestions,
      explanation:
        'Analysiere die Musterlösung und vergleiche sie mit deiner Abfrage.',
    };
  }
}

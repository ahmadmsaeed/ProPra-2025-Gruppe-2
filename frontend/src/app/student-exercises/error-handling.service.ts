/**
 * Utility service for error handling and user-friendly messages
 */
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  /**
   * Get user-friendly error message from HTTP error
   */
  getUserFriendlyErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
    }
    
    const errorMessage = error.error?.message || error.message || '';
    const lowerMessage = errorMessage.toLowerCase();
    
    // SQL Syntax Errors
    if (lowerMessage.includes('syntax error') || lowerMessage.includes('syntaxfehler')) {
      return 'SQL-Syntax Fehler: Bitte überprüfen Sie die Syntax Ihrer Abfrage.';
    }
    
    // Column/Table not found
    if (lowerMessage.includes('does not exist') || lowerMessage.includes('existiert nicht')) {
      if (lowerMessage.includes('column') || lowerMessage.includes('spalte')) {
        return 'Spalte nicht gefunden: Die angegebene Spalte existiert nicht in der Tabelle.';
      }
      if (lowerMessage.includes('table') || lowerMessage.includes('tabelle')) {
        return 'Tabelle nicht gefunden: Die angegebene Tabelle existiert nicht.';
      }
      return 'Element nicht gefunden: Das angegebene Datenbankelement existiert nicht.';
    }
    
    // Permission errors
    if (lowerMessage.includes('permission') || lowerMessage.includes('berechtigung')) {
      return 'Zugriff verweigert: Sie haben keine Berechtigung für diese Operation.';
    }
    
    // Connection errors
    if (lowerMessage.includes('connection') || lowerMessage.includes('verbindung')) {
      return 'Datenbankverbindung fehlgeschlagen: Bitte versuchen Sie es erneut.';
    }
    
    // Invalid query structure
    if (lowerMessage.includes('invalid') || lowerMessage.includes('ungültig')) {
      return 'Ungültige Abfrage: Bitte überprüfen Sie Ihre SQL-Anweisung.';
    }
    
    // Timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('zeitüberschreitung')) {
      return 'Zeitüberschreitung: Die Abfrage dauert zu lange. Versuchen Sie eine einfachere Abfrage.';
    }
    
    // Generic fallback for SQL errors
    if (lowerMessage.includes('sql') || lowerMessage.includes('query') || lowerMessage.includes('abfrage')) {
      return 'SQL-Abfrage Fehler: Bitte überprüfen Sie Ihre Abfrage und versuchen Sie es erneut.';
    }
    
    // Default fallback
    return 'Ein Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.';
  }

  /**
   * Log error with context
   */
  logError(error: any, context: string, additionalInfo?: any): void {
    console.error(`[${context}]`, error);
    if (additionalInfo) {
      console.error('Additional info:', additionalInfo);
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error: HttpErrorResponse): boolean {
    // Network errors and timeouts are usually recoverable
    if (error.status === 0 || error.status >= 500) {
      return true;
    }
    
    // Client errors (4xx) are usually not recoverable
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    
    return true;
  }

  /**
   * Get retry suggestion based on error type
   */
  getRetrySuggestion(error: HttpErrorResponse): string | null {
    if (error.status === 0) {
      return 'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
    }
    
    if (error.status >= 500) {
      return 'Serverfehler. Bitte versuchen Sie es in einigen Sekunden erneut.';
    }
    
    if (error.status === 429) {
      return 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
    }
    
    return null;
  }

  /**
   * Get error category for analytics/tracking
   */
  getErrorCategory(error: HttpErrorResponse): string {
    if (error.status === 0) return 'network';
    if (error.status >= 500) return 'server';
    if (error.status >= 400) return 'client';
    return 'unknown';
  }
}

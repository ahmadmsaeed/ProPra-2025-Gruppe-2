import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorContext {
  action?: string;
  component?: string;
  userId?: number | string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  /**
   * Get a user-friendly error message from an HTTP error
   */
  getUserFriendlyErrorMessage(error: HttpErrorResponse): string {
    if (!error) return 'Ein unbekannter Fehler ist aufgetreten';

    // Network errors
    if (error.status === 0) {
      return 'Verbindungsfehler. Bitte überprüfe deine Internetverbindung.';
    }

    // Client errors
    if (error.status >= 400 && error.status < 500) {
      switch (error.status) {
        case 400:
          return error.error?.message || 'Ungültige Anfrage. Bitte überprüfe deine Eingaben.';
        case 401:
          return 'Du bist nicht angemeldet. Bitte melde dich erneut an.';
        case 403:
          return 'Du hast keine Berechtigung für diese Aktion.';
        case 404:
          return 'Die angeforderte Ressource wurde nicht gefunden.';
        case 409:
          return error.error?.message || 'Ein Konflikt ist aufgetreten. Die Daten wurden möglicherweise bereits geändert.';
        case 422:
          return error.error?.message || 'Die übermittelten Daten sind ungültig.';
        case 429:
          return 'Zu viele Anfragen. Bitte versuche es später erneut.';
        default:
          return error.error?.message || `Client-Fehler (${error.status})`;
      }
    }

    // Server errors
    if (error.status >= 500) {
      switch (error.status) {
        case 500:
          return 'Ein Serverfehler ist aufgetreten. Bitte versuche es später erneut.';
        case 502:
        case 503:
        case 504:
          return 'Der Server ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.';
        default:
          return `Serverfehler (${error.status}). Bitte versuche es später erneut.`;
      }
    }

    return error.error?.message || error.message || 'Ein unbekannter Fehler ist aufgetreten';
  }

  /**
   * Log error to console with context
   */
  logError(error: any, context?: ErrorContext | string): void {
    const contextInfo = typeof context === 'string' ? { action: context } : context;
    
    console.group('🚨 Error Details');
    if (contextInfo) {
      console.log('Context:', contextInfo);
    }
    console.error('Error:', error);
    if (error instanceof HttpErrorResponse) {
      console.log('Status:', error.status);
      console.log('Status Text:', error.statusText);
      console.log('URL:', error.url);
      console.log('Error Details:', error.error);
    }
    console.groupEnd();
  }

  /**
   * Extract validation errors from API response
   */
  getValidationErrors(error: HttpErrorResponse): { [key: string]: string[] } {
    if (error.status === 422 && error.error?.errors) {
      return error.error.errors;
    }
    return {};
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(error: HttpErrorResponse): boolean {
    return error.status === 0;
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(error: HttpErrorResponse): boolean {
    return error.status === 401;
  }

  /**
   * Check if error is an authorization error
   */
  isAuthorizationError(error: HttpErrorResponse): boolean {
    return error.status === 403;
  }
}

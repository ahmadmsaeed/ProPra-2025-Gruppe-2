import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a success notification
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show an error notification
   */
  showError(message: string, duration: number = 5000): void {
    this.snackBar.open(message, '', {
      duration,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(message: string, duration: number = 4000): void {
    this.snackBar.open(message, '', {
      duration,
      panelClass: ['warning-snackbar']
    });
  }

  /**
   * Show an info notification
   */
  showInfo(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration,
      panelClass: ['info-snackbar']
    });
  }

  /**
   * Show a notification with custom type
   */
  show(message: string, type: NotificationType = 'info', duration?: number): void {
    switch (type) {
      case 'success':
        this.showSuccess(message, duration);
        break;
      case 'error':
        this.showError(message, duration);
        break;
      case 'warning':
        this.showWarning(message, duration);
        break;
      case 'info':
      default:
        this.showInfo(message, duration);
        break;
    }
  }
}

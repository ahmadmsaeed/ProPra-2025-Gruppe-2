import { Component, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { DialogService } from '../services/dialog.service';
import { ErrorHandlingService } from '../services/error-handling.service';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Base component that provides common functionality for all components
 */
@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {
  protected destroy$ = new Subject<void>();
  
  // Inject common services
  protected notificationService = inject(NotificationService);
  protected dialogService = inject(DialogService);
  protected errorHandlingService = inject(ErrorHandlingService);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle HTTP errors with user-friendly messages
   */
  protected handleError(error: HttpErrorResponse, context?: string): void {
    this.errorHandlingService.logError(error, context);
    const message = this.errorHandlingService.getUserFriendlyErrorMessage(error);
    this.notificationService.showError(message);
  }

  /**
   * Show success message
   */
  protected showSuccess(message: string): void {
    this.notificationService.showSuccess(message);
  }

  /**
   * Show error message
   */
  protected showError(message: string): void {
    this.notificationService.showError(message);
  }

  /**
   * Show warning message
   */
  protected showWarning(message: string): void {
    this.notificationService.showWarning(message);
  }

  /**
   * Show info message
   */
  protected showInfo(message: string): void {
    this.notificationService.showInfo(message);
  }

  /**
   * Confirm action with user
   */
  protected confirmAction(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const result = confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  }
}

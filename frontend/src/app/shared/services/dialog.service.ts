import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';

export interface BaseDialogConfig {
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  disableClose?: boolean;
  panelClass?: string | string[];
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  
  constructor(private dialog: MatDialog) {}

  /**
   * Open a dialog with common configuration
   */
  openDialog<T, D = any, R = any>(
    component: any,
    config: BaseDialogConfig & { data?: D } = {}
  ): MatDialogRef<T, R> {
    const defaultConfig = {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: false,
      ...config
    };

    return this.dialog.open<T, D, R>(component, defaultConfig);
  }

  /**
   * Open a confirmation dialog
   */
  confirm(data: ConfirmDialogData): Observable<boolean> {
    // For now, use browser confirm. Later we can create a custom dialog component
    return new Observable(observer => {
      const result = confirm(`${data.title}\n\n${data.message}`);
      observer.next(result);
      observer.complete();
    });
  }

  /**
   * Close all open dialogs
   */
  closeAll(): void {
    this.dialog.closeAll();
  }
}

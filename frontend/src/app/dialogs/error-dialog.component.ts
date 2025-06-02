import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

export interface ErrorDialogData {
  title: string;
  message: string | string[];
  buttonText: string;
}

@Component({  selector: 'app-error-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule
  ],
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss']
})
export class ErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogData
  ) {}

  isStringArray(value: any): value is string[] {
    return Array.isArray(value);
  }

  hasNewlines(message: string | string[]): boolean {
    return typeof message === 'string' && (message.includes('\n') || message.includes('\r'));
  }

  getMessageLines(message: string | string[]): string[] {
    if (typeof message !== 'string') {
      return message; // If it's already a string array, return it
    }
    return message.split(/\r?\n/).filter(line => line.trim().length > 0);
  }

  close(): void {
    this.dialogRef.close();
  }
}

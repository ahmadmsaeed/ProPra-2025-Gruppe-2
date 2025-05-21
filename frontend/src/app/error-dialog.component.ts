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

@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="error-title">
      <mat-icon color="warn">error</mat-icon>
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <div *ngIf="isStringArray(data.message); else singleMessage">
        <p *ngFor="let msg of data.message">{{ msg }}</p>
      </div>
      <ng-template #singleMessage>
        <ng-container *ngIf="hasNewlines(data.message); else plainMessage">
          <p *ngFor="let line of getMessageLines(data.message)">{{ line }}</p>
        </ng-container>
        <ng-template #plainMessage>
          <p>{{ data.message }}</p>
        </ng-template>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()" matTooltip="Dialog schließen">{{ data.buttonText }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .error-title {
      display: flex;
      align-items: center;
      color: #f44336;
    }
    
    .error-title mat-icon {
      margin-right: 8px;
    }
    
    mat-dialog-content {
      min-width: 300px;
    }
    
    p {
      margin: 0 0 8px;
      white-space: pre-wrap;
    }
  `]
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

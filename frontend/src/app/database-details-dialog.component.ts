import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import Database from './models/sql-import.model';

@Component({
  selector: 'app-database-details-dialog',
  standalone: true,  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `    <h2 mat-dialog-title>Datenbank: {{ data.name }}</h2>
    <mat-dialog-content>
      <div class="info-section">
        <div class="info-item">
          <h3>Erstellt:</h3>
          <p>{{ data.createdAt | date:'dd.MM.yyyy, HH:mm:ss' }}</p>
        </div>

        <div class="info-item">
          <h3>Aktualisiert:</h3>
          <p>{{ data.updatedAt | date:'dd.MM.yyyy, HH:mm:ss' }}</p>
        </div>

        <div class="info-item">
          <h3>Hochgeladen von:</h3>
          <p>{{ data.uploadedBy || 'Unbekannt' }}</p>
        </div>

        <div class="info-item">
          <h3>Schema:</h3>
          <pre>{{ data.schema || 'Keine Schema-Daten verfügbar' }}</pre>
        </div>

        <div class="info-item">
          <h3>SeedData:</h3>
          <pre>{{ data.seedData || 'Keine Seed-Daten verfügbar' }}</pre>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()" matTooltip="Dialog schließen">Schließen</button>
    </mat-dialog-actions>
  `,  styles: [`
    mat-dialog-content {
      max-height: 500px;
      overflow-y: auto;
      padding: 20px;
    }
    
    .info-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .info-item {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }

    .info-item h3 {
      color: #3f51b5;
      margin: 0 0 8px 0;
      font-size: 16px;
    }

    .info-item p {
      margin: 0;
      color: #333;
      font-size: 14px;
    }
    
    pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      white-space: pre-wrap;
      overflow-x: auto;
      margin: 0;
      font-size: 13px;
      border: 1px solid #e0e0e0;
    }
  `]
})
export class DatabaseDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DatabaseDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Database
  ) {
    // Ensure dates are properly parsed
    if (data.createdAt && typeof data.createdAt === 'string') {
      data.createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt && typeof data.updatedAt === 'string') {
      data.updatedAt = new Date(data.updatedAt);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

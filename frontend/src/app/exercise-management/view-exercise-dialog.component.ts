import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Exercise } from '../models/exercise.model';

@Component({
  selector: 'app-view-exercise-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <div class="exercise-details">
        <mat-card>
          <mat-card-header>
            <mat-card-subtitle>
              Autor: {{ data.author.name }} | 
              Datenbank: {{ data.database.name }}
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <h3>Beschreibung</h3>
            <p>{{ data.description }}</p>

            <h3>Musterlösung</h3>
            <pre class="sql-code">{{ data.solutionQuery }}</pre>

            <h3>Datenbank-Schema</h3>
            <pre class="sql-code">{{ data.database.schema }}</pre>

            <h3>Beispieldaten</h3>
            <pre class="sql-code">{{ data.database.seedData }}</pre>
          </mat-card-content>
        </mat-card>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Schließen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .exercise-details {
      max-width: 800px;
      margin: 0 auto;
    }

    h3 {
      color: #3f51b5;
      margin: 20px 0 10px;
    }

    .sql-code {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      white-space: pre-wrap;
    }

    mat-card-content {
      margin-top: 16px;
    }
  `]
})
export class ViewExerciseDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ViewExerciseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Exercise
  ) {}

  onClose() {
    this.dialogRef.close();
  }
} 
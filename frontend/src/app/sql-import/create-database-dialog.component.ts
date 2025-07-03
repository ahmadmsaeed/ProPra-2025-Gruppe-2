import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SqlImportService } from '../services/sql-import.service';

export interface DatabaseDialogData {
  mode: 'create' | 'edit';
  database?: any;
}

@Component({
  selector: 'app-create-database-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>storage</mat-icon>
      {{ data?.mode === 'edit' ? 'Datenbank bearbeiten' : 'Neue Datenbank erstellen' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="databaseForm" class="database-form">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Name der Datenbank</mat-label>
          <input matInput formControlName="name" placeholder="z.B. Universitätsdatenbank">
          <mat-error *ngIf="databaseForm.get('name')?.hasError('required')">
            Name ist erforderlich
          </mat-error>
          <mat-error *ngIf="databaseForm.get('name')?.hasError('minlength')">
            Name muss mindestens 3 Zeichen lang sein
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Schema (DDL)</mat-label>
          <textarea 
            matInput 
            formControlName="schema" 
            placeholder="CREATE TABLE students (&#10;  id SERIAL PRIMARY KEY,&#10;  name VARCHAR(100) NOT NULL,&#10;  email VARCHAR(100) UNIQUE&#10;);"
            rows="8"
          ></textarea>
          <mat-hint>SQL-Befehle zum Erstellen von Tabellen und Strukturen</mat-hint>
          <mat-error *ngIf="databaseForm.get('schema')?.hasError('required')">
            Schema ist erforderlich
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Seed-Daten (optional)</mat-label>
          <textarea 
            matInput 
            formControlName="seedData" 
            placeholder="INSERT INTO students (name, email) VALUES&#10;('Max Mustermann', 'max@example.com'),&#10;('Anna Schmidt', 'anna@example.com');"
            rows="6"
          ></textarea>
          <mat-hint>SQL-Befehle zum Einfügen von Beispieldaten</mat-hint>
        </mat-form-field>
      </form>

      <mat-progress-bar *ngIf="isCreating" mode="indeterminate"></mat-progress-bar>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="databaseForm.invalid || isCreating"
        (click)="onSave()"
      >
        <mat-icon>{{ data?.mode === 'edit' ? 'save' : 'add' }}</mat-icon>
        {{ data?.mode === 'edit' ? 'Speichern' : 'Erstellen' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .database-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    mat-progress-bar {
      margin-top: 16px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
    }

    textarea {
      font-family: 'Roboto Mono', monospace;
      line-height: 1.4;
    }
  `]
})
export class CreateDatabaseDialogComponent {
  databaseForm: FormGroup;
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateDatabaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatabaseDialogData,
    private sqlImportService: SqlImportService
  ) {
    this.databaseForm = this.fb.group({
      name: [
        data?.database?.name || '', 
        [Validators.required, Validators.minLength(3)]
      ],
      schema: [
        data?.database?.schema || '', 
        [Validators.required]
      ],
      seedData: [data?.database?.seedData || '']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.databaseForm.valid) {
      this.isCreating = true;
      const formValue = this.databaseForm.value;
      
      // Create a synthetic SQL file content
      const sqlContent = [
        formValue.schema,
        formValue.seedData ? '\n' + formValue.seedData : ''
      ].filter(Boolean).join('\n');
      
      // Convert to File object
      const sqlFile = new File([sqlContent], `${formValue.name}.sql`, {
        type: 'text/plain'
      });

      // Use the existing upload functionality
      this.sqlImportService.uploadDatabase(sqlFile, formValue.name).subscribe({
        next: (event: any) => {
          if (event.type === 4) { // HttpEventType.Response
            this.isCreating = false;
            this.dialogRef.close(true);
          }
        },
        error: (error) => {
          console.error('Error creating database:', error);
          this.isCreating = false;
        }
      });
    }
  }
}

import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { SqlImportService } from '../services/sql-import.service';
import { DatabaseGenerationService, GeneratedDatabase, DatabaseGenerationRequest } from '../services/database-generation.service';

@Component({
  selector: 'app-generate-database-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>auto_awesome</mat-icon>
      Datenbank mit KI generieren
    </h2>

    <mat-dialog-content>
      <mat-stepper #stepper [linear]="true" class="database-stepper">
        <!-- Step 1: Configuration -->
        <mat-step [stepControl]="requestForm" label="Konfiguration">
          <form [formGroup]="requestForm" class="generation-form">
            <div class="form-section">
              <h3>Beschreibung der gewünschten Datenbank</h3>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Beschreiben Sie Ihre Datenbank</mat-label>
                <textarea 
                  matInput 
                  formControlName="prompt"
                  placeholder="z.B. Eine Universitätsdatenbank mit Studenten, Kursen, Professoren und Einschreibungen"
                  rows="4"
                ></textarea>
                <mat-hint>{{ requestForm.value.prompt?.length || 0 }} / 500 Zeichen</mat-hint>
                <mat-error *ngIf="requestForm.get('prompt')?.hasError('required')">
                  Beschreibung ist erforderlich
                </mat-error>
                <mat-error *ngIf="requestForm.get('prompt')?.hasError('minlength')">
                  Mindestens 10 Zeichen erforderlich
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-section">
              <h3>Zusätzliche Parameter</h3>
              <mat-form-field appearance="fill">
                <mat-label>Komplexität</mat-label>
                <mat-select formControlName="complexity">
                  <mat-option *ngFor="let option of complexityOptions" [value]="option.value">
                    {{ option.label }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Anzahl der Tabellen</mat-label>
                <mat-select formControlName="tableCount">
                  <mat-option *ngFor="let count of tableCountOptions" [value]="count">
                    {{ count }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Name der Datenbank (optional)</mat-label>
                <input matInput formControlName="databaseName" placeholder="Wird automatisch generiert, wenn leer">
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button 
                mat-raised-button 
                [color]="requestForm.valid && !isGenerating ? 'primary' : ''"
                [class.disabled-button]="!requestForm.valid || isGenerating"
                [disabled]="requestForm.invalid || isGenerating"
                (click)="generateDatabase()"
              >
                <mat-icon>auto_awesome</mat-icon>
                Datenbank generieren
              </button>
            </div>

            <mat-progress-bar *ngIf="isGenerating" mode="indeterminate"></mat-progress-bar>
            
            <div *ngIf="errorMessage" class="error-message">
              <mat-icon>error</mat-icon>
              <p>{{ errorMessage }}</p>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: Preview -->
        <mat-step label="Vorschau & Bestätigung">
          <div *ngIf="generatedDatabase" class="preview-container">
            <mat-card class="preview-card">
              <mat-card-header>
                <mat-card-title>{{ generatedDatabase.name }}</mat-card-title>
                <mat-card-subtitle *ngIf="generatedDatabase.description">
                  {{ generatedDatabase.description }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="preview-section">
                  <h4>Schema (DDL)</h4>
                  <div class="code-preview">
                    <pre>{{ generatedDatabase.schema }}</pre>
                  </div>
                </div>

                <div class="preview-section" *ngIf="generatedDatabase.seedData">
                  <h4>Seed-Daten</h4>
                  <div class="code-preview">
                    <pre>{{ generatedDatabase.seedData }}</pre>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="preview-actions">
              <button mat-button (click)="stepper.previous()">
                <mat-icon>arrow_back</mat-icon>
                Zurück
              </button>
              <button 
                mat-raised-button 
                [color]="!isCreating ? 'primary' : ''"
                [class.disabled-button]="isCreating"
                [disabled]="isCreating"
                (click)="createDatabase()"
              >
                <mat-icon>save</mat-icon>
                Datenbank erstellen
              </button>
            </div>

            <mat-progress-bar *ngIf="isCreating" mode="indeterminate"></mat-progress-bar>
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .database-stepper {
      margin-top: 16px;
    }

    .generation-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 600px;
      padding: 16px 0;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section h3 {
      margin: 0 0 8px 0;
      color: #1976d2;
      font-size: 16px;
    }

    .form-section mat-form-field {
      margin-right: 16px;
    }

    .full-width {
      width: 100%;
      margin-right: 0 !important;
    }

    .form-actions {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }

    .preview-container {
      padding: 16px 0;
      min-width: 600px;
    }

    .preview-card {
      margin-bottom: 20px;
    }

    .preview-section {
      margin-bottom: 24px;
    }

    .preview-section h4 {
      margin: 0 0 12px 0;
      color: #1976d2;
      font-size: 14px;
      font-weight: 500;
    }

    .code-preview {
      background-color: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
    }

    .code-preview pre {
      margin: 0;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    .preview-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      background-color: #ffebee;
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
    }

    .error-message mat-icon {
      color: #f44336;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
    }

    mat-dialog-content {
      max-height: 80vh;
      overflow-y: auto;
    }

    mat-progress-bar {
      margin-top: 16px;
    }

    .disabled-button {
      background-color: #e0e0e0 !important;
      color: #9e9e9e !important;
      
      mat-icon {
        color: #9e9e9e !important;
      }
      
      &:hover {
        background-color: #e0e0e0 !important;
      }
    }

    :host-context(.dark-theme) .disabled-button {
      background-color: #424242 !important;
      color: #757575 !important;
      
      mat-icon {
        color: #757575 !important;
      }
      
      &:hover {
        background-color: #424242 !important;
      }
    }
  `]
})
export class GenerateDatabaseDialogComponent {
  @ViewChild('stepper') stepper!: MatStepper;

  requestForm: FormGroup;
  isGenerating = false;
  isCreating = false;
  generatedDatabase: GeneratedDatabase | null = null;
  errorMessage: string | null = null;

  complexityOptions = [
    { value: 'simple', label: 'Einfach' },
    { value: 'moderate', label: 'Mittel' },
    { value: 'complex', label: 'Komplex' }
  ];

  tableCountOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GenerateDatabaseDialogComponent>,
    private sqlImportService: SqlImportService,
    private databaseGenerationService: DatabaseGenerationService
  ) {
    this.requestForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.minLength(10)]],
      complexity: ['moderate'],
      tableCount: [3],
      databaseName: ['']
    });
  }

  canGenerate(): boolean {
    return this.requestForm.valid && !this.isGenerating;
  }

  generateDatabase(): void {
    if (!this.canGenerate()) return;

    this.isGenerating = true;
    this.errorMessage = null;

    const request = {
      prompt: this.requestForm.value.prompt,
      complexity: this.requestForm.value.complexity,
      tableCount: this.requestForm.value.tableCount,
      databaseName: this.requestForm.value.databaseName
    };

    this.databaseGenerationService.generateDatabase(request).subscribe({
      next: (result: GeneratedDatabase) => {
        this.generatedDatabase = result;
        this.isGenerating = false;
        this.stepper.next();
      },
      error: (error: any) => {
        console.error('Database generation error:', error);
        this.errorMessage = error.message || 'Fehler beim Generieren der Datenbank. Bitte versuchen Sie es erneut.';
        this.isGenerating = false;
      }
    });
  }

  createDatabase(): void {
    if (!this.generatedDatabase) return;

    this.isCreating = true;

    // Create SQL file content
    const sqlContent = [
      this.generatedDatabase.schema,
      this.generatedDatabase.seedData ? '\n' + this.generatedDatabase.seedData : ''
    ].filter(Boolean).join('\n');

    // Convert to File object
    const sqlFile = new File([sqlContent], `${this.generatedDatabase.name}.sql`, {
      type: 'text/plain'
    });

    // Use the existing upload functionality
    this.sqlImportService.uploadDatabase(sqlFile, this.generatedDatabase.name).subscribe({
      next: (event: any) => {
        if (event.type === 4) { // HttpEventType.Response
          this.isCreating = false;
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        console.error('Error creating database:', error);
        this.isCreating = false;
        this.errorMessage = 'Fehler beim Erstellen der Datenbank. Bitte versuchen Sie es erneut.';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

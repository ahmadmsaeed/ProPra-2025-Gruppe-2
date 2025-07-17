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
  templateUrl: './generate-database-dialog.component.html',
  styleUrls: ['./generate-database-dialog.component.scss']
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
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { ExerciseService } from '../services/exercise.service';
import { DatabaseService } from '../services/database.service';
import { Database } from '../models/database.model';
import { ExerciseGenerationRequest, GeneratedExercise } from '../models/exercise-generation.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-generate-exercise-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatIconModule,
    MatStepperModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './generate-exercise-dialog.component.html',
  styleUrls: ['./generate-exercise-dialog.component.scss']
})
export class GenerateExerciseDialogComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;
  
  requestForm: FormGroup;
  confirmForm: FormGroup;
  databases: Database[] = [];
  isGenerating = false;
  generatedExercise: GeneratedExercise | null = null;
  errorMessage: string | null = null;

  difficultyOptions = [
    { value: 'beginner', label: 'Anfänger' },
    { value: 'intermediate', label: 'Fortgeschritten' },
    { value: 'advanced', label: 'Experte' }
  ];

  conceptOptions = [
    { value: 'SELECT', label: 'SELECT Abfragen' },
    { value: 'WHERE', label: 'WHERE Bedingungen' },
    { value: 'JOIN', label: 'JOIN Verknüpfungen' },
    { value: 'GROUP BY', label: 'GROUP BY Gruppierung' },
    { value: 'ORDER BY', label: 'ORDER BY Sortierung' },
    { value: 'INSERT', label: 'INSERT Einfügen' },
    { value: 'UPDATE', label: 'UPDATE Aktualisieren' },
    { value: 'DELETE', label: 'DELETE Löschen' },
    { value: 'CREATE TABLE', label: 'CREATE TABLE Erstellung' },
    { value: 'ALTER TABLE', label: 'ALTER TABLE Änderung' },
    { value: 'AGGREGATE', label: 'Aggregatfunktionen' },
    { value: 'SUBQUERY', label: 'Unterabfragen' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GenerateExerciseDialogComponent>,
    private exerciseService: ExerciseService,
    private databaseService: DatabaseService
  ) {
    this.requestForm = this.fb.group({
      prompt: [''],
      databaseSchemaId: [null, Validators.required],
      difficulty: ['intermediate'],
      concept: ['']
    }, { validators: this.promptOrConceptValidator });

    this.confirmForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      solutionQuery: ['', Validators.required],
      initialQuery: ['']
    });
  }

  ngOnInit() {
    this.loadDatabases();
  }

  loadDatabases() {
    this.databaseService.getDatabases().subscribe({
      next: (databases) => {
        this.databases = databases;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading databases:', error);
        this.errorMessage = 'Fehler beim Laden der Datenbanken.';
      }
    });
  }

  generateExercise() {
    if (this.requestForm.valid) {
      this.isGenerating = true;
      this.errorMessage = null;
      
      const request: ExerciseGenerationRequest = {
        prompt: this.requestForm.value.prompt,
        databaseSchemaId: this.requestForm.value.databaseSchemaId,
        difficulty: this.requestForm.value.difficulty,
        concept: this.requestForm.value.concept || undefined
      };

      this.exerciseService.generateExercise(request).subscribe({
        next: (exercise) => {
          this.generatedExercise = exercise;
          this.confirmForm.patchValue({
            title: exercise.title,
            description: exercise.description,
            solutionQuery: exercise.solutionQuery,
            initialQuery: exercise.initialQuery || ''
          });
          this.isGenerating = false;
          // Advance to the next step
          this.stepper.next();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error generating exercise:', error);
          this.errorMessage = error.error?.message || 'Fehler beim Generieren der Aufgabe.';
          this.isGenerating = false;
        }
      });
    }
  }

  canGenerate(): boolean {
    const promptValue = this.requestForm.get('prompt')?.value || '';
    const databaseSelected = this.requestForm.get('databaseSchemaId')?.value;
    return promptValue.length >= 10 && databaseSelected && !this.isGenerating;
  }

  /**
   * Custom validator: Either prompt (min 10 chars) OR concept must be selected
   */
  promptOrConceptValidator(control: any) {
    const prompt = control.get('prompt')?.value || '';
    const concept = control.get('concept')?.value || '';
    
    // At least one must be filled
    if (!prompt && !concept) {
      return { promptOrConceptRequired: true };
    }
    
    // If prompt is provided, it must be at least 10 characters
    if (prompt && prompt.length < 10) {
      return { promptTooShort: true };
    }
    
    return null;
  }

  createExercise() {
    if (this.confirmForm.valid && this.generatedExercise) {
      const exerciseData = {
        title: this.confirmForm.value.title,
        description: this.confirmForm.value.description,
        solutionQuery: this.confirmForm.value.solutionQuery,
        initialQuery: this.confirmForm.value.initialQuery || undefined,
        databaseSchemaId: this.requestForm.value.databaseSchemaId
      };

      this.exerciseService.createExercise(exerciseData).subscribe({
        next: (exercise) => {
          this.dialogRef.close(exercise);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error creating exercise:', error);
          this.errorMessage = 'Fehler beim Erstellen der Aufgabe.';
        }
      });
    }
  }

  regenerateExercise() {
    this.generatedExercise = null;
    this.confirmForm.reset();
    this.generateExercise();
  }

  onCancel() {
    this.dialogRef.close();
  }

  getSelectedDatabaseName(): string {
    const selectedId = this.requestForm.value.databaseSchemaId;
    const database = this.databases.find(db => db.id === selectedId);
    return database ? database.name : '';
  }

  getSelectedDifficultyLabel(): string {
    const selectedValue = this.requestForm.value.difficulty;
    const option = this.difficultyOptions.find(opt => opt.value === selectedValue);
    return option ? option.label : '';
  }

  getSelectedConceptLabel(): string {
    const selectedValue = this.requestForm.value.concept;
    if (!selectedValue) return 'Allgemein';
    const option = this.conceptOptions.find(opt => opt.value === selectedValue);
    return option ? option.label : selectedValue;
  }
}

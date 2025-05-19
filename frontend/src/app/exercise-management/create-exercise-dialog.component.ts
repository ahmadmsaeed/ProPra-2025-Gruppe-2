import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { ExerciseService } from '@app/services/exercise.service';
import { DatabaseService } from '@app/services/database.service';
import { Database } from '@app/models/database.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-exercise-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Neue Übung erstellen</h2>
    <form [formGroup]="exerciseForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Titel</mat-label>
          <input matInput formControlName="title" required>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Beschreibung</mat-label>
          <textarea matInput formControlName="description" required rows="4"></textarea>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Musterlösung (SQL)</mat-label>
          <textarea matInput formControlName="solutionQuery" required rows="4"></textarea>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Datenbank</mat-label>
          <mat-select formControlName="databaseSchemaId" [required]="!selectedFile">
            <mat-option *ngFor="let db of databases" [value]="db.id">
              {{ db.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="file-upload">
          <label for="sqlFile">SQL-Datei hochladen</label>
          <input type="file" id="sqlFile" (change)="onFileSelected($event)" accept=".sql">
          <small *ngIf="selectedFile">Ausgewählte Datei: {{ selectedFile.name }}</small>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Abbrechen</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="!exerciseForm.valid">
          Erstellen
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .file-upload {
      margin: 16px 0;
    }

    .file-upload label {
      display: block;
      margin-bottom: 8px;
    }

    .file-upload input {
      margin-bottom: 8px;
    }

    .file-upload small {
      display: block;
      color: #666;
    }
  `]
})
export class CreateExerciseDialogComponent {
  exerciseForm: FormGroup;
  databases: Database[] = [];
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateExerciseDialogComponent>,
    private exerciseService: ExerciseService,
    private databaseService: DatabaseService
  ) {
    this.exerciseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      solutionQuery: ['', Validators.required],
      databaseSchemaId: ['']
    });

    this.loadDatabases();
  }

  loadDatabases() {
    this.databaseService.getDatabases().subscribe({
      next: (databases: Database[]) => this.databases = databases,
      error: (error: HttpErrorResponse) => console.error('Error loading databases:', error)
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
    }
  }

  onSubmit() {
    // Custom validation: require either databaseSchemaId or selectedFile
    const hasDatabase = !!this.exerciseForm.value.databaseSchemaId;
    const hasFile = !!this.selectedFile;
    if (!hasDatabase && !hasFile) {
      this.exerciseForm.get('databaseSchemaId')?.setErrors({ required: true });
      return;
    }
    if (this.exerciseForm.valid) {
      this.exerciseService.createExercise(
        this.exerciseForm.value,
        this.selectedFile || undefined
      ).subscribe({
        next: (exercise) => this.dialogRef.close(exercise),
        error: (error: HttpErrorResponse) => console.error('Error creating exercise:', error)
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 
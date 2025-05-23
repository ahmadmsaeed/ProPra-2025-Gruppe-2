import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { ExerciseService } from '../../services/exercise.service';
import { DatabaseService } from '../../services/database.service';
import { Database } from '../../models/database.model';
import { Exercise } from '../../models/exercise.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({  selector: 'app-edit-exercise-dialog',
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
  templateUrl: './edit-exercise-dialog.component.html',
  styleUrls: ['./edit-exercise-dialog.component.scss']
})
export class EditExerciseDialogComponent {
  exerciseForm: FormGroup;
  databases: Database[] = [];
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditExerciseDialogComponent>,
    private exerciseService: ExerciseService,
    private databaseService: DatabaseService,
    @Inject(MAT_DIALOG_DATA) public data: Exercise
  ) {
    this.exerciseForm = this.fb.group({
      title: [data.title, Validators.required],
      description: [data.description, Validators.required],
      solutionQuery: [data.solutionQuery, Validators.required],
      databaseSchemaId: [data.databaseSchemaId, Validators.required]
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
    if (this.exerciseForm.valid) {
      this.exerciseService.updateExercise(
        this.data.id,
        this.exerciseForm.value,
        this.selectedFile || undefined
      ).subscribe({
        next: (exercise) => this.dialogRef.close(exercise),
        error: (error: HttpErrorResponse) => console.error('Error updating exercise:', error)
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 
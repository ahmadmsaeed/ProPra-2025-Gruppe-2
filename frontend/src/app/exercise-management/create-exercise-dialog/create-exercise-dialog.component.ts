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

@Component({  selector: 'app-create-exercise-dialog',
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
  templateUrl: './create-exercise-dialog.component.html',
  styleUrls: ['./create-exercise-dialog.component.scss']
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
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Exercise } from '../../models/exercise.model';

@Component({  selector: 'app-view-exercise-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './view-exercise-dialog.component.html',
  styleUrls: ['./view-exercise-dialog.component.scss']
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
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../services/auth.service';
import { ExerciseService } from '../services/exercise.service';
import { Exercise } from '../models/exercise.model';
import { CreateExerciseDialogComponent } from './create-exercise-dialog.component';
import { EditExerciseDialogComponent } from './edit-exercise-dialog.component';
import { ViewExerciseDialogComponent } from './view-exercise-dialog.component';

@Component({  selector: 'app-exercise-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule
  ],
  templateUrl: './exercise-management.component.html',
  styleUrls: ['./exercise-management.component.scss']
})
export class ExerciseManagementComponent implements OnInit {
  exercises: Exercise[] = [];

  constructor(
    private authService: AuthService,
    private exerciseService: ExerciseService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadExercises();
  }

  loadExercises() {
    this.exerciseService.getExercises().subscribe(
      exercises => this.exercises = exercises,
      error => console.error('Error loading exercises:', error)
    );
  }

  canEdit(exercise: Exercise): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'TEACHER' || 
           (user?.role === 'TUTOR' && user.id === exercise.authorId);
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(CreateExerciseDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadExercises();
      }
    });
  }

  openEditDialog(exercise: Exercise) {
    const dialogRef = this.dialog.open(EditExerciseDialogComponent, {
      width: '600px',
      data: exercise
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadExercises();
      }
    });
  }

  openViewDialog(exercise: Exercise) {
    this.dialog.open(ViewExerciseDialogComponent, {
      width: '800px',
      data: exercise
    });
  }

  deleteExercise(exercise: Exercise) {
    if (confirm('Möchten Sie diese Übung wirklich löschen?')) {
      this.exerciseService.deleteExercise(exercise.id).subscribe(
        () => this.loadExercises(),
        error => console.error('Error deleting exercise:', error)
      );
    }
  }
} 
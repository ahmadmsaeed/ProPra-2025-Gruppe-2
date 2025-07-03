import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { ExerciseService } from '../services/exercise.service';
import { Exercise } from '../models/exercise.model';
import { CreateExerciseDialogComponent } from './create-exercise-dialog.component';
import { EditExerciseDialogComponent } from './edit-exercise-dialog.component';
import { ViewExerciseDialogComponent } from './view-exercise-dialog.component';
import { GenerateExerciseDialogComponent } from './generate-exercise-dialog.component';
import { BaseComponent } from '../shared/components/base.component';
import { takeUntil } from 'rxjs/operators';

@Component({  selector: 'app-exercise-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule,
    MatMenuModule,
    MatSnackBarModule
  ],
  templateUrl: './exercise-management.component.html',
  styleUrls: ['./exercise-management.component.scss']
})
export class ExerciseManagementComponent extends BaseComponent implements OnInit {
  exercises: Exercise[] = [];

  constructor(
    private authService: AuthService,
    private exerciseService: ExerciseService
  ) {
    super();
  }

  ngOnInit() {
    this.loadExercises();
  }

  loadExercises() {
    this.exerciseService.getExercises().subscribe(
      exercises => this.exercises = exercises,
      error => this.handleError(error, 'Fehler beim Laden der Übungen')
    );
  }

  canEdit(exercise: Exercise): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'TEACHER' || 
           (user?.role === 'TUTOR' && user.id === exercise.authorId);
  }

  openCreateDialog() {
    const dialogRef = this.dialogService.openDialog(CreateExerciseDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: any) => {
      if (result) {
        this.loadExercises();
      }
    });
  }

  openGenerateDialog() {
    const dialogRef = this.dialogService.openDialog(GenerateExerciseDialogComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: any) => {
      if (result) {
        this.loadExercises();
      }
    });
  }

  openEditDialog(exercise: Exercise) {
    const dialogRef = this.dialogService.openDialog(EditExerciseDialogComponent, {
      width: '600px',
      data: exercise
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: any) => {
      if (result) {
        this.loadExercises();
      }
    });
  }

  openViewDialog(exercise: Exercise) {
    this.dialogService.openDialog(ViewExerciseDialogComponent, {
      width: '800px',
      data: exercise
    });
  }

  async deleteExercise(exercise: Exercise) {
    const confirmed = await this.confirmAction(
      'Übung löschen',
      'Möchten Sie diese Übung wirklich löschen?'
    );
    
    if (confirmed) {
      this.exerciseService.deleteExercise(exercise.id).subscribe({
        next: () => {
          this.loadExercises();
          this.showSuccess('Übung erfolgreich gelöscht');
        },
        error: (error) => {
          this.handleError(error, 'Fehler beim Löschen der Übung');
        }
      });
    }
  }
} 
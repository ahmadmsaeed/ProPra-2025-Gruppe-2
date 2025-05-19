import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../auth.service';
import { ExerciseService } from '../services/exercise.service';
import { Exercise } from '../models/exercise.model';
import { CreateExerciseDialogComponent } from './create-exercise-dialog.component';
import { EditExerciseDialogComponent } from './edit-exercise-dialog.component';
import { ViewExerciseDialogComponent } from './view-exercise-dialog.component';

@Component({
  selector: 'app-exercise-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule
  ],
  template: `
    <div class="container">
      <div class="header">
        <h1>Übungsverwaltung</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Neue Übung erstellen
        </button>
      </div>

      <div class="exercises-list">
        <mat-card *ngFor="let exercise of exercises" class="exercise-card">
          <mat-card-header>
            <mat-card-title>{{ exercise.title }}</mat-card-title>
            <mat-card-subtitle>
              Autor: {{ exercise.author.name }} | 
              Datenbank: {{ exercise.database.name }}
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <p>{{ exercise.description }}</p>
          </mat-card-content>

          <mat-card-actions align="end">
            <button mat-icon-button color="primary" (click)="openViewDialog(exercise)">
              <mat-icon>visibility</mat-icon>
            </button>
            
            <button mat-icon-button color="accent" 
                    *ngIf="canEdit(exercise)"
                    (click)="openEditDialog(exercise)">
              <mat-icon>edit</mat-icon>
            </button>
            
            <button mat-icon-button color="warn" 
                    *ngIf="canEdit(exercise)"
                    (click)="deleteExercise(exercise)">
              <mat-icon>delete</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .exercises-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .exercise-card {
      height: 100%;
    }

    mat-card-content {
      margin: 16px 0;
    }

    mat-card-actions {
      padding: 8px;
    }
  `]
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
    const user = JSON.parse(localStorage.getItem('user') || 'null');
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
import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar'; // Hinzugefügt
import { AuthService, User } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface ExerciseInfo {
  id: number;
  title: string;
  description: string;
  completed?: boolean; // Hinzugefügt
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule, // Hinzugefügt
    SlicePipe
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  studentName$: Observable<string> = this.authService.me().pipe(
    map(user => (user && user.name ? user.name.split(' ')[0] : 'Student'))
  );

  lastExercise: ExerciseInfo | null = null;
  nextExercise: ExerciseInfo | null = null;
  
  // Progress Bar Properties - Hinzugefügt
  totalExercises = 0;
  completedExercises = 0;
  progressPercentage = 0;

  // Mock-Daten erweitert
  mockExercises: ExerciseInfo[] = [
    { id: 1, title: 'Einführung in SELECT', description: 'Lerne die Grundlagen des SELECT-Statements und wie man Daten aus einer einzelnen Tabelle abfragt.', completed: true },
    { id: 2, title: 'Filtern mit WHERE', description: 'Vertiefe dein Wissen, indem du lernst, Abfrageergebnisse mit der WHERE-Klausel zu filtern.', completed: true },
    { id: 3, title: 'Sortieren mit ORDER BY', description: 'Erfahre, wie du deine Ergebnisse mit ORDER BY sortieren kannst.', completed: false },
    { id: 4, title: 'JOIN Operationen', description: 'Kombiniere Daten aus mehreren Tabellen mit verschiedenen JOIN-Typen.', completed: false },
  ];

  ngOnInit(): void {
    this.fetchExerciseProgress();
    this.calculateProgress(); // Hinzugefügt
  }

  fetchExerciseProgress(): void {
    const lastCompletedId = 2; // Simuliert: Student hat 2 Übungen abgeschlossen
    const foundLast = this.mockExercises.find(ex => ex.id === lastCompletedId);

    if (foundLast) {
      this.lastExercise = foundLast;
      const nextId = lastCompletedId + 1;
      const foundNext = this.mockExercises.find(ex => ex.id === nextId);
      this.nextExercise = foundNext || null;
    } else {
      this.lastExercise = null;
      this.nextExercise = this.mockExercises.length > 0 ? this.mockExercises[0] : null;
    }
  }

  // Neue Methode für Progress Berechnung
  calculateProgress(): void {
    this.totalExercises = this.mockExercises.length;
    this.completedExercises = this.mockExercises.filter(exercise => exercise.completed).length;
    this.progressPercentage = this.totalExercises > 0 ? 
      Math.round((this.completedExercises / this.totalExercises) * 100) : 0;
  }

  navigateToExercise(exerciseId: number): void {
    this.router.navigate(['/exercises'], { queryParams: { exerciseId: exerciseId } });
  }
}
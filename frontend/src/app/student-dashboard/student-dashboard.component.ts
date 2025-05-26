import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, User } from '../services/auth.service'; // Geändert: User von AuthService importieren
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface ExerciseInfo {
  id: number;
  title: string;
  description: string;
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
    SlicePipe
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Geändert: authService.me() verwenden, falls dies die Methode ist, die den User liefert
  studentName$: Observable<string> = this.authService.me().pipe(
    map(user => (user && user.name ? user.name.split(' ')[0] : 'Student'))
  );

  lastExercise: ExerciseInfo | null = null;
  nextExercise: ExerciseInfo | null = null;

  // Mock-Daten - ersetze dies später durch echte Service-Aufrufe
  mockExercises: ExerciseInfo[] = [
    { id: 1, title: 'Einführung in SELECT', description: 'Lerne die Grundlagen des SELECT-Statements und wie man Daten aus einer einzelnen Tabelle abfragt.' },
    { id: 2, title: 'Filtern mit WHERE', description: 'Vertiefe dein Wissen, indem du lernst, Abfrageergebnisse mit der WHERE-Klausel zu filtern.' },
    { id: 3, title: 'Sortieren mit ORDER BY', description: 'Erfahre, wie du deine Ergebnisse mit ORDER BY sortieren kannst.' },
    { id: 4, title: 'JOIN Operationen', description: 'Kombiniere Daten aus mehreren Tabellen mit verschiedenen JOIN-Typen.' },
  ];

  ngOnInit(): void {
    // Simuliere das Abrufen des Übungsfortschritts
    // In einer echten Anwendung käme dies von einem ExerciseService
    this.fetchExerciseProgress();
  }

  fetchExerciseProgress(): void {
    // Platzhalter-Logik:
    // Ersetze dies durch echte API-Aufrufe an dein Backend über einen Service.
    // Angenommen, der Student hat Übung 1 abgeschlossen.
    const lastCompletedId = 1; // Dies würde vom Backend kommen.
    const foundLast = this.mockExercises.find(ex => ex.id === lastCompletedId);

    if (foundLast) {
      this.lastExercise = foundLast;
      const nextId = lastCompletedId + 1;
      const foundNext = this.mockExercises.find(ex => ex.id === nextId);
      this.nextExercise = foundNext || null;
    } else {
      // Wenn keine Übung abgeschlossen wurde, ist die erste die nächste.
      this.lastExercise = null;
      this.nextExercise = this.mockExercises.length > 0 ? this.mockExercises[0] : null;
    }
  }

  navigateToExercise(exerciseId: number): void {
    // Navigiere zur spezifischen Übungsseite, z.B. /exercises/:id
    // Die genaue Route hängt von deiner Implementierung der Übungsseite ab.
    // Die student-exercises Komponente scheint Übungen basierend auf einer ID zu laden.
    this.router.navigate(['/exercises'], { queryParams: { exerciseId: exerciseId } });
    // Oder wenn du eine dedizierte Route pro Übung hast:
    // this.router.navigate(['/exercises', exerciseId]);
  }
}
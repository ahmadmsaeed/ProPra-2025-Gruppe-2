import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, User } from '../services/auth.service';
import { ExerciseService } from '../services/exercise.service';
import { SubmissionService } from '../services/submission.service';
import { AdminService } from '../services/admin.service';
import { Exercise } from '../models/exercise.model';
import { Submission } from '../models/submission.model';
import { Observable, of, combineLatest, EMPTY } from 'rxjs';
import { map, catchError, switchMap, startWith } from 'rxjs/operators';

interface ExerciseInfo {
  id: number;
  title: string;
  description: string;
  completed?: boolean;
}

interface DashboardData {
  exercises: Exercise[];
  submissions: Submission[];
  progress: any;
  loading: boolean;
  error: string | null;
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
    MatProgressBarModule,
    MatProgressSpinnerModule,
    SlicePipe
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private exerciseService = inject(ExerciseService);
  private submissionService = inject(SubmissionService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  studentName$: Observable<string> = this.authService.me().pipe(
    map(user => (user && user.name ? user.name.split(' ')[0] : 'Student'))
  );

  // Dashboard data observables
  dashboardData$: Observable<DashboardData> = this.authService.currentUser$.pipe(
    switchMap(user => {
      if (!user) {
        return of({
          exercises: [],
          submissions: [],
          progress: null,
          loading: false,
          error: 'User not authenticated'
        });
      }

      return combineLatest([
        this.exerciseService.getExercises().pipe(catchError(() => of([]))),
        this.submissionService.getMySubmissions().pipe(catchError(() => of([])))
      ]).pipe(
        map(([exercises, submissions]) => {
          // Calculate progress locally instead of calling admin service
          const progress = this.calculateProgressFromSubmissions(exercises, submissions);
          
          return {
            exercises,
            submissions,
            progress,
            loading: false,
            error: null
          };
        }),
        startWith({
          exercises: [],
          submissions: [],
          progress: null,
          loading: true,
          error: null
        }),
        catchError(error => of({
          exercises: [],
          submissions: [],
          progress: null,
          loading: false,
          error: 'Failed to load dashboard data'
        }))
      );
    })
  );

  // Derived observables for specific dashboard components
  exercisesWithCompletion$ = this.dashboardData$.pipe(
    map(data => {
      if (data.loading || data.error) return [];
      
      const completedExerciseIds = new Set(
        data.submissions
          .filter(sub => sub.isCorrect)
          .map(sub => sub.exerciseId)
      );

      return data.exercises.map(exercise => ({
        ...exercise,
        completed: completedExerciseIds.has(exercise.id)
      }));
    })
  );

  lastExercise$ = this.exercisesWithCompletion$.pipe(
    map(exercises => {
      const completed = exercises.filter(ex => ex.completed);
      return completed.length > 0 ? completed[completed.length - 1] : null;
    })
  );

  nextExercise$ = this.exercisesWithCompletion$.pipe(
    map(exercises => {
      const nextIncomplete = exercises.find(ex => !ex.completed);
      return nextIncomplete || null;
    })
  );

  progressData$ = this.dashboardData$.pipe(
    map(data => data.progress),
    startWith(null)
  );

  ngOnInit(): void {
    // Data loading is handled by observables
  }

  navigateToExercise(exerciseId: number): void {
    this.router.navigate(['/exercises'], { queryParams: { exerciseId: exerciseId } });
  }

  private calculateProgressFromSubmissions(exercises: Exercise[], submissions: Submission[]): any {
    const totalExercises = exercises.length;
    const completedExercises = exercises.filter(exercise => 
      submissions.some(submission => 
        submission.exerciseId === exercise.id && submission.isCorrect
      )
    ).length;
    
    const progressPercentage = totalExercises > 0 ? 
      Math.round((completedExercises / totalExercises) * 100) : 0;

    return {
      totalExercises,
      completedExercises,
      progressPercentage
    };
  }

  reloadPage(): void {
    window.location.reload();
  }
}
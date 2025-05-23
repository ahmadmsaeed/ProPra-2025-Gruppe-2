import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { BackendStatusComponent } from './backend-status/backend-status.component';
import { AuthService } from './services/auth.service';
import { ExerciseSessionService } from './services/exercise-session.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    BackendStatusComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    private exerciseSessionService: ExerciseSessionService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    // End any active exercise session before logging out
    const sessionId = localStorage.getItem('sql_learning_exercise_session');
    if (sessionId) {
      this.exerciseSessionService.endSession(sessionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Clear session data and logout
            localStorage.removeItem('sql_learning_exercise_session');
            this.authService.logout();
          },
          error: (error: Error) => {
            console.error('Error ending exercise session:', error);
            // Still logout even if session cleanup fails
            this.authService.logout();
          }
        });
    } else {
      // No active session, just logout
      this.authService.logout();
    }
  }
}

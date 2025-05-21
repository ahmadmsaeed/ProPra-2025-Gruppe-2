import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { Observable, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Komponente für das User-Profil (geschützt).
 * Holt die Userdaten vom Backend und zeigt sie an.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDividerModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  user$: Observable<User | null> = of(null);
  error = '';

  constructor(public authService: AuthService, private router: Router) {
    this.user$ = this.authService.me();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
  getUserRole(): string {
    if (this.authService.isTeacher()) {
      return 'Dozent';
    } else if (this.authService.isTutor()) {
      return 'Tutor';
    } else {
      return 'Student';
    }
  }
  
  getUserRoleClass(): string {
    if (this.authService.isTeacher()) {
      return 'role-teacher';
    } else if (this.authService.isTutor()) {
      return 'role-tutor';
    } else {
      return 'role-student';
    }
  }
} 
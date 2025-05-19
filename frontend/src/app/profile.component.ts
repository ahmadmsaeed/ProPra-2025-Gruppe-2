import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from './auth.service';
import { Observable, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProfileEditDialogComponent } from './profile-edit-dialog.component';

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
  styles: [`
    .profile-container {
      max-width: 600px;
      margin: 2em auto;
      padding: 0 1rem;
    }
    
    h1 {
      color: #3f51b5;
      margin-bottom: 1.5rem;
      font-weight: 400;
    }
    
    .profile-card {
      margin-bottom: 2rem;
      border-radius: 8px;
    }
    
    .avatar-icon {
      font-size: 40px;
      height: 40px;
      width: 40px;
      color: #3f51b5;
    }
    
    .user-info {
      padding: 1rem 0;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .info-label {
      width: 150px;
      font-weight: 500;
      color: #616161;
    }
    
    .info-value {
      flex: 1;
      color: #212121;
    }
    
    .badge-wrapper {
      display: block;
      margin-left: -8px; 
    }
    
    .role-badge {
      padding: 4px 8px;
      border-radius: 16px;
      font-weight: 400;
      display: inline-block;
    }
    
    .role-student {
      background-color: #e3f2fd;
      color: #1565c0;
    }
    
    .role-tutor {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    
    .role-teacher {
      background-color: #fce4ec;
      color: #c2185b;
    }
    
    mat-card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1rem;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 0;
    }
    
    .loading-container p {
      margin-top: 1rem;
      color: #757575;
    }
    
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 1rem;
      background-color: #ffebee;
      border-radius: 4px;
      color: #c62828;
    }
  `]
})
export class ProfileComponent {
  user$: Observable<User | null> = of(null);
  error = '';

  constructor(public authService: AuthService, private router: Router, private dialog: MatDialog) {
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

  async openEditDialog() {
    const user = await this.user$.toPromise();
    if (!user) return;
    const dialogRef = this.dialog.open(ProfileEditDialogComponent, {
      data: { name: user.name, email: user.email },
      width: '400px'
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (!result) return;
      this.error = '';
      try {
        // Update name/email if changed
        if (result.name !== user.name || result.email !== user.email) {
          await this.authService.updateProfile({ name: result.name, email: result.email }).toPromise();
        }
        // Change password if requested
        if (result.newPassword) {
          await this.authService.changePassword({ currentPassword: result.currentPassword, newPassword: result.newPassword }).toPromise();
        }
        // Refresh user info
        this.user$ = this.authService.me();
      } catch (e: any) {
        this.error = e?.error?.message || 'Fehler beim Aktualisieren des Profils.';
      }
    });
  }
}

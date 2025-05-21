import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProfileEditDialogComponent } from '../profile-edit/profile-edit-dialog.component';

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
  ],  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
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

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from './auth.service';
import { Observable, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Komponente für das User-Profil (geschützt).
 * Holt die Userdaten vom Backend und zeigt sie an.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  user$: Observable<User | null> = of(null);
  error = '';

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = this.auth.me();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

// register.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

/**
 * Komponente für die User-Registrierung.
 * Sendet die Daten an das Backend und zeigt Erfolg oder Fehler an.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  form = { email: '', password: '', name: '' };
  error = '';
  success = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    // Redirect already logged-in users to their appropriate dashboard
    if (this.auth.isLoggedIn()) {
      this.redirectToDashboard();
    }
  }

  private redirectToDashboard() {
    if (this.auth.isStudent()) {
      this.router.navigate(['/student/dashboard']);
    } else if (this.auth.isTeacher()) {
      this.router.navigate(['/teacher/dashboard']);
    } else if (this.auth.isTutor()) {
      this.router.navigate(['/tutor/dashboard']);
    } else {
      this.router.navigate(['/profile']);
    }
  }

  /**
   * Sendet die Registrierungsdaten an das Backend.
   */
  onSubmit() {
    this.error = '';
    this.success = false;
    this.auth.register(this.form).subscribe({
      next: () => {
        this.success = true;
        this.form = { email: '', password: '', name: '' };
      },
      error: (err) => {
        this.error = err.error?.message || 'Registrierung fehlgeschlagen';
      }
    });
  }
}

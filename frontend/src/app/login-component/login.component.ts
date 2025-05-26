import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MaterialModule, ErrorMessageComponent } from '../shared';

/**
 * Komponente für den Login.
 * Sendet die Zugangsdaten an das Backend und speichert das Token.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, ErrorMessageComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form = { email: '', password: '' };
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  /**
   * Sendet die Login-Daten an das Backend.
   */
  onSubmit() {
    this.error = '';
    this.auth.login(this.form).subscribe({
      next: () => {
        if (this.auth.isStudent()) {
          this.router.navigate(['/student/dashboard']); // Zum neuen Student-Dashboard
        } else if (this.auth.isTeacher() || this.auth.isTutor()) {
          // Bestehende Logik für Dozenten/Tutoren, z.B. zum Teacher-Dashboard
          this.router.navigate(['/teacher/dashboard']);
        }
         else {
          this.router.navigate(['/profile']); // Fallback
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Login fehlgeschlagen';
      }
    });
  }
}
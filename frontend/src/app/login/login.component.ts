import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

/**
 * Komponente für den Login.
 * Sendet die Zugangsdaten an das Backend und speichert das Token.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule],
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
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Login fehlgeschlagen';
      }
    });
  }
} 
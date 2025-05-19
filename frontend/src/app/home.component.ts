import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],  template: `
    <div class="welcome-container">
      <h1>Willkommen auf der SQL-Lernplattform</h1>
      
      <div *ngIf="!authService.isLoggedIn()">
        <p>Bitte melden Sie sich an, um auf Ihre Lernressourcen zuzugreifen.</p>
      </div>
      
      <div *ngIf="authService.isTeacher()">
        <h2>Dozenten-Ansicht</h2>
        <p>Als Dozent können Sie:</p>
        <ul>
          <li>SQL-Übungen erstellen und verwalten</li>
          <li>Einreichungen der Studenten einsehen</li>
          <li>Auf das Admin-Dashboard zugreifen</li>
        </ul>
      </div>
      
      <div *ngIf="authService.isTutor()">
        <h2>Tutor-Ansicht</h2>
        <p>Als Tutor können Sie:</p>
        <ul>
          <li>Einreichungen der Studenten überprüfen</li>
          <li>Feedback zu Übungen geben</li>
        </ul>
      </div>
      
      <div *ngIf="authService.isStudent()">
        <h2>Studenten-Ansicht</h2>
        <p>Als Student können Sie:</p>
        <ul>
          <li>Auf SQL-Übungen zugreifen</li>
          <li>Ihre Lösungen einreichen</li>
          <li>Ihren Fortschritt einsehen</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .welcome-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #3f51b5;
      margin-bottom: 30px;
    }
    h2 {
      color: #3f51b5;
      margin-top: 30px;
    }
    ul {
      margin-top: 15px;
      margin-bottom: 30px;
    }    li {
      margin-bottom: 8px;
    }
  `]
})
export class HomeComponent {
  constructor(public authService: AuthService) {}
} 
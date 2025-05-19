import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, RouterModule],
  template: `
    <div *ngIf="authService.isTeacher() || authService.isTutor(); else accessDenied">      <h1>Dozenten-Dashboard</h1>
      
      <div class="dashboard-container">
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-card-title>Übungsverwaltung</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Erstellen und verwalten Sie SQL-Übungen für Ihre Studenten.</p>
          </mat-card-content>
          <mat-card-actions>
            <a mat-button color="primary" routerLink="/exercise-management">ÜBUNGEN VERWALTEN</a>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-card-title>Studentenfortschritt</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Verfolgen Sie den Fortschritt der Studenten bei den Übungen.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary">FORTSCHRITT ANZEIGEN</button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-card-title>Datenbankschemata</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Verwalten Sie Datenbankschemata für Übungen.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary">SCHEMATA VERWALTEN</button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
      <ng-template #accessDenied>
      <p style="color: red;">Zugriff verweigert. Sie müssen ein Dozent oder Tutor sein, um diese Seite anzuzeigen.</p>
    </ng-template>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    
    .dashboard-card {
      width: 300px;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #3f51b5;
      margin-bottom: 20px;
    }
  `]
})
export class TeacherDashboardComponent {
  constructor(public authService: AuthService) {}
} 
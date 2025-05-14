import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-teacher-exercises',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],  template: `
    <div *ngIf="authService.isTeacher() || authService.isTutor(); else accessDenied">      
      <h1>Übungen verwalten</h1>
      
      <div class="actions">
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon> Neue Übung erstellen
        </button>
      </div>
      
      <div class="exercises-container">
        <mat-card class="no-exercises-card">
          <mat-card-content>
            <p>Keine Übungen vorhanden. Erstellen Sie eine neue Übung mit dem Button oben.</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
      <ng-template #accessDenied>
      <p style="color: red;">Zugriff verweigert. Sie müssen ein Dozent oder Tutor sein, um diese Seite anzuzeigen.</p>
    </ng-template>
  `,  styles: [`
    .exercises-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    
    .exercise-card {
      width: 400px;
      margin-bottom: 20px;
    }
    
    .no-exercises-card {
      width: 100%;
      text-align: center;
      padding: 30px;
      background-color: #f5f5f5;
    }
    
    h1 {
      color: #3f51b5;
      margin-bottom: 20px;
    }
    
    .actions {
      margin-bottom: 20px;
    }
    
    .stats {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
  `]
})
export class TeacherExercisesComponent {
  constructor(public authService: AuthService) {}
} 
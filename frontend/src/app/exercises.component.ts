import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],  template: `
    <div *ngIf="authService.isStudent(); else accessDenied">
      <h1>SQL-Übungen</h1>
      
      <div class="exercises-container">
        <mat-card class="no-exercises-card">
          <mat-card-content>
            <p>Derzeit sind keine Übungen verfügbar. Bitte versuchen Sie es später erneut.</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
    
    <ng-template #accessDenied>
      <p style="color: red;">Zugriff verweigert. Sie müssen ein Student sein, um diese Seite anzuzeigen.</p>
    </ng-template>
  `,  styles: [`
    .exercises-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    
    .exercise-card {
      width: 300px;
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
  `]
})
export class ExercisesComponent {
  constructor(public authService: AuthService) {}
} 
  import { Component } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { AuthService } from '../services/auth.service';
  import { MatCardModule } from '@angular/material/card';
  import { MatButtonModule } from '@angular/material/button';
  import { MatIconModule } from '@angular/material/icon';

  @Component({
  selector: 'app-teacher-exercises',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './teacher-exercises.component.html',
  styleUrls: ['./teacher-exercises.component.scss']
  })
  export class TeacherExercisesComponent {
    constructor(public authService: AuthService) {}
  } 
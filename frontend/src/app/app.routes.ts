import { Routes } from '@angular/router';
import { RegisterComponent } from './register.component';
import { LoginComponent } from './login.component';
import { ProfileComponent } from './profile.component';
import { authGuard } from './auth.guard';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard.component';
import { ExercisesComponent } from './exercises.component';
import { TeacherExercisesComponent } from './teacher-exercises.component';
import { LandingPageComponent } from './landing-page/landing-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
  
  // Routes for SQL learning platform
  { path: 'exercises', component: ExercisesComponent, canActivate: [authGuard] },
  { path: 'teacher/dashboard', component: TeacherDashboardComponent, canActivate: [authGuard] },
  { path: 'teacher/exercises', component: TeacherExercisesComponent, canActivate: [authGuard] },
];

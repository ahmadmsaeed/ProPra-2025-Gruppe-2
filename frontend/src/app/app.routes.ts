import { Routes } from '@angular/router';
import { RegisterComponent } from './register-component/register.component';
import { LoginComponent } from './login-component/login.component';
import { ProfileComponent } from './profile-component/profile.component';
import { authGuard } from './auth.guard';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { TeacherExercisesComponent } from './teachers-exercises/teacher-exercises.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { ExerciseManagementComponent } from './exercise-management/exercise-management.component';
import { StudentExercisesComponent } from './student-exercises/student-exercises.component';
import { SqlImportComponent } from './sql-import/sql-import.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
  
  // Routes for SQL learning platform
  { path: 'exercises', component: StudentExercisesComponent, canActivate: [authGuard] },
  { path: 'teacher/dashboard', component: TeacherDashboardComponent, canActivate: [authGuard] },
  { path: 'teacher/exercises', component: TeacherExercisesComponent, canActivate: [authGuard] },
  { path: 'exercise-management', component: ExerciseManagementComponent, canActivate: [authGuard] },
  { path: 'databases', component: SqlImportComponent, canActivate: [authGuard] },
];

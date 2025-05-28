import { Routes } from '@angular/router';
import { RegisterComponent } from './register-component/register.component';
import { LoginComponent } from './login-component/login.component';
import { ProfileComponent } from './profile-component/profile.component';
import { authGuard } from './auth.guard';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { TutorDashboardComponent } from './tutor-dashboard/tutor-dashboard.component';
import { StudentProgressComponent } from './student-progress/student-progress.component';
import { TeacherExercisesComponent } from './teacher-exercises/teacher-exercises.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { ExerciseManagementComponent } from './exercise-management/exercise-management.component';
import { StudentExercisesComponent } from './student-exercises/student-exercises.component';
import { SqlImportComponent } from './sql-import/sql-import.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: 'student/dashboard', component: StudentDashboardComponent, canActivate: [authGuard] },
  { path: 'tutor/dashboard', component: TutorDashboardComponent, canActivate: [authGuard] },
  { path: 'student-progress', component: StudentProgressComponent, canActivate: [authGuard] }, 
  { path: 'exercises', component: StudentExercisesComponent, canActivate: [authGuard] },
  { path: 'teacher/dashboard', component: TeacherDashboardComponent, canActivate: [authGuard] },
  { path: 'teacher/exercises', component: TeacherExercisesComponent, canActivate: [authGuard] },
  { path: 'exercise-management', component: ExerciseManagementComponent, canActivate: [authGuard] },
  { path: 'databases', component: SqlImportComponent, canActivate: [authGuard] },
];
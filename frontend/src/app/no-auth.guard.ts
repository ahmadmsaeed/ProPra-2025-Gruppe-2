import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

/**
 * Guard that prevents logged-in users from accessing authentication pages (login/register).
 * Redirects to appropriate dashboard based on user role.
 */
export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (auth.isLoggedIn()) {
    // User is already logged in, redirect to appropriate dashboard
    if (auth.isStudent()) {
      router.navigate(['/student/dashboard']);
    } else if (auth.isTeacher()) {
      router.navigate(['/teacher/dashboard']);
    } else if (auth.isTutor()) {
      router.navigate(['/tutor/dashboard']);
    } else {
      router.navigate(['/profile']);
    }
    return false;
  }
  
  return true; // Allow access if not logged in
};

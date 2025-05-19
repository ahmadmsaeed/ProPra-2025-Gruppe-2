import { Injectable } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar'; // Import MatSnackBar
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar); // Inject MatSnackBar
  const router = inject(Router); // Inject Router
  const token = authService.getToken();

  let clonedRequest = req;


  // Nur wenn ein Token existiert, Authorization Header setzen
  if (token && token !== 'null' && token !== '') {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check for 403 Forbidden specifically
      if (error.status === 403) {
        // Check if the error message indicates the user is blocked
        // Adjust the condition based on the exact error message from your backend BlockedUserGuard
        const errorMessage = error.error?.message || '';
        if (errorMessage.toLowerCase().includes('blocked')) {
           snackBar.open('Your account is blocked. Please contact support.', 'Close', {
             duration: undefined, // Keep open until manually closed
             panelClass: ['error-snackbar'] // Optional: for custom styling
           });
           // Optionally log out the user or redirect
           authService.logout();
           router.navigate(['/login']);
        } else {
           // Handle other 403 errors (e.g., insufficient role) if needed
           snackBar.open(`Access Denied: ${errorMessage || 'You do not have permission.'}`, 'Close', { duration: 5000 });
        }
      } else if (error.status === 401) {
        // Handle unauthorized (e.g., invalid/expired token)
        console.error('Unauthorized request (401): Logging out.', error);
        // Avoid showing snackbar if the error is from the initial /auth/me check on load
        if (!req.url.includes('/auth/me')) {
          snackBar.open('Your session has expired or is invalid. Please log in again.', 'Close', { duration: 5000 });
        }
        authService.logout(); // Log the user out
        router.navigate(['/login']); // Redirect to login page
      }

      // Rethrow the error to be handled by the component's error handler
      return throwError(() => error);
    })
  );
};

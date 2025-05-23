import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Observable, throwError, of, fromEvent, timer, Subject } from 'rxjs';
import { catchError, retry, mergeMap, finalize, shareReplay } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

/**
 * JWT Interceptor that adds authorization headers and handles common auth errors
 */
export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  
  // Skip token for authentication endpoints except refresh & me
  if (req.url.includes('/auth/') && 
      !req.url.includes('/auth/me') && 
      !req.url.includes('/auth/refresh-token')) {
    return next(req);
  }
  
  // Get the token
  const token = authService.getToken();

  // Only add token if it exists
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // For certain GET requests, we can allow caching to improve performance
  if (req.method === 'GET' && !req.url.includes('/auth/')) {
    req = req.clone({
      setHeaders: {
        'Cache-Control': 'max-age=300', // Allow caching for 5 minutes
      },
    });
  }

  return next(req).pipe(
    // Retry non-mutation requests (GET) if they fail due to network issues
    retry({
      count: req.method === 'GET' ? 2 : 0, // Only retry GET requests
      delay: 1000, // Wait 1 second between retries
      resetOnSuccess: true,
    }),
    
    catchError((error: HttpErrorResponse) => {
      // Do not handle errors in development if debug mode is enabled
      if (!environment.production && environment.features.enableDebugTools) {
        return throwError(() => error);
      }
      
      // Handle based on status code
      switch (error.status) {
        case 0: // Network error
          snackBar.open('Network error. Please check your internet connection.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          break;
          
        case 401: // Unauthorized
          if (req.url.includes('/auth/refresh-token')) {
            // Token refresh failed - logout
            authService.logout(true);
          } else if (!req.url.includes('/auth/me')) {
            // Try to refresh token if it's not an auth endpoint
            return refreshTokenAndRetry(req, next, authService, router, snackBar);
          }
          break;
          
        case 403: // Forbidden
          handleForbiddenError(error, authService, router, snackBar);
          break;
          
        case 429: // Too many requests
          snackBar.open('Rate limit exceeded. Please try again later.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          break;
          
        case 500: // Server error
        case 502: // Bad gateway
        case 503: // Service unavailable
        case 504: // Gateway timeout
          snackBar.open('Server error. Please try again later.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          break;
      }

      // Rethrow the error to be handled by the component's error handler
      return throwError(() => error);
    })
  );
};

/**
 * Handle 403 Forbidden errors with detailed user feedback
 */
function handleForbiddenError(
  error: HttpErrorResponse,
  authService: AuthService,
  router: Router,
  snackBar: MatSnackBar
): void {
  const errorMessage = error.error?.message || '';
  
  if (errorMessage.toLowerCase().includes('blocked')) {
    snackBar.open('Your account has been blocked. Please contact support for assistance.', 'Close', {
      duration: 10000,
      panelClass: ['error-snackbar']
    });
    authService.logout(true);
  } else {
    snackBar.open(`Access Denied: ${errorMessage || 'You do not have permission to access this resource.'}`, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}

/**
 * Try to refresh the token and retry the original request
 * Uses a synchronized token refresh mechanism to prevent multiple refresh requests
 */
// We use a static property to track ongoing refresh operations
let refreshTokenPromise: Observable<any> | null = null;

function refreshTokenAndRetry(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  snackBar: MatSnackBar
): Observable<HttpEvent<any>> {
  // Check if token is present before trying to refresh
  if (!authService.getToken()) {
    console.warn('No token available, redirecting to login page');
    authService.logout(true);
    return throwError(() => new Error('No authentication token available'));
  }

  // If there's already a refresh in progress, use that one instead of starting another
  if (!refreshTokenPromise) {
    // Create a new refresh token promise
    refreshTokenPromise = authService.refreshToken().pipe(
      // After refresh completes (success or error), clear the promise
      finalize(() => {
        refreshTokenPromise = null;
      }),
      // Share the same refresh call with multiple requests
      shareReplay(1)
    );
  }

  // Use the existing or new refresh promise
  return refreshTokenPromise.pipe(
    mergeMap(() => {
      // Retry the original request with the new token
      const token = authService.getToken();
      
      if (!token) {
        console.error('Token refresh succeeded but no token returned');
        authService.logout(true);
        return throwError(() => new Error('Authentication failed'));
      }
      
      const updatedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next(updatedRequest);
    }),
    catchError((refreshError) => {
      // If refresh fails, log the user out only for authentication errors
      if (refreshError.status === 401 || refreshError.status === 403) {
        snackBar.open('Your session has expired. Please log in again.', 'Close', {
          duration: 5000
        });
        authService.logout(true);
      }
      return throwError(() => refreshError);
    })
  );
}

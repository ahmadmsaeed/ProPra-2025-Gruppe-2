// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { jwtInterceptor } from './jwt.interceptor';
import { environment } from '../environments/environment';

// Custom error handler for global error handling
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Log to console in all environments
    console.error('Global error occurred:', error);
    
    // In production, we could send to a monitoring service
    if (environment.production) {
      // This would be where you'd integrate error monitoring like Sentry
      // Example: Sentry.captureException(error);
    }
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Performance optimizations for Change Detection
    provideZoneChangeDetection({ 
      eventCoalescing: true,
      runCoalescing: true
    }),
    
    // Router configuration with preloading strategy
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withRouterConfig({ 
        paramsInheritanceStrategy: 'always',
        onSameUrlNavigation: 'reload',
        urlUpdateStrategy: 'eager'
      })
    ),
    
    // HTTP configuration with interceptors
    provideHttpClient(
      withInterceptors([jwtInterceptor]),
      withInterceptorsFromDi()
    ),
    
    // Animations
    provideAnimations(),
    importProvidersFrom(BrowserAnimationsModule),
    
    // Global error handler
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    
    // Material default configurations
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, 
      useValue: { appearance: 'outline' }
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { 
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      }
    }
  ]
};
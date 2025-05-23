import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from '../services/auth.service';
import { ExerciseSessionService } from '../services/exercise-session.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let exerciseSessionService: jasmine.SpyObj<ExerciseSessionService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['logout', 'isLoggedIn', 'getRole']);
    exerciseSessionService = jasmine.createSpyObj('ExerciseSessionService', ['endSession']);

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule,
        BrowserAnimationsModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ExerciseSessionService, useValue: exerciseSessionService }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore unknown elements like app-backend-status
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('logout', () => {
    it('should call authService.logout directly when no active session exists', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      component.logout();
      expect(authService.logout).toHaveBeenCalled();
      expect(exerciseSessionService.endSession).not.toHaveBeenCalled();
    });

    it('should end session and then logout when active session exists', () => {
      const sessionId = 'test-session-id';
      spyOn(localStorage, 'getItem').and.returnValue(sessionId);
      spyOn(localStorage, 'removeItem');
      exerciseSessionService.endSession.and.returnValue(of({ success: true, message: 'Session ended successfully' }));

      component.logout();

      expect(exerciseSessionService.endSession).toHaveBeenCalledWith(sessionId);
      expect(localStorage.removeItem).toHaveBeenCalledWith('sql_learning_exercise_session');
      expect(authService.logout).toHaveBeenCalled();
    });

    it('should still logout even if ending session fails', () => {
      const sessionId = 'test-session-id';
      spyOn(localStorage, 'getItem').and.returnValue(sessionId);
      exerciseSessionService.endSession.and.returnValue(of({ success: true, message: 'Session ended successfully' }));
      spyOn(console, 'error');

      component.logout();

      expect(authService.logout).toHaveBeenCalled();
    });
  });
});

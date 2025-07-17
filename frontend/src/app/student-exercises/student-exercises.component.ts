/**
 * Component for the student exercises page
 * Shows exercise cards and allows SQL query practice with feedback
 */
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Exercise } from '../models/exercise.model';
import { ExerciseService } from '../services/exercise.service';
import { SubmissionService } from '../services/submission.service';
import { SqlImportService } from '../services/sql-import.service';
import { AuthService } from '../services/auth.service';
import { Submission } from '../models/submission.model';
import { environment } from '../../environments/environment';
import { Subject, Observable, of, throwError, combineLatest, timer } from 'rxjs';
import { 
  takeUntil, catchError, finalize, tap, debounceTime, 
  distinctUntilChanged, share, switchMap, filter, timeout
} from 'rxjs/operators';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

// Local services
import { DatabaseSchemaService, DatabaseTable, TableColumn } from './database-schema.service';
import { TableDataService } from './table-data.service';
import { QueryExecutionService } from './query-execution.service';
import { StudentExerciseStateService, ComponentState } from './student-exercise-state.service';
import { ErrorHandlingService } from './error-handling.service';
import { DialogService } from '../shared/services/dialog.service';
import { DatabaseVisualizationDialogComponent } from '../dialogs/database-visualization-dialog.component';

@Component({
  selector: 'app-student-exercises',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './student-exercises.component.html',
  styleUrls: ['./student-exercises.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentExercisesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Inject DialogService
  protected dialogService = inject(DialogService);
  
  // UI state
  activeTab: 'schema' | 'data' = 'schema';
  
  // Exercises data
  exercises: Exercise[] = [];
  selectedExercise: Exercise | null = null;
  userQuery: string = '';
  lastSubmission: Submission | null = null;
  queryResults: any[] = [];
  resultColumns: string[] = [];
  hasExecutedQuery: boolean = false;
  executionTime: number = 0;
  
  // Database schema & data
  databaseTables: DatabaseTable[] = [];
  selectedTable: string | null = null;
  tableData: any[] = [];
  tableColumns: string[] = [];
  tableSeedData: string[] = [];

  constructor(
    private exerciseService: ExerciseService,
    private submissionService: SubmissionService,
    private sqlImportService: SqlImportService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private databaseSchemaService: DatabaseSchemaService,
    private tableDataService: TableDataService,
    private queryExecutionService: QueryExecutionService,
    private stateService: StudentExerciseStateService,
    private errorHandlingService: ErrorHandlingService
  ) {}

  // Expose state observables to template
  get state$() { return this.stateService.state$; }
  get exerciseState$() { return this.stateService.exerciseState$; }
  get databaseState$() { return this.stateService.databaseState$; }

  ngOnInit(): void {
    this.loadExercises();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadExercises(): void {
    this.stateService.updateState({ isLoading: true, hasError: false, errorMessage: null });
    
    this.exerciseService.getExercises()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.stateService.updateState({ isLoading: false });
        })
      )
      .subscribe({
        next: (exercises) => {
          this.exercises = exercises;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading exercises');
        }
      });
  }

  refreshExercises(): void {
    this.exerciseService.refreshExercises()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exercises) => {
          this.exercises = exercises;
          this.stateService.resetExerciseState();
          this.selectedExercise = null;
          this.queryResults = [];
          this.resultColumns = [];
          this.hasExecutedQuery = false;
          this.showMessage('Übungen erfolgreich aktualisiert', 'success-snackbar');
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, 'Error refreshing exercises');
        }
      });
  }

  selectExercise(exercise: Exercise): void {
    console.log('Selected exercise:', exercise.title, 'Database ID:', exercise.databaseSchemaId);
    this.selectedExercise = exercise;
    this.userQuery = exercise.initialQuery || '';
    this.lastSubmission = null;
    this.queryResults = [];
    this.resultColumns = [];
    this.hasExecutedQuery = false;
    this.executionTime = 0;
    
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
    
    this.loadDatabaseSchema(exercise.databaseSchemaId);
    this.initializeContainerForExercise(exercise.databaseSchemaId);
    
    this.cdr.markForCheck();
  }

  /**
   * Initialize database container when a student starts an exercise
   */
  private initializeContainerForExercise(databaseId: number): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'STUDENT') {
      return;
    }

    this.stateService.updateState({ 
      isInitializingContainer: true,
      hasError: false,
      errorMessage: null 
    });

    this.sqlImportService.initializeContainer(databaseId)
      .pipe(
        takeUntil(this.destroy$),
        timeout(90000),
        finalize(() => {
          this.stateService.updateState({ isInitializingContainer: false });
        }),
        catchError((error: any) => {
          const isTimeout = error.name === 'TimeoutError';
          const errorMessage = isTimeout 
            ? 'Container initialization timed out, will retry on first query'
            : 'Container initialization failed, will retry on first query';
            
          console.warn('Failed to pre-initialize container:', error);
          this.stateService.updateState({ 
            isInitializingContainer: false,
            hasError: true,
            errorMessage
          });
          return of({ success: false, message: errorMessage });
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response && response.success) {
            console.log('Database container initialized successfully');
            this.stateService.updateState({ isInitializingContainer: false });
          }
        }
      });
  }

  loadDatabaseSchema(databaseId: number): void {
    this.databaseSchemaService.loadDatabaseSchema(databaseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ tables, seedData }) => {
          this.databaseTables = tables;
          
          // Only auto-select first table if there are tables and no table is currently selected
          if (tables.length > 0 && !this.selectedTable) {
            this.viewTableData(tables[0].tableName);
          }
          
          // If we have multiple tables and a table is already selected, refresh its data
          if (tables.length > 0 && this.selectedTable) {
            const selectedTableExists = tables.some(t => t.tableName === this.selectedTable);
            if (selectedTableExists) {
              this.viewTableData(this.selectedTable);
            } else {
              // Selected table doesn't exist anymore, select the first one
              this.viewTableData(tables[0].tableName);
            }
          }
          
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading database schema');
        }
      });
  }



  viewTableData(tableName: string): void {
    if (!this.selectedExercise) return;
    
    this.selectedTable = tableName;
    
    this.stateService.updateState({ isLoadingTableData: true });
    
    this.tableDataService.loadTableData(this.selectedExercise.databaseSchemaId, tableName)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.stateService.updateState({ isLoadingTableData: false });
        })
      )
      .subscribe({
        next: ({ data, columns, seedData }) => {
          this.tableData = data;
          this.tableColumns = columns;
          this.tableSeedData = seedData;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading table data');
        }
      });
  }

  executeQuery(preserveSubmission: boolean = false): void {
    if (!this.selectedExercise || !this.userQuery) return;
    
    if (!preserveSubmission) {
      this.lastSubmission = null;
    }
    
    this.stateService.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    this.hasExecutedQuery = true;
    
    this.queryExecutionService.executeQuery(this.selectedExercise.databaseSchemaId, this.userQuery, false)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.stateService.updateState({ isExecuting: false });
        })
      )
      .subscribe({
        next: (result) => {
          this.queryResults = result.data;
          this.resultColumns = result.columns;
          this.executionTime = result.executionTime;
          
          if (result.data.length === 0) {
            this.showMessage("The query was executed successfully, but returned no results.", "info-snackbar");
          }
          
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.handleError(error, 'Error executing query');
        }
      });
  }

  submitSolution(): void {
    if (!this.selectedExercise || !this.userQuery) return;

    this.stateService.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    this.hasExecutedQuery = true;
    
    this.sendSubmission();
  }

  private sendSubmission(): void {
    if (!this.selectedExercise) return;
    
    this.submissionService.submitSolution(this.selectedExercise.id, this.userQuery)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.stateService.updateState({ isExecuting: false });
        }),
        catchError((error: HttpErrorResponse) => {
          // Don't use handleError here - we want to show the submission feedback
          this.stateService.updateState({ isExecuting: false });
          
          // Check if the error contains submission data (from backend)
          if (error.error && (error.error.isSubmission || error.error.query || error.error.isCorrect !== undefined)) {
            // This is actually a submission response, not an error
            this.lastSubmission = error.error;
            
            // Show appropriate message based on whether it's correct or not
            if (error.error.isCorrect) {
              this.showMessage('Glückwunsch! Deine Lösung ist korrekt.', 'success-snackbar');
            } else {
              this.showMessage('Deine Lösung ist leider nicht korrekt. Versuche es nochmal!', 'warning-snackbar');
            }
            
            // Scroll to the feedback immediately
            setTimeout(() => {
              const feedbackElement = document.querySelector('.submission-feedback');
              if (feedbackElement) {
                feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 100);
            
            this.cdr.markForCheck();
            return of(error.error); // Return the submission data as a successful response
          }
          
          this.handleError(error, 'Error submitting solution');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (submission: Submission) => {
          this.lastSubmission = submission;
          
          // Execute the query to get results for display if submission was successful
          if (submission.isCorrect) {
            this.executeQuery(true);
            this.showMessage('Glückwunsch! Deine Lösung ist korrekt.', 'success-snackbar');
          } else {
            // For incorrect solutions, only execute if there's no syntax error
            // If there's LLM feedback, it likely means there was a syntax error
            if (submission.feedback) {
              // Don't execute query for syntax errors - just show the feedback
              this.showMessage('Deine Lösung ist leider nicht korrekt. Versuche es nochmal!', 'warning-snackbar');
            } else {
              // For logical errors (valid syntax but wrong logic), try to execute
              this.executeQuery(true);
              this.showMessage('Deine Lösung ist leider nicht korrekt. Versuche es nochmal!', 'warning-snackbar');
            }
          }
          
          // Scroll to the feedback
          setTimeout(() => {
            const feedbackElement = document.querySelector('.submission-feedback');
            if (feedbackElement) {
              feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 100);
          
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          // If we get here, it means it's a real error, not a submission response
          this.handleError(error, 'Error submitting solution');
        }
      });
  }

  resetDatabaseContainer(): void {
    if (!this.selectedExercise) return;

    this.stateService.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    
    // Call the backend API to reset the container
    this.http.post<any>(`${environment.apiUrl}/sql-import/reset-container`, {
      databaseId: this.selectedExercise.databaseSchemaId
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.stateService.updateState({ isExecuting: false });
      })
    ).subscribe({
      next: () => {
        this.showMessage('Datenbank wurde erfolgreich zurückgesetzt', 'success-snackbar');
        
        // Clear caches
        this.databaseSchemaService.clearCache();
        this.tableDataService.clearDatabaseCache(this.selectedExercise!.databaseSchemaId);
        
        // Clear current query results
        this.queryResults = [];
        this.resultColumns = [];
        this.hasExecutedQuery = false;
        this.lastSubmission = null;
        
        // Reset any table data that might be displayed
        if (this.selectedTable) {
          this.viewTableData(this.selectedTable);
        }
        
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error, 'Fehler beim Zurücksetzen der Datenbank');
      }
    });
  }

  private handleError(error: HttpErrorResponse, contextMessage: string): void {
    this.errorHandlingService.logError(error, contextMessage);
    
    const userFriendlyMessage = this.errorHandlingService.getUserFriendlyErrorMessage(error);
    
    this.stateService.updateState({
      hasError: true,
      errorMessage: userFriendlyMessage
    });
    
    this.showMessage(userFriendlyMessage, 'error-snackbar');
  }



  showMessage(message: string, panelClass: string = ''): void {
    let action = 'Schließen';
    
    // Set different icons or actions based on message type
    if (panelClass === 'success-snackbar') {
      action = '✓';
    } else if (panelClass === 'warning-snackbar') {
      action = '✗';
    } else if (panelClass === 'info-snackbar') {
      action = 'OK';
    }
    
    this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: panelClass ? [panelClass] : []
    });
  }



  /**
   * Check if the current user is a student
   */
  isCurrentUserStudent(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'STUDENT';
  }

  // Methods for template interactions
  
  /**
   * Go back to exercises list
   */
  backToExercises(): void {
    this.selectedExercise = null;
    this.userQuery = '';
    this.lastSubmission = null;
    this.queryResults = [];
    this.resultColumns = [];
    this.hasExecutedQuery = false;
    this.executionTime = 0;
    
    // Reset database state
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
    this.tableSeedData = [];
    
    // Reset state service
    this.stateService.resetStates();
    
    this.cdr.markForCheck();
  }

  /**
   * Open database visualization dialog
   */
  visualizeDatabase(): void {
    if (!this.selectedExercise) return;
    
    this.dialogService.openDialog(DatabaseVisualizationDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      data: {
        databaseId: this.selectedExercise.databaseSchemaId,
        databaseName: this.selectedExercise.database.name
      }
    });
  }

  /**
   * Handle query input changes
   */
  onQueryInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.userQuery = target.value;
    
    // Reset previous submission when query changes
    if (this.lastSubmission) {
      this.lastSubmission = null;
      this.cdr.markForCheck();
    }
  }
}
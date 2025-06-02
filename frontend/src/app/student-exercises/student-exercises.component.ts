/**
 * Component for the student exercises page
 * Shows exercise cards and allows SQL query practice with feedback
 */
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { Subject, Observable, of, throwError, BehaviorSubject, combineLatest, timer } from 'rxjs';
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

// Interfaces for better type safety
interface DatabaseTable {
  tableName: string;
  columns: TableColumn[];
}

interface TableColumn {
  name: string;
  type: string;
  constraints?: string;
}

// Component state interface
interface ComponentState {
  isLoading: boolean;
  isExecuting: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isLoadingTableData: boolean;
  isInitializingContainer: boolean;
}

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
  private userQuerySubject = new BehaviorSubject<string>('');
  private tableDataCache = new Map<string, any[]>();
  
  // Component state management
  private stateSubject = new BehaviorSubject<ComponentState>({
    isLoading: true,
    isExecuting: false,
    hasError: false,
    errorMessage: null,
    isLoadingTableData: false,
    isInitializingContainer: false
  });
  
  // Observable of the current state that can be used in the template
  readonly state$ = this.stateSubject.asObservable();
  
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

  // Cache for database schemas to avoid unnecessary API calls
  private schemaCache: Record<number, {schema: string, seedData?: string}> = {};

  constructor(
    private exerciseService: ExerciseService,
    private submissionService: SubmissionService,
    private sqlImportService: SqlImportService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadExercises();
    
    // Comment out the auto-execute feature for now
    /*
    // Set up debounced query execution for auto-preview
    this.userQuerySubject.pipe(
      takeUntil(this.destroy$),
      filter(() => !!this.selectedExercise), // Only when an exercise is selected
      debounceTime(environment.performance.defaultDebounceTime || 500),
      distinctUntilChanged(),
      // Don't execute empty queries or if already executing
      filter(query => !!query && !this.stateSubject.value.isExecuting)
    ).subscribe(query => {
      if (environment.features.enableDebugTools) {
        // Auto-execute query if debug tools enabled and query is valid
        this.executeQueryInternal(query, true);
      }
    });
    */
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Update component state
  private updateState(partialState: Partial<ComponentState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partialState
    });
    this.cdr.markForCheck();
  }

  loadExercises(): void {
    this.updateState({ isLoading: true, hasError: false, errorMessage: null });
    
    this.exerciseService.getExercises()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoading: false });
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
          // Clear selected exercise and reset state
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
    this.userQuerySubject.next(this.userQuery);
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
    
    // Initialize the database container for this student when they start the exercise
    this.initializeContainerForExercise(exercise.databaseSchemaId);
    
    this.cdr.markForCheck();
  }

  /**
   * Initialize database container when a student starts an exercise
   * Only initialize containers for students, not for teachers/tutors
   */
  private initializeContainerForExercise(databaseId: number): void {
    // Only initialize containers for students
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'STUDENT') {
      return; // Teachers and tutors don't need containers
    }

    // Set loading state for container initialization
    this.updateState({ 
      isInitializingContainer: true,
      hasError: false,
      errorMessage: null 
    });

    this.sqlImportService.initializeContainer(databaseId)
      .pipe(
        takeUntil(this.destroy$),
        timeout(90000), // 90 second timeout for container initialization
        finalize(() => {
          this.updateState({ isInitializingContainer: false });
        }),
        catchError((error: any) => {
          // Log the error but don't block the user - container will be created on first query if needed
          const isTimeout = error.name === 'TimeoutError';
          const errorMessage = isTimeout 
            ? 'Container initialization timed out, will retry on first query'
            : 'Container initialization failed, will retry on first query';
            
          console.warn('Failed to pre-initialize container, will create on first query:', error);
          this.updateState({ 
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
            this.updateState({ isInitializingContainer: false });
          }
        }
      });
  }

  loadDatabaseSchema(databaseId: number): void {
    // Check cache first
    if (this.schemaCache[databaseId]) {
      this.parseDatabaseSchema(this.schemaCache[databaseId].schema);
      if (this.schemaCache[databaseId].seedData) {
        this.processTableSeedData(this.schemaCache[databaseId].seedData);
      }
      return;
    }
    
    this.updateState({ isLoading: true, hasError: false });
    
    this.sqlImportService.getDatabase(databaseId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoading: false });
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading database schema');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (database) => {
          if (database && database.schema) {
            // Cache the result
            this.schemaCache[databaseId] = {
              schema: database.schema,
              seedData: database.seedData
            };
            
            this.parseDatabaseSchema(database.schema);
            
            // Process seed data if available
            if (database.seedData) {
              this.processTableSeedData(database.seedData);
            }
            
            this.cdr.markForCheck();
          }
        }
      });
  }

  parseDatabaseSchema(schema: string): void {
    const tables: DatabaseTable[] = [];
    
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
    let match;
    
    while ((match = tableRegex.exec(schema)) !== null) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      const columns = this.parseColumns(tableDefinition);
      
      tables.push({
        tableName,
        columns
      });
    }
    
    this.databaseTables = tables;
    
    if (tables.length > 0) {
      this.viewTableData(tables[0].tableName);
    }
  }

  parseColumns(tableDefinition: string): TableColumn[] {
    const columns: TableColumn[] = [];
    
    const columnLines = this.splitDefinitionLines(tableDefinition);
    
    columnLines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('PRIMARY KEY') || trimmedLine.startsWith('FOREIGN KEY')) {
        return;
      }
      
      const matches = trimmedLine.match(/^["']?(\w+)["']?\s+([A-Za-z0-9\(\)]+)(.*)$/i);
      if (matches) {
        const name = matches[1];
        const type = matches[2];
        const constraints = matches[3] ? matches[3].trim() : '';
        
        columns.push({
          name,
          type,
          constraints
        });
      }
    });
    
    return columns;
  }

  splitDefinitionLines(definition: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inParentheses = 0;
    
    for (let i = 0; i < definition.length; i++) {
      const char = definition[i];
      
      if (char === '(') {
        inParentheses++;
        currentLine += char;
      } else if (char === ')') {
        inParentheses--;
        currentLine += char;
      } else if (char === ',' && inParentheses === 0) {
        lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  viewTableData(tableName: string): void {
    if (!this.selectedExercise) return;
    
    this.selectedTable = tableName;
    
    // Check cache first
    const cacheKey = `${this.selectedExercise.databaseSchemaId}-${tableName}`;
    if (this.tableDataCache.has(cacheKey)) {
      const cachedData = this.tableDataCache.get(cacheKey);
      this.tableData = cachedData || [];
      this.tableColumns = this.tableData.length > 0 ? Object.keys(this.tableData[0]) : [];
      this.tableSeedData = this.findSeedDataForTable(tableName);
      this.cdr.markForCheck();
      return;
    }
    
    this.updateState({ isLoadingTableData: true });
    
    const query = `SELECT * FROM ${tableName}`;
    this.sqlImportService.executeQuery(this.selectedExercise.databaseSchemaId, query, true)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoadingTableData: false });
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading table data');
          return of([]);
        })
      )
      .subscribe({
        next: (result: any) => {
          if (Array.isArray(result) && result.length > 0) {
            this.tableData = result;
            this.tableColumns = Object.keys(result[0]);
            // Cache the result
            this.tableDataCache.set(cacheKey, result);
          } else {
            this.tableData = [];
            this.tableColumns = [];
          }
          
          // Find the selected table in our database tables to show its seed data
          const selectedTableData = this.databaseTables.find(t => t.tableName === tableName);
          if (selectedTableData) {
            // Find the seed data for this table
            this.tableSeedData = this.findSeedDataForTable(tableName);
          }
          
          this.cdr.markForCheck();
        }
      });
  }

  backToExercises(): void {
    this.selectedExercise = null;
    this.userQuery = '';
    this.userQuerySubject.next('');
    this.lastSubmission = null;
    this.queryResults = [];
    this.resultColumns = [];
    this.hasExecutedQuery = false;
    this.executionTime = 0;
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
    this.cdr.markForCheck();
  }
  
  onQueryInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.userQuery = target.value;
    this.userQuerySubject.next(this.userQuery);
    
    // Reset the lastSubmission when user modifies the query
    this.lastSubmission = null;
  }

  executeQuery(): void {
    if (!this.selectedExercise || !this.userQuery) return;
    
    // Reset the lastSubmission when executing a new query
    this.lastSubmission = null;
    
    this.executeQueryInternal(this.userQuery, false);
  }
  
  private executeQueryInternal(query: string, isPreview: boolean = false): void {
    if (!this.selectedExercise) return;
    
    this.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    this.hasExecutedQuery = true;
    
    const startTime = performance.now();
    
    this.sqlImportService.executeQuery(this.selectedExercise.databaseSchemaId, query, false)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isExecuting: false });
          const endTime = performance.now();
          this.executionTime = Math.round(endTime - startTime);
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Error executing query');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (result: any) => {
          if (Array.isArray(result)) {
            this.queryResults = result;
            this.resultColumns = result.length > 0 ? Object.keys(result[0]) : [];
            if (result.length === 0 && !isPreview) {
              this.showMessage("The query was executed successfully, but returned no results.", "info-snackbar");
            }
          } else {
            this.queryResults = [];
            this.resultColumns = [];
            if (!isPreview) {
              this.showMessage("The query was executed successfully with no result set returned.", "info-snackbar");
            }
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitSolution(): void {
    if (!this.selectedExercise || !this.userQuery) return;

    this.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    this.hasExecutedQuery = true;
    
    // First, try executing the query to make sure it's valid
    this.sqlImportService.executeQuery(this.selectedExercise.databaseSchemaId, this.userQuery, false)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: HttpErrorResponse) => {
          this.updateState({ isExecuting: false });
          this.handleError(error, 'Error executing query');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (result: any) => {
          if (Array.isArray(result)) {
            this.queryResults = result;
            this.resultColumns = result.length > 0 ? Object.keys(result[0]) : [];
            
            // Now send the submission
            this.sendSubmission();
          } else {
            this.queryResults = [];
            this.resultColumns = [];
            this.updateState({ isExecuting: false });
            this.showMessage("The query was executed successfully with no result set returned.", "info-snackbar");
            this.cdr.markForCheck();
          }
        }
      });
  }

  private sendSubmission(): void {
    if (!this.selectedExercise) return;
    
    this.submissionService.submitSolution(this.selectedExercise.id, this.userQuery)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isExecuting: false });
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Error submitting solution');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (submission: Submission) => {
          this.lastSubmission = submission;
          
          if (submission.isCorrect) {
            // Show success message with green color
            this.showMessage('Glückwunsch! Deine Lösung ist korrekt.', 'success-snackbar');
            
            // Optional: Add confetti or animation for correct solutions
            // document.querySelectorAll('.submission-feedback.correct').forEach(el => el.classList.add('animate-success'));
          } else {
            // Show error message with red color
            this.showMessage('Deine Lösung ist leider nicht korrekt. Versuche es nochmal!', 'warning-snackbar');
          }
          
          // Scroll to the feedback
          setTimeout(() => {
            const feedbackElement = document.querySelector('.submission-feedback');
            if (feedbackElement) {
              feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 100);
          
          this.cdr.markForCheck();
        }
      });
  }

  resetDatabaseContainer(): void {
    if (!this.selectedExercise) return;

    this.updateState({ 
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
        this.updateState({ isExecuting: false });
      })
    ).subscribe({
      next: () => {
        this.showMessage('Datenbank wurde erfolgreich zurückgesetzt', 'success-snackbar');
        
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
    console.error(contextMessage, error);
    
    let errorMessage = `${contextMessage}: `;
    if (error.status === 0) {
      errorMessage += 'Network error. Please check your internet connection.';
    } else if (error.error?.message) {
      errorMessage += error.error.message;
    } else {
      errorMessage += error.message || 'An unknown error occurred';
    }
    
    this.updateState({
      hasError: true,
      errorMessage: errorMessage
    });
    
    this.showMessage(errorMessage, 'error-snackbar');
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

  processTableSeedData(seedData: string): void {
    // Split SQL statements and filter for INSERT statements
    const statements = seedData.split(';').filter(s => s.trim().length > 0);
    
    // Mapping from table name to array of INSERT statements
    const tableSeedMap: Record<string, string[]> = {};
    
    // Process each statement
    statements.forEach(statement => {
      const trimmed = statement.trim();
      if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
        // Extract table name
        const tableNameMatch = trimmed.match(/INSERT\s+INTO\s+(?:["'])?(\w+)(?:["'])?/i);
        if (tableNameMatch && tableNameMatch[1]) {
          const tableName = tableNameMatch[1];
          
          if (!tableSeedMap[tableName]) {
            tableSeedMap[tableName] = [];
          }
          
          tableSeedMap[tableName].push(trimmed);
        }
      }
    });
    
    // Store the mapping for later use
    this.tableSeedDataMap = tableSeedMap;
    
    // If a table is already selected, update its seed data
    if (this.selectedTable) {
      this.tableSeedData = this.findSeedDataForTable(this.selectedTable);
      this.cdr.markForCheck();
    }
  }
  
  private tableSeedDataMap: Record<string, string[]> = {};
  
  private findSeedDataForTable(tableName: string): string[] {
    return this.tableSeedDataMap[tableName] || [];
  }

  /**
   * Check if the current user is a student
   */
  isCurrentUserStudent(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'STUDENT';
  }
}
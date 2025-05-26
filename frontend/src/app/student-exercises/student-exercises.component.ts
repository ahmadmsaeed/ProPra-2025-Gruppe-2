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
import { Submission } from '../models/submission.model';
import { environment } from '../../environments/environment';
import { Subject, Observable, of, throwError, BehaviorSubject, combineLatest, timer } from 'rxjs';
import { 
  takeUntil, catchError, finalize, tap, debounceTime, 
  distinctUntilChanged, share, switchMap, filter
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

import { ExerciseSessionService } from '../services/exercise-session.service';

// Interfaces for better type safety
interface Database {
  id: number;
  name: string;
  authorId?: number;
  uploadedBy?: string;  // Made optional to match service model
}

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
  isLoadingDatabases: boolean;  // Added new state for database loading
}

interface ExerciseSession {
  sessionId: string;
  message: string;
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
    isLoadingDatabases: false  // Added new state for database loading
  });
  
  // Observable of the current state that can be used in the template
  readonly state$ = this.stateSubject.asObservable();
  
  // UI state
  activeTab: 'schema' | 'data' = 'schema';
  
  // Exercises data
  private allExercises: Exercise[] = [];  // Store all exercises
  exercises: Exercise[] = [];  // Filtered exercises
  selectedExercise: Exercise | null = null;
  userQuery: string = '';
  lastSubmission: Submission | null = null;
  queryResults: any[] = [];
  resultColumns: string[] = [];
  hasExecutedQuery: boolean = false;
  executionTime: number = 0;
  
  // Database selection
  databases: Database[] = [];
  selectedDatabaseId: number | null = null;
  
  // Database schema & data
  databaseTables: DatabaseTable[] = [];
  selectedTable: string | null = null;
  tableData: any[] = [];
  tableColumns: string[] = [];
  tableSeedData: string[] = [];

  // Cache for database schemas to avoid unnecessary API calls
  private schemaCache: Record<number, {schema: string, seedData?: string}> = {};

  private currentSessionId: string | null = null;

  isInitializingContainer: boolean = false; // <--- Diese Zeile hinzufügen

  // Query result state
  queryError: string | null = null;
  queryMessage: string = '';

  constructor(
    private exerciseService: ExerciseService,
    private submissionService: SubmissionService,
    private sqlImportService: SqlImportService,
    private exerciseSessionService: ExerciseSessionService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadExercises();
    this.loadDatabases();
    
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
          this.allExercises = exercises;
          this.filterExercises();  // Apply initial filtering
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading exercises');
        }
      });
  }

  loadDatabases(): void {
    this.updateState({ isLoadingDatabases: true, hasError: false, errorMessage: null });
    
    this.sqlImportService.getDatabases()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoadingDatabases: false });
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Error loading databases');
          return of([]);
        })
      )
      .subscribe({
        next: (databases) => {
          this.databases = databases;
          this.cdr.markForCheck();
        }
      });
  }

  onDatabaseSelect(databaseId: number | null): void {
    this.selectedDatabaseId = databaseId;
    this.filterExercises();
  }

  private filterExercises(): void {
    if (this.selectedDatabaseId === null) {
      this.exercises = [...this.allExercises];
    } else {
      this.exercises = this.allExercises.filter(
        exercise => exercise.database.id === this.selectedDatabaseId
      );
    }
    this.cdr.markForCheck();
  }

  selectExercise(exercise: Exercise): void {
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
    
    // Start a new exercise session
    this.startExerciseSession(exercise.id);
    
    this.loadDatabaseSchema(exercise.databaseSchemaId);
    this.cdr.markForCheck();
  }

  private startExerciseSession(exerciseId: number): void {
    this.updateState({ isLoading: true, hasError: false, errorMessage: null });
    this.isInitializingContainer = true;

    this.exerciseSessionService.startSession(exerciseId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoading: false });
        })
      )
      .subscribe({
        next: (session: ExerciseSession) => {
          this.currentSessionId = session.sessionId;
          localStorage.setItem('sql_learning_exercise_session', session.sessionId);
          this.showMessage(session.message, 'info-snackbar');
          this.cdr.markForCheck();

          if (this.selectedExercise) {
            setTimeout(() => {
              this.loadDatabaseSchema(this.selectedExercise!.databaseSchemaId);

              setTimeout(() => {
                if (this.databaseTables.length > 0) {
                  this.viewTableData(this.databaseTables[0].tableName);
                }
                this.isInitializingContainer = false; // Initialisierung vorbei
              }, 1000);
            }, 10000);
          } else {
            this.isInitializingContainer = false;
          }
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error, 'Error starting exercise session');
          this.isInitializingContainer = false;
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
    if (!this.currentSessionId) {
      this.queryError = 'Keine Session ausgewählt.';
      return;
    }
    this.exerciseSessionService.executeQuery(this.currentSessionId, query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateState({ isLoadingTableData: false });
        }),
        catchError((error: HttpErrorResponse) => {
          // Fehler beim Initialisieren freundlich behandeln
          if (this.isInitializingContainer) {
            // Kein Fehler anzeigen, sondern Info
            this.queryError = null;
            this.showMessage('Container wird initialisiert... Bitte warten.', 'info-snackbar');
            this.tableData = [];
            this.tableColumns = [];
            this.cdr.markForCheck();
            return of([]);
          } else {
            this.handleError(error, 'Error loading table data');
            return of([]);
          }
        })
      )
      .subscribe({
        next: (result: any) => {
          if (Array.isArray(result)) {
            this.tableData = result;
            this.tableColumns = result.length > 0 ? Object.keys(result[0]) : [];
          } else {
            this.tableData = [];
            this.tableColumns = [];
          }
          this.cdr.markForCheck();
        }
      });
  }

  backToExercises(): void {
    this.currentSessionId = null;
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
    if (!this.selectedExercise || !this.userQuery || !this.currentSessionId) return;
    
    this.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    this.hasExecutedQuery = true;
    
    const startTime = performance.now();
    
    this.exerciseSessionService.executeQuery(this.currentSessionId, this.userQuery)
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
            if (result.length === 0) {
              this.showMessage("The query was executed successfully, but returned no results.", "info-snackbar");
            }
          } else {
            this.queryResults = [];
            this.resultColumns = [];
            this.showMessage("The query was executed successfully with no result set returned.", "info-snackbar");
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitSolution(): void {
    if (!this.selectedExercise || !this.userQuery || !this.currentSessionId) return;

    this.updateState({ 
      isExecuting: true, 
      hasError: false,
      errorMessage: null
    });
    this.hasExecutedQuery = true;

    // Korrekt: Query über die Session ausführen!
    this.exerciseSessionService.executeQuery(this.currentSessionId, this.userQuery)
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
            // Jetzt die Lösung einreichen
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
    
    this.submissionService.submitSolution(this.selectedExercise.id, this.userQuery, this.currentSessionId!)
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
            
            // Session beenden
            this.exerciseSessionService.endSession(this.currentSessionId!)
              .subscribe({
                next: () => {
                  this.showMessage('Deine Session wurde beendet.', 'info-snackbar');
                  this.currentSessionId = null;
                },
                error: (error: HttpErrorResponse) => {
                  this.showMessage('Fehler beim Beenden der Session: ' + error.message, 'error-snackbar');
                }
              });
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
  
  resetQuery(): void {
    if (!this.selectedExercise) return;
    this.userQuery = this.selectedExercise.initialQuery || '';
    this.userQuerySubject.next(this.userQuery);
    this.cdr.markForCheck();
  }

  onResetDatabase(): void {
    if (!this.currentSessionId) {
      this.showMessage('Keine aktive Session vorhanden', 'error-snackbar');
      return;
    }

    // Optional: Bestätigung vom User
    if (!confirm('Möchten Sie die Datenbank wirklich zurücksetzen? Alle Ihre Änderungen gehen verloren.')) {
      return;
    }

    this.exerciseSessionService.resetSession(this.currentSessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.showMessage('Datenbank wurde zurückgesetzt', 'success-snackbar');
          // Optional: Tabellen neu laden
          this.reloadTableData();
        },
        error: (error: HttpErrorResponse) => {
          this.showMessage('Fehler beim Zurücksetzen: ' + error.message, 'error-snackbar');
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

  reloadTableData(): void {
    if (!this.currentSessionId || !this.selectedTable) {
      this.queryError = 'Keine Tabelle oder Session ausgewählt.';
      return;
    }
    const query = `SELECT * FROM ${this.selectedTable}`;
    this.exerciseSessionService.executeQuery(this.currentSessionId, query)
      .subscribe({
        next: (result: any) => {
          this.tableData = Array.isArray(result) ? result : [];
          this.tableColumns = this.tableData.length > 0 ? Object.keys(this.tableData[0]) : [];
          this.queryMessage = 'Tabellendaten erfolgreich geladen.';
          this.queryError = null; // <--- Fehler zurücksetzen!
          this.cdr.detectChanges();
        },
        error: (error: Error) => {
          this.queryError = error.message;
          this.cdr.detectChanges();
        }
      });
  }
}
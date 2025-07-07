/**
 * Service for handling component state management
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ComponentState {
  isLoading: boolean;
  isExecuting: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isLoadingTableData: boolean;
  isInitializingContainer: boolean;
}

export interface ExerciseState {
  selectedExercise: any | null;
  userQuery: string;
  queryResults: any[];
  resultColumns: string[];
  hasExecutedQuery: boolean;
  executionTime: number;
  lastSubmission: any | null;
}

export interface DatabaseState {
  databaseTables: any[];
  selectedTable: string | null;
  tableData: any[];
  tableColumns: string[];
  tableSeedData: string[];
}

@Injectable({
  providedIn: 'root'
})
export class StudentExerciseStateService {
  
  // Component state management
  private stateSubject = new BehaviorSubject<ComponentState>({
    isLoading: true,
    isExecuting: false,
    hasError: false,
    errorMessage: null,
    isLoadingTableData: false,
    isInitializingContainer: false
  });
  
  // Exercise state management
  private exerciseStateSubject = new BehaviorSubject<ExerciseState>({
    selectedExercise: null,
    userQuery: '',
    queryResults: [],
    resultColumns: [],
    hasExecutedQuery: false,
    executionTime: 0,
    lastSubmission: null
  });
  
  // Database state management
  private databaseStateSubject = new BehaviorSubject<DatabaseState>({
    databaseTables: [],
    selectedTable: null,
    tableData: [],
    tableColumns: [],
    tableSeedData: []
  });
  
  // Observable streams
  readonly state$ = this.stateSubject.asObservable();
  readonly exerciseState$ = this.exerciseStateSubject.asObservable();
  readonly databaseState$ = this.databaseStateSubject.asObservable();
  
  /**
   * Update component state
   */
  updateState(partialState: Partial<ComponentState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partialState
    });
  }
  
  /**
   * Update exercise state
   */
  updateExerciseState(partialState: Partial<ExerciseState>): void {
    this.exerciseStateSubject.next({
      ...this.exerciseStateSubject.value,
      ...partialState
    });
  }
  
  /**
   * Update database state
   */
  updateDatabaseState(partialState: Partial<DatabaseState>): void {
    this.databaseStateSubject.next({
      ...this.databaseStateSubject.value,
      ...partialState
    });
  }
  
  /**
   * Get current state values
   */
  getCurrentState(): ComponentState {
    return this.stateSubject.value;
  }
  
  getCurrentExerciseState(): ExerciseState {
    return this.exerciseStateSubject.value;
  }
  
  getCurrentDatabaseState(): DatabaseState {
    return this.databaseStateSubject.value;
  }
  
  /**
   * Reset all states
   */
  resetStates(): void {
    this.updateExerciseState({
      selectedExercise: null,
      userQuery: '',
      queryResults: [],
      resultColumns: [],
      hasExecutedQuery: false,
      executionTime: 0,
      lastSubmission: null
    });
    
    this.updateDatabaseState({
      databaseTables: [],
      selectedTable: null,
      tableData: [],
      tableColumns: [],
      tableSeedData: []
    });
    
    this.updateState({
      isLoading: false,
      isExecuting: false,
      hasError: false,
      errorMessage: null,
      isLoadingTableData: false,
      isInitializingContainer: false
    });
  }
  
  /**
   * Reset exercise-specific state
   */
  resetExerciseState(): void {
    this.updateExerciseState({
      selectedExercise: null,
      userQuery: '',
      queryResults: [],
      resultColumns: [],
      hasExecutedQuery: false,
      executionTime: 0,
      lastSubmission: null
    });
  }
  
  /**
   * Reset query results only
   */
  resetQueryResults(): void {
    this.updateExerciseState({
      queryResults: [],
      resultColumns: [],
      hasExecutedQuery: false,
      executionTime: 0,
      lastSubmission: null
    });
  }

  /**
   * Reset database container state
   */
  resetContainerState(): void {
    this.updateState({
      isInitializingContainer: false,
      isExecuting: false,
      hasError: false,
      errorMessage: null
    });
  }
}

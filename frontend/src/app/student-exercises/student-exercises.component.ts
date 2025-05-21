/**
 * Component for the student exercises page
 * Shows exercise cards and allows SQL query practice with feedback
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Exercise } from '../models/exercise.model';
import { ExerciseService } from '../services/exercise.service';
import { SubmissionService } from '../services/submission.service';
import { Submission } from '../models/submission.model';
import { environment } from '../../environments/environment';

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
    MatDividerModule
  ],
  templateUrl: './student-exercises.component.html',
  styleUrls: ['./student-exercises.component.scss']
})
export class StudentExercisesComponent implements OnInit {
  activeTab: 'schema' | 'data' = 'schema';
  
  exercises: Exercise[] = [];
  selectedExercise: Exercise | null = null;
  userQuery: string = '';
  isLoading: boolean = true;
  isExecuting: boolean = false;
  lastSubmission: Submission | null = null;
  queryResults: any[] = [];
  resultColumns: string[] = [];
  
  databaseTables: any[] = [];
  selectedTable: string | null = null;
  tableData: any[] = [];
  tableColumns: string[] = [];
  isLoadingTableData: boolean = false;

  constructor(
    private exerciseService: ExerciseService,
    private submissionService: SubmissionService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadExercises();
  }

  loadExercises(): void {
    this.isLoading = true;
    this.exerciseService.getExercises().subscribe({
      next: (exercises) => {
        this.exercises = exercises;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading exercises:', error);
        this.showMessage('Fehler beim Laden der Übungen');
        this.isLoading = false;
      }
    });
  }

  selectExercise(exercise: Exercise): void {
    this.selectedExercise = exercise;
    this.userQuery = exercise.initialQuery || '';
    this.lastSubmission = null;
    this.queryResults = [];
    this.resultColumns = [];
    
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
    
    this.loadDatabaseSchema(exercise.databaseSchemaId);
  }

  loadDatabaseSchema(databaseId: number): void {
    const apiUrl = `${environment.apiUrl}/sql-import/databases/${databaseId}`;
    this.http.get<any>(apiUrl).subscribe({
      next: (database) => {
        if (database && database.schema) {
          this.parseDatabaseSchema(database.schema);
        }
      },
      error: (error) => {
        console.error('Error loading database schema:', error);
        this.showMessage('Fehler beim Laden des Datenbankschemas');
      }
    });
  }

  parseDatabaseSchema(schema: string): void {
    const tables: any[] = [];
    
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

  parseColumns(tableDefinition: string): any[] {
    const columns: any[] = [];
    
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
    this.isLoadingTableData = true;
    
    const query = `SELECT * FROM ${tableName}`;
    const apiUrl = `${environment.apiUrl}/sql-import/query`;
    
    this.http.post(apiUrl, {
      databaseId: this.selectedExercise.databaseSchemaId,
      query
    }).subscribe({
      next: (result: any) => {
        this.isLoadingTableData = false;
        
        if (Array.isArray(result) && result.length > 0) {
          this.tableData = result;
          this.tableColumns = Object.keys(result[0]);
        } else {
          this.tableData = [];
          this.tableColumns = [];
        }
      },
      error: (error) => {
        console.error('Error loading table data:', error);
        
        // Extract the error message
        let errorMessage = error.error?.message || 'Unbekannter Fehler';
        
        // Check for "relation does not exist" errors
        if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
          errorMessage = `Die Tabelle "${tableName}" existiert noch nicht. Bitte überprüfen Sie das Schema und reichen Sie eine korrekte Lösung ein.`;
        }
        
        this.showMessage(`Fehler beim Laden der Tabellendaten: ${errorMessage}`);
        this.isLoadingTableData = false;
        this.tableData = [];
        this.tableColumns = [];
      }
    });
  }

  backToExercises(): void {
    this.selectedExercise = null;
    this.userQuery = '';
    this.lastSubmission = null;
    this.queryResults = [];
    this.resultColumns = [];
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
  }

  executeQuery(): void {
    // This is now just a placeholder - the query execution is handled directly in submitSolution
    console.log('Query execution is now handled in the submitSolution method');
  }

  submitSolution(): void {
    if (!this.selectedExercise || !this.userQuery) return;

    console.log('Submitting solution for exercise:', this.selectedExercise.id);
    console.log('Query:', this.userQuery);

    this.isExecuting = true;
    
    // First, try executing the query to make sure it's valid
    const apiUrl = `${environment.apiUrl}/sql-import/query`;
    this.http.post(apiUrl, {
      databaseId: this.selectedExercise.databaseSchemaId,
      query: this.userQuery
    }).subscribe({
      next: (result: any) => {
        console.log('Query execution successful:', result);
        
        // Now submit the solution
        this.submissionService.submitSolution(this.selectedExercise!.id, this.userQuery).subscribe({
          next: (submission) => {
            console.log('Submission successful:', submission);
            this.lastSubmission = submission;
            this.isExecuting = false;
            
            // Store the query results for display
            if (Array.isArray(result) && result.length > 0) {
              this.queryResults = result;
              this.resultColumns = Object.keys(result[0]);
            } else if (Array.isArray(result) && result.length === 0) {
              this.queryResults = [];
              this.resultColumns = [];
              this.showMessage('Die Abfrage wurde erfolgreich ausgeführt, aber es wurden keine Ergebnisse zurückgegeben');
            } else {
              this.queryResults = [{ result: 'Abfrage erfolgreich ausgeführt' }];
              this.resultColumns = ['result'];
            }
          },
          error: (error: any) => {
            console.error('Error submitting solution:', error);
            this.showMessage('Fehler beim Einreichen der Lösung: ' + (error.error?.message || error.message || 'Unbekannter Fehler'));
            this.isExecuting = false;
          }
        });
      },
      error: (error: any) => {
        console.error('Error executing query:', error);
        
        // Extract the specific error message
        let errorMessage = error.error?.message || error.message || 'Unbekannter Fehler';
        
        // Check for "relation does not exist" errors
        if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
          errorMessage = `Die Tabelle existiert nicht: ${errorMessage}`;
        }
        
        // Create a fake submission object to display the error in the same UI as normal feedback
        this.lastSubmission = {
          id: 0,
          query: this.userQuery,
          isCorrect: false,
          feedback: 'SQL-Syntaxfehler: ' + errorMessage,
          studentId: 0,
          exerciseId: this.selectedExercise?.id || 0,
          createdAt: new Date()
        };
        
        // No popup for SQL errors - they will be shown in the feedback section
        this.isExecuting = false;
        
        // Clear any previous results
        this.queryResults = [];
        this.resultColumns = [];
      }
    });
  }

  showMessage(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
} 
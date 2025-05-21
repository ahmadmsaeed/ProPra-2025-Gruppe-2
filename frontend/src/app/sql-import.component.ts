import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';
import { SqlImportService } from './services/sql-import.service';
import { DatabaseDetailsDialogComponent } from './database-details-dialog.component';
import { EditDatabaseDialogComponent } from './edit-database-dialog.component';
import { ErrorDialogComponent } from './error-dialog.component';
import { SuccessDialogComponent } from './success-dialog.component';

@Component({
  selector: 'app-sql-import',
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div *ngIf="authService.isTeacher() || authService.isTutor() || authService.isStudent()">
      <h1>SQL-Datenbanken</h1>
      
      <div class="database-management">
        <!-- SQL File Upload (Teachers and Tutors only) -->
        <mat-card *ngIf="authService.isTeacher() || authService.isTutor()" class="upload-card">
          <mat-card-content>
            <h2>SQL-Datei importieren</h2>
              <div class="upload-form">
              <div class="upload-area" (click)="fileInput.click()" matTooltip="Klicke, um eine SQL-Datei auszuwählen">
                <mat-icon>cloud_upload</mat-icon>
                <p>Klicke hier, um eine SQL-Datei hochzuladen</p>
                <p class="small-text">(MySQL oder PostgreSQL)</p>
              </div>
              
              <input 
                #fileInput 
                type="file" 
                accept=".sql" 
                style="display: none;" 
                (change)="onFileSelected($event)"
              />
              
              <div *ngIf="selectedFile" class="file-info">
                <mat-form-field appearance="fill" class="database-name">
                  <mat-label>Name der Datenbank (optional)</mat-label>
                  <input matInput [(ngModel)]="databaseName" placeholder="Wird aus dem Dateinamen generiert, wenn leer">
                </mat-form-field>
                  <p>Ausgewählte Datei: {{ selectedFile.name }}</p>
                <button mat-raised-button color="primary" (click)="uploadFile()" matTooltip="Datei auf den Server hochladen">
                  <mat-icon>upload</mat-icon> Datei hochladen
                </button>
              </div>
              
              <mat-progress-bar *ngIf="uploadProgress > 0" [value]="uploadProgress"></mat-progress-bar>
            </div>
          </mat-card-content>
        </mat-card>
        
        <!-- Database List -->
        <mat-card class="database-list-card">
          <mat-card-content>
            <h2>Verfügbare Datenbanken</h2>
            
            <table mat-table [dataSource]="databases" class="mat-elevation-z2">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let db">{{ db.name }}</td>
              </ng-container>
              
              <!-- Uploaded By Column -->
              <ng-container matColumnDef="uploadedBy">
                <th mat-header-cell *matHeaderCellDef>Hochgeladen von</th>
                <td mat-cell *matCellDef="let db">{{ db.uploadedBy }}</td>
              </ng-container>
              
              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Aktionen</th>
                <td mat-cell *matCellDef="let db">
                  <button mat-icon-button color="primary" (click)="viewDatabase(db)" matTooltip="Details anzeigen">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button color="primary" (click)="editDatabase(db)" 
                          *ngIf="canEdit(db)" 
                          matTooltip="Datenbank bearbeiten">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete(db)" 
                          *ngIf="canEdit(db)" 
                          matTooltip="Datenbank löschen">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      </div>
      
      <!-- SQL Query Execution -->
      <mat-card class="query-card">
        <mat-card-content>
          <h2>SQL-Abfrage ausführen</h2>
          
          <div class="query-form">
            <mat-form-field appearance="fill" class="database-select">
              <mat-label>Datenbank auswählen</mat-label>
              <mat-select [(ngModel)]="selectedDatabaseId">
                <mat-option *ngFor="let db of databases" [value]="db.id">
                  {{ db.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field appearance="fill" class="query-input">
              <mat-label>SQL-Abfrage</mat-label>
              <textarea 
                matInput 
                [(ngModel)]="sqlQuery" 
                placeholder="SELECT * FROM users;"
                rows="5"
              ></textarea>
            </mat-form-field>
            
            <button              mat-raised-button 
              color="primary" 
              [disabled]="!selectedDatabaseId || !sqlQuery"
              (click)="executeQuery()"
              matTooltip="SQL-Abfrage ausführen"
            >
              <mat-icon>play_arrow</mat-icon> Ausführen
            </button>
          </div>
          
          <div *ngIf="queryResult?.length" class="query-result">
            <h3>Ergebnis</h3>
            
            <table mat-table [dataSource]="queryResult" class="mat-elevation-z2">
              <ng-container *ngFor="let column of resultColumns" [matColumnDef]="column">
                <th mat-header-cell *matHeaderCellDef>{{ column }}</th>
                <td mat-cell *matCellDef="let element">{{ element[column] }}</td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="resultColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: resultColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 {
      color: #3f51b5;
      margin-bottom: 20px;
    }
    
    .database-management {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .upload-card {
      flex: 1;
      max-width: 450px;
    }
    
    .database-list-card {
      flex: 2;
    }
    
    .upload-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .upload-area {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
      border: 2px dashed #3f51b5;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .upload-area:hover {
      background-color: rgba(63, 81, 181, 0.05);
    }
    
    .upload-area mat-icon {
      font-size: 36px;
      height: 36px;
      width: 36px;
      color: #3f51b5;
      margin-bottom: 10px;
    }
    
    .small-text {
      font-size: 12px;
      color: #666;
    }
    
    .file-info {
      display: flex;
      flex-direction: column;
      padding: 10px;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    
    .query-card {
      margin-top: 20px;
    }
    
    .query-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .database-select {
      width: 100%;
    }
    
    .query-input {
      width: 100%;
    }
    
    .query-result {
      margin-top: 30px;
    }
    
    table {
      width: 100%;
    }
    
    .database-name {
      width: 100%;
      margin-bottom: 10px;
    }
  `]
})
export class SqlImportComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  databases: any[] = [];
  displayedColumns: string[] = ['name', 'uploadedBy', 'actions'];
  selectedDatabaseId: number | null = null;
  sqlQuery = '';
  queryResult: any[] = [];
  resultColumns: string[] = [];  
  selectedFile: File | null = null;
  uploadProgress = 0;
  databaseName: string = '';
  
  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private sqlImportService: SqlImportService
  ) {}

  ngOnInit() {
    this.loadDatabases();
  }
  
  loadDatabases() {
    this.sqlImportService.getDatabases()
      .subscribe({
        next: (data) => {
          // Store all database data, including dates for details dialog
          this.databases = data;
        },
        error: (error) => {
          this.showMessage('Fehler beim Laden der Datenbanken: ' + (error.error?.message || 'Unbekannter Fehler'));
        }
      });
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }
  
  uploadFile() {
    if (!this.selectedFile) {
      this.showMessage('Bitte wähle zuerst eine SQL-Datei aus');
      return;
    }
    
    // Use the sqlImport service for upload
    this.sqlImportService.uploadDatabase(this.selectedFile, this.databaseName || undefined)
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            if (event.total) {
              this.uploadProgress = Math.round(100 * event.loaded / event.total);
            }
          } else if (event.type === HttpEventType.Response) {
            const response = event.body;
            
            // Check if the response includes warnings
            if (response && response.importWarnings) {
              // Show success dialog with warnings
              this.dialog.open(SuccessDialogComponent, {
                width: '600px',
                data: {
                  title: 'Import mit Warnungen',
                  message: response.importMessage || 'SQL-Datei wurde mit Warnungen importiert. Einige Daten wurden übersprungen, da sie bereits existieren.',
                  buttonText: 'Verstanden'
                }
              });
            } else {
              // Show standard success message
              this.showMessage('SQL-Datei erfolgreich hochgeladen und verarbeitet');
            }
            
            this.selectedFile = null;
            this.databaseName = '';
            this.uploadProgress = 0;
            this.loadDatabases(); // Refresh the database list
            this.fileInput.nativeElement.value = ''; // Reset file input
          }
        },
        error: (error) => {
          console.error('Raw error:', error);

          // Reset upload state
          this.uploadProgress = 0;
          this.selectedFile = null;
          this.fileInput.nativeElement.value = '';

          // Extract error message - trying different possible response structures
          let errorMessage: string;
          if (error?.error?.message) {
            // Message might be a string or an array of strings
            errorMessage = Array.isArray(error.error.message) 
              ? error.error.message.join('\n') 
              : error.error.message;
          } else if (typeof error?.error === 'string') {
            // Sometimes the error itself is a string
            errorMessage = error.error;
          } else if (error?.message) {
            // Fallback to the error's message property
            errorMessage = error.message;
          } else {
            // Default message when we can't determine the exact error
            errorMessage = 'Die SQL-Datei konnte nicht importiert werden. Möglicherweise gibt es Konflikte mit bestehenden Daten.';
          }

          this.dialog.open(ErrorDialogComponent, {
            width: '600px', // Wider dialog to accommodate longer messages
            data: {
              title: 'Import-Information',
              message: errorMessage,
              buttonText: 'Verstanden'
            }
          });
        }
      });
  }
    executeQuery() {
    if (!this.selectedDatabaseId || !this.sqlQuery) {
      this.showMessage('Bitte wähle eine Datenbank aus und gib eine SQL-Abfrage ein');
      return;
    }

    this.sqlImportService.executeQuery(this.selectedDatabaseId, this.sqlQuery).subscribe({
      next: (result) => {
        if (Array.isArray(result) && result.length > 0) {
          this.queryResult = result;
          this.resultColumns = Object.keys(result[0]);
          this.showMessage('Abfrage erfolgreich ausgeführt');
        } else if (Array.isArray(result) && result.length === 0) {
          this.queryResult = [];
          this.resultColumns = [];
          this.showMessage('Die Abfrage wurde erfolgreich ausgeführt, aber es wurden keine Ergebnisse zurückgegeben');
        } else {
          this.queryResult = [{ result: 'Abfrage erfolgreich ausgeführt' }];
          this.resultColumns = ['result'];
        }
      },
      error: (error) => {
        this.showMessage('Fehler bei der Ausführung der Abfrage: ' + (error.error?.message || 'Unbekannter Fehler'));
      }
    });
  }
  viewDatabase(db: any) {
    this.sqlImportService.getDatabase(db.id).subscribe({
      next: (database) => {
        // Create a new object with default values for missing fields
        const data = {
          ...database,
          // Make sure seedData is not undefined
          seedData: database.seedData || ''
        };
        
        const dialogRef = this.dialog.open(DatabaseDetailsDialogComponent, {
          width: '800px',
          data
        });
      },
      error: (error) => {
        this.showMessage('Fehler beim Laden der Datenbankdetails: ' + (error.error?.message || 'Unbekannter Fehler'));
      }
    });
  }
    editDatabase(db: any) {
    const dialogRef = this.dialog.open(EditDatabaseDialogComponent, {
      width: '600px',
      data: db
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDatabases();
        this.showMessage(`Datenbank "${db.name}" erfolgreich aktualisiert`);
      }
    });
  }  confirmDelete(db: any) {
    if (confirm(`Willst du die Datenbank "${db.name}" wirklich löschen?`)) {
      this.sqlImportService.deleteDatabase(db.id).subscribe({
        next: () => {
          this.showMessage(`Datenbank "${db.name}" erfolgreich gelöscht`);
          this.loadDatabases(); // Refresh the list
        },
        error: (error) => {
          console.error('Database deletion error:', error);
          
          // Always show the proper error dialog for database constraint errors
          this.dialog.open(ErrorDialogComponent, {
            width: '400px',
            data: {
              title: 'Datenbank wird verwendet',
              message: `Die Datenbank "${db.name}" kann nicht gelöscht werden, da sie von einer oder mehreren Übungen verwendet wird. Bitte entfernen Sie zuerst die zugehörigen Übungen oder ändern Sie deren Datenbank.`,
              buttonText: 'Verstanden'
            }
          });
        }
      });
    }
  }

  private showMessage(message: string) {
    this.snackBar.open(message, 'Schließen', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  canEdit(db: any): boolean {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return this.authService.isTeacher() || 
           (this.authService.isTutor() && user?.sub === db.authorId);
  }
}

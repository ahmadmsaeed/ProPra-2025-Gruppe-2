import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
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
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { SqlImportService } from '../services/sql-import.service';
import { DatabaseDetailsDialogComponent } from '../dialogs/database-details-dialog.component';
import { EditDatabaseDialogComponent } from '../dialogs/edit-database-dialog.component';
import { ErrorDialogComponent } from '../dialogs/error-dialog.component';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';

interface Database {
  id: number;
  name: string;
  schema: string;
  seedData?: string;
  authorId?: number;
  author?: {
    name: string;
  };
  createdAt?: Date;
  warnings?: string[];
}

@Component({
  selector: 'app-sql-import',
  standalone: true,
  imports: [
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
  templateUrl: './sql-import.component.html',
  styleUrls: ['./sql-import.component.scss']
})
export class SqlImportComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  databases: Database[] = [];
  displayedColumns: string[] = ['name', 'uploadedBy', 'actions'];
  selectedDatabaseId: number | null = null;
  sqlQuery = '';
  queryResult: any[] = [];
  resultColumns: string[] = [];
  selectedFile: File | null = null;
  uploadProgress = 0;
  databaseName: string = '';
  isLoading = false;
  isExecutingQuery = false;
  queryError: string | null = null;
  hasExecutedQuery = false;

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private sqlImportService: SqlImportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Force refresh databases when component initializes
    this.sqlImportService.refreshDatabases().subscribe({
      next: (databases) => {
        this.databases = databases;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: Error) => {
        this.showErrorDialog('Fehler beim Laden der Datenbanken', error.message);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    // Subscribe to upload progress updates
    this.sqlImportService.getUploadProgress().subscribe(progress => {
      this.uploadProgress = progress.progress;
      this.cdr.detectChanges();
    });

    this.hasExecutedQuery = false;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      // Reset any previous upload progress
      this.uploadProgress = 0;
      this.cdr.detectChanges();
    }
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.showErrorDialog('Fehler', 'Bitte wähle zuerst eine SQL-Datei aus');
      return;
    }

    // Set loading state to prevent multiple uploads
    this.isLoading = true;
    this.cdr.detectChanges();

    // Add timestamp to help identify this upload in logs
    const requestId = new Date().getTime();
    console.log(`[${requestId}] Starting upload of file: ${this.selectedFile.name}`);

    this.sqlImportService.uploadDatabase(this.selectedFile, this.databaseName || undefined)
      .subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.Response) {
            console.log(`[${requestId}] Upload complete, response:`, event.body);
            const response = event.body as Database;

            // Reset form
            this.selectedFile = null;
            this.databaseName = '';
            this.uploadProgress = 0;
            this.fileInput.nativeElement.value = '';

            // Force refresh of the database list
            this.isLoading = true;
            this.cdr.detectChanges();

            setTimeout(() => {
              this.sqlImportService.refreshDatabases().subscribe({
                next: (databases) => {
                  this.databases = databases;
                  this.isLoading = false;
                  this.cdr.detectChanges();

                  if (response?.warnings && response.warnings.length > 0) {
                    // Show success dialog with warnings
                    this.dialog.open(SuccessDialogComponent, {
                      width: '600px',
                      data: {
                        title: 'Import mit Warnungen',
                        message: this.formatWarningsMessage(response.warnings || []),
                        buttonText: 'Verstanden'
                      }
                    });
                  } else {
                    // Show standard success dialog
                    this.dialog.open(SuccessDialogComponent, {
                      width: '400px',
                      data: {
                        title: 'Import erfolgreich',
                        message: 'SQL-Datei erfolgreich hochgeladen und verarbeitet',
                        buttonText: 'OK'
                      }
                    });
                  }
                },
                error: (err) => {
                  console.error(`[${requestId}] Failed to refresh databases after upload:`, err);
                  this.isLoading = false;
                  this.cdr.detectChanges();

                  this.dialog.open(SuccessDialogComponent, {
                    width: '400px',
                    data: {
                      title: 'Import erfolgreich',
                      message: 'SQL-Datei erfolgreich hochgeladen, aber die Liste konnte nicht aktualisiert werden. Bitte laden Sie die Seite neu.',
                      buttonText: 'OK'
                    }
                  });
                }
              });
            }, 1000);
          }
        },
        error: (error: Error) => {
          console.error(`[${requestId}] Upload failed:`, error);

          // Reset upload state
          this.isLoading = false;
          this.uploadProgress = 0;
          this.selectedFile = null;
          this.fileInput.nativeElement.value = '';
          this.cdr.detectChanges();

          // Show error dialog with detailed message
          this.showErrorDialog('Import-Fehler', error.message);
        }
      });
  }

  executeQuery() {
    if (!this.selectedDatabaseId || !this.sqlQuery) {
      this.showMessage('Bitte wählen Sie eine Datenbank aus und geben Sie eine SQL-Abfrage ein');
      return;
    }

    this.isExecutingQuery = true;
    this.queryError = null;
    this.queryResult = [];
    this.resultColumns = [];
    this.hasExecutedQuery = true;
    this.cdr.markForCheck();

    this.sqlImportService.executeQuery(this.selectedDatabaseId, this.sqlQuery).subscribe({
      next: (result) => {
        if (result.results && Array.isArray(result.results) && result.results.length > 0) {
          this.queryResult = result.results;
          this.resultColumns = Object.keys(result.results[0] || {});
          // Show success message for SELECT queries
          if (this.sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
            this.showMessage(`Abfrage erfolgreich ausgeführt - ${result.results.length} Ergebnisse gefunden`);
          } else {
            // Show success dialog for non-SELECT queries
            this.dialog.open(SuccessDialogComponent, {
              width: '400px',
              data: {
                title: 'Abfrage erfolgreich',
                message: 'Die SQL-Anweisung wurde erfolgreich ausgeführt.',
                buttonText: 'OK'
              }
            });
          }
        } else if (result.message) {
          // Show success message for statements that don't return results
          this.dialog.open(SuccessDialogComponent, {
            width: '400px',
            data: {
              title: 'Abfrage erfolgreich',
              message: result.message,
              buttonText: 'OK'
            }
          });
        }

        this.isExecutingQuery = false;
        this.cdr.detectChanges();
      },
      error: (error: Error) => {
        this.queryError = error.message;
        
        // Check for specific error types and provide more helpful messages
        if (this.queryError && 
            this.queryError.includes('relation') && 
            this.queryError.includes('does not exist')) {
          const match = this.queryError.match(/relation "([^"]+)" does not exist/);
          if (match && match[1]) {
            this.queryError = `Die Tabelle "${match[1]}" existiert nicht. Bitte überprüfen Sie den Tabellennamen oder erstellen Sie die Tabelle zuerst.`;
          }
        }
        
        // Show error dialog
        this.dialog.open(ErrorDialogComponent, {
          width: '500px',
          data: {
            title: 'SQL-Abfrage fehlgeschlagen',
            message: this.queryError,
            buttonText: 'Verstanden'
          }
        });
        
        this.isExecutingQuery = false;
        this.cdr.detectChanges();
      }
    });
  }

  showMessage(message: string) {
    this.snackBar.open(message, 'Schließen', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  showErrorDialog(title: string, message: string) {
    this.dialog.open(ErrorDialogComponent, {
      width: '600px',
      data: {
        title: title,
        message: message,
        buttonText: 'Verstanden'
      }
    });
  }

  private formatWarningsMessage(warnings: string[]): string {
    let message = 'SQL-Datei wurde importiert, aber es gab einige Warnungen:\n\n';
    return message + warnings.map(warning => `• ${warning}`).join('\n');
  }

  viewDatabase(db: Database) {
    this.sqlImportService.getDatabase(db.id).subscribe({
      next: (database) => {
        // Create a new object with default values for missing fields
        const data = {
          ...database,
          // Make sure seedData is not undefined
          seedData: database.seedData || ''
        };
        
        this.dialog.open(DatabaseDetailsDialogComponent, {
          width: '800px',
          data
        });
      },
      error: (error: Error) => {
        this.showMessage('Fehler beim Laden der Datenbankdetails: ' + error.message);
      }
    });
  }

  editDatabase(db: Database) {
    const dialogRef = this.dialog.open(EditDatabaseDialogComponent, {
      width: '600px',
      data: db
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Force refresh of the database list
        this.sqlImportService.refreshDatabases().subscribe({
          next: (databases) => {
            this.databases = databases;
            this.cdr.detectChanges();
            
            // Show success dialog
            this.dialog.open(SuccessDialogComponent, {
              width: '400px',
              data: {
                title: 'Aktualisierung erfolgreich',
                message: `Datenbank "${String(db.name)}" wurde erfolgreich aktualisiert.`,
                buttonText: 'OK'
              }
            });
          },
          error: (err) => {
            // Even if refresh fails, show success message for the update
            this.showMessage(`Datenbank "${String(db.name)}" erfolgreich aktualisiert. Die Liste konnte jedoch nicht aktualisiert werden.`);
            this.cdr.detectChanges();
          }
        });      
      }
    });
  }

  confirmDelete(db: Database) {
    if (confirm(`Willst du die Datenbank "${String(db.name)}" wirklich löschen?`)) {
      // Set a loading state immediately to prevent multiple clicks
      this.isLoading = true;
      this.cdr.detectChanges();
      
      console.log(`Attempting to delete database ID: ${db.id}, Name: ${String(db.name)}`);
      
      this.sqlImportService.deleteDatabase(db.id).subscribe({
        next: () => {
          console.log(`Successfully deleted database ID: ${db.id}`);
          
          // Force refresh of the database list
          this.sqlImportService.refreshDatabases().subscribe({
            next: (databases) => {
              console.log(`Database list refreshed after deletion. Current count: ${databases.length}`);
              this.databases = databases;
              this.isLoading = false;
              this.cdr.detectChanges();
              
              // Show success dialog
              this.dialog.open(SuccessDialogComponent, {
                width: '400px',
                data: {
                  title: 'Löschvorgang erfolgreich',
                  message: `Datenbank "${String(db.name)}" wurde erfolgreich gelöscht.`,
                  buttonText: 'OK'
                }
              });
            },
            error: (err) => {
              console.error('Failed to refresh databases after deletion:', err);
              // Even if refresh fails, show success message for the deletion
              this.showMessage(`Datenbank "${String(db.name)}" erfolgreich gelöscht. Die Liste konnte jedoch nicht aktualisiert werden.`);
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: (error: Error) => {
          console.error('Database deletion error:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
          
          // Always show the proper error dialog for database constraint errors
          this.dialog.open(ErrorDialogComponent, {
            width: '400px',
            data: {
              title: 'Fehler beim Löschen',
              message: error.message || 
                `Die Datenbank "${String(db.name)}" konnte nicht gelöscht werden. Möglicherweise wird sie von einer Übung verwendet.`,
              buttonText: 'Verstanden'
            }
          });
        }
      });
    }
  }

  canEdit(db: Database): boolean {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return this.authService.isTeacher() || 
           (this.authService.isTutor() && user?.sub === db.authorId);
  }
}

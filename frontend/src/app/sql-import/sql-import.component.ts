import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
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
  
  databases: any[] = [];
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
      error: (error) => {
        this.showMessage('Fehler beim Laden der Datenbanken: ' + (error.error?.message || 'Unbekannter Fehler'));
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
    this.hasExecutedQuery = false; // Initialize on component load
  }
  
  loadDatabases() {
    this.isLoading = true;
    this.sqlImportService.getDatabases()
      .subscribe({
        next: (data) => {
          // Store all database data, including dates for details dialog
          this.databases = data;
          this.isLoading = false;
          this.cdr.markForCheck(); // Mark for check when data is loaded
          // Use detectChanges instead of markForCheck to force immediate update
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.showMessage('Fehler beim Laden der Datenbanken: ' + (error.error?.message || 'Unbekannter Fehler'));
          this.isLoading = false;
          this.cdr.detectChanges(); // Force UI update in case of error
        }
      });
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }  uploadFile() {
    if (!this.selectedFile) {
      this.showMessage('Bitte wähle zuerst eine SQL-Datei aus');
      return;
    }
    
    // Set loading state to prevent multiple uploads
    this.isLoading = true;
    this.cdr.detectChanges();
    
    // Add timestamp to help identify this upload in logs
    const requestId = new Date().getTime();
    console.log(`[${requestId}] Starting upload of file: ${this.selectedFile.name}, Size: ${this.selectedFile.size} bytes, Type: ${this.selectedFile.type}`);
    
    // Use the sqlImport service for upload
    this.sqlImportService.uploadDatabase(this.selectedFile, this.databaseName || undefined)
      .subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            if (event.total) {
              this.uploadProgress = Math.round(100 * event.loaded / event.total);
              console.log(`[${requestId}] Upload progress: ${this.uploadProgress}%`);
              this.cdr.detectChanges(); // Ensure UI updates during upload
            }
          } else if (event.type === HttpEventType.Response) {
            console.log(`[${requestId}] Upload successful, response:`, event.body);
            const response = event.body;
            
            // Reset upload form fields
            this.selectedFile = null;
            this.databaseName = '';
            this.uploadProgress = 0;
            this.fileInput.nativeElement.value = '';
            
            // Force a complete refresh of the database list with extra delay
            // to ensure backend processing completes
            this.isLoading = true;
            this.cdr.detectChanges();
            
            setTimeout(() => {
              console.log(`[${requestId}] Refreshing database list after upload`);
              this.sqlImportService.invalidateCache(); // Make sure cache is cleared
              this.sqlImportService.getDatabases().subscribe({
                next: (databases) => {
                  console.log(`[${requestId}] Databases refreshed after upload, count:`, databases.length);
                  this.databases = databases;
                  this.isLoading = false;
                  this.cdr.detectChanges();
                  
                  // Show success message after database list has been updated
                  if (response && response.warnings && response.warnings.length > 0) {
                    // Show success dialog with warnings
                    this.dialog.open(SuccessDialogComponent, {
                      width: '600px',
                      data: {
                        title: 'Import mit Warnungen',
                        message: response.message || 'SQL-Datei wurde mit Warnungen importiert. Einige Daten wurden übersprungen, da sie bereits existieren.',
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
                  
                  // Even if refresh fails, show success message for the upload
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
            }, 1000); // Small delay to ensure backend processing completes
          }
        },
        error: (error) => {
          console.error('Raw upload error:', error);

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
              title: 'Import-Fehler',
              message: errorMessage,
              buttonText: 'Verstanden'
            }
          });
          
          this.cdr.detectChanges(); // Force UI update after error
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
    this.cdr.markForCheck(); // Mark for check before execution starts

    this.sqlImportService.executeQuery(this.selectedDatabaseId, this.sqlQuery).subscribe({
      next: (result) => {
        if (Array.isArray(result) && result.length > 0) {
          this.queryResult = result;
          this.resultColumns = Object.keys(result[0] || {});
          // Show success message for SELECT queries
          if (this.sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
            this.showMessage(`Abfrage erfolgreich ausgeführt - ${result.length} Ergebnisse gefunden`);
          } else {
            // Show success dialog for non-SELECT queries (INSERT, UPDATE, DELETE)
            this.dialog.open(SuccessDialogComponent, {
              width: '400px',
              data: {
                title: 'Abfrage erfolgreich',
                message: 'Die SQL-Anweisung wurde erfolgreich ausgeführt.',
                buttonText: 'OK'
              }
            });
          }
        } else if (Array.isArray(result)) {
          // Empty array returned
          this.queryResult = [];
          this.resultColumns = [];
          this.showMessage('Abfrage erfolgreich ausgeführt - keine Ergebnisse gefunden');
        } else {
          // Non-array result, maybe a message
          this.queryResult = [{ message: 'Abfrage erfolgreich ausgeführt' }];
          this.resultColumns = ['message'];
          this.showMessage('Abfrage erfolgreich ausgeführt');
        }
        this.isExecutingQuery = false;
        this.cdr.detectChanges(); // Force update after result received
      },
      error: (error) => {
        this.queryError = error.error?.message || 'Unbekannter Fehler';
        
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
        this.cdr.detectChanges(); // Force update after error
      }    });
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
                message: `Datenbank "${db.name}" wurde erfolgreich aktualisiert.`,
                buttonText: 'OK'
              }
            });
          },
          error: (err) => {
            // Even if refresh fails, show success message for the update
            this.showMessage(`Datenbank "${db.name}" erfolgreich aktualisiert. Die Liste konnte jedoch nicht aktualisiert werden.`);
            this.cdr.detectChanges();
          }
        });      }
    });
  }
  
  confirmDelete(db: any) {
    if (confirm(`Willst du die Datenbank "${db.name}" wirklich löschen?`)) {
      // Set a loading state immediately to prevent multiple clicks
      this.isLoading = true;
      this.cdr.detectChanges();
      
      console.log(`Attempting to delete database ID: ${db.id}, Name: ${db.name}`);
      
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
                  message: `Datenbank "${db.name}" wurde erfolgreich gelöscht.`,
                  buttonText: 'OK'
                }
              });
            },
            error: (err) => {
              console.error('Failed to refresh databases after deletion:', err);
              // Even if refresh fails, show success message for the deletion
              this.showMessage(`Datenbank "${db.name}" erfolgreich gelöscht. Die Liste konnte jedoch nicht aktualisiert werden.`);
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: (error) => {
          console.error('Database deletion error:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
          
          // Always show the proper error dialog for database constraint errors
          this.dialog.open(ErrorDialogComponent, {
            width: '400px',
            data: {
              title: 'Fehler beim Löschen',
              message: error.error?.message || 
                `Die Datenbank "${db.name}" konnte nicht gelöscht werden. Möglicherweise wird sie von einer Übung verwendet.`,
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
    const user = this.authService.getCurrentUser();
    return this.authService.isTeacher() || 
           (this.authService.isTutor() && user?.id === db.authorId);
  }
}

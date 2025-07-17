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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { SqlImportService } from '../services/sql-import.service';
import { DatabaseDetailsDialogComponent } from '../dialogs/database-details-dialog.component';
import { EditDatabaseDialogComponent } from '../dialogs/edit-database-dialog.component';
import { ErrorDialogComponent } from '../dialogs/error-dialog.component';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { CreateDatabaseDialogComponent } from './create-database-dialog.component';
import { GenerateDatabaseDialogComponent } from './generate-database-dialog.component';
import { DatabaseVisualizationDialogComponent } from '../dialogs/database-visualization-dialog.component';
import { BaseComponent } from '../shared/components/base.component';
import { DatabaseSchemaService, DatabaseTable } from '../student-exercises/database-schema.service';
import { TableDataService } from '../student-exercises/table-data.service';
import { takeUntil } from 'rxjs/operators';

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
    MatTooltipModule,
    MatMenuModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './sql-import.component.html',
  styleUrls: ['./sql-import.component.scss']
})
export class SqlImportComponent extends BaseComponent implements OnInit {
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
  
  // Table data viewing properties
  selectedDatabaseForViewing: any = null;
  activeTabForViewing: 'schema' | 'data' = 'schema';
  databaseTables: DatabaseTable[] = [];
  selectedTable: string | null = null;
  tableData: any[] = [];
  tableColumns: string[] = [];
  tableSeedData: string[] = [];
  isLoadingSchema = false;
  isLoadingTableData = false;
  
  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private sqlImportService: SqlImportService,
    private cdr: ChangeDetectorRef,
    private databaseSchemaService: DatabaseSchemaService,
    private tableDataService: TableDataService
  ) {
    super();
  }
  ngOnInit(): void {
    // Force refresh databases when component initializes
    this.sqlImportService.refreshDatabases().subscribe({
      next: (databases) => {
        this.databases = databases;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.handleError(error, 'Fehler beim Laden der Datenbanken');
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
          this.handleError(error, 'Fehler beim Laden der Datenbanken');
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
      this.showWarning('Bitte wähle zuerst eine SQL-Datei aus');
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
                    this.dialogService.openDialog(SuccessDialogComponent, {
                      width: '600px',
                      data: {
                        title: 'Import mit Warnungen',
                        message: response.message || 'SQL-Datei wurde mit Warnungen importiert. Einige Daten wurden übersprungen, da sie bereits existieren.',
                        buttonText: 'Verstanden'
                      }
                    });
                  } else {
                    // Show standard success dialog
                    this.dialogService.openDialog(SuccessDialogComponent, {
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
                  this.dialogService.openDialog(SuccessDialogComponent, {
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

          this.dialogService.openDialog(ErrorDialogComponent, {
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
      this.showWarning('Bitte wählen Sie eine Datenbank aus und geben Sie eine SQL-Abfrage ein');
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
            this.showSuccess(`Abfrage erfolgreich ausgeführt - ${result.length} Ergebnisse gefunden`);
          } else {
            // Show success dialog for non-SELECT queries (INSERT, UPDATE, DELETE)
            this.dialogService.openDialog(SuccessDialogComponent, {
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
          this.showInfo('Abfrage erfolgreich ausgeführt - keine Ergebnisse gefunden');
        } else {
          // Non-array result, maybe a message
          this.queryResult = [{ message: 'Abfrage erfolgreich ausgeführt' }];
          this.resultColumns = ['message'];
          this.showSuccess('Abfrage erfolgreich ausgeführt');
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
        this.dialogService.openDialog(ErrorDialogComponent, {
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
        
        const dialogRef = this.dialogService.openDialog(DatabaseDetailsDialogComponent, {
          width: '800px',
          data
        });
      },
      error: (error) => {
        this.handleError(error, 'Fehler beim Laden der Datenbankdetails');
      }
    });
  }
  
  viewDatabaseWithTables(db: any) {
    this.viewDatabaseTables(db);
  }

  visualizeDatabase(db: any) {
    this.dialogService.openDialog(DatabaseVisualizationDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      data: {
        databaseId: db.id,
        databaseName: db.name
      }
    });
  }
  editDatabase(db: any) {
    const dialogRef = this.dialogService.openDialog(EditDatabaseDialogComponent, {
      width: '600px',
      data: db
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: any) => {
      if (result) {
        // Force refresh of the database list
        this.sqlImportService.refreshDatabases().subscribe({
          next: (databases) => {
            this.databases = databases;
            this.cdr.detectChanges();
            
            // Show success message like user update
            this.showSuccess('Datenbank erfolgreich aktualisiert');
          },
          error: (err) => {
            // Even if refresh fails, show success message for the update
            this.showSuccess('Datenbank erfolgreich aktualisiert');
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
              
              // Show success message like user deletion
              this.showSuccess('Datenbank erfolgreich gelöscht');
            },
            error: (err) => {
              console.error('Failed to refresh databases after deletion:', err);
              // Even if refresh fails, show success message for the deletion
              this.showSuccess('Datenbank erfolgreich gelöscht');
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: (error) => {
          console.error('Database deletion error:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
          
          // Check for specific error messages
          let errorMessage = 'Fehler beim Löschen der Datenbank';
          if (error?.error?.message) {
            const serverMessage = error.error.message;
            if (serverMessage.includes('verwendet wird') || serverMessage.includes('Aufgaben')) {
              errorMessage = 'Fehler beim Löschen der Datenbank: Datenbank wird von einer Aufgabe verwendet';
            }
          }
          
          this.showError(errorMessage);
        }
      });
    }
  }

  canEdit(db: any): boolean {
    const user = this.authService.getCurrentUser();
    return this.authService.isTeacher() || 
           (this.authService.isTutor() && user?.id === db.authorId);
  }

  openCreateDatabaseDialog(): void {
    const dialogRef = this.dialogService.openDialog(CreateDatabaseDialogComponent, {
      width: '700px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: any) => {
      if (result) {
        // Database was created successfully
        this.sqlImportService.refreshDatabases().subscribe({
          next: (databases) => {
            this.databases = databases;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Failed to refresh databases after creation:', err);
          }
        });
      }
    });
  }

  openGenerateDatabaseDialog(): void {
    const dialogRef = this.dialogService.openDialog(GenerateDatabaseDialogComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: any) => {
      if (result) {
        // Database was generated and created successfully
        this.sqlImportService.refreshDatabases().subscribe({
          next: (databases) => {
            this.databases = databases;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Failed to refresh databases after generation:', err);
          }
        });
      }
    });
  }
  
  // Table data viewing methods
  viewDatabaseTables(database: any): void {
    this.selectedDatabaseForViewing = database;
    this.activeTabForViewing = 'schema';
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
    this.tableSeedData = [];
    
    this.loadDatabaseSchema(database.id);
  }
  
  loadDatabaseSchema(databaseId: number): void {
    this.isLoadingSchema = true;
    this.databaseSchemaService.loadDatabaseSchema(databaseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ tables, seedData }) => {
          this.databaseTables = tables;
          this.isLoadingSchema = false;
          
          if (tables.length > 0) {
            this.viewTableData(tables[0].tableName);
          }
          
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.handleError(error, 'Fehler beim Laden des Datenbankschemas');
          this.isLoadingSchema = false;
        }
      });
  }
  
  viewTableData(tableName: string): void {
    if (!this.selectedDatabaseForViewing) return;
    
    this.selectedTable = tableName;
    this.isLoadingTableData = true;
    
    this.tableDataService.loadTableData(this.selectedDatabaseForViewing.id, tableName)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ data, columns, seedData }) => {
          this.tableData = data;
          this.tableColumns = columns;
          this.tableSeedData = seedData;
          this.isLoadingTableData = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.handleError(error, 'Fehler beim Laden der Tabellendaten');
          this.isLoadingTableData = false;
        }
      });
  }
  
  closeDatabaseView(): void {
    this.selectedDatabaseForViewing = null;
    this.databaseTables = [];
    this.selectedTable = null;
    this.tableData = [];
    this.tableColumns = [];
    this.tableSeedData = [];
  }
}

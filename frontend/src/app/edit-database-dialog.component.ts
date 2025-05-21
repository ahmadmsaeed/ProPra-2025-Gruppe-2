import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Database from './models/sql-import.model';
import { SqlImportService } from './services/sql-import.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-edit-database-dialog',
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>Datenbank bearbeiten</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Name der Datenbank</mat-label>
        <input matInput [(ngModel)]="database.name" required>
      </mat-form-field>      <div class="file-upload">
        <p>SQL-Datei ersetzen (optional):</p>
        <div class="upload-area" (click)="fileInput.click()" matTooltip="Klicke, um eine SQL-Datei auszuwählen">
          <mat-icon>cloud_upload</mat-icon>
          <p>{{ selectedFile ? selectedFile.name : 'Klicke hier, um eine SQL-Datei hochzuladen' }}</p>
        </div>
        <input 
          #fileInput 
          type="file" 
          accept=".sql" 
          style="display: none;" 
          (change)="onFileSelected($event)"
        />
      </div>    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()" matTooltip="Änderungen verwerfen">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!database.name" matTooltip="Änderungen speichern">Speichern</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
    
    .file-upload {
      margin-top: 20px;
    }
    
    .upload-area {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 15px;
      border: 2px dashed #3f51b5;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .upload-area:hover {
      background-color: rgba(63, 81, 181, 0.05);
    }
    
    .upload-area mat-icon {
      font-size: 24px;
      height: 24px;
      width: 24px;
      color: #3f51b5;
      margin-bottom: 10px;
    }
  `]
})
export class EditDatabaseDialogComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  database: Partial<Database>;
  selectedFile: File | null = null;
  
  constructor(
    public dialogRef: MatDialogRef<EditDatabaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Database,
    private sqlImportService: SqlImportService
  ) {
    this.database = { ...data };
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }
  
  save(): void {
    console.log('Updating database with ID:', this.data.id);
    console.log('Database data:', this.database);
    console.log('Selected file:', this.selectedFile);
    
    // Only include necessary fields to avoid sending extra data
    const databaseUpdate = {
      name: this.database.name,
      // Include any other fields you want to update
    };
    
    this.sqlImportService.updateDatabase(
      this.data.id, 
      databaseUpdate, 
      this.selectedFile || undefined
    ).subscribe({
      next: (response) => {
        console.log('Database updated successfully:', response);
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error updating database:', error);
        this.dialogRef.close(false);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Database from '../models/sql-import.model';
import { SqlImportService } from '../services/sql-import.service';
import { HttpEventType } from '@angular/common/http';

@Component({  selector: 'app-edit-database-dialog',
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
  templateUrl: './edit-database-dialog.component.html',
  styleUrls: ['./edit-database-dialog.component.scss']
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

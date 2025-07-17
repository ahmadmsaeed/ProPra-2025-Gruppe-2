import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SqlImportService } from '../services/sql-import.service';

export interface DatabaseDialogData {
  mode: 'create' | 'edit';
  database?: any;
}

@Component({
  selector: 'app-create-database-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './create-database-dialog.component.html',
  styleUrls: ['./create-database-dialog.component.scss']
})
export class CreateDatabaseDialogComponent {
  databaseForm: FormGroup;
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateDatabaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatabaseDialogData,
    private sqlImportService: SqlImportService
  ) {
    this.databaseForm = this.fb.group({
      name: [
        data?.database?.name || '', 
        [Validators.required, Validators.minLength(3)]
      ],
      schema: [
        data?.database?.schema || '', 
        [Validators.required]
      ],
      seedData: [data?.database?.seedData || '']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.databaseForm.valid) {
      this.isCreating = true;
      const formValue = this.databaseForm.value;
      
      // Create a synthetic SQL file content
      const sqlContent = [
        formValue.schema,
        formValue.seedData ? '\n' + formValue.seedData : ''
      ].filter(Boolean).join('\n');
      
      // Convert to File object
      const sqlFile = new File([sqlContent], `${formValue.name}.sql`, {
        type: 'text/plain'
      });

      // Use the existing upload functionality
      this.sqlImportService.uploadDatabase(sqlFile, formValue.name).subscribe({
        next: (event: any) => {
          if (event.type === 4) { // HttpEventType.Response
            this.isCreating = false;
            this.dialogRef.close(true);
          }
        },
        error: (error) => {
          console.error('Error creating database:', error);
          this.isCreating = false;
        }
      });
    }
  }
}
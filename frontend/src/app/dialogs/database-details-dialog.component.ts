import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import Database from '../models/sql-import.model';

@Component({  selector: 'app-database-details-dialog',
  standalone: true,  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './database-details-dialog.component.html',
  styleUrls: ['./database-details-dialog.component.scss']
})
export class DatabaseDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DatabaseDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Database
  ) {
    // Ensure dates are properly parsed
    if (data.createdAt && typeof data.createdAt === 'string') {
      data.createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt && typeof data.updatedAt === 'string') {
      data.updatedAt = new Date(data.updatedAt);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

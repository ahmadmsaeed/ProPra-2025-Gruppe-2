import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { UserRole } from './auth.service';

interface DialogData {
  title: string;
  user: {
    id?: number;
    name?: string;
    email?: string;
    role?: UserRole;
  };
  isEdit: boolean;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <div mat-dialog-content>
      <form [formGroup]="userForm">        <mat-form-field appearance="fill" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" required>
          <mat-error *ngIf="userForm.get('name')?.invalid">Name wird benötigt</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" style="width: 100%; margin-bottom: 15px;">
          <mat-label>E-Mail</mat-label>
          <input matInput formControlName="email" required type="email">
          <mat-error *ngIf="userForm.get('email')?.invalid">Gültige E-Mail wird benötigt</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" style="width: 100%; margin-bottom: 15px;">
          <mat-label>Rolle</mat-label>          <mat-select formControlName="role" required>
            <mat-option value="TEACHER">Dozent</mat-option>
            <mat-option value="TUTOR">Tutor</mat-option>
            <mat-option value="STUDENT">Student</mat-option>
          </mat-select>
          <mat-error *ngIf="userForm.get('role')?.invalid">Rolle wird benötigt</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" style="width: 100%; margin-bottom: 15px;" *ngIf="!data.isEdit">
          <mat-label>Passwort</mat-label>
          <input matInput formControlName="password" required type="password">
          <mat-error *ngIf="userForm.get('password')?.invalid">Passwort wird benötigt</mat-error>
        </mat-form-field>
      </form>
    </div>    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" [disabled]="userForm.invalid" (click)="onSubmit()">
        {{ data.isEdit ? 'Aktualisieren' : 'Erstellen' }}
      </button>
    </div>
  `,
})
export class UserDialogComponent {
  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.userForm = this.fb.group({
      name: [data.user.name || '', Validators.required],
      email: [data.user.email || '', [Validators.required, Validators.email]],
      role: [data.user.role || 'STUDENT', Validators.required],
      password: ['', data.isEdit ? [] : Validators.required]
    });

    // If editing, disable fields that shouldn't be changed
    if (data.isEdit) {
      if (data.user.role === 'TEACHER') {
        this.userForm.get('role')?.disable();
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const userData = {...this.userForm.value};
      
      // If it's an edit and the role control is disabled, use the original role
      if (this.data.isEdit && this.userForm.get('role')?.disabled) {
        userData.role = this.data.user.role;
      }
      
      // If it's an edit and password is empty, remove it from the data
      if (this.data.isEdit && !userData.password) {
        delete userData.password;
      }
      
      this.dialogRef.close(userData);
    }
  }
} 
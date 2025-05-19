import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';

export interface EditProfileData {
  name: string;
  email: string;
}

@Component({
  selector: 'app-profile-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>Profil bearbeiten</h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" required>
        </mat-form-field>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>E-Mail</mat-label>
          <input matInput formControlName="email" required type="email">
        </mat-form-field>
        <mat-divider></mat-divider>
        <h3>Passwort ändern</h3>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Aktuelles Passwort</mat-label>
          <input matInput formControlName="currentPassword" type="password">
        </mat-form-field>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Neues Passwort</mat-label>
          <input matInput formControlName="newPassword" type="password">
        </mat-form-field>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Neues Passwort bestätigen</mat-label>
          <input matInput formControlName="confirmPassword" type="password">
        </mat-form-field>
        <div *ngIf="error" class="error-message">{{error}}</div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Abbrechen</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Speichern</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 16px; }
    .error-message { color: #c62828; margin-top: 8px; }
    h3 { margin-top: 24px; margin-bottom: 8px; font-size: 1.1em; color: #3f51b5; }
  `]
})
export class ProfileEditDialogComponent {
  form: FormGroup;
  error = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProfileEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditProfileData
  ) {
    this.form = this.fb.group({
      name: [data.name, Validators.required],
      email: [data.email, [Validators.required, Validators.email]],
      currentPassword: [''],
      newPassword: [''],
      confirmPassword: ['']
    });
  }

  onSubmit() {
    if (this.form.value.newPassword && this.form.value.newPassword !== this.form.value.confirmPassword) {
      this.error = 'Die neuen Passwörter stimmen nicht überein.';
      return;
    }
    this.dialogRef.close(this.form.value);
  }

  onCancel() {
    this.dialogRef.close();
  }
} 
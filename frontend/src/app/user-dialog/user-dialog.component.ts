import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { UserRole } from '../services/auth.service';

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

@Component({  selector: 'app-user-dialog',
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
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
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
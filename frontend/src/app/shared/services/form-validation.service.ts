import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class FormValidationService {

  /**
   * Get error message for a form control
   */
  getErrorMessage(control: AbstractControl, fieldName: string = 'Feld'): string {
    if (!control || !control.errors) return '';

    const errors = control.errors;
    
    if (errors['required']) {
      return `${fieldName} ist erforderlich`;
    }
    
    if (errors['email']) {
      return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `${fieldName} muss mindestens ${requiredLength} Zeichen lang sein`;
    }
    
    if (errors['maxlength']) {
      const requiredLength = errors['maxlength'].requiredLength;
      return `${fieldName} darf maximal ${requiredLength} Zeichen lang sein`;
    }
    
    if (errors['min']) {
      const min = errors['min'].min;
      return `${fieldName} muss mindestens ${min} sein`;
    }
    
    if (errors['max']) {
      const max = errors['max'].max;
      return `${fieldName} darf maximal ${max} sein`;
    }
    
    if (errors['pattern']) {
      return `${fieldName} hat ein ungültiges Format`;
    }
    
    if (errors['passwordMismatch']) {
      return 'Die Passwörter stimmen nicht überein';
    }
    
    if (errors['sqlSyntax']) {
      return errors['sqlSyntax'].message || 'Ungültige SQL-Syntax';
    }

    // Generic error
    return `${fieldName} ist ungültig`;
  }

  /**
   * Custom validator for password confirmation
   */
  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      
      const password = control.parent.get('password');
      const confirmPassword = control.parent.get('confirmPassword');
      
      if (!password || !confirmPassword) return null;
      
      if (password.value !== confirmPassword.value) {
        return { passwordMismatch: true };
      }
      
      return null;
    };
  }

  /**
   * Custom validator for SQL syntax (basic)
   */
  sqlSyntaxValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const sql = control.value.trim().toLowerCase();
      
      // Basic SQL syntax checks
      const sqlKeywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter'];
      const hasValidKeyword = sqlKeywords.some(keyword => sql.startsWith(keyword));
      
      if (!hasValidKeyword) {
        return { 
          sqlSyntax: { 
            message: 'SQL-Query muss mit einem gültigen SQL-Befehl beginnen' 
          } 
        };
      }
      
      // Check for basic SQL injection patterns (very basic)
      const dangerousPatterns = [';--', '/*', '*/', 'xp_', 'sp_'];
      const hasDangerousPattern = dangerousPatterns.some(pattern => sql.includes(pattern));
      
      if (hasDangerousPattern) {
        return { 
          sqlSyntax: { 
            message: 'SQL-Query enthält potenziell gefährliche Zeichen' 
          } 
        };
      }
      
      return null;
    };
  }

  /**
   * Mark all fields in a form as touched to show validation errors
   */
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Check if form is valid and show errors if not
   */
  validateFormAndShowErrors(form: FormGroup): boolean {
    if (form.valid) {
      return true;
    }
    
    this.markFormGroupTouched(form);
    return false;
  }

  /**
   * Get all error messages from a form
   */
  getFormErrors(form: FormGroup): { [key: string]: string } {
    const errors: { [key: string]: string } = {};
    
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.errors && control.touched) {
        errors[key] = this.getErrorMessage(control, key);
      }
    });
    
    return errors;
  }
}

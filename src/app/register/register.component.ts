import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ✅ დამატება

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule, 
    MatButtonModule,
    TranslateModule // ✅ დამატება
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService // ✅ დამატება
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      secondName: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?\d{1,4}?\s?\d{1,4}?\s?\d{1,4}?\s?\d{1,9}$/)]],
      dateOfBirth: ['', [Validators.required]], 
      personalNumber: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    const { name, email, password, secondName, phone, dateOfBirth, personalNumber } = this.registerForm.value;
    
    this.authService.register({ 
      name, 
      email, 
      password, 
      secondName, 
      phone, 
      dateOfBirth, 
      personalNumber 
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        // ✅ განახლებული თარგმანით
        this.translate.get('REGISTER.SUCCESS_MESSAGE').subscribe(msg => {
          this.successMessage = msg;
        });
        this.registerForm.reset();
      },
      error: (error) => {
        this.isSubmitting = false;
        // ✅ განახლებული თარგმანით
        const errorMsg = error.error?.message;
        if (errorMsg) {
          this.errorMessage = errorMsg;
        } else {
          this.translate.get('REGISTER.ERROR_MESSAGE').subscribe(msg => {
            this.errorMessage = msg;
          });
        }
      }
    });
  }
  
  openGmail() {
    window.open('https://mail.google.com/', '_blank');
  }
}
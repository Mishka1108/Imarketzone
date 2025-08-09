import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

// თუ გაქვთ Auth სერვისი, შეცვალეთ იმპორტის გზა რეალური მისამართით
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,        // *ngIf, *ngFor და სხვა დირექტივებისთვის
    ReactiveFormsModule, // FormGroup, formControlName და სხვა ფორმის დირექტივებისთვის
    RouterModule         // routerLink-ისთვის
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isSubmitting: boolean = false; // შევცვალე isLoading -> isSubmitting, რადგან ტემპლეიტში ეს სახელი გამოიყენება

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // ფორმის ინიციალიზაცია
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        // წარმატებული ავტორიზაციის შემდეგ გადამისამართება
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.log('Login error:', error);
        this.errorMessage = error.error?.message || 'ავტორიზაციის დროს დაფიქსირდა შეცდომა';
      }
    });
  }
}
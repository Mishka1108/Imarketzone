import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ✅ დამატება

// თუ გაქვთ Auth სერვისი, შეცვალეთ იმპორტის გზა რეალური მისამართით
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,        // *ngIf, *ngFor და სხვა დირექტივებისთვის
    ReactiveFormsModule, // FormGroup, formControlName და სხვა ფორმის დირექტივებისთვის
    RouterModule,        // routerLink-ისთვის
    TranslateModule      // ✅ დამატება translate pipe-ისთვის
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isSubmitting: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService // ✅ დამატება
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
        // შეცდომის შეტყობინება - თარგმნილი
        const backendMessage = error.error?.message;
        
        if (backendMessage) {
          // თუ backend აბრუნებს შეტყობინებას (ქართულად/ინგლისურად)
          this.errorMessage = backendMessage;
        } else {
          // თუ არა, გამოიყენე ლოკალური თარგმანი
          this.translate.get('LOGIN.ERRORS.LOGIN_FAILED').subscribe(msg => {
            this.errorMessage = msg;
          });
        }
      }
    });
  }
}
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../environment';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('googleButton', { static: false }) googleButtonDiv!: ElementRef;

  loginForm!: FormGroup;
  isLoading = false;
  isGoogleLoading = false;
  errorMessage = '';
  hidePassword = true;
  needsVerification = false;
  userEmail = '';
  useGoogleLogin = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // ✅ Check if already logged in
    if (this.authService.isLoggedIn()) {
      console.log('ℹ️ User already logged in, redirecting to dashboard...');
      this.router.navigate(['/dashboard']);
      return;
    }

    // ✅ Initialize login form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // ✅ Clear any previous auth data on login page load
    if (isPlatformBrowser(this.platformId)) {
      this.clearPreviousSession();
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    console.log('🔍 Checking Google library...');
    console.log('Google object exists:', typeof google !== 'undefined');
    console.log('Google button div exists:', !!this.googleButtonDiv);

    // ✅ Wait for Google library to load with retry mechanism
    this.waitForGoogleLibrary();
  }

  private waitForGoogleLibrary(): void {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds (50 * 100ms)

    const checkInterval = setInterval(() => {
      attempts++;

      if (typeof google !== 'undefined' && this.googleButtonDiv?.nativeElement) {
        clearInterval(checkInterval);
        console.log('✅ Google library loaded after', attempts * 100, 'ms');
        this.initializeGoogleSignIn();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('❌ Google library failed to load after 5 seconds');
        console.error('Google exists:', typeof google !== 'undefined');
        console.error('Button div exists:', !!this.googleButtonDiv?.nativeElement);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // ✅ Cancel any active Google prompts when leaving login page
    if (isPlatformBrowser(this.platformId) && typeof google !== 'undefined') {
      try {
        google.accounts.id.cancel();
      } catch (e) {
        // Silent ignore - don't log FedCM warnings
      }
    }
  }

  // ✅ Initialize Google Sign-In without FedCM
  private initializeGoogleSignIn(): void {
    try {
      console.log('🔄 Initializing Google Sign-In...');
      console.log('Client ID:', environment.googleClientId);

      // ✅ Completely disable FedCM to avoid disconnect warnings
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: this.handleGoogleLogin.bind(this),
        auto_select: false,
        cancel_on_tap_outside: false,
        itp_support: false,
        use_fedcm_for_prompt: false,  // ✅ Disable FedCM
        ux_mode: 'popup'                // ✅ Use popup mode instead
      });

      // ✅ Render Google button
      const buttonConfig = {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: this.googleButtonDiv.nativeElement.offsetWidth || 400
      };

      console.log('🎨 Rendering Google button with config:', buttonConfig);

      google.accounts.id.renderButton(
        this.googleButtonDiv.nativeElement,
        buttonConfig
      );

      console.log('✅ Google Sign-In initialized successfully');

    } catch (error) {
      console.error('❌ Google Sign-In initialization error:', error);
      this.showSnackBar('Google Sign-In initialization failed');
    }
  }

  // ✅ Clear previous session data on login page
  private clearPreviousSession(): void {
    // Don't clear if user is already logged in
    if (this.authService.isLoggedIn()) {
      return;
    }

    // Clear any stale data
    const keysToCheck = ['currentUser', 'token', 'userId', 'username'];
    const hasStaleData = keysToCheck.some(key => localStorage.getItem(key));

    if (hasStaleData) {
      console.log('🧹 Clearing stale session data...');
      
      // Disable Google auto-select
      if (typeof google !== 'undefined') {
        try {
          google.accounts.id.disableAutoSelect();
        } catch (e) {
          // Silently ignore
        }
      }
    }
  }

  // ✅ Handle Google Sign-In callback
  handleGoogleLogin(response: any): void {
    this.ngZone.run(() => {
      console.log('📥 Google Sign-In response received');

      if (!response || !response.credential) {
        console.error('❌ No credential in Google response');
        this.showSnackBar('Google Sign-In failed - no credential received');
        return;
      }

      this.isGoogleLoading = true;
      console.log('🔄 Sending credential to backend...');

      this.authService.loginWithGoogle(response.credential).subscribe({
        next: (result) => {
          console.log('✅ Google login successful:', result);
          this.isGoogleLoading = false;

          this.showSnackBar('✅ Google Sign-In წარმატებული!');

          // ✅ თუ ახალი მომხმარებელია, გადავიდეთ პროფილის შევსებაზე
          setTimeout(() => {
            if (this.authService.isNewUser()) {
              this.router.navigate(['/complete-profile']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          }, 500);
        },
        error: (error) => {
          console.error('❌ Google login error:', error);
          this.isGoogleLoading = false;

          let errorMessage = 'Google Sign-In ვერ მოხერხდა';

          if (error.status === 401) {
            errorMessage = 'Google authentication failed';
          } else if (error.status === 400) {
            errorMessage = error.error?.message || 'Invalid Google credentials';
          } else if (error.status === 0) {
            errorMessage = 'ქსელის კავშირის პრობლემა';
          }

          this.errorMessage = errorMessage;
          this.showSnackBar('❌ ' + errorMessage);
        }
      });
    });
  }

  // ✅ Handle email/password login
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      this.showSnackBar('❌ გთხოვთ შეავსოთ ყველა ველი სწორად');
      return;
    }

    this.isLoading = true;
    this.needsVerification = false;
    this.useGoogleLogin = false;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('✅ Login successful:', response);
        this.isLoading = false;

        this.showSnackBar('✅ შესვლა წარმატებული!');

        // ✅ Navigate to dashboard
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (error) => {
        console.error('❌ Login error:', error);
        this.isLoading = false;

        if (error.status === 400) {
          const errorData = error.error;

          // ✅ Check for verification needed
          if (errorData.needsVerification) {
            this.needsVerification = true;
            this.userEmail = email;
            this.errorMessage = 'გთხოვთ დაადასტუროთ თქვენი ელ-ფოსტა';
            this.showSnackBar('❌ ' + this.errorMessage);
          }
          // ✅ Check for Google login required
          else if (errorData.useGoogleLogin) {
            this.useGoogleLogin = true;
            this.errorMessage = 'ეს ანგარიში Google-ით არის შექმნილი';
            this.showSnackBar('❌ ' + this.errorMessage);
          }
          // ✅ Invalid credentials
          else {
            this.errorMessage = errorData.message || 'არასწორი ელ-ფოსტა ან პაროლი';
            this.showSnackBar('❌ ' + this.errorMessage);
          }
        } else if (error.status === 401) {
          this.errorMessage = 'არასწორი ელ-ფოსტა ან პაროლი';
          this.showSnackBar('❌ ' + this.errorMessage);
        } else if (error.status === 0) {
          this.errorMessage = 'ქსელის კავშირის პრობლემა';
          this.showSnackBar('❌ ' + this.errorMessage);
        } else {
          this.errorMessage = 'შესვლა ვერ მოხერხდა';
          this.showSnackBar('❌ ' + this.errorMessage);
        }
      }
    });
  }

  // ✅ Resend verification email
  resendVerification(): void {
    if (!this.userEmail) {
      this.showSnackBar('❌ ელ-ფოსტა არ არის მითითებული');
      return;
    }

    this.isLoading = true;

    const resendObservable = this.authService.resendVerificationEmail(this.userEmail);
    
    resendObservable.subscribe({
      next: (response: any) => {
        console.log('✅ Verification email resent');
        this.isLoading = false;
        this.showSnackBar('✅ გააქტიურების ელფოსტა ხელახლა გაიგზავნა');
      },
      error: (error: any) => {
        console.error('❌ Resend verification error:', error);
        this.isLoading = false;
        this.errorMessage = 'ელფოსტის გაგზავნა ვერ მოხერხდა';
        this.showSnackBar('❌ ' + this.errorMessage);
      }
    });
  }

  // ✅ Helper: Mark all form fields as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // ✅ Show snackbar message
  private showSnackBar(message: string, duration: number = 5000): void {
    this.snackBar.open(message, 'დახურვა', {
      duration: duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: message.includes('❌') ? ['error-snackbar'] : 
                  message.includes('✅') ? ['success-snackbar'] : 
                  ['info-snackbar']
    });
  }

  // ✅ Toggle password visibility
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  // ✅ Get form control for template
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
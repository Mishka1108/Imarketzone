import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isSubmitting: boolean = false;
  googleLoaded: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private ngZone: NgZone
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    (window as any).handleCredentialResponse = this.handleGoogleCallback.bind(this);
  }

  ngOnInit(): void {
    this.loadGoogleScript();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (typeof google !== 'undefined') {
        this.initializeGoogleSignIn();
      }
    }, 1000);
  }

  private loadGoogleScript(): void {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      this.googleLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google script loaded');
      this.googleLoaded = true;
      this.initializeGoogleSignIn();
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google script');
      this.errorMessage = 'Google Sign-In ვერ ჩაიტვირთა';
    };
    document.head.appendChild(script);
  }

  private initializeGoogleSignIn(): void {
    if (typeof google === 'undefined') {
      console.error('Google object not found');
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: this.handleGoogleCallback.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        context: 'signin'
      });

      const buttonElement = document.getElementById('google-signin-button');
      if (buttonElement) {
        google.accounts.id.renderButton(
          buttonElement,
          {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: '100%'
          }
        );
      }

      console.log('✅ Google Sign-In initialized');
    } catch (error) {
      console.error('❌ Error initializing Google Sign-In:', error);
      this.errorMessage = 'Google Sign-In ინიციალიზაცია ვერ მოხერხდა';
    }
  }

  handleGoogleCallback(response: any): void {
    console.log('🔐 Google callback received');
    
    if (!response || !response.credential) {
      console.error('❌ No credential in response');
      this.ngZone.run(() => {
        this.errorMessage = 'Google authentication ვერ მოხერხდა';
        this.isSubmitting = false;
      });
      return;
    }

    this.ngZone.run(() => {
      this.isSubmitting = true;
      this.errorMessage = '';

      console.log('📤 Sending credential to backend...');

      this.authService.loginWithGoogle(response.credential).subscribe({
        next: (authResponse) => {
          console.log('✅ Login successful:', authResponse);
          this.isSubmitting = false;
          
          // ✅ შევამოწმოთ არის თუ არა პროფილი სრულად შევსებული
          const user = authResponse.user;
          const needsProfileCompletion = !user.phone || !user.personalNumber;

          if (needsProfileCompletion) {
            console.log('📝 User needs to complete profile');
            // გადავიდეთ პროფილის შევსების გვერდზე
            this.router.navigate(['/complete-profile']);
          } else {
            // პროფილი სრულია, გადავიდეთ dashboard-ზე
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          console.error('❌ Login error:', error);
          this.isSubmitting = false;
          this.handleError(error);
        }
      });
    });
  }

  signInWithGoogle(): void {
    if (typeof google === 'undefined') {
      this.errorMessage = 'Google Sign-In არ არის ხელმისაწვდომი';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    try {
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google prompt not displayed or skipped');
          this.isSubmitting = false;
        }
      });
    } catch (error) {
      console.error('Error showing Google prompt:', error);
      this.isSubmitting = false;
      this.errorMessage = 'Google Sign-In ვერ გაიხსნა';
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('✅ Regular login successful');
        this.isSubmitting = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('❌ Login error:', error);
        this.isSubmitting = false;
        this.handleError(error);
      }
    });
  }

  private handleError(error: any): void {
    console.error('Full error object:', error);
    
    const backendMessage = error.error?.message;
    
    if (backendMessage) {
      this.errorMessage = backendMessage;
    } else if (error.status === 401) {
      this.translate.get('LOGIN.ERRORS.INVALID_CREDENTIALS').subscribe(msg => {
        this.errorMessage = msg || 'არასწორი ელფოსტა ან პაროლი';
      });
    } else if (error.status === 404) {
      this.translate.get('LOGIN.ERRORS.USER_NOT_FOUND').subscribe(msg => {
        this.errorMessage = msg || 'მომხმარებელი ვერ მოიძებნა';
      });
    } else if (error.status === 500) {
      this.errorMessage = 'სერვერის შეცდომა. გთხოვთ სცადოთ მოგვიანებით';
    } else {
      this.translate.get('LOGIN.ERRORS.LOGIN_FAILED').subscribe(msg => {
        this.errorMessage = msg || 'შესვლა ვერ მოხერხდა';
      });
    }
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss']
})
export class CompleteProfileComponent implements OnInit {
  profileForm: FormGroup;
  errorMessage: string = '';
  isSubmitting: boolean = false;
  maxDate: string = '';
  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    // ✅ ყველა ველი სავალდებულოა
    this.profileForm = this.fb.group({
      phone: ['', [
        Validators.required, // ✅ სავალდებულო
        Validators.pattern(/^\+?[0-9]{9,15}$/)
      ]],
      personalNumber: ['', [
        Validators.required, // ✅ სავალდებულო
        Validators.pattern(/^[0-9]{11}$/),
        Validators.minLength(11),
        Validators.maxLength(11)
      ]],
      dateOfBirth: ['', [
        Validators.required // ✅ სავალდებულო
      ]]
    });
  }

  ngOnInit(): void {
    // ✅ დავამატოთ შემოწმება - თუ არ არის ახალი მომხმარებელი, გადავიყვანოთ dashboard-ზე
    if (!this.authService.isNewUser()) {
      console.log('⚠️ Not a new user, redirecting to dashboard');
      this.router.navigate(['/dashboard']);
      return;
    }

    // Set max date to 13 years ago
    const today = new Date();
    today.setFullYear(today.getFullYear() - 13);
    this.maxDate = today.toISOString().split('T')[0];

    // Get current user info
    this.currentUser = this.authService.getCurrentUser();
    console.log('Current user:', this.currentUser);

    // Pre-fill existing data if any
    if (this.currentUser) {
      if (this.currentUser.phone) {
        this.profileForm.patchValue({ phone: this.currentUser.phone });
      }
      if (this.currentUser.personalNumber) {
        this.profileForm.patchValue({ personalNumber: this.currentUser.personalNumber });
      }
      if (this.currentUser.dateOfBirth) {
        const date = new Date(this.currentUser.dateOfBirth);
        this.profileForm.patchValue({ 
          dateOfBirth: date.toISOString().split('T')[0] 
        });
      }
    }
  }

  onSubmit(): void {
    // Mark all as touched to show validation errors
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.markAsTouched();
    });

    // ✅ შემოწმება - ყველა ველი უნდა იყოს შევსებული
    if (this.profileForm.invalid) {
      this.errorMessage = 'გთხოვთ შეავსოთ ყველა ველი სწორად';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // ✅ ყველა ველი სავალდებულოა, ასე რომ არ გვჭირდება შემოწმება
    const profileData = {
      phone: this.profileForm.value.phone,
      personalNumber: this.profileForm.value.personalNumber,
      dateOfBirth: this.profileForm.value.dateOfBirth
    };

    console.log('📤 Updating profile with data:', profileData);

    this.authService.updateProfile(profileData).subscribe({
      next: (response) => {
        console.log('✅ Profile updated successfully:', response);
        this.isSubmitting = false;
        
        // ✅ Clear new user flag
        this.authService.clearNewUserFlag();
        
        // Show success message
        this.translate.get('PROFILE.UPDATE_SUCCESS').subscribe(msg => {
          console.log(msg || 'პროფილი წარმატებით განახლდა');
        });

        // Navigate to dashboard
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (error) => {
        console.error('❌ Profile update error:', error);
        this.isSubmitting = false;
        
        const backendMessage = error.error?.message;
        if (backendMessage) {
          this.errorMessage = backendMessage;
        } else if (error.status === 400) {
          this.errorMessage = 'გთხოვთ შეამოწმოთ შეყვანილი მონაცემები';
        } else if (error.status === 401) {
          this.errorMessage = 'სესია ამოიწურა. გთხოვთ თავიდან შეხვიდეთ';
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }, 2000);
        } else {
          this.errorMessage = 'პროფილის განახლება ვერ მოხერხდა';
        }
      }
    });
  }

  // ✅ წაშლილია onSkip() მეთოდი - აღარ არის გამოტოვების შესაძლებლობა

  // Helper method to check if field has error
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.hasError(errorType) && field.touched);
  }
}
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
    this.profileForm = this.fb.group({
      phone: ['', [
        Validators.pattern(/^\+?[0-9]{9,15}$/)
      ]],
      personalNumber: ['', [
        Validators.pattern(/^[0-9]{11}$/),
        Validators.minLength(11),
        Validators.maxLength(11)
      ]],
      dateOfBirth: ['']
    });
  }

  ngOnInit(): void {
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

    // Check if form has invalid fields that are not empty
    if (this.profileForm.invalid) {
      const controls = this.profileForm.controls;
      if ((controls['phone'].value && controls['phone'].invalid) ||
          (controls['personalNumber'].value && controls['personalNumber'].invalid) ||
          (controls['dateOfBirth'].value && controls['dateOfBirth'].invalid)) {
        this.errorMessage = 'გთხოვთ შეავსოთ ველები სწორად';
        return;
      }
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Get only filled values
    const profileData: any = {};
    if (this.profileForm.value.phone) {
      profileData.phone = this.profileForm.value.phone;
    }
    if (this.profileForm.value.personalNumber) {
      profileData.personalNumber = this.profileForm.value.personalNumber;
    }
    if (this.profileForm.value.dateOfBirth) {
      profileData.dateOfBirth = this.profileForm.value.dateOfBirth;
    }

    // If nothing to update, just skip
    if (Object.keys(profileData).length === 0) {
      this.onSkip();
      return;
    }

    console.log('📤 Updating profile with data:', profileData);

    this.authService.updateProfile(profileData).subscribe({
      next: (response) => {
        console.log('✅ Profile updated successfully:', response);
        this.isSubmitting = false;
        
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

  onSkip(): void {
    console.log('⏭️ Skipping profile completion');
    this.router.navigate(['/dashboard']);
  }

  // Helper method to check if field has error
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.hasError(errorType) && field.touched);
  }
}
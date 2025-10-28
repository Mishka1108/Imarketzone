// forgotpassword.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ✅ დამატება
import { environment } from '../environment';

@Component({
  selector: 'app-forgotpassword',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TranslateModule // ✅ დამატება
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotpasswordComponent {
  email: string = '';
  isLoading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private http: HttpClient,
    private router: Router,
    private translate: TranslateService // ✅ დამატება
  ) {}

  async onSubmit() {
    // ვალიდაცია - თარგმნილი შეტყობინებებით
    if (!this.email) {
      this.translate.get('FORGOT_PASSWORD.VALIDATION.EMAIL_EMPTY').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.translate.get('FORGOT_PASSWORD.VALIDATION.EMAIL_INVALID').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      const response = await this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, {
        email: this.email
      }).toPromise();

      // Backend-დან მოსული შეტყობინება (თუ არის თარგმნილი)
      this.showMessage(response.message, 'success');
      
      // 3 წამის შემდეგ გადაატანე login გვერდზე
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 3000);

    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // შეცდომის შეტყობინება - თარგმნილი
      const backendMessage = error?.error?.message;
      
      if (backendMessage) {
        // თუ backend აბრუნებს თარგმნილ შეტყობინებას
        this.showMessage(backendMessage, 'error');
      } else {
        // თუ არა, გამოიყენე ლოკალური თარგმანი
        this.translate.get('FORGOT_PASSWORD.MESSAGES.ERROR_OCCURRED').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
      }
    } finally {
      this.isLoading = false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
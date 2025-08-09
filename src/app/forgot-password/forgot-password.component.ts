// forgotpassword.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environment';

@Component({
  selector: 'app-forgotpassword',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email) {
      this.showMessage('გთხოვთ შეიყვანოთ ელ-ფოსტა', 'error');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.showMessage('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა', 'error');
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      const response = await this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, {
        email: this.email
      }).toPromise();

      this.showMessage(response.message, 'success');
      
      // 3 წამის შემდეგ გადაატანე login გვერდზე
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 3000);

    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      const errorMessage = error?.error?.message || 'შეცდომა მოხდა. თხოვნა გაიმეორეთ';
      this.showMessage(errorMessage, 'error');
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
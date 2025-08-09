import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})

export class ResetPasswordComponent implements OnInit {
  password: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' = 'success';
  token: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // URL-დან ტოკენის აღება
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.showMessage('არასწორი ბმული', 'error');
      setTimeout(() => {
        this.router.navigate(['/auth/forgot-password']);
      }, 2000);
    }
  }

  async onSubmit() {
    if (!this.password || this.password.length < 6) {
      this.showMessage('პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან', 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showMessage('პაროლები არ ემთხვევა', 'error');
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      const response = await this.http.post<any>(`${environment.apiUrl}/auth/reset-password/${this.token}`, {
        password: this.password,
        confirmPassword: this.confirmPassword
      }).toPromise();

      this.showMessage(response.message, 'success');
      
      // 2 წამის შემდეგ გადაატანე login გვერდზე
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);

    } catch (error: any) {
      console.error('Reset password error:', error);
      
      const errorMessage = error?.error?.message || 'შეცდომა მოხდა. თხოვნა გაიმეორეთ';
      this.showMessage(errorMessage, 'error');
      
      // თუ ტოკენი ვადაგასულია, გადაატანე forgot password გვერდზე
      if (error?.error?.expired) {
        setTimeout(() => {
          this.router.navigate(['/auth/forgot-password']);
        }, 3000);
      }
    } finally {
      this.isLoading = false;
    }
  }

  private showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}


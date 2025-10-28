import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ✅ დამატება

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, TranslateModule], // ✅ დამატება
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
    private route: ActivatedRoute,
    private translate: TranslateService // ✅ დამატება
  ) {}

  ngOnInit() {
    // URL-დან ტოკენის აღება
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.translate.get('RESET_PASSWORD.ERRORS.INVALID_LINK').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      setTimeout(() => {
        this.router.navigate(['/auth/forgot-password']);
      }, 2000);
    }
  }

  async onSubmit() {
    if (!this.password || this.password.length < 6) {
      this.translate.get('RESET_PASSWORD.VALIDATION.PASSWORD_MIN_LENGTH').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.translate.get('RESET_PASSWORD.VALIDATION.PASSWORD_MISMATCH').subscribe(msg => {
        this.showMessage(msg, 'error');
      });
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
      
      const errorMessage = error?.error?.message;
      if (errorMessage) {
        this.showMessage(errorMessage, 'error');
      } else {
        this.translate.get('RESET_PASSWORD.ERRORS.GENERAL_ERROR').subscribe(msg => {
          this.showMessage(msg, 'error');
        });
      }
      
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
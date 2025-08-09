// src/app/components/auth/verify-email/verify-email.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  isVerifying = true;
  isSuccess = false;
  message = 'მიმდინარეობს ელფოსტის ვერიფიკაცია...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.verifyEmail();
  }

  private verifyEmail(): void {
    const token = this.route.snapshot.paramMap.get('token');
    
    if (!token) {
      this.isVerifying = false;
      this.message = 'არასწორი ვერიფიკაციის ბმული. ვერიფიკაციის ტოკენი არ არის მითითებული.';
      return;
    }
    
    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.isVerifying = false;
        this.isSuccess = true;
        this.message = response.message || 'ელფოსტა წარმატებით გადამოწმდა!';
      },
      error: (error) => {
        this.isVerifying = false;
        this.message = error.error?.message || 'ვერიფიკაციის დროს მოხდა შეცდომა. გთხოვთ სცადოთ თავიდან ან დაუკავშირდით ადმინისტრაციას.';
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

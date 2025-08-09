// src/app/components/admin/admin-login/admin-login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss'],
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  manualToken = '';

  constructor(
    private formBuilder: FormBuilder,
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // მოკლე სინტაქსი ფორმის კონტროლებთან წვდომისთვის
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // ფორმის ვალიდაცია
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.adminAuthService.login({
      username: this.f['username'].value,
      password: this.f['password'].value
    }).subscribe({
      next: () => {
        this.router.navigate(['/admin/dashboard']);
      },
      error: err => {
        this.error = err.error?.message || 'შესვლისას მოხდა შეცდომა. გთხოვთ შეამოწმოთ მონაცემები.';
        this.loading = false;
      }
    });
  }

  // დროებითი მეთოდი ტოკენით პირდაპირ შესვლისთვის
  loginWithToken(): void {
    if (this.manualToken) {
      this.adminAuthService.setManualAdminToken(this.manualToken);
      this.router.navigate(['/admin/dashboard']);
    }
  }
}
// src/app/services/admin-auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private apiUrl = environment.apiUrl;
  private adminTokenKey = 'admin_token';
  private isAdminLoggedInSubject = new BehaviorSubject<boolean>(this.hasAdminToken());
  
  isAdminLoggedIn$ = this.isAdminLoggedInSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(adminCredentials: { username: string; password: string }): Observable<any> {
    // ეს რეალური იმპლემენტაციისთვის უნდა შეიცვალოს ბექენდის ფაქტობრივი ენდპოინტით
    return this.http.post<{ token: string }>(`${this.apiUrl}/admin/login`, adminCredentials)
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.setAdminToken(response.token);
            this.isAdminLoggedInSubject.next(true);
          }
        })
      );
  }

  // ალტერნატივა - ტოკენის პირდაპირ დაყენება (დროებითი გამოყენებისთვის)
  setManualAdminToken(token: string): void {
    this.setAdminToken(token);
    this.isAdminLoggedInSubject.next(true);
  }

  logout(): void {
    localStorage.removeItem(this.adminTokenKey);
    this.isAdminLoggedInSubject.next(false);
    this.router.navigate(['/admin/login']);
  }

  getAdminToken(): string | null {
    return localStorage.getItem(this.adminTokenKey);
  }

  private setAdminToken(token: string): void {
    localStorage.setItem(this.adminTokenKey, token);
  }

  private hasAdminToken(): boolean {
    return !!this.getAdminToken();
  }

  isAdmin(): boolean {
    return this.hasAdminToken();
  }
}
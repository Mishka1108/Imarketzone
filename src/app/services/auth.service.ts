import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadUserFromStorage();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  public isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
      // JWT token-ის payload-ის გაშლა
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // თუ exp field არსებობს, შევამოწმოთ
      if (payload.exp) {
        return payload.exp < currentTime;
      }
      
      // თუ exp field არ არსებობს, ვთვლით რომ token ძველია
      return false;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true; // თუ token-ის parsing ვერ მოხერხდა, ვთვლით ვადაგასულად
    }
  }

   public loadUserFromStorage(): void {
    if (!this.isBrowser()) return;

    const userJson = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    
    if (userJson && token) {
      // პირველ რიგში შევამოწმოთ token-ის ვალიდურობა
      if (this.isTokenExpired(token)) {
        console.log('Token expired, clearing storage');
        this.clearAuthData();
        return;
      }

      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        
        // მხოლოდ მაშინ დავირფრეშოთ, როცა token ვალიდურია
        this.refreshUserData().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser) {
              console.log('User data refreshed successfully');
            }
          },
          error: (error) => {
            console.error('Failed to refresh user data:', error);
          }
        });
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
        this.clearAuthData();
      }
    }
  }

  public clearAuthData(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
  }

  // Updated method with better error handling
  refreshUserData(): Observable<any> {
    const token = this.getToken();
    
    if (!token || this.isTokenExpired(token)) {
      console.log('No valid token available for refresh');
      this.clearAuthData();
      return of(null);
    }
    
    return this.http.get(`${this.apiUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap((user: any) => {
        if (user && this.isBrowser()) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error refreshing user data', error);
        
        // თუ 401 Unauthorized, token არასწორია ან ვადაგასულია
        if (error.status === 401) {
          console.log('Unauthorized - clearing auth data');
          this.clearAuthData();
        }
        
        return of(null);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response: any) => {
          if (response && response.token && response.user && this.isBrowser()) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/verify/${token}`);
  }

  logout(): void {
    this.clearAuthData();
    // Optional: გადამისამართება login page-ზე
    // this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return token ? !this.isTokenExpired(token) : false;
  }

  updateProfileImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profileImage', file);
  
    const token = this.getToken();
    
    if (!token || this.isTokenExpired(token)) {
      console.error('No valid token for profile image update');
      this.clearAuthData();
      return throwError(() => new Error('Authentication required'));
    }

    return this.http.put(`${this.apiUrl}/users/profile-image`, formData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).pipe(
      tap((response: any) => {
        if (response?.user && this.isBrowser()) {
          console.log('Profile image updated:', response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating profile image', error);
        
        if (error.status === 401) {
          this.clearAuthData();
        }
        
        return throwError(() => error);
      })
    );
  }

  // Additional utility method to manually validate current session
  validateSession(): Observable<boolean> {
    const token = this.getToken();
    
    if (!token || this.isTokenExpired(token)) {
      this.clearAuthData();
      return of(false);
    }

    return this.refreshUserData().pipe(
      tap(user => {
        if (!user) {
          this.clearAuthData();
        }
      }),
      catchError(() => {
        this.clearAuthData();
        return of(false);
      }),
      tap(() => of(!!this.getCurrentUser()))
    );
  }
}
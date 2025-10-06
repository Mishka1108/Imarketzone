import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../environment';
import { ProfileImageService } from './profileImage.service'; // ✅ IMPORT

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private profileImageService: ProfileImageService // ✅ INJECT
  ) {
    this.loadUserFromStorage();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  public isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp) {
        return payload.exp < currentTime;
      }
      
      return false;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  }

  public loadUserFromStorage(): void {
    if (!this.isBrowser()) return;

    const userJson = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    
    if (userJson && token) {
      if (this.isTokenExpired(token)) {
        console.log('Token expired, clearing storage');
        this.clearAuthData();
        return;
      }

      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        
        // ✅ UPDATE PROFILE IMAGE SERVICE ON LOAD
        if (user && user.profileImage) {
          console.log('Loading profile image from storage:', user.profileImage);
          this.profileImageService.updateProfileImage(user.profileImage);
        }
        
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
    
    // ✅ RESET PROFILE IMAGE TO DEFAULT
    this.profileImageService.updateProfileImage(
      'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg'
    );
  }

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
          
          // ✅ UPDATE PROFILE IMAGE SERVICE ON REFRESH
          if (user.profileImage) {
            console.log('Refreshing profile image:', user.profileImage);
            this.profileImageService.updateProfileImage(user.profileImage);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error refreshing user data', error);
        
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
            
            // ✅ UPDATE PROFILE IMAGE SERVICE ON LOGIN
            if (response.user.profileImage) {
              console.log('Login: Setting profile image:', response.user.profileImage);
              this.profileImageService.updateProfileImage(response.user.profileImage);
            }
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
          console.log('Profile image updated on server:', response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          
          // ✅ UPDATE PROFILE IMAGE SERVICE AFTER UPLOAD
          if (response.user.profileImage) {
            console.log('Upload success: Updating profile image service:', response.user.profileImage);
            this.profileImageService.updateProfileImage(response.user.profileImage);
          }
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
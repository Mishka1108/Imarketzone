import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../environment';
import { ProfileImageService } from './profileImage.service';

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
    private profileImageService: ProfileImageService
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
        this.clearAuthData();
        return;
      }

      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        
        if (user && user.profileImage) {
          this.profileImageService.updateProfileImage(user.profileImage);
        }
        
        this.refreshUserData().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser) {
              // User data refreshed successfully
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
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
    }
    this.currentUserSubject.next(null);
    
    this.profileImageService.updateProfileImage(
      'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg'
    );
  }

  refreshUserData(): Observable<any> {
    const token = this.getToken();
    
    if (!token || this.isTokenExpired(token)) {
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
          
          if (user._id || user.id) {
            localStorage.setItem('userId', user._id || user.id);
          }
          if (user.name || user.username) {
            localStorage.setItem('username', user.name || user.username);
          }
          
          if (user.profileImage) {
            this.profileImageService.updateProfileImage(user.profileImage);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error refreshing user data', error);
        
        if (error.status === 401) {
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
            this.saveAuthData(response.token, response.user);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * ✅ Google OAuth Login
   * @param credential - Google ID Token (JWT credential)
   */
  loginWithGoogle(credential: string): Observable<any> {
    console.log('📤 Sending Google credential to backend...');
    
    return this.http.post(`${this.apiUrl}/auth/google`, { 
      credential: credential // Backend expects { credential: string }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap((response: any) => {
        console.log('✅ Backend response:', response);
        
        if (response && response.token && response.user && this.isBrowser()) {
          this.saveAuthData(response.token, response.user);
          console.log('✅ Auth data saved successfully');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Google login error:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Google OAuth Registration
   * @param credential - Google ID Token
   */
  registerWithGoogle(credential: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/google/register`, { credential })
      .pipe(
        tap((response: any) => {
          if (response && response.token && response.user && this.isBrowser()) {
            this.saveAuthData(response.token, response.user);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Google registration error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * ✅ Auth Data-ს შენახვა (DRY principle)
   */
  private saveAuthData(token: string, user: any): void {
    if (!this.isBrowser()) return;

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    
    if (user._id || user.id) {
      localStorage.setItem('userId', user._id || user.id);
    }
    if (user.name || user.username) {
      localStorage.setItem('username', user.name || user.username);
    }
    
    if (user.profileImage) {
      this.profileImageService.updateProfileImage(user.profileImage);
    }
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

  getCurrentUserSimple(): { id: string; name: string; avatar?: string } | null {
    const user = this.currentUserSubject.value;
    
    if (!user) {
      if (this.isBrowser()) {
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        
        if (userId) {
          return {
            id: userId,
            name: username || 'User'
          };
        }
      }
      return null;
    }

    return {
      id: user._id || user.id || '',
      name: user.name || user.username || 'User',
      avatar: user.profileImage || undefined
    };
  }

  getUserId(): string | null {
    const user = this.currentUserSubject.value;
    
    if (user) {
      return user._id || user.id || null;
    }
    
    if (this.isBrowser()) {
      return localStorage.getItem('userId');
    }
    
    return null;
  }

  getUsername(): string | null {
    const user = this.currentUserSubject.value;
    
    if (user) {
      return user.name || user.username || null;
    }
    
    if (this.isBrowser()) {
      return localStorage.getItem('username');
    }
    
    return null;
  }

  getUserAvatar(): string | null {
    const user = this.currentUserSubject.value;
    
    if (user && user.profileImage) {
      return user.profileImage;
    }
    
    return null;
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return token ? !this.isTokenExpired(token) : false;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role || false;
  }

  isOwner(userId: string): boolean {
    const currentUserId = this.getUserId();
    return currentUserId === userId;
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
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          
          if (response.user.profileImage) {
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

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    const token = this.getToken();
    
    if (!token || this.isTokenExpired(token)) {
      this.clearAuthData();
      return throwError(() => new Error('Authentication required'));
    }

    return this.http.put(`${this.apiUrl}/users/change-password`, 
      { oldPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.clearAuthData();
        }
        return throwError(() => error);
      })
    );
  }

  updateProfile(profileData: Partial<User>): Observable<any> {
    const token = this.getToken();
    
    if (!token || this.isTokenExpired(token)) {
      this.clearAuthData();
      return throwError(() => new Error('Authentication required'));
    }

    return this.http.put(`${this.apiUrl}/users/profile`, profileData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap((response: any) => {
        if (response?.user && this.isBrowser()) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          
          if (response.user.name || response.user.username) {
            localStorage.setItem('username', response.user.name || response.user.username);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.clearAuthData();
        }
        return throwError(() => error);
      })
    );
  }
}
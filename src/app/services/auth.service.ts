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
        console.log('Token expired, clearing storage');
        this.clearAuthData();
        return;
      }

      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        
        // Update profile image service on load
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
      localStorage.removeItem('userId'); // ✅ დამატებული
      localStorage.removeItem('username'); // ✅ დამატებული
    }
    this.currentUserSubject.next(null);
    
    // Reset profile image to default
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
          
          // ✅ განახლდეს userId და username localStorage-ში
          if (user._id || user.id) {
            localStorage.setItem('userId', user._id || user.id);
          }
          if (user.name || user.username) {
            localStorage.setItem('username', user.name || user.username);
          }
          
          // Update profile image service on refresh
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
            
            // ✅ შეინახოს userId და username
            if (response.user._id || response.user.id) {
              localStorage.setItem('userId', response.user._id || response.user.id);
            }
            if (response.user.name || response.user.username) {
              localStorage.setItem('username', response.user.name || response.user.username);
            }
            
            // Update profile image service on login
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

  // ✅ განახლებული getCurrentUser მეთოდი - უფრო დეტალური
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ✅ ახალი მეთოდი - უფრო მარტივი ფორმატით message dialog-ისთვის
  getCurrentUserSimple(): { id: string; name: string; avatar?: string } | null {
    const user = this.currentUserSubject.value;
    
    if (!user) {
      // Fallback - შევამოწმოთ localStorage
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

  // ✅ ახალი - userId-ის პირდაპირი მიღება
  getUserId(): string | null {
    const user = this.currentUserSubject.value;
    
    if (user) {
      return user._id || user.id || null;
    }
    
    // Fallback - localStorage-დან
    if (this.isBrowser()) {
      return localStorage.getItem('userId');
    }
    
    return null;
  }

  // ✅ ახალი - username-ის პირდაპირი მიღება
  getUsername(): string | null {
    const user = this.currentUserSubject.value;
    
    if (user) {
      return user.name || user.username || null;
    }
    
    // Fallback - localStorage-დან
    if (this.isBrowser()) {
      return localStorage.getItem('username');
    }
    
    return null;
  }

  // ✅ ახალი - user avatar-ის მიღება
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

  // ✅ ახალი - user-ის როლის შემოწმება (თუ საჭიროა)
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role || false;
  }

  // ✅ ახალი - შეამოწმოს არის თუ არა მოცემული პროდუქტი მომხმარებლის საკუთარი
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
          console.log('Profile image updated on server:', response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          
          // Update profile image service after upload
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

  // ✅ ახალი - password-ის შეცვლა
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

  // ✅ ახალი - პროფილის განახლება
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
          
          // განახლდეს localStorage-ში username
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
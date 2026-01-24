import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map, delay } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../environment';
import { ProfileImageService } from './profileImage.service';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-verification`, 
      { email }, 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
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
    console.log('🧹 Starting comprehensive auth data cleanup...');
    
    if (this.isBrowser()) {
      // 1. Clear ALL localStorage keys
      const keysToRemove = [
        'currentUser',
        'token',
        'userId',
        'username',
        'userName',
        'userEmail',
        'googleUser',
        'g_state',
        'google_session',
        'isNewUser'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 2. Clear ALL sessionStorage
      sessionStorage.clear();
      
      // 3. Clear Google cookies (comprehensive)
      this.clearAllGoogleCookies();
      
      // 4. Revoke Google session
      this.revokeGoogleSession();
      
      // 5. Clear Google state cookie
      this.clearGoogleState();
      
      console.log('✅ All auth data cleared from storage');
    }
    
    // 6. Reset all subjects and services
    this.currentUserSubject.next(null);
    
    // 7. Reset profile image
    this.profileImageService.updateProfileImage(
      'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg'
    );
    
    console.log('✅ Auth cleanup completed');
  }

  private revokeGoogleSession(): void {
    if (!this.isBrowser() || typeof google === 'undefined') {
      console.warn('⚠️ Google API not available for session revocation');
      return;
    }

    try {
      const user = this.currentUserSubject.value;
      
      // 1. Cancel any active prompts FIRST
      try {
        google.accounts.id.cancel();
        console.log('✅ Google prompt cancelled');
      } catch (e) {
        // Silently ignore if no active prompt
      }
      
      // 2. Disable auto-select
      try {
        google.accounts.id.disableAutoSelect();
        console.log('✅ Google auto-select disabled');
      } catch (e) {
        console.warn('⚠️ Could not disable auto-select:', e);
      }
      
      // 3. Revoke token ONLY if user email exists
      if (user && user.email) {
        try {
          google.accounts.id.revoke(user.email, (done: any) => {
            if (done && done.successful) {
              console.log('✅ Google token revoked for:', user.email);
            } else if (done && done.error) {
              console.log('ℹ️ Google revoke response:', done.error);
            }
          });
        } catch (e) {
          console.log('ℹ️ Google revoke skipped:', e);
        }
      }
      
    } catch (error) {
      console.log('ℹ️ Google session cleanup completed with warnings');
    }
  }

  private clearAllGoogleCookies(): void {
    console.log('🍪 Clearing all Google cookies...');
    
    const googleCookies = [
      '__Secure-1PSID',
      '__Secure-3PSID',
      'SIDCC',
      'SSID',
      'APISID',
      'SAPISID',
      '__Secure-1PAPISID',
      '__Secure-3PAPISID',
      'HSID',
      'SID',
      'g_state',
      'google_session',
      'oauth_token',
      'CONSENT',
      'NID',
      '1P_JAR',
      'DV',
      'SEARCH_SAMESITE',
      'OTZ',
      '__Secure-ENID',
      '_ga',
      '_gid',
      '_gat'
    ];

    const domains = [
      window.location.hostname,
      `.${window.location.hostname}`,
      'localhost',
      '.localhost',
      '.google.com',
      'google.com',
      '.accounts.google.com',
      'accounts.google.com',
      '.googleapis.com',
      'googleapis.com'
    ];

    const paths = ['/', '/auth', '/login', '/auth/login', '/dashboard'];

    googleCookies.forEach(cookieName => {
      domains.forEach(domain => {
        paths.forEach(path => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; secure`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=None; Secure`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=Lax`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=Strict`;
        });
        
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}`;
      });
      
      paths.forEach(path => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
      });
      
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    });

    console.log('✅ All Google cookies cleared');
  }

  private clearGoogleState(): void {
    console.log('🔄 Clearing Google state...');
    
    const paths = ['/', '/auth', '/login', '/auth/login', '/dashboard'];
    const domains = [
      window.location.hostname,
      `.${window.location.hostname}`,
      'localhost',
      '.localhost'
    ];

    paths.forEach(path => {
      domains.forEach(domain => {
        document.cookie = `g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
        document.cookie = `g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; secure`;
        document.cookie = `g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=None; Secure`;
      });
      
      document.cookie = `g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
    });

    document.cookie = 'g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    
    console.log('✅ Google state cookie cleared');
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

  loginWithGoogle(credential: string): Observable<any> {
    console.log('📤 Sending Google credential to backend...');
    
    return this.http.post(`${this.apiUrl}/auth/google`, { 
      credential: credential
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap((response: any) => {
        console.log('✅ Backend response:', response);
        
        if (response && response.token && response.user && this.isBrowser()) {
          this.saveAuthData(response.token, response.user);
          
          // ✅ შევინახოთ isNewUser ფლაგი localStorage-ში
          if (response.isNewUser) {
            localStorage.setItem('isNewUser', 'true');
          }
          
          console.log('✅ Auth data saved successfully');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Google login error:', error);
        return throwError(() => error);
      })
    );
  }

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

  logout(): Observable<void> {
    console.log('🚪 Starting logout process...');
    
    const token = this.getToken();
    const userEmail = this.getCurrentUser()?.email;
    
    if (this.isBrowser() && typeof google !== 'undefined') {
      try {
        google.accounts.id.cancel();
        google.accounts.id.disableAutoSelect();
        console.log('✅ Google features disabled');
      } catch (e) {
        console.log('ℹ️ Google disable skipped');
      }
    }
    
    const backendLogout = token 
      ? this.http.post(`${this.apiUrl}/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).pipe(
          tap(() => console.log('✅ Backend logout successful')),
          catchError((error) => {
            console.log('ℹ️ Backend logout completed');
            return of(null);
          })
        )
      : of(null);

    return backendLogout.pipe(
      tap(() => {
        this.clearAuthData();
        console.log('✅ Local auth data cleared');
      }),
      delay(50),
      tap(() => {
        if (this.isBrowser() && typeof google !== 'undefined') {
          try {
            google.accounts.id.disableAutoSelect();
            
            if (userEmail) {
              google.accounts.id.revoke(userEmail, () => {});
            }
            
            console.log('✅ Final Google cleanup completed');
          } catch (e) {
            // Silently ignore
          }
        }
      }),
      map(() => void 0)
    );
  }

  // ✅ დამატებითი მეთოდები isNewUser-სთვის
  isNewUser(): boolean {
    if (!this.isBrowser()) return false;
    return localStorage.getItem('isNewUser') === 'true';
  }
  
  clearNewUserFlag(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('isNewUser');
    }
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
      map(() => !!this.getCurrentUser())
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
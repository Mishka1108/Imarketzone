// src/app/interceptors/admin-auth.interceptor.ts
import { Injectable } from '@angular/core';
import { 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminAuthService } from '../services/admin-auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AdminAuthInterceptor implements HttpInterceptor {
  constructor(
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // ვამოწმებთ, არის თუ არა მოთხოვნა ადმინ API-სთვის
    if (request.url.includes('/api/admin/')) {
      const adminToken = this.adminAuthService.getAdminToken();
      
      // თუ ტოკენი გვაქვს, ვამატებთ ავტორიზაციის ჰედერს
      if (adminToken) {
        const authReq = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${adminToken}`)
        });
        
        // დავამუშავოთ 401 (Unauthorized) შეცდომები
        return next.handle(authReq).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              // თუ ტოკენი აღარ არის ვალიდური, გამოვაცალკევოთ ადმინი და გადავამისამართოთ login გვერდზე
              this.adminAuthService.logout();
            }
            return throwError(() => error);
          })
        );
      }
    }
    
    // სხვა შემთხვევაში, მოთხოვნა გადავცეთ უცვლელად
    return next.handle(request);
  }
}
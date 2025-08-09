// src/app/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { User, UserResponse } from '../models/user.model';
import { environment } from '../environment';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService
  ) { }
  
  // HTTP ჰედერების გენერაცია ტოკენით ავტორიზაციისთვის
  private getHeaders(): HttpHeaders {
    const adminToken = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    });
  }
  
  // ყველა მომხმარებლის მიღება
  getUsers(): Observable<User[]> {
    console.log('მომხმარებლების მოთხოვნა API-დან...');
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`, {
      headers: this.getHeaders()
    }).pipe(
      tap(users => {
        console.log('მომხმარებლები წარმატებით მოთხოვნილია:', users);
      }),
      catchError(error => {
        console.error('შეცდომა მომხმარებლების მოთხოვნისას:', error);
        throw error;
      })
    );
  }
  
  // მომხმარებლის წაშლა ID-ის მიხედვით
  deleteUser(userId: string): Observable<{ message: string }> {
    console.log(`მომხმარებლის წაშლა ID-ით: ${userId}`);
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/admin/users/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('მომხმარებელი წარმატებით წაიშალა:', response);
      }),
      catchError(error => {
        console.error('შეც დომა მომხმარებლის წაშლისას:', error);
        throw error;
      })
    );
  }
  
  // მომხმარებლის დეტალების მიღება
  getUserDetails(userId: string): Observable<User> {
    console.log(`მომხმარებლის დეტალების მოთხოვნა ID-ით: ${userId}`);
    return this.http.get<User>(
      `${this.apiUrl}/admin/users/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(user => {
        console.log('მომხმარებლის დეტალები მიღებულია:', user);
      }),
      catchError(error => {
        console.error('შეცდომა მომხმარებლის დეტალების მოთხოვნისას:', error);
        throw error;
      })
    );
  }
  
  // მომხმარებლის სტატუსის ცვლილება (მაგ., ვერიფიკაცია)
  updateUserStatus(userId: string, status: { isVerified: boolean }): Observable<UserResponse> {
    console.log(`მომხმარებლის სტატუსის განახლება ID-ით: ${userId}, სტატუსი:`, status);
    return this.http.patch<UserResponse>(
      `${this.apiUrl}/admin/users/${userId}/status`,
      status,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('მომხმარებლის სტატუსი წარმატებით განახლდა:', response);
      }),
      catchError(error => {
        console.error('შეცდომა მომხმარებლის სტატუსის განახლებისას:', error);
        throw error;
      })
    );
  }
}
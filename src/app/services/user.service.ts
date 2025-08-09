// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) { }
  
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/api/users/profile`);
  }
  
  updateUserProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/api/users/profile`, userData);
  }
}
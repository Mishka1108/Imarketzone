// src/app/services/message.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { Message, Conversation, SendMessageRequest, MessageResponse } from '../models/message.model';
import { environment } from '../environment';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUnreadCount();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    });
  }

  sendMessage(data: SendMessageRequest): Observable<MessageResponse> {
    const senderId = localStorage.getItem('userId');
    
    const messageData = {
      senderId: senderId,
      receiverId: data.receiverId,
      content: data.content,
      productId: data.productId
    };


    return this.http.post<MessageResponse>(
      `${this.apiUrl}/send`,
      messageData,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        if (response.success) {
        }
      }),
      catchError(error => {
        console.error('❌ Failed to send message:', error);
        return throwError(() => error);
      })
    );
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<any>(
      `${this.apiUrl}/conversations`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      tap(conversations => {
        // ✅ დაემატა ტიპები
        const totalUnread = conversations.reduce((sum: number, conv: Conversation) => {
          return sum + (conv.unreadCount || 0);
        }, 0);
        this.unreadCountSubject.next(totalUnread);
      }),
      catchError(error => {
        console.error('❌ Failed to load conversations:', error);
        return throwError(() => error);
      })
    );
  }

  getConversationMessages(userId: string, otherId: string): Observable<Message[]> {
    
    return this.http.get<any>(
      `${this.apiUrl}/conversation/${userId}/${otherId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        return response.success ? (response.data || []) : [];
      }),
      catchError(error => {
        console.error('❌ Failed to load messages:', error);
        return throwError(() => error);
      })
    );
  }

  markAsRead(userId: string, otherId: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/mark-read/${userId}/${otherId}`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        this.loadUnreadCount();
      }),
      catchError(error => {
        console.error('❌ Failed to mark as read:', error);
        return throwError(() => error);
      })
    );
  }

  getUnreadCount(): Observable<number> {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      return new BehaviorSubject<number>(0).asObservable();
    }

    return this.http.get<any>(
      `${this.apiUrl}/unread-count/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        const count = response.unreadCount || response.count || 0;
        this.unreadCountSubject.next(count);
        return count;
      }),
      catchError(error => {
        console.error('❌ Failed to load unread count:', error);
        return new BehaviorSubject<number>(0).asObservable();
      })
    );
  }

  private loadUnreadCount(): void {
    this.getUnreadCount().subscribe({
      error: (err) => console.error('Failed to load unread count:', err)
    });
  }

  searchUsers(query: string): Observable<any[]> {
    return this.http.get<any>(
      `${this.apiUrl}/search-users?q=${query}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response.users)) {
          return response.users;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
      catchError(error => {
        console.error('❌ Failed to search users:', error);
        return throwError(() => error);
      })
    );
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/${messageId}`,
      { headers: this.getHeaders() }
    );
  }

  deleteConversation(conversationId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/conversation/${conversationId}`,
      { headers: this.getHeaders() }
    );
  }
}
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { Message, Conversation, SendMessageRequest, MessageResponse } from '../models/message.model';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object  // ✅ დამატება
  ) {
    // ✅ მხოლოდ browser-ში ვტვირთავთ
    if (isPlatformBrowser(this.platformId)) {
      this.loadUnreadCount();
    }
  }

  // ✅ localStorage მხოლოდ browser-ში
  private getHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('token') || '';
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  sendMessage(data: SendMessageRequest): Observable<MessageResponse> {
    // ✅ localStorage მხოლოდ browser-ში
    const senderId = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('userId')
      : null;

    const messageData = {
      senderId,
      receiverId: data.receiverId,
      content: data.content,
      productId: data.productId
    };

    return this.http.post<MessageResponse>(
      `${this.apiUrl}/send`,
      messageData,
      { headers: this.getHeaders() }
    ).pipe(
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
        if (response.success && Array.isArray(response.data)) return response.data;
        if (Array.isArray(response)) return response;
        return [];
      }),
      tap(conversations => {
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
      map(response => response.success ? (response.data || []) : []),
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
      tap(() => this.loadUnreadCount()),
      catchError(error => {
        console.error('❌ Failed to mark as read:', error);
        return throwError(() => error);
      })
    );
  }

  getUnreadCount(): Observable<number> {
    // ✅ localStorage მხოლოდ browser-ში
    if (!isPlatformBrowser(this.platformId)) {
      return new BehaviorSubject<number>(0).asObservable();
    }

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
      catchError(() => new BehaviorSubject<number>(0).asObservable())
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
        if (response.success && Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.users)) return response.users;
        if (Array.isArray(response)) return response;
        return [];
      }),
      catchError(error => throwError(() => error))
    );
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${messageId}`, { headers: this.getHeaders() });
  }

  deleteConversation(conversationId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/conversation/${conversationId}`, { headers: this.getHeaders() });
  }
}
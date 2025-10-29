// src/app/services/socket.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  
  // Observable streams for real-time events
  private newMessage$ = new BehaviorSubject<any>(null);
  private messageSent$ = new BehaviorSubject<any>(null);
  private conversationUpdate$ = new BehaviorSubject<any>(null);
  private messagesRead$ = new BehaviorSubject<any>(null);
  private typingStart$ = new BehaviorSubject<any>(null);
  private typingStop$ = new BehaviorSubject<any>(null);

  constructor() {
  }

  // Connect to Socket.IO server
  connect(userId: string): void {
    if (this.socket?.connected) {
      return;
    }

    // გამოიყენეთ socketUrl environment-იდან
    const socketUrl = environment.socketUrl || environment.apiUrl.replace('/api', '');
    
    this.socket = io(socketUrl, {
      path: '/socket.io',  // default path
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: true,
      withCredentials: true  // დაამატეთ credentials support
    });

    this.socket.on('connect', () => {
      this.connected$.next(true);
      
      // Join with userId
      if (userId) {
        this.socket?.emit('user:join', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error);
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Attempting URL:', socketUrl);
      this.connected$.next(false);
    });

    // Listen for new messages
    this.socket.on('message:new', (data) => {
      this.newMessage$.next(data);
    });

    // Listen for sent message confirmation
    this.socket.on('message:sent', (data) => {
      this.messageSent$.next(data);
    });

    // Listen for conversation updates
    this.socket.on('conversation:update', (data) => {
      this.conversationUpdate$.next(data);
    });

    // Listen for messages read notification
    this.socket.on('messages:read', (data) => {
      this.messagesRead$.next(data);
    });

    // Listen for typing indicators
    this.socket.on('typing:start', (data) => {
      this.typingStart$.next(data);
    });

    this.socket.on('typing:stop', (data) => {
      this.typingStop$.next(data);
    });

    // Reconnection handlers
    this.socket.on('reconnect', (attemptNumber) => {
      if (userId) {
        this.socket?.emit('user:join', userId);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
    });
  }

  // Disconnect from Socket.IO
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected$.next(false);
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection status observable
  getConnectionStatus(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  // Emit typing start
  emitTypingStart(userId: string, receiverId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { userId, receiverId });
    }
  }

  // Emit typing stop
  emitTypingStop(userId: string, receiverId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { userId, receiverId });
    }
  }

  // Observable for new messages
  onNewMessage(): Observable<any> {
    return this.newMessage$.asObservable();
  }

  // Observable for sent messages
  onMessageSent(): Observable<any> {
    return this.messageSent$.asObservable();
  }

  // Observable for conversation updates
  onConversationUpdate(): Observable<any> {
    return this.conversationUpdate$.asObservable();
  }

  // Observable for messages read
  onMessagesRead(): Observable<any> {
    return this.messagesRead$.asObservable();
  }

  // Observable for typing start
  onTypingStart(): Observable<any> {
    return this.typingStart$.asObservable();
  }

  // Observable for typing stop
  onTypingStop(): Observable<any> {
    return this.typingStop$.asObservable();
  }
}
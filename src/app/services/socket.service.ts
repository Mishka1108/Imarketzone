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
    console.log('🔌 SocketService initialized');
  }

  // Connect to Socket.IO server
  connect(userId: string): void {
    if (this.socket?.connected) {
      console.log('✅ Already connected to socket');
      return;
    }

    // გამოიყენეთ socketUrl environment-იდან
    const socketUrl = environment.socketUrl || environment.apiUrl.replace('/api', '');
    console.log('🔄 Connecting to Socket.IO server:', socketUrl);
    
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
      console.log('✅ Connected to Socket.IO:', this.socket?.id);
      console.log('✅ Transport:', this.socket?.io.engine.transport.name);
      this.connected$.next(true);
      
      // Join with userId
      if (userId) {
        this.socket?.emit('user:join', userId);
        console.log('👤 Joined as user:', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO:', reason);
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
      console.log('📩 New message received:', data);
      this.newMessage$.next(data);
    });

    // Listen for sent message confirmation
    this.socket.on('message:sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      this.messageSent$.next(data);
    });

    // Listen for conversation updates
    this.socket.on('conversation:update', (data) => {
      console.log('🔄 Conversation update:', data);
      this.conversationUpdate$.next(data);
    });

    // Listen for messages read notification
    this.socket.on('messages:read', (data) => {
      console.log('📖 Messages read:', data);
      this.messagesRead$.next(data);
    });

    // Listen for typing indicators
    this.socket.on('typing:start', (data) => {
      console.log('✍️ User typing:', data);
      this.typingStart$.next(data);
    });

    this.socket.on('typing:stop', (data) => {
      console.log('✋ User stopped typing:', data);
      this.typingStop$.next(data);
    });

    // Reconnection handlers
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      if (userId) {
        this.socket?.emit('user:join', userId);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt:', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
    });
  }

  // Disconnect from Socket.IO
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO...');
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
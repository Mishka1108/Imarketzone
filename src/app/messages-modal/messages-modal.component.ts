// src/app/messages-modal/messages-modal.component.ts - FULLY FIXED REAL-TIME

import { Component, OnInit, OnDestroy, Inject, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MessageService } from '../services/message.service';
import { SocketService } from '../services/socket.service';
import { Message, Conversation } from '../models/message.model';
import { ProfileImageService } from '../services/profileImage.service';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

export interface MessagesModalData {
  userId: string;
  userName?: string;
}

@Component({
  selector: 'app-messages-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatListModule,
    MatBadgeModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './messages-modal.component.html',
  styleUrls: ['./messages-modal.component.scss']
})
export class MessagesModalComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage: string = '';
  isMobile: boolean = false;
  isLoadingConversations: boolean = false;
  isLoadingMessages: boolean = false;
  isSending: boolean = false;
  isTyping: boolean = false;
  typingUserId: string | null = null;
  
  private destroy$ = new Subject<void>();
  private typingTimeout: any;
  private shouldScrollToBottom = false;

  constructor(
    public dialogRef: MatDialogRef<MessagesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessagesModalData,
    private messageService: MessageService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private profileImageService: ProfileImageService,
    private cdr: ChangeDetectorRef // ✅ დაემატა ChangeDetectorRef
  ) {
    console.log('💬 Messages Modal Data:', this.data);
  }

  ngOnInit(): void {
    if (!this.data.userId) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        this.data.userId = userId;
        console.log('✅ Set userId from localStorage:', userId);
      } else {
        console.error('❌ No userId available!');
        this.showSnackBar('ავტორიზაცია საჭიროა', 'error');
        this.close();
        return;
      }
    }

    this.checkIfMobile();
    this.setupSocketConnection();
    this.listenToSocketEvents();
    this.loadConversations();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // ✅ გასუფთავება
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  private setupSocketConnection(): void {
    if (!this.socketService.isConnected()) {
      console.log('🔌 Connecting to Socket.IO...');
      this.socketService.connect(this.data.userId);
    } else {
      console.log('✅ Already connected to Socket.IO');
    }
  }

  private listenToSocketEvents(): void {
    console.log('👂 Setting up socket event listeners...');

    // ✅ 1. ახალი შეტყობინების მოსმენა
    this.socketService.onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('📩 Raw socket data received:', data);
        
        if (!data || !data.message) {
          console.warn('⚠️ Invalid message data received');
          return;
        }

        const msg = data.message;
        const senderId = this.extractUserId(msg.senderId);
        const receiverId = this.extractUserId(msg.receiverId);
        
        console.log('📩 Processing message:', {
          content: msg.content,
          from: senderId,
          to: receiverId,
          isMyMessage: senderId === this.data.userId
        });

        // ✅ თუ არჩეული საუბარია ღია
        if (this.selectedConversation) {
          const otherUserId = this.extractUserId(this.selectedConversation.otherUser);
          
          // შევამოწმოთ არის თუ არა ეს შეტყობინება მიმდინარე საუბრიდან
          const isInCurrentConversation = 
            (senderId === otherUserId && receiverId === this.data.userId) ||
            (receiverId === otherUserId && senderId === this.data.userId);
          
          if (isInCurrentConversation) {
            console.log('✅ Message belongs to current conversation');
            
            // შევამოწმოთ არსებობს თუ არა უკვე
            const messageId = msg._id || msg.id;
            const exists = this.messages.some(m => 
              (m._id === messageId || m.id === messageId)
            );
            
            if (!exists) {
              console.log('➕ Adding new message to UI:', msg.content);
              this.messages.push(msg);
              
              // ✅ CRITICAL: ვაფორსებთ UI განახლებას
              this.cdr.detectChanges();
              this.shouldScrollToBottom = true;
              
              // Mark as read if incoming message
              if (senderId === otherUserId) {
                setTimeout(() => {
                  this.markAsRead(this.selectedConversation!);
                }, 500);
              }
            } else {
              console.log('ℹ️ Message already exists in UI');
            }
          } else {
            console.log('ℹ️ Message is from another conversation');
          }
        }
        
        // ✅ 2. საუბრების სიის განახლება
        this.updateConversationInList(msg, senderId, receiverId);
      });

    // ✅ გაგზავნილი შეტყობინების დადასტურება
    this.socketService.onMessageSent()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message) {
          console.log('✅ Message sent confirmation:', data.message.content);
        }
      });

    // ✅ საუბრის განახლება
    this.socketService.onConversationUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🔄 Conversation update received');
        this.loadConversations(true);
      });

    // ✅ წაკითხული შეტყობინებები
    this.socketService.onMessagesRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          console.log('📖 Messages were read');
          
          this.messages.forEach(msg => {
            const msgSenderId = this.extractUserId(msg.senderId);
            if (msgSenderId === this.data.userId) {
              msg.read = true;
            }
          });
          
          this.cdr.detectChanges();
        }
      });

    // ✅ Typing indicators
    this.socketService.onTypingStart()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && this.selectedConversation) {
          const otherUserId = this.extractUserId(this.selectedConversation.otherUser);
          
          if (data.userId === otherUserId) {
            console.log('✍️ User is typing:', data.userId);
            this.isTyping = true;
            this.typingUserId = data.userId;
            this.cdr.detectChanges();
          }
        }
      });

    this.socketService.onTypingStop()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && this.selectedConversation) {
          const otherUserId = this.extractUserId(this.selectedConversation.otherUser);
          
          if (data.userId === otherUserId) {
            console.log('✋ User stopped typing');
            this.isTyping = false;
            this.typingUserId = null;
            this.cdr.detectChanges();
          }
        }
      });

    // ✅ კავშირის სტატუსი
    this.socketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected) => {
        console.log('🔌 Socket connection status:', connected);
        if (!connected) {
          console.log('⚠️ Socket disconnected, attempting to reconnect...');
        }
      });
  }

  // ✅ Helper method to extract user ID
  private extractUserId(user: any): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user._id || user.id || '';
  }

  // ✅ განახლებული მეთოდი საუბრების სიის განახლებისთვის
  private updateConversationInList(message: Message, senderId: string, receiverId: string): void {
    console.log('🔄 Updating conversations list');
    
    // განვსაზღვროთ "მეორე მომხმარებელი"
    const otherUserId = (senderId === this.data.userId) ? receiverId : senderId;
    
    // ვეძებთ არსებულ საუბარს
    const conversationIndex = this.conversations.findIndex(c => {
      const convOtherUserId = this.extractUserId(c.otherUser);
      return convOtherUserId === otherUserId;
    });

    if (conversationIndex !== -1) {
      // ვაახლებთ არსებულ საუბარს
      const conversation = this.conversations[conversationIndex];
      conversation.lastMessage = message;
      conversation.updatedAt = message.createdAt;
      
      // Unread count - მხოლოდ თუ არ არის არჩეული და არ არის ჩემი შეტყობინება
      const isSelected = this.selectedConversation && 
        ((this.selectedConversation._id === conversation._id) || 
         (this.selectedConversation.id === conversation.id));
      
      const isOwnMessage = senderId === this.data.userId;
      
      if (!isSelected && !isOwnMessage) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
      
      // გადავიტანოთ თავში
      this.conversations.splice(conversationIndex, 1);
      this.conversations.unshift(conversation);
      
      console.log('✅ Conversation updated and moved to top');
    } else {
      // ახალი საუბარი - ჩავტვირთოთ თავიდან
      console.log('🆕 New conversation, reloading list');
      this.loadConversations(true);
    }
    
    // ✅ Force UI update
    this.cdr.detectChanges();
  }

  checkIfMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  backToConversations() {
    this.selectedConversation = null;
    this.messages = [];
  }

  getMessageSenderAvatar(message: Message): string {
    if (!this.isOwnMessage(message)) {
      if (typeof message.senderId === 'object' && message.senderId !== null) {
        const sender = message.senderId as any;
        if (sender.avatar && sender.avatar.trim() !== '') {
          return sender.avatar;
        }
      }
      if (this.selectedConversation?.otherUser?.avatar) {
        return this.selectedConversation.otherUser.avatar;
      }
    }
    
    return this.profileImageService.getDefaultAvatar();
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['errorHandled']) {
      img.src = this.profileImageService.getDefaultAvatar();
      img.dataset['errorHandled'] = 'true';
    }
  }

  loadConversations(silent: boolean = false): void {
    if (!silent) {
      console.log('📥 Loading conversations...');
      this.isLoadingConversations = true;
    }
    
    this.messageService.getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations) => {
          if (!silent) {
            console.log('✅ Loaded conversations:', conversations.length);
          }
          
          const oldSelectedId = this.selectedConversation?._id || this.selectedConversation?.id;
          
          this.conversations = conversations;
          this.isLoadingConversations = false;
          
          // Restore selected conversation
          if (oldSelectedId) {
            const stillExists = conversations.find(c => 
              (c._id === oldSelectedId || c.id === oldSelectedId)
            );
            if (stillExists) {
              this.selectedConversation = stillExists;
            }
          } else if (this.conversations.length > 0 && !this.selectedConversation) {
            this.selectConversation(this.conversations[0]);
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Failed to load conversations:', error);
          this.isLoadingConversations = false;
          if (!silent) {
            this.showSnackBar('საუბრების ჩატვირთვა ვერ მოხერხდა', 'error');
          }
        }
      });
  }

  selectConversation(conversation: Conversation): void {
    console.log('🔍 Selected conversation:', conversation.otherUser?.name);
    this.selectedConversation = conversation;
    this.messages = []; // ✅ გავასუფთავოთ ძველი შეტყობინებები
    this.loadMessages(conversation);
  }

  loadMessages(conversation: Conversation, silent: boolean = false): void {
    const otherUserId = this.extractUserId(conversation.otherUser);
    
    if (!otherUserId) {
      console.error('❌ No other user ID in conversation');
      return;
    }

    if (!silent) {
      this.isLoadingMessages = true;
    }
    
    this.messageService
      .getConversationMessages(this.data.userId, otherUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          console.log('✅ Loaded', messages.length, 'messages');
          
          this.messages = messages;
          this.isLoadingMessages = false;
          
          // ✅ Force change detection
          this.cdr.detectChanges();
          
          // Multiple scroll attempts for reliability
          setTimeout(() => this.scrollToBottom(), 0);
          setTimeout(() => this.scrollToBottom(), 100);
          setTimeout(() => this.scrollToBottom(), 300);
          
          this.markAsRead(conversation);
        },
        error: (error) => {
          console.error('❌ Failed to load messages:', error);
          this.isLoadingMessages = false;
          if (!silent) {
            this.showSnackBar('შეტყობინებების ჩატვირთვა ვერ მოხერხდა', 'error');
          }
        }
      });
  }

  markAsRead(conversation: Conversation): void {
    const otherUserId = this.extractUserId(conversation.otherUser);
    if (!otherUserId) return;

    this.messageService
      .markAsRead(this.data.userId, otherUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Messages marked as read');
          if (this.selectedConversation) {
            this.selectedConversation.unreadCount = 0;
          }
          const conv = this.conversations.find(c => 
            (c._id === conversation._id || c.id === conversation.id)
          );
          if (conv) {
            conv.unreadCount = 0;
          }
          this.cdr.detectChanges();
        },
        error: (err) => console.error('❌ Failed to mark as read:', err)
      });
  }

  sendMessage(): void {
    const messageContent = this.newMessage.trim();
    
    if (!messageContent) {
      this.showSnackBar('შეიყვანეთ შეტყობინება', 'error');
      return;
    }

    if (!this.selectedConversation?.otherUser) {
      this.showSnackBar('აირჩიეთ საუბარი', 'error');
      return;
    }

    const receiverId = this.extractUserId(this.selectedConversation.otherUser);
    if (!receiverId) {
      this.showSnackBar('შეცდომა: მიმღების ID არ არის', 'error');
      return;
    }

    this.isSending = true;
    this.stopTyping();
    
    const messageData = {
      receiverId: receiverId,
      content: messageContent
    };

    console.log('📤 Sending message:', messageData);

    this.messageService
      .sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Message sent successfully:', response);
          
          if (response.success && response.data) {
            const newMsg = response.data;
            const messageId = newMsg._id || newMsg.id;
            
            // Check if already exists
            const exists = this.messages.some(m => 
              ((m._id || m.id) === messageId)
            );
            
            if (!exists) {
              console.log('➕ Adding sent message to UI');
              this.messages.push(newMsg);
              
              // ✅ Force UI update
              this.cdr.detectChanges();
              this.shouldScrollToBottom = true;
            }
            
            this.newMessage = '';
          }
          
          this.isSending = false;
        },
        error: (error) => {
          console.error('❌ Failed to send message:', error);
          this.isSending = false;
          this.showSnackBar('შეტყობინების გაგზავნა ვერ მოხერხდა', 'error');
        }
      });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onMessageInput(): void {
    const otherUserId = this.extractUserId(this.selectedConversation?.otherUser);
    if (!otherUserId) return;
    
    this.socketService.emitTypingStart(this.data.userId, otherUserId);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  private stopTyping(): void {
    const otherUserId = this.extractUserId(this.selectedConversation?.otherUser);
    if (!otherUserId) return;
    
    this.socketService.emitTypingStop(this.data.userId, otherUserId);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  scrollToBottom(): void {
    try {
      const container = document.querySelector('.messages-list-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
        console.log('📜 Scrolled to bottom');
      }
    } catch (err) {
      console.error('❌ Scroll error:', err);
    }
  }

  getMessageTime(message: Message): string {
    const date = new Date(message.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ახლახან';
    if (diffMins < 60) return `${diffMins} წთ`;
    if (diffHours < 24) return `${diffHours} სთ`;
    if (diffDays < 7) return `${diffDays} დღე`;
    
    return date.toLocaleDateString('ka-GE', {
      day: 'numeric',
      month: 'short'
    });
  }

  getLastMessageTime(conversation: Conversation): string {
    if (!conversation.lastMessage) return '';
    return this.getMessageTime(conversation.lastMessage);
  }

  getLastMessagePreview(conversation: Conversation): string {
    if (!conversation.lastMessage) return 'შეტყობინებები არ არის';
    
    const content = conversation.lastMessage.content || '';
    if (!content.trim()) return 'ახალი შეტყობინება';
    
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  }

  isOwnMessage(message: Message): boolean {
    const msgSenderId = this.extractUserId(message.senderId);
    return msgSenderId === this.data.userId;
  }

  deleteConversation(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    
    if (!confirm('ნამდვილად გსურთ საუბრის წაშლა?')) {
      return;
    }

    const conversationId = conversation._id || conversation.id;
    if (!conversationId) return;

    this.messageService.deleteConversation(conversationId).subscribe({
      next: () => {
        console.log('✅ Conversation deleted');
        this.showSnackBar('საუბარი წაშლილია', 'success');
        
        this.conversations = this.conversations.filter(c => 
          (c._id || c.id) !== conversationId
        );
        
        if (this.selectedConversation && 
            (this.selectedConversation._id === conversationId || 
             this.selectedConversation.id === conversationId)) {
          this.selectedConversation = null;
          this.messages = [];
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Failed to delete conversation:', error);
        this.showSnackBar('საუბრის წაშლა ვერ მოხერხდა', 'error');
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  showSnackBar(message: string, type: 'success' | 'error' = 'error'): void {
    this.snackBar.open(message, 'დახურვა', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }
  
  getDefaultAvatar(): string {
    return this.profileImageService.getDefaultAvatar();
  }
}
// src/app/messages-modal/messages-modal.component.ts - FIXED REAL-TIME UPDATES

import { Component, OnInit, OnDestroy, Inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
    MatTooltipModule
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
    private profileImageService: ProfileImageService
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

    // ✅ FIXED: Listen for new incoming messages
    this.socketService.onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message) {
          console.log('📩 Real-time message received:', data);
          
          const msg = data.message;
          const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
          const receiverId = typeof msg.receiverId === 'object' ? msg.receiverId._id : msg.receiverId;
          
          // ✅ CRITICAL: Add message if conversation is open
          if (this.selectedConversation) {
            const otherUserId = this.selectedConversation.otherUser.id || this.selectedConversation.otherUser._id;
            
            // Check if this message is part of current conversation
            const isInCurrentConversation = (senderId === otherUserId) || (receiverId === otherUserId);
            
            if (isInCurrentConversation) {
              console.log('✅ Message is from selected conversation, adding to UI');
              
              // Check if message already exists
              const exists = this.messages.some(m => 
                (m._id === msg._id || m.id === msg.id)
              );
              
              if (!exists) {
                this.messages.push(msg);
                this.shouldScrollToBottom = true;
                console.log('✅ Message added to UI:', msg.content);
              }
              
              // Mark as read automatically if it's incoming
              if (senderId === otherUserId) {
                this.markAsRead(this.selectedConversation);
              }
            }
          }
          
          // ✅ NEW: Update conversations list in real-time
          // Determine which user is the "other user" in the conversation
          const conversationOtherUserId = (senderId === this.data.userId) ? receiverId : senderId;
          this.updateConversationsList(msg, conversationOtherUserId);
        }
      });

    // ✅ Listen for sent message confirmation (already handled in sendMessage)
    this.socketService.onMessageSent()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message) {
          console.log('✅ Message sent confirmation:', data);
        }
      });

    // ✅ Listen for conversation updates
    this.socketService.onConversationUpdate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          console.log('🔄 Conversation update:', data);
          this.loadConversations(true);
        }
      });

    // ✅ Listen for messages read notifications
    this.socketService.onMessagesRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          console.log('📖 Messages were read:', data);
          
          // Update read status in UI
          this.messages.forEach(msg => {
            const msgSenderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            
            if (msgSenderId === this.data.userId) {
              msg.read = true;
            }
          });
        }
      });

    // ✅ Listen for typing indicators
    this.socketService.onTypingStart()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && this.selectedConversation) {
          const otherUserId = this.selectedConversation.otherUser.id || this.selectedConversation.otherUser._id;
          
          if (data.userId === otherUserId) {
            console.log('✍️ User is typing:', data.userId);
            this.isTyping = true;
            this.typingUserId = data.userId;
          }
        }
      });

    this.socketService.onTypingStop()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && this.selectedConversation) {
          const otherUserId = this.selectedConversation.otherUser.id || this.selectedConversation.otherUser._id;
          
          if (data.userId === otherUserId) {
            console.log('✋ User stopped typing:', data.userId);
            this.isTyping = false;
            this.typingUserId = null;
          }
        }
      });

    // ✅ Monitor connection status
    this.socketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected) => {
        console.log('🔌 Socket connection status:', connected);
        if (!connected) {
          console.log('⚠️ Socket disconnected, attempting to reconnect...');
        }
      });
  }

  // ✅ NEW METHOD: Update conversations list in real-time
  private updateConversationsList(message: Message, otherUserId: string): void {
    console.log('🔄 Updating conversations list with new message');
    
    // Find the conversation
    const conversationIndex = this.conversations.findIndex(c => {
      const convOtherUserId = c.otherUser.id || c.otherUser._id;
      return convOtherUserId === otherUserId;
    });

    if (conversationIndex !== -1) {
      // Update existing conversation
      const conversation = this.conversations[conversationIndex];
      conversation.lastMessage = message;
      conversation.updatedAt = message.createdAt;
      
      // Increment unread count only if not the selected conversation
      const isSelected = this.selectedConversation && 
        ((this.selectedConversation._id === conversation._id) || 
         (this.selectedConversation.id === conversation.id));
      
      const msgSenderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
      const isOwnMessage = msgSenderId === this.data.userId;
      
      if (!isSelected && !isOwnMessage) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
      
      // Move to top
      this.conversations.splice(conversationIndex, 1);
      this.conversations.unshift(conversation);
      
      console.log('✅ Conversation updated and moved to top');
    } else {
      // New conversation - reload the list
      console.log('🆕 New conversation detected, reloading list');
      this.loadConversations(true);
    }
  }

  checkIfMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  backToConversations() {
    this.selectedConversation = null;
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
            console.log('✅ Loaded conversations:', conversations);
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
    console.log('🔍 Selected conversation:', conversation);
    this.selectedConversation = conversation;
    this.loadMessages(conversation);
  }

  loadMessages(conversation: Conversation, silent: boolean = false): void {
    if (!conversation.otherUser?.id) {
      console.error('❌ No other user ID in conversation');
      return;
    }

    if (!silent) {
      this.isLoadingMessages = true;
    }
    
    this.messageService
      .getConversationMessages(this.data.userId, conversation.otherUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          console.log('✅ Loaded messages for conversation:', messages.length, 'messages');
          
          this.messages = messages;
          this.isLoadingMessages = false;
          
          // Force scroll after messages are rendered
          setTimeout(() => {
            this.scrollToBottom();
          }, 0);
          
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
          
          setTimeout(() => {
            this.scrollToBottom();
          }, 300);
          
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
    if (!conversation.otherUser?.id) return;

    this.messageService
      .markAsRead(this.data.userId, conversation.otherUser.id)
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

    if (!this.selectedConversation?.otherUser?.id) {
      this.showSnackBar('აირჩიეთ საუბარი', 'error');
      return;
    }

    this.isSending = true;
    this.stopTyping();
    
    const messageData = {
      receiverId: this.selectedConversation.otherUser.id,
      content: messageContent
    };

    console.log('📤 Sending message:', messageData);

    this.messageService
      .sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Message sent:', response);
          
          if (response.success && response.data) {
            const newMsg = response.data;
            
            // Check if message already exists
            const exists = this.messages.some(m => 
              ((m._id || m.id) === (newMsg._id || newMsg.id))
            );
            
            if (!exists) {
              const messageToAdd: Message = {
                ...newMsg,
                id: newMsg.id || newMsg._id,
                _id: newMsg._id || newMsg.id
              };
              
              this.messages.push(messageToAdd);
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
    if (!this.selectedConversation?.otherUser?.id) return;
    
    this.socketService.emitTypingStart(
      this.data.userId, 
      this.selectedConversation.otherUser.id
    );
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  private stopTyping(): void {
    if (!this.selectedConversation?.otherUser?.id) return;
    
    this.socketService.emitTypingStop(
      this.data.userId,
      this.selectedConversation.otherUser.id
    );
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  scrollToBottom(): void {
    try {
      // Force multiple scroll attempts for reliability
      setTimeout(() => {
        const container = document.querySelector('.messages-list-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
          console.log('📜 Scrolled to bottom:', container.scrollHeight);
        }
      }, 0);
      
      setTimeout(() => {
        const container = document.querySelector('.messages-list-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
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
    const msgSenderId = typeof message.senderId === 'object' ? 
      (message.senderId as any)._id : 
      message.senderId;
    
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
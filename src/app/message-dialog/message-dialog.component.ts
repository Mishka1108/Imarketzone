// src/app/components/message-dialog/message-dialog.component.ts - WITH REAL-TIME
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MessageService } from '../services/message.service';
import { SocketService } from '../services/socket.service';
import { Message, SendMessageRequest } from '../models/message.model';
import { Subject, takeUntil } from 'rxjs';
import { ProfileImageService } from '../services/profileImage.service';
import { TranslateModule } from '@ngx-translate/core';

export interface MessageDialogData {
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  productId?: string;
  productTitle?: string;
  senderId: string;
}

@Component({
  selector: 'app-message-dialog',
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
    TranslateModule
  ],
  templateUrl: './message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss']
})
export class MessageDialogComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  isTyping: boolean = false;
  private destroy$ = new Subject<void>();
  private typingTimeout: any;

  constructor(
    public dialogRef: MatDialogRef<MessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessageDialogData,
    private messageService: MessageService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private profileImageService: ProfileImageService
  ) {
    console.log('💬 Message Dialog Data:', this.data);
  }

  ngOnInit(): void {
    if (!this.data.senderId) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        this.data.senderId = userId;
        console.log('✅ Set senderId from localStorage:', userId);
      } else {
        console.error('❌ No senderId available!');
        this.showSnackBar('ავტორიზაცია საჭიროა შეტყობინების გასაგზავნად');
        this.dialogRef.close();
        return;
      }
    }

    this.setupSocketConnection();
    this.listenToSocketEvents();
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTyping();
  }

  private setupSocketConnection(): void {
    if (!this.socketService.isConnected()) {
      console.log('🔌 Connecting to Socket.IO...');
      this.socketService.connect(this.data.senderId);
    } else {
      console.log('✅ Already connected to Socket.IO');
    }
  }

  private listenToSocketEvents(): void {
    // ✅ Listen for new incoming messages
    this.socketService.onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message && data.message.senderId === this.data.receiverId) {
          console.log('📩 Real-time message received:', data);
          this.messages.push(data.message);
          setTimeout(() => this.scrollToBottom(), 100);
          
          // Mark as read automatically
          this.markMessagesAsRead();
        }
      });

    // ✅ Listen for sent message confirmation
    this.socketService.onMessageSent()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message) {
          console.log('✅ Message sent confirmation:', data);
        }
      });

    // ✅ Listen for messages read notifications
    this.socketService.onMessagesRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.userId === this.data.receiverId) {
          console.log('📖 Receiver read the messages');
          // Update read status
          this.messages.forEach(msg => {
            if (msg.senderId === this.data.senderId) {
              msg.read = true;
            }
          });
        }
      });

    // ✅ Listen for typing indicators
    this.socketService.onTypingStart()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.userId === this.data.receiverId) {
          console.log('✍️ Receiver is typing');
          this.isTyping = true;
        }
      });

    this.socketService.onTypingStop()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.userId === this.data.receiverId) {
          console.log('✋ Receiver stopped typing');
          this.isTyping = false;
        }
      });
  }

  getReceiverAvatar(): string {
    if (this.data.receiverAvatar && this.data.receiverAvatar.trim() !== '') {
      return this.data.receiverAvatar;
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

  loadMessages(): void {
    if (!this.data.senderId || !this.data.receiverId) {
      console.error('❌ Missing sender or receiver ID');
      return;
    }

    this.isLoading = true;
    
    this.messageService
      .getConversationMessages(this.data.senderId, this.data.receiverId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: Message[]) => {
          console.log('✅ Loaded messages:', messages);
          this.messages = messages;
          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 100);
          
          this.markMessagesAsRead();
        },
        error: (error: any) => {
          console.error('❌ Failed to load messages:', error);
          this.isLoading = false;
          this.showSnackBar('შეტყობინებების ჩატვირთვა ვერ მოხერხდა');
        }
      });
  }

  private markMessagesAsRead(): void {
    if (!this.data.senderId || !this.data.receiverId) return;

    this.messageService
      .markAsRead(this.data.senderId, this.data.receiverId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('✅ Messages marked as read'),
        error: (err) => console.error('❌ Failed to mark as read:', err)
      });
  }

  sendMessage(): void {
    const messageContent = this.newMessage.trim();
    
    if (!messageContent) {
      this.showSnackBar('შეიყვანეთ შეტყობინება');
      return;
    }

    if (!this.data.senderId || !this.data.receiverId) {
      this.showSnackBar('შეცდომა: მომხმარებლის მონაცემები არ არის ხელმისაწვდომი');
      return;
    }

    this.isSending = true;
    this.stopTyping();
    
    const messageData: SendMessageRequest = {
      receiverId: this.data.receiverId,
      content: messageContent,
      productId: this.data.productId
    };

    console.log('📤 Sending message:', messageData);

    this.messageService
      .sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Message sent successfully:', response);
          
          if (response.success && response.data) {
            this.messages.push(response.data);
            this.newMessage = '';
            setTimeout(() => this.scrollToBottom(), 100);
          }
          
          this.isSending = false;
        },
        error: (error: any) => {
          console.error('❌ Failed to send message:', error);
          this.isSending = false;
          
          if (error.status === 401) {
            this.showSnackBar('გთხოვთ გაიაროთ ავტორიზაცია');
            this.dialogRef.close();
          } else if (error.status === 400) {
            this.showSnackBar('შეცდომა: შეავსეთ ყველა ველი');
          } else {
            this.showSnackBar('შეტყობინების გაგზავნა ვერ მოხერხდა');
          }
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
    if (!this.data.receiverId) return;
    
    // Emit typing start
    this.socketService.emitTypingStart(this.data.senderId, this.data.receiverId);
    
    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Set new timeout to stop typing after 2 seconds
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  private stopTyping(): void {
    if (!this.data.receiverId) return;
    
    this.socketService.emitTypingStop(this.data.senderId, this.data.receiverId);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  scrollToBottom(): void {
    try {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
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
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    if (diffDays < 7) return `${diffDays} დღის წინ`;
    
    return date.toLocaleDateString('ka-GE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.data.senderId;
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
}
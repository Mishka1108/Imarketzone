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
  ) {}

  ngOnInit(): void {
    if (!this.data.senderId) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        this.data.senderId = userId;
      } else {
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
      this.socketService.connect(this.data.senderId);
    }
  }

  // ✅ HELPER: Extract ID from user object or string
  private extractUserId(sender: any): string {
    if (!sender) return '';
    
    // If it's already a string, return it
    if (typeof sender === 'string') {
      return sender;
    }
    
    // If it's an object, get _id or id
    if (typeof sender === 'object') {
      return sender._id || sender.id || '';
    }
    
    return '';
  }

  private listenToSocketEvents(): void {
    this.socketService.onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message) {
          const messageSenderId = this.extractUserId(data.message.senderId);
          if (messageSenderId === this.data.receiverId) {
            this.messages.push(data.message);
            setTimeout(() => this.scrollToBottom(), 100);
            this.markMessagesAsRead();
          }
        }
      });

    this.socketService.onMessageSent()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.message) {
        }
      });

    this.socketService.onMessagesRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.userId === this.data.receiverId) {
          this.messages.forEach(msg => {
            const msgSenderId = this.extractUserId(msg.senderId);
            if (msgSenderId === this.data.senderId) {
              msg.read = true;
            }
          });
        }
      });

    this.socketService.onTypingStart()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.userId === this.data.receiverId) {
          this.isTyping = true;
        }
      });

    this.socketService.onTypingStop()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data && data.userId === this.data.receiverId) {
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
      return;
    }

    this.isLoading = true;
    
    this.messageService
      .getConversationMessages(this.data.senderId, this.data.receiverId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: Message[]) => {
          this.messages = messages;
          this.isLoading = false;
          
          // 🐛 DEBUG: Log first 5 messages to verify
          messages.slice(0, 5).forEach((msg, idx) => {
            const senderId = this.extractUserId(msg.senderId);
            const isOwn = senderId === this.data.senderId;
          });
          
          setTimeout(() => this.scrollToBottom(), 100);
          this.markMessagesAsRead();
        },
        error: (error: any) => {
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

    this.messageService
      .sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.messages.push(response.data);
            this.newMessage = '';
            
            // 🐛 DEBUG
            const senderId = this.extractUserId(response.data.senderId);
            
            setTimeout(() => this.scrollToBottom(), 100);
          }
          this.isSending = false;
        },
        error: (error: any) => {
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
    
    this.socketService.emitTypingStart(this.data.senderId, this.data.receiverId);
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
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

  // ✅ FIXED: Handle both object and string senderId
  isOwnMessage(message: Message): boolean {
    const messageSenderId = this.extractUserId(message.senderId);
    const isOwn = messageSenderId === this.data.senderId;
    return isOwn;
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
// src/app/components/message-dialog/message-dialog.component.ts

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
import { Message, SendMessageRequest } from '../models/message.model';
import { Subject, takeUntil } from 'rxjs';
import { ProfileImageService } from '../services/profileImage.service';

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
    MatSnackBarModule
  ],
  templateUrl: './message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss']
})
export class MessageDialogComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isSending: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<MessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessageDialogData,
    private messageService: MessageService,
    private snackBar: MatSnackBar,
      private profileImageService: ProfileImageService
  ) {
    console.log('💬 Message Dialog Data:', this.data);
  }

  ngOnInit(): void {
    // ✅ დარწმუნდი რომ senderId არის
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

    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


    getReceiverAvatar(): string {
    // თუ არის data.receiverAvatar და არ არის ცარიელი
    if (this.data.receiverAvatar && this.data.receiverAvatar.trim() !== '') {
      return this.data.receiverAvatar;
    }
    
    // Default avatar-ზე დაბრუნება
    return this.profileImageService.getDefaultAvatar();
  }

    onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['errorHandled']) {
      img.src = this.profileImageService.getDefaultAvatar();
      img.dataset['errorHandled'] = 'true';
    }
  }
  // შეტყობინებების ჩატვირთვა
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
          
          // ✅ მონიშნე როგორც წაკითხული
          this.markMessagesAsRead();
        },
        error: (error: any) => {
          console.error('❌ Failed to load messages:', error);
          this.isLoading = false;
          this.showSnackBar('შეტყობინებების ჩატვირთვა ვერ მოხერხდა');
        }
      });
  }

  // შეტყობინებების წაკითხულად მონიშვნა
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

  // შეტყობინების გაგზავნა
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
            this.showSnackBar('შეტყობინება გაიგზავნა', 'success');
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

  // Enter ღილაკით გაგზავნა
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Scroll to bottom
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

  // შეტყობინების დრო
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

  // მესიჯის ავტორის შემოწმება
  isOwnMessage(message: Message): boolean {
    return message.senderId === this.data.senderId;
  }

  // დახურვა
  close(): void {
    this.dialogRef.close();
  }

  // Snackbar
  showSnackBar(message: string, type: 'success' | 'error' = 'error'): void {
    this.snackBar.open(message, 'დახურვა', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }
}
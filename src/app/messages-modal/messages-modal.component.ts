// src/app/components/messages-modal/messages-modal.component.ts

import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
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
import { MessageService } from '../services/message.service';
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
    MatBadgeModule
  ],
  templateUrl: './messages-modal.component.html',
  styleUrls: ['./messages-modal.component.scss']
})
export class MessagesModalComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage: string = '';
  
  isLoadingConversations: boolean = false;
  isLoadingMessages: boolean = false;
  isSending: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<MessagesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MessagesModalData,
    private messageService: MessageService,
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

    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ ავატარის მიღება (otherUser-ის ან sender-ის)
  getMessageSenderAvatar(message: Message): string {
    // თუ ეს არის სხვისი მესიჯი
    if (!this.isOwnMessage(message)) {
      // თუ senderId არის populated object
      if (typeof message.senderId === 'object' && message.senderId !== null) {
        const sender = message.senderId as any;
        if (sender.avatar && sender.avatar.trim() !== '') {
          return sender.avatar;
        }
      }
      // თუ არ არის populated, გამოვიყენოთ selectedConversation-ის otherUser avatar
      if (this.selectedConversation?.otherUser?.avatar) {
        return this.selectedConversation.otherUser.avatar;
      }
    }
    
    // default avatar
    return this.profileImageService.getDefaultAvatar();
  }

  // ✅ Avatar error handler
  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['errorHandled']) {
      img.src = this.profileImageService.getDefaultAvatar();
      img.dataset['errorHandled'] = 'true';
    }
  }

  loadConversations(): void {
    console.log('📥 Loading conversations...');
    this.isLoadingConversations = true;
    
    this.messageService.getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations) => {
          console.log('✅ Loaded conversations:', conversations);
          this.conversations = conversations;
          this.isLoadingConversations = false;
          
          if (this.conversations.length > 0 && !this.selectedConversation) {
            this.selectConversation(this.conversations[0]);
          }
        },
        error: (error) => {
          console.error('❌ Failed to load conversations:', error);
          this.isLoadingConversations = false;
          this.showSnackBar('საუბრების ჩატვირთვა ვერ მოხერხდა', 'error');
        }
      });
  }

  selectConversation(conversation: Conversation): void {
    console.log('🔍 Selected conversation:', conversation);
    this.selectedConversation = conversation;
    this.loadMessages(conversation);
  }

  loadMessages(conversation: Conversation): void {
    if (!conversation.otherUser?.id) {
      console.error('❌ No other user ID in conversation');
      return;
    }

    this.isLoadingMessages = true;
    
    this.messageService
      .getConversationMessages(this.data.userId, conversation.otherUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          console.log('✅ Loaded messages:', messages);
          this.messages = messages;
          this.isLoadingMessages = false;
          setTimeout(() => this.scrollToBottom(), 100);
          
          this.markAsRead(conversation);
        },
        error: (error) => {
          console.error('❌ Failed to load messages:', error);
          this.isLoadingMessages = false;
          this.showSnackBar('შეტყობინებების ჩატვირთვა ვერ მოხერხდა', 'error');
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
          const conv = this.conversations.find(c => c._id === conversation._id || c.id === conversation.id);
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
            this.messages.push(response.data);
            this.newMessage = '';
            setTimeout(() => this.scrollToBottom(), 100);
            this.showSnackBar('შეტყობინება გაიგზავნა', 'success');
            
            this.loadConversations();
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

  scrollToBottom(): void {
    try {
      const container = document.querySelector('.messages-list-container');
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
    const content = conversation.lastMessage.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.data.userId || 
           (typeof message.senderId === 'object' && message.senderId !== null && 
            (message.senderId as any)._id === this.data.userId);
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
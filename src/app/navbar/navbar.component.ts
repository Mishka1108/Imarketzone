// navbar.component.ts - WITH TRANSLATION SUPPORT
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProfileImageService } from '../services/profileImage.service';
import { MessageService } from '../services/message.service';
import { SocketService } from '../services/socket.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatButtonModule, 
    RouterLink, 
    RouterLinkActive, 
    CommonModule, 
    FormsModule, 
    RouterModule, 
    MatIcon,
    MatSnackBarModule,
    TranslateModule // ✅ დაამატეთ TranslateModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('notificationAnimation', [
      state('void', style({
        transform: 'translateX(500px)',
        opacity: 0
      })),
      state('*', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('void => *', animate('400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)')),
      transition('* => void', animate('300ms ease-in', style({
        transform: 'translateX(500px)',
        opacity: 0
      })))
    ])
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  public isShow: boolean = false;
  isLoggedIn: boolean = false;
  profileImageUrl: string = 'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg';
  
  unreadMessagesCount: number = 0;
  currentLang: string = 'ka'; // ✅ Current language
  
  showNotification: boolean = false;
  notificationData: {
    senderName: string;
    message: string;
    avatar?: string;
  } | null = null;
  
  private subscriptions = new Subscription();
  private notificationTimeout: any;

  constructor(
    private profileImageService: ProfileImageService, 
    private authService: AuthService, 
    private messageService: MessageService,
    private socketService: SocketService,
    private router: Router,
    private snackBar: MatSnackBar,
    private translate: TranslateService, // ✅ დაამატეთ
    private languageService: LanguageService // ✅ დაამატეთ
  ) {
  }

  ngOnInit(): void {
    
    // ✅ Subscribe to language changes
    const langSub = this.languageService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });
    
    // Profile image subscription
    const profileSub = this.profileImageService.profileImage$.subscribe(
      (imageUrl: string) => {
        this.profileImageUrl = imageUrl;
      }
    );

    // Auth subscription
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      
      if (user) {
        const userId = localStorage.getItem('userId');
        if (userId) {
          this.connectToSocket(userId);
          this.startUnreadCountMonitoring();
          this.listenForNewMessages();
        }
      } else {
        this.unreadMessagesCount = 0;
        this.socketService.disconnect();
      }
    });

    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage) {
      this.profileImageUrl = savedImage;
    }

    this.subscriptions.add(langSub);
    this.subscriptions.add(profileSub);
    this.subscriptions.add(authSub);
    
  }

  // ✅ Change Language Method
  changeLanguage(lang: 'ka' | 'en'): void {
    this.languageService.setLanguage(lang);
  }

  private connectToSocket(userId: string): void {
    this.socketService.connect(userId);
    
    setTimeout(() => {
      if (this.socketService.isConnected()) {
      } else {
        console.warn('⚠️ Socket not connected, retrying...');
        this.socketService.connect(userId);
      }
    }, 1000);

    const connectionSub = this.socketService.getConnectionStatus().subscribe({
      next: (connected) => {
        if (!connected) {
          console.warn('⚠️ Socket disconnected, attempting to reconnect in 2s...');
          setTimeout(() => {
            if (!this.socketService.isConnected() && this.isLoggedIn) {
              this.socketService.connect(userId);
            }
          }, 2000);
        }
      }
    });

    this.subscriptions.add(connectionSub);
  }

  private startUnreadCountMonitoring(): void {
    
    this.messageService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadMessagesCount = count;
      },
      error: (err) => {
      }
    });

    const unreadSub = this.messageService.unreadCount$.subscribe({
      next: (count) => {
        this.unreadMessagesCount = count;
      },
      error: (err) => {
        this.unreadMessagesCount = 0;
      }
    });

    this.subscriptions.add(unreadSub);
  }

  private listenForNewMessages(): void {
    
    const messageSub = this.socketService.onNewMessage().subscribe((data) => {
      
      if (data && data.message) {
        const msg = data.message;
        const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
        const userId = localStorage.getItem('userId');
        
        if (senderId !== userId) {
          
          const senderName = typeof msg.senderId === 'object' && msg.senderId.name 
            ? msg.senderId.name 
            : this.translate.instant('NOTIFICATIONS.UNKNOWN_USER');
          
          const senderAvatar = typeof msg.senderId === 'object' && msg.senderId.avatar
            ? msg.senderId.avatar
            : this.profileImageService.getDefaultAvatar();
          
          this.showMessageNotification(senderName, msg.content, senderAvatar);
          this.playNotificationSound();
          this.messageService.getUnreadCount().subscribe();
        }
      }
    });

    this.subscriptions.add(messageSub);
  }

  showMessageNotification(senderName: string, message: string, avatar?: string): void {
    
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationData = {
      senderName,
      message: message.length > 50 ? message.substring(0, 50) + '...' : message,
      avatar: avatar || this.profileImageService.getDefaultAvatar()
    };

    this.showNotification = true;

    this.notificationTimeout = setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  hideNotification(): void {
    this.showNotification = false;
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  onNotificationClick(): void {
    this.hideNotification();
    this.router.navigate(['/dashboard'], { 
      queryParams: { tab: 'messages' } 
    });
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('assets/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => {
      });
    } catch (err) {
    }
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.profileImageUrl;
    }
  }
  
  toggleMenu(): void {
    this.isShow = !this.isShow;
  }

  closeMenu(): void {
    window.scrollTo(0, 0);
    this.isShow = false;
  }

  onProfileImageClick(): void {
    this.closeMenu();
    
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.unreadMessagesCount = 0;
    this.socketService.disconnect();
    this.closeMenu();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }
  
}
// navbar.component.ts - WITH LANGUAGE SWITCHER
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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslationService, Language } from '../services/translation.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatButtonModule, 
    RouterLink, 
    RouterLinkActive, 
    CommonModule, 
    MatTooltipModule,
    FormsModule, 
    RouterModule, 
    MatIcon,
    MatSnackBarModule,
    TranslatePipe
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
  
  showNotification: boolean = false;
  notificationData: {
    senderName: string;
    message: string;
    avatar?: string;
  } | null = null;
  
  // ✅ Language properties
  currentLanguage: Language = 'ka';
  
  private subscriptions = new Subscription();
  private notificationTimeout: any;

  constructor(
    private profileImageService: ProfileImageService, 
    private authService: AuthService, 
    private messageService: MessageService,
    private socketService: SocketService,
    private router: Router,
    public translationService: TranslationService
  ) {
    console.log('🔔 Navbar constructor called');
  }

  ngOnInit(): void {
    console.log('🔔 Navbar ngOnInit started');
    console.log('🌐 Initial language:', this.translationService.getCurrentLanguage());
    
    // ✅ Subscribe to language changes
    const langSub = this.translationService.currentLang$.subscribe(lang => {
      this.currentLanguage = lang;
      console.log('🌐 Language changed in subscription to:', lang);
      console.log('🔍 Testing translation:', this.translationService.translate('nav.home'));
    });
    this.subscriptions.add(langSub);
    
    // Profile image subscription
    const profileSub = this.profileImageService.profileImage$.subscribe(
      (imageUrl: string) => {
        this.profileImageUrl = imageUrl;
      }
    );

    // Auth subscription
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      console.log('🔔 User login status:', this.isLoggedIn);
      
      if (user) {
        const userId = localStorage.getItem('userId');
        if (userId) {
          console.log('✅ User logged in, starting socket connection...');
          this.connectToSocket(userId);
          this.startUnreadCountMonitoring();
          this.listenForNewMessages();
        }
      } else {
        console.log('❌ User logged out, disconnecting socket...');
        this.unreadMessagesCount = 0;
        this.socketService.disconnect();
      }
    });

    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage) {
      this.profileImageUrl = savedImage;
    }

    this.subscriptions.add(profileSub);
    this.subscriptions.add(authSub);
    
    console.log('✅ Navbar initialization complete');
  }

  // ✅ Set specific language
  setLanguage(lang: Language): void {
    console.log('🔘 Language button clicked! Switching to:', lang);
    console.log('📍 Current language before switch:', this.currentLanguage);
    
    this.translationService.setLanguage(lang);
    
    console.log('✅ Language set to:', lang);
    console.log('📍 Current language after switch:', this.currentLanguage);
    console.log('💾 LocalStorage language:', localStorage.getItem('preferredLanguage'));
  }

  // 🔬 SUPER DETAILED TEST METHOD
  testLanguageChange(lang: Language): void {
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST LANGUAGE CHANGE STARTED');
    console.log('═══════════════════════════════════════════');
    console.log('🎯 Target language:', lang);
    console.log('📍 Current this.currentLanguage:', this.currentLanguage);
    console.log('📍 Service getCurrentLanguage():', this.translationService.getCurrentLanguage());
    console.log('💾 localStorage before:', localStorage.getItem('preferredLanguage'));
    
    console.log('---');
    console.log('🔄 Calling translationService.setLanguage(' + lang + ')...');
    this.translationService.setLanguage(lang);
    
    console.log('---');
    console.log('✅ After setLanguage call:');
    console.log('📍 Current this.currentLanguage:', this.currentLanguage);
    console.log('📍 Service getCurrentLanguage():', this.translationService.getCurrentLanguage());
    console.log('💾 localStorage after:', localStorage.getItem('preferredLanguage'));
    
    console.log('---');
    console.log('🔤 Testing translations:');
    console.log('  nav.home =', this.translationService.translate('nav.home'));
    console.log('  nav.products =', this.translationService.translate('nav.products'));
    console.log('  nav.contact =', this.translationService.translate('nav.contact'));
    
    console.log('---');
    console.log('🔍 Checking subscriptions:');
    console.log('  Subscriptions count:', this.subscriptions.closed ? 'CLOSED' : 'ACTIVE');
    
    console.log('═══════════════════════════════════════════');
    console.log('🧪 TEST LANGUAGE CHANGE COMPLETED');
    console.log('═══════════════════════════════════════════');
    
    // Force change detection
    setTimeout(() => {
      console.log('⏰ After 100ms timeout:');
      console.log('📍 this.currentLanguage:', this.currentLanguage);
      console.log('🔤 nav.home =', this.translationService.translate('nav.home'));
    }, 100);
  }

  // 🐛 Debug method for template
  getStorageLang(): string {
    return localStorage.getItem('preferredLanguage') || 'none';
  }

  private connectToSocket(userId: string): void {
    console.log('🔌 Connecting to socket with userId:', userId);
    this.socketService.connect(userId);
    
    setTimeout(() => {
      if (this.socketService.isConnected()) {
        console.log('✅ Socket connection verified');
      } else {
        console.warn('⚠️ Socket not connected, retrying...');
        this.socketService.connect(userId);
      }
    }, 1000);

    const connectionSub = this.socketService.getConnectionStatus().subscribe({
      next: (connected) => {
        console.log('🔌 Socket connection status changed:', connected);
        if (!connected) {
          console.warn('⚠️ Socket disconnected, attempting to reconnect in 2s...');
          setTimeout(() => {
            if (!this.socketService.isConnected() && this.isLoggedIn) {
              console.log('🔄 Reconnecting socket...');
              this.socketService.connect(userId);
            }
          }, 2000);
        }
      }
    });

    this.subscriptions.add(connectionSub);
  }

  private startUnreadCountMonitoring(): void {
    console.log('🔔 Starting unread count monitoring');
    
    this.messageService.getUnreadCount().subscribe({
      next: (count) => {
        console.log('📊 Initial unread count:', count);
        this.unreadMessagesCount = count;
      },
      error: (err) => {
        console.error('❌ Error loading initial unread count:', err);
      }
    });

    const unreadSub = this.messageService.unreadCount$.subscribe({
      next: (count) => {
        console.log('🔔 Navbar received unread count update:', count);
        this.unreadMessagesCount = count;
      },
      error: (err) => {
        console.error('❌ Error in navbar unread subscription:', err);
        this.unreadMessagesCount = 0;
      }
    });

    this.subscriptions.add(unreadSub);
  }

  private listenForNewMessages(): void {
    console.log('👂 Navbar listening for new messages');
    
    const messageSub = this.socketService.onNewMessage().subscribe((data) => {
      console.log('📩 NEW MESSAGE EVENT RECEIVED IN NAVBAR:', data);
      
      if (data && data.message) {
        const msg = data.message;
        const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
        const userId = localStorage.getItem('userId');
        
        if (senderId !== userId) {
          console.log('✅ Message is from another user, showing notification!');
          
          const senderName = typeof msg.senderId === 'object' && msg.senderId.name 
            ? msg.senderId.name 
            : this.translationService.translate('msg.unknown');
          
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
        console.log('⚠️ Could not play notification sound:', err);
      });
    } catch (err) {
      console.log('ℹ️ Notification sound not available:', err);
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
    console.log('🔴 Navbar destroying, cleaning up...');
    this.subscriptions.unsubscribe();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }
}
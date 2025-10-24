// navbar.component.ts - COMPLETE WITH BEAUTIFUL NOTIFICATIONS
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
    MatSnackBarModule
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
  
  private subscriptions = new Subscription();
  private notificationTimeout: any;

  constructor(
    private profileImageService: ProfileImageService, 
    private authService: AuthService, 
    private messageService: MessageService,
    private socketService: SocketService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    console.log('🔔 Navbar constructor called');
  }

  ngOnInit(): void {
    console.log('🔔 Navbar ngOnInit started');
    
    // Profile image subscription
    const profileSub = this.profileImageService.profileImage$.subscribe(
      (imageUrl: string) => {
        this.profileImageUrl = imageUrl;
      }
    );

    // Auth subscription - CRITICAL!
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      console.log('🔔 User login status:', this.isLoggedIn);
      
      if (user) {
        const userId = localStorage.getItem('userId');
        if (userId) {
          console.log('✅ User logged in, starting socket connection...');
          
          // CRITICAL: Connect socket
          this.connectToSocket(userId);
          
          // Start unread count monitoring
          this.startUnreadCountMonitoring();
          
          // Listen for new messages
          this.listenForNewMessages();
        }
      } else {
        console.log('❌ User logged out, disconnecting socket...');
        this.unreadMessagesCount = 0;
        this.socketService.disconnect();
      }
    });

    // Load saved profile image from localStorage
    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage) {
      this.profileImageUrl = savedImage;
    }

    this.subscriptions.add(profileSub);
    this.subscriptions.add(authSub);
    
    console.log('✅ Navbar initialization complete');
  }

  // ✅ Socket Connection
  private connectToSocket(userId: string): void {
    console.log('🔌 Connecting to socket with userId:', userId);
    
    // Force connection
    this.socketService.connect(userId);
    
    // Verify connection after delay
    setTimeout(() => {
      if (this.socketService.isConnected()) {
        console.log('✅ Socket connection verified');
      } else {
        console.warn('⚠️ Socket not connected, retrying...');
        this.socketService.connect(userId);
      }
    }, 1000);

    // Monitor connection status
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

  // ✅ Unread count monitoring
  private startUnreadCountMonitoring(): void {
    console.log('🔔 Starting unread count monitoring');
    
    // Initial load
    this.messageService.getUnreadCount().subscribe({
      next: (count) => {
        console.log('📊 Initial unread count:', count);
        this.unreadMessagesCount = count;
      },
      error: (err) => {
        console.error('❌ Error loading initial unread count:', err);
      }
    });

    // Subscribe to real-time updates
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

  // ✅ Listen for incoming messages - MAIN FEATURE!
  private listenForNewMessages(): void {
    console.log('👂 Navbar listening for new messages');
    
    const messageSub = this.socketService.onNewMessage().subscribe((data) => {
      console.log('📩 NEW MESSAGE EVENT RECEIVED IN NAVBAR:', data);
      
      if (data && data.message) {
        const msg = data.message;
        const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
        const userId = localStorage.getItem('userId');
        
        console.log('🔍 Checking message:', {
          senderId,
          userId,
          isFromCurrentUser: senderId === userId
        });
        
        // Only show notification if message is NOT from current user
        if (senderId !== userId) {
          console.log('✅ Message is from another user, showing notification!');
          
          const senderName = typeof msg.senderId === 'object' && msg.senderId.name 
            ? msg.senderId.name 
            : 'უცნობი მომხმარებელი';
          
          const senderAvatar = typeof msg.senderId === 'object' && msg.senderId.avatar
            ? msg.senderId.avatar
            : this.profileImageService.getDefaultAvatar();
          
          // Show notification
          this.showMessageNotification(
            senderName, 
            msg.content,
            senderAvatar
          );
          
          // Play sound
          this.playNotificationSound();
          
          // Update unread count
          this.messageService.getUnreadCount().subscribe();
        } else {
          console.log('ℹ️ Message is from current user, skipping notification');
        }
      } else {
        console.warn('⚠️ Invalid message data received:', data);
      }
    });

    this.subscriptions.add(messageSub);
    console.log('✅ Message listener registered');
  }

  // ✅ Show beautiful notification popup
  showMessageNotification(senderName: string, message: string, avatar?: string): void {
    console.log('🔔 Showing notification:', { senderName, message });
    
    // Clear previous timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Set notification data
    this.notificationData = {
      senderName,
      message: message.length > 50 ? message.substring(0, 50) + '...' : message,
      avatar: avatar || this.profileImageService.getDefaultAvatar()
    };

    this.showNotification = true;
    console.log('✅ Notification displayed');

    // Auto-hide after 5 seconds
    this.notificationTimeout = setTimeout(() => {
      console.log('⏱️ Auto-hiding notification');
      this.hideNotification();
    }, 5000);
  }

  // ✅ Hide notification
  hideNotification(): void {
    this.showNotification = false;
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  // ✅ Navigate to messages when notification clicked
  onNotificationClick(): void {
    console.log('🖱️ Notification clicked');
    this.hideNotification();
    this.router.navigate(['/dashboard'], { 
      queryParams: { tab: 'messages' } 
    });
  }

  // ✅ Play notification sound
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

  // ✅ Handle image load errors
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
    console.log('✅ Navbar cleanup complete');
  }
}
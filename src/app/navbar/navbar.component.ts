import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProfileImageService } from '../services/profileImage.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  imports: [MatButtonModule, RouterLink, RouterLinkActive, CommonModule, FormsModule, RouterModule, MatIcon],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  public isShow: boolean = false;
  isLoggedIn: boolean = false;
  profileImageUrl: string = 'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg';
  
  private subscriptions = new Subscription();

  constructor(
    private profileImageService: ProfileImageService, 
    private authService: AuthService, 
    private router: Router
  ) {
    console.log('Navbar constructor called');
  }

  ngOnInit(): void {
    console.log('Navbar ngOnInit started');
    console.log('Initial profileImageUrl:', this.profileImageUrl.substring(0, 50));
    
    // პროფილის სურათის subscription
    const profileSub = this.profileImageService.profileImage$.subscribe(
      (imageUrl: string) => {
        console.log('NEW IMAGE RECEIVED IN NAVBAR:', imageUrl.substring(0, 50) + '...');
        console.log('Old URL was:', this.profileImageUrl.substring(0, 50) + '...');
        this.profileImageUrl = imageUrl;
        console.log('Navbar profileImageUrl updated successfully');
      }
    );

    // ავტორიზაციის subscription
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      console.log('User login status:', this.isLoggedIn);
    });

    // localStorage-დან წავიკითხოთ შენახული სურათი
    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage) {
      console.log('Found saved image in localStorage');
      this.profileImageUrl = savedImage;
    }

    this.subscriptions.add(profileSub);
    this.subscriptions.add(authSub);
    
    console.log('Navbar initialization complete');
  }
  
  toggleMenu(): void {
    this.isShow = !this.isShow;
  }

  closeMenu(): void {
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
    this.closeMenu();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    console.log('Navbar destroyed, subscriptions cleaned up');
  }
}
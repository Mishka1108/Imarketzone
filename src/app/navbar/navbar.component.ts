import { Component, OnInit, OnDestroy } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProfileImageService } from '../services/profileImage.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { MatIcon } from '@angular/material/icon';



@Component({
  selector: 'app-navbar',
  imports: [ MatButtonModule, RouterLink,RouterLinkActive, CommonModule, FormsModule, RouterModule,MatIcon],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  public isShow:boolean=false
  profileImageUrl: string = '';
  isLoggedIn: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(private profileImageService :ProfileImageService, private authService:AuthService, private router :Router) {}

  ngOnInit(): void {
    this.subscription = this.profileImageService.profileImage$.subscribe(imageUrl => {
      this.profileImageUrl = imageUrl;
    });
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });
  }
  
  toggleMenu(){
    this.isShow = !this.isShow
  }
  closeMenu() {
  this.isShow = false;
}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onProfileImageClick(): void {
    // შევამოწმოთ დალოგინებულია თუ არა მომხმარებელი
    if (this.authService.isLoggedIn()) {
      // თუ დალოგინებულია, გადავამისამართოთ დაშბორდზე
      this.router.navigate(['/dashboard']);
    } else {
      // თუ არ არის დალოგინებული, გადავამისამართოთ ლოგინის გვერდზე
      this.router.navigate(['/auth/login']);
    }
  }
  logout(): void {
    this.authService.logout();
  }
    
}

import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard რომელიც უზრუნველყოფს, რომ მომხმარებელი ვერ გადავიდეს dashboard-ზე
 * სანამ პროფილს არ შეავსებს (თუ isNewUser ფლაგი true-ა)
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileCompletionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    console.log('🛡️ ProfileCompletionGuard - checking if profile is complete');
    
    // თუ მომხმარებელი ახალია და პროფილი არ არის შევსებული
    if (this.authService.isNewUser()) {
      console.log('❌ Profile not complete, redirecting to /complete-profile');
      
      // გადაიყვანე complete-profile-ზე
      return this.router.createUrlTree(['/complete-profile']);
    }
    
    console.log('✅ Profile complete, allowing access');
    return true;
  }
}

/**
 * Guard რომელიც უზრუნველყოფს, რომ complete-profile გვერდზე მხოლოდ
 * ახალი მომხმარებლები შეძლებენ შესვლას
 */
@Injectable({
  providedIn: 'root'
})
export class OnlyNewUsersGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    console.log('🛡️ OnlyNewUsersGuard - checking if user is new');
    
    // თუ მომხმარებელი არ არის ახალი
    if (!this.authService.isNewUser()) {
      console.log('❌ Not a new user, redirecting to /dashboard');
      
      // გადაიყვანე dashboard-ზე
      return this.router.createUrlTree(['/dashboard']);
    }
    
    console.log('✅ New user, allowing access to complete-profile');
    return true;
  }
}
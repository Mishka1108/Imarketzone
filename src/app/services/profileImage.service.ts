import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileImageService {
  // ✅ Default avatar URL
  private readonly DEFAULT_AVATAR = 'https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg';
  
  private profileImageSubject = new BehaviorSubject<string>(this.DEFAULT_AVATAR);
  public profileImage$: Observable<string> = this.profileImageSubject.asObservable();

  constructor() {
    // ✅ Load saved avatar from localStorage if exists
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar && savedAvatar.trim() !== '') {
      this.profileImageSubject.next(savedAvatar);
    }
  }

  updateProfileImage(imageUrl: string): void {
    if (imageUrl && imageUrl.trim() !== '') {
      this.profileImageSubject.next(imageUrl);
      localStorage.setItem('userAvatar', imageUrl);
    }
  }

  getCurrentProfileImage(): string {
    return this.profileImageSubject.getValue();
  }

  getDefaultAvatar(): string {
    return this.DEFAULT_AVATAR;
  }

  resetToDefault(): void {
    this.profileImageSubject.next(this.DEFAULT_AVATAR);
    localStorage.removeItem('userAvatar');
  }
}
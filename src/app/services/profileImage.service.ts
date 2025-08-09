import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileImageService {
  private profileImageSubject = new BehaviorSubject<string>('https://i.ibb.co/GvshXkLK/307ce493-b254-4b2d-8ba4-d12c080d6651.jpg');
  public profileImage$: Observable<string> = this.profileImageSubject.asObservable();

  constructor() {}

  updateProfileImage(imageUrl: string): void {
    this.profileImageSubject.next(imageUrl);
  }

  getCurrentProfileImage(): string {
    return this.profileImageSubject.getValue();
  }
}
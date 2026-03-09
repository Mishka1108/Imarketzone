import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<string>('ka');
  public currentLang$ = this.currentLangSubject.asObservable();

  constructor(
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object  // ✅ დამატება
  ) {
    // ✅ localStorage მხოლოდ browser-ში
    const savedLang = isPlatformBrowser(this.platformId)
      ? (localStorage.getItem('selectedLanguage') || 'ka')
      : 'ka';

    this.setLanguage(savedLang);
  }

  setLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLangSubject.next(lang);

    // ✅ localStorage და document მხოლოდ browser-ში
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedLanguage', lang);
      document.documentElement.lang = lang;
    }
  }

  getCurrentLanguage(): string {
    return this.currentLangSubject.value;
  }

  toggleLanguage(): void {
    const newLang = this.getCurrentLanguage() === 'ka' ? 'en' : 'ka';
    this.setLanguage(newLang);
  }
}
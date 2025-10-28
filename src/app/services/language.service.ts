// src/app/services/language.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<string>('ka');
  public currentLang$ = this.currentLangSubject.asObservable();

  constructor(private translate: TranslateService) {
    // Load saved language or default to Georgian
    const savedLang = localStorage.getItem('selectedLanguage') || 'ka';
    this.setLanguage(savedLang);
  }

  setLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLangSubject.next(lang);
    localStorage.setItem('selectedLanguage', lang);
    
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = lang;
  }

  getCurrentLanguage(): string {
    return this.currentLangSubject.value;
  }

  toggleLanguage(): void {
    const newLang = this.getCurrentLanguage() === 'ka' ? 'en' : 'ka';
    this.setLanguage(newLang);
  }
}
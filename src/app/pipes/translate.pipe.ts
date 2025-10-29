// src/app/pipes/translate.pipe.ts - FIXED CACHE ISSUE
import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Important: allows pipe to update when language changes
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private lastValue: string = '';
  private lastKey: string = '';
  private lastLang: string = '';
  private subscription: Subscription;
  private callCount = 0;

  constructor(
    private translationService: TranslationService,
    private cd: ChangeDetectorRef
  ) {
    
    // Subscribe to language changes
    this.subscription = this.translationService.currentLang$.subscribe((lang) => {
  
      // ✅ CLEAR CACHE WHEN LANGUAGE CHANGES
      this.lastValue = '';
      this.lastKey = '';
      this.lastLang = lang;
      
      this.cd.markForCheck();
    });
  }

  transform(key: string): string {
    this.callCount++;
    const currentLang = this.translationService.getCurrentLanguage();
    

    
    if (!key) {
      console.warn('⚠️ TranslatePipe: Empty key provided');
      return '';
    }

    // ✅ CHECK IF LANGUAGE CHANGED OR KEY CHANGED
    if (key === this.lastKey && currentLang === this.lastLang && this.lastValue) {
      return this.lastValue;
    }

    this.lastKey = key;
    this.lastLang = currentLang;
    this.lastValue = this.translationService.translate(key);
    
    
    return this.lastValue;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
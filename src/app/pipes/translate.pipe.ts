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
    console.log('🔧 TranslatePipe constructor called');
    
    // Subscribe to language changes
    this.subscription = this.translationService.currentLang$.subscribe((lang) => {
      console.log('🌐 TranslatePipe: Language changed to:', lang);
      console.log('🗑️ TranslatePipe: CLEARING CACHE!');
      
      // ✅ CLEAR CACHE WHEN LANGUAGE CHANGES
      this.lastValue = '';
      this.lastKey = '';
      this.lastLang = lang;
      
      this.cd.markForCheck();
      console.log('🔄 TranslatePipe: Change detection marked');
    });
  }

  transform(key: string): string {
    this.callCount++;
    const currentLang = this.translationService.getCurrentLanguage();
    
    console.log(`🔤 TranslatePipe.transform #${this.callCount} called`);
    console.log(`  Key: "${key}"`);
    console.log(`  Current Lang: "${currentLang}"`);
    console.log(`  Last Key: "${this.lastKey}"`);
    console.log(`  Last Lang: "${this.lastLang}"`);
    console.log(`  Cached Value: "${this.lastValue}"`);
    
    if (!key) {
      console.warn('⚠️ TranslatePipe: Empty key provided');
      return '';
    }

    // ✅ CHECK IF LANGUAGE CHANGED OR KEY CHANGED
    if (key === this.lastKey && currentLang === this.lastLang && this.lastValue) {
      console.log('♻️ TranslatePipe: Using cached value:', this.lastValue);
      return this.lastValue;
    }

    console.log('🆕 TranslatePipe: Getting NEW translation...');
    this.lastKey = key;
    this.lastLang = currentLang;
    this.lastValue = this.translationService.translate(key);
    
    console.log(`✅ TranslatePipe: New translation for "${key}" in "${currentLang}" →`, this.lastValue);
    
    return this.lastValue;
  }

  ngOnDestroy(): void {
    console.log('🔴 TranslatePipe destroyed, unsubscribing...');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
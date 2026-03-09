import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../env/environment';

declare let gtag: Function;

declare global {
  interface Window {
    dataLayer: any[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {

  // ✅ isBrowser - SSR-ში false, Browser-ში true
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // ✅ მხოლოდ browser-ში გაეშვება, SSR-ში არ
    if (this.isBrowser) {
      this.initializeGoogleAnalytics();
    }
  }

  private initializeGoogleAnalytics() {
    // ✅ browser-ში ვართ, document და window უსაფრთხოდ გამოიყენება
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.googleAnalytics}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    gtag = function() {
      window.dataLayer.push(arguments);
    };
    gtag('js', new Date());
    gtag('config', environment.googleAnalytics, {
      page_title: document.title,
      page_location: window.location.href
    });
  }

  trackPageView(url: string, title: string = '') {
    if (!this.isBrowser) return; // ✅ SSR-ში გამოტოვება
    gtag('config', environment.googleAnalytics, {
      page_path: url,
      page_title: title || document.title
    });
  }

  trackEvent(action: string, category: string, label?: string, value?: number) {
    if (!this.isBrowser) return;
    gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }

  trackConversion(event_name: string, parameters?: any) {
    if (!this.isBrowser) return;
    gtag('event', event_name, {
      currency: 'GEL',
      ...parameters
    });
  }

  trackSearch(search_term: string, category?: string) {
    if (!this.isBrowser) return;
    gtag('event', 'search', {
      search_term: search_term,
      category: category
    });
  }

  trackProductView(product_id: string, product_name: string, category: string, price?: number) {
    if (!this.isBrowser) return;
    gtag('event', 'view_item', {
      currency: 'GEL',
      value: price || 0,
      items: [{
        item_id: product_id,
        item_name: product_name,
        item_category: category,
        price: price || 0,
        quantity: 1
      }]
    });
  }

  trackFormSubmit(form_name: string, form_id?: string) {
    if (!this.isBrowser) return;
    gtag('event', 'form_submit', {
      form_name: form_name,
      form_id: form_id
    });
  }
}
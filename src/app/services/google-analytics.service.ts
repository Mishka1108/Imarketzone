import { Injectable } from '@angular/core';
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

  constructor() {
    // Initialize Google Analytics
    this.initializeGoogleAnalytics();
  }

  private initializeGoogleAnalytics() {
    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.googleAnalytics}`;
    document.head.appendChild(script);

    // Initialize gtag
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

  // Track page views
  trackPageView(url: string, title: string = '') {
    gtag('config', environment.googleAnalytics, {
      page_path: url,
      page_title: title || document.title
    });
  }

  // Track events
  trackEvent(action: string, category: string, label?: string, value?: number) {
    gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }

  // Track conversions (რეგისტრაცია, განცხადების დამატება, ა.შ.)
  trackConversion(event_name: string, parameters?: any) {
    gtag('event', event_name, {
      currency: 'GEL',
      ...parameters
    });
  }

  // Track search events
  trackSearch(search_term: string, category?: string) {
    gtag('event', 'search', {
      search_term: search_term,
      category: category
    });
  }

  // Track product views
  trackProductView(product_id: string, product_name: string, category: string, price?: number) {
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

  // Track form submissions
  trackFormSubmit(form_name: string, form_id?: string) {
    gtag('event', 'form_submit', {
      form_name: form_name,
      form_id: form_id
    });
  }
}
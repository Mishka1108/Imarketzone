import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export type Language = 'ka' | 'en';

interface Translations {
  [key: string]: {
    ka: string;
    en: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLangSubject = new BehaviorSubject<Language>('ka');
  public currentLang$ = this.currentLangSubject.asObservable();
  private apiUrl = 'http://localhost:3000/api';

  private translations: Translations = {
    'nav.home': { ka: 'მთავარი', en: 'Home' },
    'nav.products': { ka: 'პროდუქტები', en: 'Products' },
    'nav.contact': { ka: 'დაკავშირება', en: 'Contact' },
    'nav.rules': { ka: 'წესები', en: 'Rules' },
    'nav.courses': { ka: 'კურსები', en: 'Courses' },
    'nav.about': { ka: 'ჩვენ შესახებ', en: 'About Us' },
    'nav.login': { ka: 'შესვლა', en: 'Login' },
    'nav.logout': { ka: 'გასვლა', en: 'Logout' },
    'nav.dashboard': { ka: 'პანელი', en: 'Dashboard' },
    'nav.messages': { ka: 'შეტყობინებები', en: 'Messages' },
    'home.buySell': { ka: 'იყიდე და გაყიდე', en: 'Buy and Sell' },
    'home.easily': { ka: 'მარტივად!', en: 'Easily!' },
    'home.subtitle': { ka: 'თქვენთვის საუკეთესო ონლაინ მარკეტპლეისი', en: 'The best online marketplace for you' },
    'home.searchPlaceholder': { ka: 'რისი ძებნა გინდათ?', en: 'What are you looking for?' },
    'home.searchByCategory': { ka: 'მოძებნე კატეგორიით', en: 'Search by Category' },
    'home.category': { ka: 'კატეგორია', en: 'Category' },
    'home.foundProducts': { ka: 'ნაფოვნი პროდუქტი', en: 'Found Products' },
    'home.product': { ka: 'პროდუქტი', en: 'Product' },
    'home.price': { ka: 'ფასი', en: 'Price' },
    'home.priceNotSpecified': { ka: 'ფასი არ არის მითითებული', en: 'Price not specified' },
    'home.details': { ka: 'დეტალები', en: 'Details' },
    'home.noProductsFound': { ka: 'პროდუქტი ვერ მოიძებნა', en: 'No products found' },
    'home.startNow': { ka: 'დაიწყე ახლავე', en: 'Start Now' },
    'home.popularProducts': { ka: 'პოპულარული პროდუქტები', en: 'Popular Products' },
    'home.views': { ka: 'ნახვა', en: 'views' },
    'home.view': { ka: 'ნახვა', en: 'view' },
    'home.viewProduct': { ka: 'პროდუქტის ნახვა', en: 'View Product' },
    'home.seeMore': { ka: 'მეტის ნახვა', en: 'See More' },
    'home.noDescription': { ka: 'აღწერა არ არის', en: 'No description' },
    'home.popularCategories': { ka: 'პოპულარული კატეგორიები', en: 'Popular Categories' },
    'home.loading': { ka: 'იტვირთება პროდუქტები...', en: 'Loading products...' },
    'home.browseAllProducts': { ka: 'ყველა პროდუქტის ნახვა', en: 'Browse All Products' },
    'categories.phones': { ka: 'ტელეფონები', en: 'Phones' },
    'categories.tech': { ka: 'ტექნიკა', en: 'Electronics' },
    'categories.cars': { ka: 'ავტომობილები', en: 'Cars' },
    'categories.clothing': { ka: 'ტანსაცმელი', en: 'Clothing' },
    'categories.toys': { ka: 'სათამაშოები', en: 'Toys' },
    'categories.computers': { ka: 'კომპიუტერები', en: 'Computers' },
    'msg.newMessage': { ka: 'ახალი შეტყობინება', en: 'New Message' },
    'msg.unread': { ka: 'წაუკითხავი შეტყობინება', en: 'unread messages' },
    'msg.noMessages': { ka: 'შეტყობინებები არ არის', en: 'No Messages' },
    'msg.typeMessage': { ka: 'დაწერეთ შეტყობინება...', en: 'Type a message...' },
    'msg.send': { ka: 'გაგზავნა', en: 'Send' },
    'auth.email': { ka: 'ელ. ფოსტა', en: 'Email' },
    'auth.password': { ka: 'პაროლი', en: 'Password' },
    'auth.register': { ka: 'რეგისტრაცია', en: 'Register' },
    'common.save': { ka: 'შენახვა', en: 'Save' },
    'common.cancel': { ka: 'გაუქმება', en: 'Cancel' },
    'common.delete': { ka: 'წაშლა', en: 'Delete' },
    'common.edit': { ka: 'რედაქტირება', en: 'Edit' },
    'common.back': { ka: 'უკან', en: 'Back' },
    'common.loading': { ka: 'იტვირთება...', en: 'Loading...' },
    'common.error': { ka: 'შეცდომა', en: 'Error' },
    'common.success': { ka: 'წარმატებული', en: 'Success' },
    'common.close': { ka: 'დახურვა', en: 'Close' },
    'profile.uploadImage': { ka: 'ფოტოს ატვირთვა', en: 'Upload Photo' },
    'profile.changePassword': { ka: 'პაროლის შეცვლა', en: 'Change Password' },
    'profile.phone': { ka: 'ტელეფონი', en: 'Phone' },
  };

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object  // ✅ დამატება
  ) {
    this.loadLanguage();
  }

  private loadLanguage(): void {
    // ✅ localStorage მხოლოდ browser-ში
    if (!isPlatformBrowser(this.platformId)) return;

    const savedLang = localStorage.getItem('preferredLanguage') as Language;
    if (savedLang && (savedLang === 'ka' || savedLang === 'en')) {
      this.currentLangSubject.next(savedLang);
    }

    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get<{ language: Language }>(`${this.apiUrl}/users/${userId}/language`)
        .subscribe({
          next: (response) => {
            if (response.language) this.setLanguage(response.language);
          },
          error: () => {}
        });
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLangSubject.value;
  }

  setLanguage(lang: Language): void {
    this.currentLangSubject.next(lang);

    // ✅ localStorage მხოლოდ browser-ში
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem('preferredLanguage', lang);

    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.put(`${this.apiUrl}/users/${userId}/language`, { language: lang })
        .subscribe({ error: () => {} });
    }
  }

  toggleLanguage(): void {
    const newLang: Language = this.getCurrentLanguage() === 'ka' ? 'en' : 'ka';
    this.setLanguage(newLang);
  }

  translate(key: string): string {
    const currentLang = this.getCurrentLanguage();
    const translation = this.translations[key];
    if (!translation) return key;
    return translation[currentLang] || key;
  }

  instant(key: string): string {
    return this.translate(key);
  }

  getAllTranslations(): { [key: string]: string } {
    const currentLang = this.getCurrentLanguage();
    const result: { [key: string]: string } = {};
    Object.keys(this.translations).forEach(key => {
      result[key] = this.translations[key][currentLang];
    });
    return result;
  }
}
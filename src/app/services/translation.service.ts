// src/app/services/translation.service.ts - WITH DETAILED LOGS
import { Injectable } from '@angular/core';
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
    // Navbar
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

    // Home Page
    'home.buySell': { ka: 'იყიდე და გაყიდე', en: 'Buy and Sell' },
    'home.easily': { ka: 'მარტივად!', en: 'Easily!' },
    'home.subtitle': { ka: 'თქვენთვის საუკეთესო ონლაინ მარკეტპლეისი სადაც შეგიძლიათ იყიდოთ და გაყიდოთ ნებისმიერი პროდუქცია', en: 'The best online marketplace for you where you can buy and sell any product' },
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
    'home.sellEasyFree': { ka: '🚀 გაყიდე მარტივად — უფასოდ!', en: '🚀 Sell Easily — For Free!' },
    'home.sellPoint1': { ka: '🔹განათავსე შენი პირველი 5 პროდუქტი სრულიად უფასოდ', en: '🔹Post your first 5 products completely free' },
    'home.sellPoint2': { ka: '🔹გაიარე სწრაფი რეგისტრაცია', en: '🔹Quick registration' },
    'home.sellPoint3': { ka: '🔹განათავსე ფოტოები, აღწერა და დაიწყე გაყიდვა წამებში', en: '🔹Upload photos, description and start selling in seconds' },
    'home.sellPoint4': { ka: '🔹ტექნიკა, სათამაშოები, ტანსაცმელი, მანქანები და სხვა — რაც გინდა!', en: '🔹Tech, toys, clothing, cars and more — whatever you want!' },
    'home.startToday': { ka: '🔹დაიწყე დღესვე!', en: '🔹Start Today!' },
    'home.whyUs': { ka: '🌟 რატომ ჩვენ?', en: '🌟 Why Us?' },
    'home.whyPoint1': { ka: '✅ უფასო რეგისტრაცია', en: '✅ Free registration' },
    'home.whyPoint2': { ka: '✅ იპოვე მყიდველი ან გამყიდველი მარტივად', en: '✅ Find buyer or seller easily' },
    'home.whyPoint3': { ka: '✅ მომხმარებელზე ორიენტირებული სერვისი', en: '✅ User-oriented service' },
    'home.whyPoint4': { ka: '✅ თანამედროვე დიზაინი და სწრაფი მუშაობა', en: '✅ Modern design and fast performance' },
    'home.errorOpeningProduct': { ka: 'პროდუქტის გახსნისას წარმოიშვა შეცდომა', en: 'Error opening product' },
    'home.loading': { ka: 'იტვირთება პროდუქტები...', en: 'Loading products...' },
    'home.noPopularProducts': { ka: 'პოპულარული პროდუქტები ჯერ არ არის', en: 'No popular products yet' },
    'home.noPopularProductsDesc': { ka: 'დაელოდეთ პირველ პოპულარულ პროდუქტებს', en: 'Wait for the first popular products' },
    'home.browseAllProducts': { ka: 'ყველა პროდუქტის ნახვა', en: 'Browse All Products' },

    // Categories
    'categories.phones': { ka: 'ტელეფონები', en: 'Phones' },
    'categories.phonesDesc': { ka: 'iPhone, Samsung, Xiaomi და სხვა', en: 'iPhone, Samsung, Xiaomi and more' },
    'categories.tech': { ka: 'ტექნიკა', en: 'Electronics' },
    'categories.techDesc': { ka: 'ლეპტოპები, ტელევიზორები, აუდიო', en: 'Laptops, TVs, Audio' },
    'categories.cars': { ka: 'ავტომობილები', en: 'Cars' },
    'categories.carsDesc': { ka: 'ახალი და გამოყენებული მანქანები', en: 'New and used cars' },
    'categories.clothing': { ka: 'ტანსაცმელი', en: 'Clothing' },
    'categories.clothingDesc': { ka: 'მოდური ტანსაცმელი ყველასთვის', en: 'Fashion clothing for everyone' },
    'categories.toys': { ka: 'სათამაშოები', en: 'Toys' },
    'categories.toysDesc': { ka: 'ბავშვებისთვის და მოზრდილებისთვის', en: 'For kids and adults' },
    'categories.computers': { ka: 'კომპიუტერები', en: 'Computers' },
    'categories.computersDesc': { ka: 'PC, Mac, აქსესუარები', en: 'PC, Mac, Accessories' },

    // Messages & Notifications
    'msg.newMessage': { ka: 'ახალი შეტყობინება', en: 'New Message' },
    'msg.unread': { ka: 'წაუკითხავი შეტყობინება', en: 'unread messages' },
    'msg.clickToReply': { ka: 'დააჭირეთ პასუხის გასაცემად', en: 'Click to reply' },
    'msg.noMessages': { ka: 'შეტყობინებები არ არის', en: 'No Messages' },
    'msg.typeMessage': { ka: 'დაწერეთ შეტყობინება...', en: 'Type a message...' },
    'msg.send': { ka: 'გაგზავნა', en: 'Send' },
    'msg.unknown': { ka: 'უცნობი მომხმარებელი', en: 'Unknown User' },

    // Dashboard
    'dash.profile': { ka: 'პროფილი', en: 'Profile' },
    'dash.settings': { ka: 'პარამეტრები', en: 'Settings' },
    'dash.courses': { ka: 'ჩემი კურსები', en: 'My Courses' },
    'dash.notifications': { ka: 'შეტყობინებები', en: 'Notifications' },

    // Auth
    'auth.email': { ka: 'ელ. ფოსტა', en: 'Email' },
    'auth.password': { ka: 'პაროლი', en: 'Password' },
    'auth.confirmPassword': { ka: 'გაიმეორეთ პაროლი', en: 'Confirm Password' },
    'auth.name': { ka: 'სახელი', en: 'Name' },
    'auth.register': { ka: 'რეგისტრაცია', en: 'Register' },
    'auth.forgotPassword': { ka: 'დაგავიწყდათ პაროლი?', en: 'Forgot Password?' },
    'auth.noAccount': { ka: 'არ გაქვთ ანგარიში?', en: "Don't have an account?" },
    'auth.hasAccount': { ka: 'უკვე გაქვთ ანგარიში?', en: 'Already have an account?' },

    // Common
    'common.save': { ka: 'შენახვა', en: 'Save' },
    'common.cancel': { ka: 'გაუქმება', en: 'Cancel' },
    'common.delete': { ka: 'წაშლა', en: 'Delete' },
    'common.edit': { ka: 'რედაქტირება', en: 'Edit' },
    'common.back': { ka: 'უკან', en: 'Back' },
    'common.next': { ka: 'შემდეგი', en: 'Next' },
    'common.loading': { ka: 'იტვირთება...', en: 'Loading...' },
    'common.error': { ka: 'შეცდომა', en: 'Error' },
    'common.success': { ka: 'წარმატებული', en: 'Success' },
    'common.close': { ka: 'დახურვა', en: 'Close' },
    'common.currency': { ka: 'ლარი', en: 'GEL' },

    // Courses
    'course.enroll': { ka: 'ჩაწერა', en: 'Enroll' },
    'course.start': { ka: 'დაწყება', en: 'Start' },
    'course.continue': { ka: 'გაგრძელება', en: 'Continue' },
    'course.completed': { ka: 'დასრულებული', en: 'Completed' },
    'course.progress': { ka: 'პროგრესი', en: 'Progress' },
    'course.lessons': { ka: 'გაკვეთილები', en: 'Lessons' },
    'course.description': { ka: 'აღწერა', en: 'Description' },
    'course.instructor': { ka: 'ინსტრუქტორი', en: 'Instructor' },

    // Profile
    'profile.uploadImage': { ka: 'ფოტოს ატვირთვა', en: 'Upload Photo' },
    'profile.changePassword': { ka: 'პაროლის შეცვლა', en: 'Change Password' },
    'profile.updateProfile': { ka: 'პროფილის განახლება', en: 'Update Profile' },
    'profile.bio': { ka: 'ბიოგრაფია', en: 'Bio' },
    'profile.phone': { ka: 'ტელეფონი', en: 'Phone' },
    'profile.address': { ka: 'მისამართი', en: 'Address' },
    'profile.profile': { ka: 'პროფილი', en: 'Profile' },
    'profile.avatar': { ka: 'მომხმარებლის ავატარი', en: 'User avatar' },
  };

  constructor(private http: HttpClient) {
    this.loadLanguage();
  }

  // ✅ Load saved language from localStorage and backend
  private loadLanguage(): void {
    const savedLang = localStorage.getItem('preferredLanguage') as Language;
    
    if (savedLang && (savedLang === 'ka' || savedLang === 'en')) {
      this.currentLangSubject.next(savedLang);
    } else {
    }

    // If user is logged in, sync with backend
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.get<{ language: Language }>(`${this.apiUrl}/users/${userId}/language`)
        .subscribe({
          next: (response) => {
            if (response.language) {
              this.setLanguage(response.language);
            }
          },
          error: (err) => {
          }
        });
    } else {
    }
  }

  // ✅ Get current language
  getCurrentLanguage(): Language {
    const lang = this.currentLangSubject.value;
    return lang;
  }

  // ✅ Set language
  setLanguage(lang: Language): void {
    this.currentLangSubject.next(lang);
    
    localStorage.setItem('preferredLanguage', lang);
    

    // Save to backend if user is logged in
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.http.put(`${this.apiUrl}/users/${userId}/language`, { language: lang })
        .subscribe({
          error: (err) => console.error('❌ Could not save language to backend:', err)
        });
    } else {
    }
    
  }

  // ✅ Toggle between Georgian and English
  toggleLanguage(): void {
    const currentLang = this.getCurrentLanguage();
    const newLang: Language = currentLang === 'ka' ? 'en' : 'ka';
    this.setLanguage(newLang);
  }

  // ✅ Translate a key
  translate(key: string): string {
    
    const currentLang = this.getCurrentLanguage();
    
    const translation = this.translations[key];
    
    if (!translation) {
      console.warn(`⚠️ Translation not found for key: ${key}`);
      return key;
    }

    const result = translation[currentLang];
    
    if (!result) {
      console.warn(`⚠️ No translation for language ${currentLang}, returning key`);
      return key;
    }
    
    return result;
  }

  // ✅ Instant translation (for use in templates)
  instant(key: string): string {
    return this.translate(key);
  }

  // ✅ Get all translations for current language
  getAllTranslations(): { [key: string]: string } {
    const currentLang = this.getCurrentLanguage();
    const result: { [key: string]: string } = {};
    
    
    Object.keys(this.translations).forEach(key => {
      result[key] = this.translations[key][currentLang];
    });

    return result;
  }
}
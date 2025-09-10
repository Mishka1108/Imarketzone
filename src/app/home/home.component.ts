// home.component.ts - ნახვების რეალური API ინტეგრაცია

import { Component, OnInit, HostListener, OnDestroy, Inject, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SeoService } from '../../seo.service';
import { ProductService } from '../services/product.service';
import { Meta, Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError  } from 'rxjs/operators';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-home',
  imports: [MatButtonModule, RouterLink, FormsModule, CommonModule, CarouselModule, ButtonModule, TagModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomeComponent implements OnInit, OnDestroy {
  
  searchQuery: string = '';
  showSuggestions: boolean = false;
  filteredSuggestions: any[] = [];
  allProducts: any[] = []; 
  isLoadingProducts: boolean = false;
  isLoadingViews: boolean = false;
    responsiveOptions: any[] | undefined;
  products: any[] = [];
  loading = true;
  error: string | null = null;
  
  categories: string[] = [
    'ტელეფონები', 'ტექნიკა', 'ავტომობილები', 'ტანსაცმელი', 
    'სათამაშოები', 'კომპიუტერები', 'სპორტი', 'წიგნები'
  ];
  
  constructor(
    private router: Router, 
    private seoService: SeoService,
    private productService: ProductService,
    private meta: Meta,
    private title: Title,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  

  
  ngOnInit() {
    this.setupSEO();
    this.loadAllProducts();
    if (isPlatformBrowser(this.platformId)) {
      this.addStructuredData();
    }
    this.loadProductsWithRealViews();
     this.responsiveOptions = [
    {
        breakpoint: '1920px',
        numVisible: 4,
        numScroll: 1
    },
    {
        breakpoint: '1400px',
        numVisible: 3,
        numScroll: 1
    },
    {
        breakpoint: '1024px',
        numVisible: 3,
        numScroll: 1
    },
     {
        breakpoint: '962px',
        numVisible: 2,
        numScroll: 1
    },
    {
        breakpoint: '768px',
        numVisible: 2,
        numScroll: 1
    },
    {
        breakpoint: '480px',
        numVisible: 1,
        numScroll: 1
    }
]
  }

  

  ngOnDestroy() {
    // cleanup if needed
  }



  getProductsWithHighViews(): any[] {
  if (!this.products || this.products.length === 0) {
    console.log('🔍 არ არის პროდუქტები ჩასატვირთად');
    return [];
  }

  // ვფილტრავთ მხოლოდ 100+ ნახვის მქონე პროდუქტებს
  const highViewProducts = this.products.filter(product => {
    const viewCount = product.viewCount || product.views || product.totalViews || 0;
    const hasHighViews = viewCount > 100;
    
    console.log(`📊 პროდუქტი: ${product.title} - ნახვები: ${viewCount} - მაღალი: ${hasHighViews}`);
    
    return hasHighViews;
  });




  console.log(`✅ მაღალი ნახვების მქონე პროდუქტები: ${highViewProducts.length}/${this.products.length}`);

  // დავალაგოთ ნახვების მიხედვით (ყველაზე მეტიდან ნაკლებისკენ)
  const sortedProducts = highViewProducts.sort((a, b) => {
    const viewsA = a.viewCount || a.views || a.totalViews || 0;
    const viewsB = b.viewCount || b.views || b.totalViews || 0;
    return viewsB - viewsA;
  });

  // ვაბრუნებთ მაქსიმუმ 12 პროდუქტს
  return sortedProducts.slice(0, 12);
}

// დამატებითი მეთოდი - შეამოწმოს არის თუ არა პოპულარული პროდუქტები
hasPopularProducts(): boolean {
  return this.getProductsWithHighViews().length > 0;
}

// დამატებითი მეთოდი - პოპულარული პროდუქტების რაოდენობა
getPopularProductsCount(): number {
  return this.getProductsWithHighViews().length;
}
     
  // მთავარი მეთოდი - პროდუქტების ჩატვირთვა რეალური ნახვებით
  loadProductsWithRealViews() {
    
    this.loading = true;
    this.isLoadingViews = true;
    this.error = null;
    
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        
        const allProducts = response.products || response.data || response || [];

        
        if (allProducts.length === 0) {
          this.products = [];
          this.loading = false;
          this.isLoadingViews = false;
          return;
        }

        // ვფილტრავთ პროდუქტებს, რომლებსაც აქვთ ნახვების ინფორმაცია
        this.processProductsWithRealViews(allProducts);
      },
      error: (error) => {
        console.error('❌ პროდუქტების ჩატვირთვის შეცდომა:', error);
        this.error = 'პროდუქტების ჩატვირთვა ვერ მოხერხდა';
        this.loading = false;
        this.isLoadingViews = false;
      }
    });
  }

  // პროდუქტების დამუშავება რეალური ნახვების მონაცემებთან ერთად
  private processProductsWithRealViews(allProducts: any[]) {
    
    // ვალაგებთ პროდუქტებს ნახვების მიხედვით (თუ ნახვების ინფორმაცია უკვე არის API response-ში)
    const productsWithViewData = allProducts.map(product => {
      const viewCount = product.viewCount || product.views || product.totalViews || 0;
      return {
        ...product,
        viewCount: viewCount,
        hasViews: viewCount > 0
      };
    });

  

    // ვფილტრავთ და ვალაგებთ ნახვების მიხედვით
    const sortedProducts = productsWithViewData
      .filter(product => product.viewCount > 0) // მხოლოდ ნახვების მქონე პროდუქტები
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)); // ნახვების მიხედვით დალაგება

 

    if (sortedProducts.length === 0) {
     
      // თუ არც ერთ პროდუქტს არ აქვს ნახვები, ვიღებთ ყველაზე ახალს
      this.products = productsWithViewData.slice(0, 12);
    } else {
      // ვიღებთ მაქსიმუმ 12 პროდუქტს
      this.products = sortedProducts.slice(0, 12);
    }

  
    
    this.loading = false;
    this.isLoadingViews = false;
  }

  // ალტერნატიული მეთოდი - თუ API response-ში ნახვების ინფორმაცია არ არის
  private loadProductsWithAsyncViews(allProducts: any[]) {
    console.log('🔄 ალტერნატიული მეთოდი: async ნახვების ჩატვირთვა...');
    
    const productsToCheck = allProducts.slice(0, 20); // პირველი 20 პროდუქტი
    const viewRequests: Observable<any>[] = [];

    productsToCheck.forEach(product => {
      const productId = product._id || product.id;
      if (productId) {
        const viewRequest = this.productService.getProductViewStats(productId).pipe(
          map(stats => ({
            productId,
            product,
            viewCount: stats.views || stats.viewCount || 0
          })),
          catchError(() => of({
            productId,
            product,
            viewCount: 0
          }))
        );
        viewRequests.push(viewRequest);
      }
    });

    if (viewRequests.length === 0) {
      this.products = [];
      this.loading = false;
      this.isLoadingViews = false;
      return;
    }

    // Batch processing - ყველა request-ის პარალელურად გაშვება
    forkJoin(viewRequests).subscribe({
      next: (results) => {
        console.log('✅ ნახვების მონაცემები მიღებულია:', results);
        
        const productsWithViews = results
          .filter(result => result.viewCount > 0)
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 12)
          .map(result => ({
            ...result.product,
            viewCount: result.viewCount
          }));

        console.log(`🔥 საბოლოო სია ნახვებით: ${productsWithViews.length}`);
        
        this.products = productsWithViews;
        this.loading = false;
        this.isLoadingViews = false;
      },
      error: (error) => {
        console.error('❌ ნახვების მონაცემების მიღების შეცდომა:', error);
        this.products = allProducts.slice(0, 12);
        this.loading = false;
        this.isLoadingViews = false;
      }
    });
  }

  // ნახვების ფორმატირება (1000+ -> 1.0ც, 1000000+ -> 1.0მ)
  formatViews(views: number | undefined | null): string {
    const numViews = Number(views);
    
    if (isNaN(numViews) || numViews < 0) {
      return '0';
    }
    
    if (numViews >= 1000000) {
      return Math.floor(numViews / 100000) / 10 + 'მ';
    } else if (numViews >= 1000) {
      return Math.floor(numViews / 100) / 10 + 'ც';
    } else {
      return numViews.toString();
    }
  }

  // პროდუქტის ნახვა - ნახვის რეგისტრაციით
  viewProduct(productId: string) {
    console.log('🔍 იხსნება პროდუქტი:', productId);
    const slug = this.generateProductUrl(productId);
    this.router.navigate([slug]);
    if (!productId) {
      console.error('❌ არასწორი პროდუქტის ID');
      this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
      return;
    }
    
    
    // ვრეკორდავთ ნახვას
    this.productService.recordView(productId).subscribe({
      next: (response) => {
        console.log('✅ ნახვა დაფიქსირდა:', response);
        
        // ვაღრმავებთ ნახვების რაოდენობას UI-ში
        const product = this.products.find(p => (p._id || p.id) === productId);
        if (product) {
          product.viewCount = (product.viewCount || 0) + 1;
          console.log(`📈 განახლებული ნახვები: ${product.viewCount}`);
        }
      },
      error: (error) => {
        console.error('❌ ნახვის რეგისტრაციის შეცდომა:', error);
      }
    });

    // გადასვლა პროდუქტის დეტალებზე
    const product = this.products.find(p => (p._id || p.id) === productId);
    if (product && product.title) {
      const productUrl = this.generateProductUrl(product.title);
      console.log('🔗 გადავდივართ URL-ზე:', productUrl);
      
      this.router.navigate([productUrl]).then(success => {
        if (success) {
          console.log('✅ წარმატებით გადავედით პროდუქტის დეტალებზე');
          this.scrollToTop();
        } else {
          console.error('❌ URL navigation ვერ მოხერხდა');
          this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
        }
      });
    } else {
      // Fallback navigation ID-ს გამოყენებით
      this.router.navigate(['/product-details', productId]).then(success => {
        if (success) {
          console.log('✅ Fallback navigation წარმატებული');
          this.scrollToTop();
        } else {
          console.error('❌ Fallback navigation-იც ვერ მოხერხდა');
          this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
        }
      });
    }
  }

  // SnackBar შეტყობინების ჩვენება
  private showSnackBar(message: string): void {
    if (this.snackBar) {
      this.snackBar.open(message, 'დახურვა', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar']
      });
    } else {
      console.warn(message);
    }
  }

  // SEO კონფიგურაცია
  private setupSEO(): void {
    this.title.setTitle('ყიდვა გაყიდვა საქართველოში | iMarket Zone - ონლაინ მარკეტპლეისი');

    this.meta.updateTag({ 
      name: 'description', 
      content: 'ყიდვა გაყიდვა მარტივად საქართველოში! ახალი და გამოყენებული ნივთები - ტელეფონები, ტექნიკა, მანქანები, ტანსაცმელი. უფასო განცხადებები, სწრაფი მყიდველი, მარტივი გაყიდვა.' 
    });

    this.meta.updateTag({ 
      name: 'keywords', 
      content: 'ყიდვა, გაყიდვა, უფასო განცხადებები, ონლაინ მაღაზია, მყიდველი, გამყიდველი, ახალი ნივთები, გამოყენებული ნივთები, ტელეფონების ყიდვა, მანქანების გაყიდვა, ტექნიკის ყიდვა, ონლაინ მარკეტპლეისი, imarket zone' 
    });

    // Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: 'ყიდვა გაყიდვა საქართველოში | iMarket Zone' });
    this.meta.updateTag({ property: 'og:description', content: 'ყიდვა გაყიდვა მარტივად! ახალი და გამოყენებული ნივთები, უფასო განცხადებები, სწრაფი გადაწყვეტილება.' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://imarketzone.ge' });
    this.meta.updateTag({ property: 'og:image', content: 'https://imarketzone.ge/assets/images/og-buy-sell.jpg' });
    this.meta.updateTag({ property: 'og:locale', content: 'ka_GE' });
    this.meta.updateTag({ property: 'og:site_name', content: 'iMarket Zone' });

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'ყიდვა გაყიდვა საქართველოში | iMarket Zone' });
    this.meta.updateTag({ name: 'twitter:description', content: 'ყიდვა გაყიდვა მარტივად! ახალი და გამოყენებული ნივთები, უფასო განცხადებები.' });
    this.meta.updateTag({ name: 'twitter:image', content: 'https://imarketzone.ge/assets/images/twitter-buy-sell.jpg' });

    // Additional SEO tags
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' });
    this.meta.updateTag({ name: 'author', content: 'iMarket Zone' });
    this.meta.updateTag({ name: 'language', content: 'Georgian' });
    this.meta.updateTag({ name: 'geo.region', content: 'GE' });
    this.meta.updateTag({ name: 'geo.country', content: 'Georgia' });
    this.meta.updateTag({ name: 'geo.placename', content: 'Tbilisi, Georgia' });

    this.meta.updateTag({ rel: 'canonical', href: 'https://imarketzone.ge' });
    this.meta.updateTag({ rel: 'alternate', hreflang: 'ka', href: 'https://imarketzone.ge' });
    this.meta.updateTag({ rel: 'alternate', hreflang: 'en', href: 'https://imarketzone.ge/en' });
  }

  // Structured Data-ს დამატება
  private addStructuredData(): void {
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    const structuredData = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "iMarket Zone - ყიდვა გაყიდვის ონლაინ მარკეტპლეისი",
        "alternateName": [
          "iMarket Zone",
          "ყიდვა გაყიდვა საქართველოში",
          "ონლაინ მაღაზია საქართველო"
        ],
        "url": "https://imarketzone.ge",
        "description": "ყიდვა გაყიდვა მარტივად საქართველოში! ახალი და გამოყენებული ნივთები - ტელეფონები, ტექნიკა, მანქანები, ტანსაცმელი. უფასო განცხადებები.",
        "inLanguage": ["ka-GE", "en-US"],
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": "https://imarketzone.ge/public-products?search={search_term_string}",
            "query-input": "required name=search_term_string"
          },
          {
            "@type": "BuyAction",
            "target": "https://imarketzone.ge/public-products"
          },
          {
            "@type": "SellAction",
            "target": "https://imarketzone.ge/login"
          }
        ],
        "sameAs": [
          "https://www.facebook.com/imarketzone",
          "https://www.instagram.com/imarketzone"
        ],
        "publisher": {
          "@type": "Organization",
          "name": "iMarket Zone",
          "logo": {
            "@type": "ImageObject",
            "url": "https://imarketzone.ge/assets/images/logo.png"
          }
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Marketplace",
        "name": "iMarket Zone",
        "url": "https://imarketzone.ge",
        "description": "საქართველოს ყველაზე დიდი ონლაინ მარკეტპლეისი ყიდვა-გაყიდვისთვის",
        "areaServed": {
          "@type": "Country",
          "name": "Georgia"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "პროდუქტების კატალოგი",
          "itemListElement": this.categories.map((category, index) => ({
            "@type": "OfferCatalog",
            "name": category,
            "position": index + 1,
            "url": `https://imarketzone.ge/public-products?category=${encodeURIComponent(category)}`
          }))
        },
        "paymentAccepted": ["Cash", "Bank Transfer", "PayPal", "Credit Card"],
        "priceRange": "1₾ - 50000₾",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "41.7151",
          "longitude": "44.8271"
        },
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "GE",
          "addressRegion": "Tbilisi"
        }
      }
    ];

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  // პროდუქტის URL-ის გენერირება
  private generateProductUrl(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const encodedSlug = encodeURIComponent(slug);
    return `/product-details/${encodedSlug}`;
  }

  // ძებნის ფუნქციონალი
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.scrollToTop();
      this.showSuggestions = false;
      
      if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
        (window as any).gtag('event', 'search', {
          search_term: this.searchQuery.trim()
        });
      }
      
      console.log(`ძებნა: ${this.searchQuery}`);
      
      this.title.setTitle(`${this.searchQuery} - ძებნა | iMarket Zone`);
      this.meta.updateTag({ 
        name: 'description', 
        content: `იპოვეთ ${this.searchQuery} iMarket Zone-ზე. ყიდვა გაყიდვა მარტივად საქართველოში. ახალი და გამოყენებული ნივთები.` 
      });
      
      this.seoService.updatePageSEO('search', this.searchQuery);
      this.router.navigate(['/public-products'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
    }
  }

  // კატეგორიის არჩევა
  onCategoryClick(category: string): void {
    this.scrollToTop();
    
    if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
      (window as any).gtag('event', 'select_content', {
        content_type: 'category',
        item_id: category
      });
    }
    
    console.log(`კატეგორია დაჭერილია: ${category}`);
    
    this.title.setTitle(`${category} - ყიდვა გაყიდვა | iMarket Zone`);
    this.meta.updateTag({ 
      name: 'description', 
      content: `${category} ყიდვა გაყიდვა საქართველოში. იპოვეთ ახალი და გამოყენებული ${category} iMarket Zone-ზე. უფასო განცხადებები.` 
    });
    
    this.seoService.updatePageSEO('category', category);
    this.router.navigate(['/public-products'], { 
      queryParams: { category: category } 
    });
  }

  // კატეგორიის არჩევა suggestions-იდან
  selectCategory(category: string): void {
    this.searchQuery = category;
    this.showSuggestions = false;
    this.onCategoryClick(category);
  }

  // პროდუქტის არჩევა suggestions-იდან
  selectProduct(product: any): void {
    console.log('პროდუქტი არჩეულია:', product);
    this.searchQuery = product.title;
    this.showSuggestions = false;
    
    if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
      (window as any).gtag('event', 'select_item', {
        item_category: product.category,
        item_name: product.title,
        value: product.price
      });
    }
    
    const productUrl = this.generateProductUrl(product.title);
    console.log('გადავდივართ URL-ზე:', productUrl);
    
    this.router.navigate([productUrl]).then(success => {
      if (success) {
        console.log('წარმატებით გადავედით პროდუქტის დეტალებზე');
        this.scrollToTop();
      } else {
        console.error('URL navigation ვერ მოხერხდა, ვცადოთ ID-ით');
        const productId = product._id || product.id;
        this.router.navigate(['/product-details', productId]).then(fallbackSuccess => {
          if (fallbackSuccess) {
            console.log('Fallback navigation წარმატებული');
            this.scrollToTop();
          } else {
            console.error('Fallback navigation-იც ვერ მოხერხდა');
            this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
          }
        });
      }
    }).catch(error => {
      console.error('Navigation შეცდომა:', error);
      this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
    });
  }

  // Products Loading for Search Suggestions
  private loadAllProducts(): void {
    if (this.isLoadingProducts) {
      console.log('Already loading products, skipping...');
      return;
    }
    
    this.isLoadingProducts = true;
    console.log('Starting to load products for suggestions...');
    
    this.productService.getAllProducts().subscribe({
      next: (response: any) => {
        console.log('Raw API Response:', response);
        
        let products = [];
        if (response.products) {
          products = response.products;
        } else if (response.data) {
          products = response.data;
        } else if (Array.isArray(response)) {
          products = response;
        } else {
          products = [];
        }
        
        this.allProducts = products;
        this.isLoadingProducts = false;
        
        console.log('Successfully loaded products for suggestions:', this.allProducts.length);
        
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
      },
      error: (error) => {
        console.error('Error loading products for suggestions:', error);
        this.isLoadingProducts = false;
        
        // Fallback data for suggestions
        this.allProducts = [
          { 
            _id: 'fallback-1',
            title: 'Samsung Galaxy S24', 
            image: 'https://via.placeholder.com/40', 
            category: 'ტელეფონები',
            price: 1200 
          },
          { 
            _id: 'fallback-2',
            title: 'iPhone 15 Pro', 
            image: 'https://via.placeholder.com/40', 
            category: 'ტელეფონები',
            price: 1500 
          },
          { 
            _id: 'fallback-3',
            title: 'MacBook Pro', 
            image: 'https://via.placeholder.com/40', 
            category: 'კომპიუტერები',
            price: 2000 
          }
        ];
        
        console.log('Using fallback products for suggestions:', this.allProducts.length);
        
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
      }
    });
  }

  // Document Click Handler - Hide suggestions when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && !searchContainer.contains(event.target)) {
      this.showSuggestions = false;
    }
  }
  // Scroll to Top
  private scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Search Input Handler
  onSearchInput(event: any): void {
    const value = event.target.value;
    this.searchQuery = value;
    if (value.trim().length > 0) {
      this.showSuggestions = true;
      
      if (this.allProducts.length === 0 && !this.isLoadingProducts) {
     
        this.loadAllProducts();
      }
      
      this.updateSuggestions();
    } else {
      this.showSuggestions = false;
      this.filteredSuggestions = [];
    }
  }

  // Update Suggestions based on search query
  private updateSuggestions(): void {
    const query = this.searchQuery.toLowerCase();
    const categories = this.getFilteredCategories();
    const products = this.getFilteredProducts();
    
  
    
    this.filteredSuggestions = [...categories, ...products];
  }

  // Get Filtered Categories
  getFilteredCategories(): string[] {
    if (!this.searchQuery.trim()) return [];
    const query = this.searchQuery.toLowerCase();
    return this.categories.filter(category => 
      category.toLowerCase().includes(query)
    );
  }

  // Get Filtered Products
  getFilteredProducts(): any[] {
    if (!this.searchQuery.trim()) {
  
      return [];
    }
    
    if (this.allProducts.length === 0) {
      return [];
      
    }
    
    const query = this.searchQuery.toLowerCase();

    
    const filtered = this.allProducts.filter(product => {
      const titleMatch = product.title && product.title.toLowerCase().includes(query);
      const descriptionMatch = product.description && product.description.toLowerCase().includes(query);
      const categoryMatch = product.category && product.category.toLowerCase().includes(query);
      
      const isMatch = titleMatch || descriptionMatch || categoryMatch;
    
      return isMatch;
    });
    return filtered.slice(0, 5); // Limit to 5 suggestions
  }

  // Get Product Image with fallback
  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    if (product.image) {
      return product.image;
    }
    return 'https://via.placeholder.com/300x200?text=No+Image';
  }

  // Handle Image Loading Errors
  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
  }
}
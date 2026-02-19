// home.component.ts - FULL SEO OPTIMIZED VERSION

import { Component, OnInit, HostListener, OnDestroy, Inject, PLATFORM_ID, signal, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG Imports
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { SeoService } from '../../seo.service';
import { ProductService } from '../services/product.service';
import { CategoryTranslatePipe } from "../pipes/category-translate.pipe";
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, A11y } from 'swiper/modules';
Swiper.use([Navigation, Pagination, Autoplay, A11y]);
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    TranslateModule,
    CategoryTranslatePipe,
    CarouselModule,
    ButtonModule,
    TagModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  
  @ViewChild('carouselContainer') carouselContainer!: ElementRef;
  
  searchQuery: string = '';
  showSuggestions: boolean = false;
  filteredSuggestions: any[] = [];
  allProducts: any[] = []; 
  isLoadingProducts: boolean = false;
  isLoadingViews: boolean = false;
  products = signal<any[]>([]);
  loading = true;
  error: string | null = null;

  responsiveOptions: any[] = [];
  
  categories: string[] = [
    'ტელეფონები', 'ტექნიკა', 'ავტომობილები', 'ტანსაცმელი', 
    'სათამაშოები', 'კომპიუტერები', 'სპორტი', 'წიგნები'
  ];
 popularSwiperInstance: Swiper | null = null;
  
  constructor(
    private router: Router, 
    private seoService: SeoService,
    private productService: ProductService,
    private meta: Meta,
    private title: Title,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.responsiveOptions = [
      { breakpoint: '1400px', numVisible: 4, numScroll: 1 },
      { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
      { breakpoint: '991px', numVisible: 2, numScroll: 1 },
      { breakpoint: '767px', numVisible: 2, numScroll: 1 },
      { breakpoint: '575px', numVisible: 1, numScroll: 1 }
    ];
  }

  ngAfterViewInit() {
  if (isPlatformBrowser(this.platformId)) {
    setTimeout(() => this.initSwiper(), 500);
  }
}
 private initSwiper(): void {
  if (this.popularSwiperInstance) {
    this.popularSwiperInstance.destroy(true, true);
  }

  this.popularSwiperInstance = new Swiper('.popular-swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    navigation: {
      prevEl: '.popular-prev',
      nextEl: '.popular-next',
    },
    pagination: {
      el: '.popular-pagination',
      clickable: true,
      dynamicBullets: true,
    },
    a11y: {
      prevSlideMessage: 'წინა სლაიდი',
      nextSlideMessage: 'შემდეგი სლაიდი',
    },
    breakpoints: {
      575: { slidesPerView: 1, spaceBetween: 16 },
      768: { slidesPerView: 2, spaceBetween: 20 },
      992: { slidesPerView: 3, spaceBetween: 24 },
      1200: { slidesPerView: 4, spaceBetween: 24 },
    },
  });
}

  private preventCarouselScrollInterference(): void {
    setTimeout(() => {
      const carouselElement = document.querySelector('.carousel-container');
      
      if (carouselElement) {
        carouselElement.addEventListener('wheel', (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
        }, { passive: false });

        carouselElement.addEventListener('touchstart', (e: Event) => {
          e.stopPropagation();
        }, { passive: true });

        carouselElement.addEventListener('touchmove', (e: Event) => {
          e.stopPropagation();
        }, { passive: true });

        const pCarousel = carouselElement.querySelector('.p-carousel');
        if (pCarousel) {
          pCarousel.addEventListener('wheel', (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
          }, { passive: false });
        }
      }
    }, 800);
  }

  ngOnInit() {
    this.loadProductsWithRealViews();
    this.setupAdvancedSEO();
    this.loadAllProducts();
    
    if (isPlatformBrowser(this.platformId)) {
      this.addAllStructuredData();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      const carouselElement = document.querySelector('.carousel-container');
      if (carouselElement) {
        carouselElement.removeEventListener('wheel', () => {});
        carouselElement.removeEventListener('touchmove', () => {});
      }
    }
  }

  // ==================== ADVANCED SEO SETUP ====================

  private setupAdvancedSEO(): void {
    // Primary Title
    const pageTitle = 'ყიდვა გაყიდვა საქართველოში უფასოდ | iMarketZone - ონლაინ მარკეტპლეისი';
    this.title.setTitle(pageTitle);
    
    // Meta Description
    const description = 'ყიდვა გაყიდვა საქართველოში უფასოდ ⭐ ტელეფონები, ავტომობილები, ტექნიკა, ტანსაცმელი და სხვა ათასობით პროდუქტი | iMarketZone - საქართველოს #1 ონლაინ მარკეტპლეისი';
    this.meta.updateTag({ name: 'description', content: description });
    
    // Keywords - ძალიან მნიშვნელოვანი SEO-სთვის
    const keywords = 'ყიდვა გაყიდვა, ყიდვა გაყიდვა საქართველოში, ყიდვა გაყიდვა თბილისში, ონლაინ ყიდვა გაყიდვა, უფასო განცხადებები, ტელეფონების ყიდვა გაყიდვა, ავტომობილების ყიდვა გაყიდვა, ბითოვი ტექნიკის ყიდვა გაყიდვა, მარკეტპლეისი საქართველოში, imarketzone, იმარკეტ ზონი';
    this.meta.updateTag({ name: 'keywords', content: keywords });
    
    // Robots
    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' });
    this.meta.updateTag({ name: 'googlebot', content: 'index, follow' });
    
    // Canonical URL
    this.meta.updateTag({ rel: 'canonical', href: 'https://imarketzone.ge/' });
    
    // Open Graph
    this.meta.updateTag({ property: 'og:locale', content: 'ka_GE' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: 'https://imarketzone.ge/' });
    this.meta.updateTag({ property: 'og:site_name', content: 'iMarketZone' });
    this.meta.updateTag({ property: 'og:image', content: 'https://imarketzone.ge/assets/og-image.jpg' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    
    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: 'https://imarketzone.ge/assets/og-image.jpg' });
    
    // Additional SEO
    this.meta.updateTag({ name: 'author', content: 'iMarketZone' });
    this.meta.updateTag({ name: 'geo.region', content: 'GE' });
    this.meta.updateTag({ name: 'geo.placename', content: 'Tbilisi' });
    this.meta.updateTag({ name: 'language', content: 'Georgian' });
    this.meta.updateTag({ httpEquiv: 'Content-Language', content: 'ka' });
  }

  private addAllStructuredData(): void {
    this.addWebSiteSchema();
    this.addOrganizationSchema();
    this.addBreadcrumbSchema();
    this.addFAQSchema();
    this.addLocalBusinessSchema();
  }

  private addWebSiteSchema(): void {
    this.removeExistingSchema('website-schema');

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "iMarketZone - ყიდვა გაყიდვა საქართველოში",
      "alternateName": ["იმარკეტ ზონი", "iMarket Zone", "ყიდვა გაყიდვა"],
      "url": "https://imarketzone.ge",
      "description": "საქართველოს ყველაზე დიდი უფასო განცხადებების პორტალი - ყიდვა გაყიდვა მარტივად",
      "inLanguage": "ka-GE",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://imarketzone.ge/public-products?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    };

    this.appendSchema('website-schema', structuredData);
  }

  private addOrganizationSchema(): void {
    this.removeExistingSchema('org-schema');

    const orgData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "iMarketZone",
      "alternateName": "იმარკეტ ზონი",
      "url": "https://imarketzone.ge",
      "logo": "https://imarketzone.ge/assets/logo.png",
      "description": "საქართველოს საუკეთესო ონლაინ მარკეტპლეისი - ყიდვა გაყიდვა უფასოდ",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "თბილისი",
        "addressRegion": "თბილისი",
        "addressCountry": "GE"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "availableLanguage": ["Georgian", "English"]
      },
      "sameAs": [
        "https://www.facebook.com/imarketzone",
        "https://www.instagram.com/imarketzone"
      ]
    };

    this.appendSchema('org-schema', orgData);
  }

  private addBreadcrumbSchema(): void {
    this.removeExistingSchema('breadcrumb-schema');

    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{
        "@type": "ListItem",
        "position": 1,
        "name": "მთავარი - ყიდვა გაყიდვა",
        "item": "https://imarketzone.ge"
      }]
    };

    this.appendSchema('breadcrumb-schema', breadcrumbData);
  }

  private addFAQSchema(): void {
    this.removeExistingSchema('faq-schema');

    const faqData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "როგორ გავყიდო პროდუქტი iMarketZone-ზე?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "დარეგისტრირდით უფასოდ, შედით თქვენს პროფილში, დააჭირეთ 'ახალი განცხადება' ღილაკს, ატვირთეთ პროდუქტის ფოტოები, შეავსეთ ინფორმაცია (სათაური, აღწერა, ფასი, კატეგორია) და გამოაქვეყნეთ. ყველაფერი მარტივია და სრულიად უფასო!"
          }
        },
        {
          "@type": "Question",
          "name": "რა კატეგორიების პროდუქტები შემიძლია გავყიდო?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "iMarketZone-ზე შეგიძლიათ გაყიდოთ: ტელეფონები (iPhone, Samsung, Xiaomi), ბითოვი ტექნიკა (მაცივარი, სარეცხი მანქანა, ტელევიზორი), ავტომობილები, ტანსაცმელი, ფეხსაცმელი, სათამაშოები, კომპიუტერები, აქსესუარები და ათასობით სხვა პროდუქტი."
          }
        },
        {
          "@type": "Question",
          "name": "იხდის თუ არა iMarketZone საკომისიოს?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "არა! iMarketZone-ზე განცხადების განთავსება სრულიად უფასოა. არ არსებობს რეგისტრაციის საფასური, განცხადების განთავსების საფასური ან საკომისიო. ყველაფერი 100% უფასოა!"
          }
        },
        {
          "@type": "Question",
          "name": "რამდენი ხნით რჩება განცხადება აქტიური?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "თქვენი განცხადება რჩება აქტიური 30 დღე. შემდეგ შეგიძლიათ მისი განახლება ერთი დაჭერით უფასოდ და განცხადება კვლავ გახდება აქტიური შემდეგი 30 დღის განმავლობაში."
          }
        },
        {
          "@type": "Question",
          "name": "როგორ ვიყიდო პროდუქტი iMarketZone-ზე?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "გამოიყენეთ ძებნის ველი და მოძებნეთ სასურველი პროდუქტი, ან შეარჩიეთ კატეგორია. დაათვალიერეთ განცხადებები, იხილეთ ფოტოები, ფასები და აღწერილობები. დაუკავშირდით გამყიდველს მითითებული საკონტაქტო ინფორმაციით."
          }
        }
      ]
    };

    this.appendSchema('faq-schema', faqData);
  }

  private addLocalBusinessSchema(): void {
    this.removeExistingSchema('local-business-schema');

    const businessData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "iMarketZone",
      "image": "https://imarketzone.ge/assets/logo.png",
      "description": "საქართველოს #1 ონლაინ მარკეტპლეისი - ყიდვა გაყიდვა უფასოდ",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "თბილისი",
        "addressRegion": "თბილისი",
        "postalCode": "0100",
        "addressCountry": "GE"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "41.7151",
        "longitude": "44.8271"
      },
      "url": "https://imarketzone.ge",
      "priceRange": "უფასო",
      "openingHours": "Mo-Su 00:00-23:59",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "1250"
      }
    };

    this.appendSchema('local-business-schema', businessData);
  }

  addProductListSchema(products: any[]): void {
    if (!isPlatformBrowser(this.platformId) || products.length === 0) return;

    this.removeExistingSchema('product-list-schema');

    const productListData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "პოპულარული პროდუქტები - ყიდვა გაყიდვა საქართველოში",
      "description": "100+ ნახვის მქონე ყველაზე პოპულარული პროდუქტები iMarketZone-ზე",
      "itemListElement": products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": product.title,
          "description": product.description?.substring(0, 200),
          "image": this.getProductImage(product),
          "brand": {
            "@type": "Brand",
            "name": product.brand || "iMarketZone"
          },
          "offers": {
            "@type": "Offer",
            "price": product.price || 0,
            "priceCurrency": "GEL",
            "availability": "https://schema.org/InStock",
            "url": `https://imarketzone.ge${this.generateProductUrl(product.title)}`,
            "seller": {
              "@type": "Organization",
              "name": "iMarketZone"
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "reviewCount": product.viewCount || 100
          }
        }
      }))
    };

    this.appendSchema('product-list-schema', productListData);
  }

  private removeExistingSchema(id: string): void {
    const existingScript = document.querySelector(`script[type="application/ld+json"]#${id}`);
    if (existingScript) {
      existingScript.remove();
    }
  }

  private appendSchema(id: string, data: any): void {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  // ==================== PRODUCT METHODS ====================

  getProductsWithHighViews(): any[] {
    const currentProducts = this.products();
    
    if (!currentProducts || currentProducts.length === 0) {
      return [];
    }

    const highViewProducts = currentProducts.filter(product => {
      const viewCount = product.viewCount || product.views || product.totalViews || 0;
      return viewCount >= 100;
    });

    if (highViewProducts.length === 0) {
      return [];
    }

    const sortedProducts = highViewProducts.sort((a, b) => {
      const viewsA = a.viewCount || a.views || a.totalViews || 0;
      const viewsB = b.viewCount || b.views || b.totalViews || 0;
      return viewsB - viewsA;
    });

    return sortedProducts.slice(0, 12);
  }

  hasPopularProducts(): boolean {
    return this.getProductsWithHighViews().length > 0;
  }

  getPopularProductsCount(): number {
    return this.getProductsWithHighViews().length;
  }
     
  loadProductsWithRealViews() {
    this.loading = true;
    this.isLoadingViews = true;
    this.error = null;
    
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        let allProducts: any[] = [];
        
        if (!response) {
          console.error('❌ Response is null or undefined!');
          this.products.set([]);
          this.loading = false;
          this.isLoadingViews = false;
          return;
        }
        
        if (Array.isArray(response)) {
          allProducts = response;
        } else if (response.products && Array.isArray(response.products)) {
          allProducts = response.products;
        } else if (response.data && Array.isArray(response.data)) {
          allProducts = response.data;
        } else if (typeof response === 'object' && response !== null) {
          if (response._id || response.id || response.title) {
            allProducts = [response];
          }
        }
        
        if (allProducts.length > 0) {
          this.processProductsWithRealViews(allProducts);
          this.addProductListSchema(allProducts.slice(0, 12));
        } else {
          this.products.set([]);
          this.loading = false;
          this.isLoadingViews = false;
        }
      },
      error: (error) => {
        console.error('❌ loadProductsWithRealViews ERROR:', error);
        this.error = 'პროდუქტების ჩატვირთვა ვერ მოხერხდა';
        this.loading = false;
        this.isLoadingViews = false;
      }
    });
  }

  private processProductsWithRealViews(allProducts: any[]) {
    const productsWithViewData = allProducts.map(product => {
      const viewCount = product.viewCount || product.views || product.totalViews || 0;
      return {
        ...product,
        viewCount: viewCount,
        hasViews: viewCount > 0
      };
    });

    const sortedProducts = productsWithViewData
      .filter(product => product.viewCount > 0)
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

    if (sortedProducts.length === 0) {
      this.products.set(productsWithViewData.slice(0, 12));
    } else {
      this.products.set(sortedProducts.slice(0, 12));
    }

    this.loading = false;
    this.isLoadingViews = false;
  }

  formatViews(views: number | undefined | null): string {
    const numViews = Number(views);
    
    if (isNaN(numViews) || numViews < 0) return '0';
    if (numViews >= 1000000) return Math.floor(numViews / 100000) / 10 + 'მ';
    if (numViews >= 1000) return Math.floor(numViews / 100) / 10 + 'ც';
    return numViews.toString();
  }

  viewProduct(productId: string) {
    if (!productId) {
      console.error('❌ არასწორი პროდუქტის ID');
      this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
      return;
    }
    
    this.productService.recordView(productId).subscribe({
      next: (response) => {
        const currentProducts = this.products();
        const productIndex = currentProducts.findIndex(p => (p._id || p.id) === productId);
        if (productIndex !== -1) {
          const updatedProducts = [...currentProducts];
          updatedProducts[productIndex] = {
            ...updatedProducts[productIndex],
            viewCount: (updatedProducts[productIndex].viewCount || 0) + 1
          };
          this.products.set(updatedProducts);
        }
      },
      error: (error) => console.error('❌ ნახვის რეგისტრაციის შეცდომა:', error)
    });

    const currentProducts = this.products();
    const product = currentProducts.find(p => (p._id || p.id) === productId);
    if (product && product.title) {
      const productUrl = this.generateProductUrl(product.title);
      this.router.navigate([productUrl]).then(success => {
        if (success) this.scrollToTop();
        else this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
      });
    } else {
      this.router.navigate(['/product-details', productId]).then(success => {
        if (success) this.scrollToTop();
        else this.showSnackBar('პროდუქტის გახსნისას წარმოიშვა შეცდომა');
      });
    }
  }

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

  generateProductUrl(title: string): string {
    const slug = title.toLowerCase().trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `/product-details/${encodeURIComponent(slug)}`;
  }

  // ==================== SEARCH & NAVIGATION ====================

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.scrollToTop();
      this.showSuggestions = false;
      this.router.navigate(['/public-products'], { queryParams: { search: this.searchQuery.trim() } });
    }
  }

  onCategoryClick(category: string): void {
    this.scrollToTop();
    this.router.navigate(['/public-products'], { queryParams: { category: category } });
  }

  selectCategory(category: string): void {
    this.searchQuery = category;
    this.showSuggestions = false;
    this.onCategoryClick(category);
  }

  selectProduct(product: any): void {
    this.searchQuery = product.title;
    this.showSuggestions = false;
    const productUrl = this.generateProductUrl(product.title);
    this.router.navigate([productUrl]).then(success => {
      if (success) this.scrollToTop();
    });
  }

  private loadAllProducts(): void {
    if (this.isLoadingProducts) return;
    
    this.isLoadingProducts = true;
    
    this.productService.getAllProducts().subscribe({
      next: (response: any) => {
        let products = [];
        if (response.products) {
          products = response.products;
        } else if (response.data) {
          products = response.data;
        } else if (Array.isArray(response)) {
          products = response;
        }
        
        this.allProducts = products;
        this.isLoadingProducts = false;
        
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
      },
      error: (error) => {
        console.error('Error loading products for suggestions:', error);
        this.isLoadingProducts = false;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && !searchContainer.contains(event.target)) {
      this.showSuggestions = false;
    }
  }

  private scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

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

  private updateSuggestions(): void {
    const categories = this.getFilteredCategories();
    const products = this.getFilteredProducts();
    this.filteredSuggestions = [...categories, ...products];
  }

  getFilteredCategories(): string[] {
    if (!this.searchQuery.trim()) return [];
    const query = this.searchQuery.toLowerCase();
    return this.categories.filter(category => category.toLowerCase().includes(query));
  }

  getFilteredProducts(): any[] {
    if (!this.searchQuery.trim() || this.allProducts.length === 0) return [];
    
    const query = this.searchQuery.toLowerCase();
    const filtered = this.allProducts.filter(product => {
      const titleMatch = product.title && product.title.toLowerCase().includes(query);
      const descriptionMatch = product.description && product.description.toLowerCase().includes(query);
      const categoryMatch = product.category && product.category.toLowerCase().includes(query);
      return titleMatch || descriptionMatch || categoryMatch;
    });
    
    return filtered.slice(0, 5);
  }

  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    if (product.image) {
      return product.image;
    }
    return 'https://via.placeholder.com/300x200?text=iMarket+Zone';
  }

  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/300x200?text=iMarket+Zone';
  }
}
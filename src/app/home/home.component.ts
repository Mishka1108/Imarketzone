// home.component.ts - Custom Carousel Version (No PrimeNG)

import { Component, OnInit, HostListener, OnDestroy, Inject, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SeoService } from '../../seo.service';
import { ProductService } from '../services/product.service';
import { Meta, Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CategoryTranslatePipe } from "../pipes/category-translate.pipe";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    TranslateModule,
    CategoryTranslatePipe
  ],
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
  products: any[] = [];
  loading = true;
  error: string | null = null;

  // ==================== CAROUSEL PROPERTIES ====================
  currentIndex: number = 0;
  slideWidth: number = 33.333; // Default for 3 items
  itemsPerView: number = 3;
  autoplayInterval: any;
  circular: boolean = true;
  showNavigators: boolean = true;
  showIndicators: boolean = true;
  autoplayDelay: number = 5000;
  
  // Touch Events
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchEndX: number = 0;
  
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
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadProductsWithRealViews();
    this.setupComprehensiveSEO();
    this.loadAllProducts();
    this.updateCarouselSettings();
    this.startAutoplay();
    
    if (isPlatformBrowser(this.platformId)) {
      this.addEnhancedStructuredData();
      this.addBreadcrumbSchema();
      this.addOrganizationSchema();
      window.addEventListener('resize', () => this.updateCarouselSettings());
    }
  }

  ngOnDestroy() {
    this.stopAutoplay();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', () => this.updateCarouselSettings());
    }
  }

  // ==================== CAROUSEL METHODS ====================
  
  updateCarouselSettings() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const width = window.innerWidth;
    if (width < 480) {
      this.itemsPerView = 1;
      this.slideWidth = 100;
    } else if (width < 768) {
      this.itemsPerView = 2;
      this.slideWidth = 50;
    } else if (width < 1024) {
      this.itemsPerView = 2;
      this.slideWidth = 50;
    } else if (width < 1400) {
      this.itemsPerView = 3;
      this.slideWidth = 33.333;
    } else {
      this.itemsPerView = 4;
      this.slideWidth = 25;
    }
  }

  get maxIndex(): number {
    const products = this.getProductsWithHighViews();
    // თითო პროდუქტით გადასვლისთვის
    return Math.max(0, products.length - this.itemsPerView);
  }

  nextSlide() {
    const products = this.getProductsWithHighViews();
    if (this.currentIndex < this.maxIndex) {
      this.currentIndex++;
    } else if (this.circular) {
      this.currentIndex = 0;
    }
    this.resetAutoplay();
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else if (this.circular) {
      this.currentIndex = this.maxIndex;
    }
    this.resetAutoplay();
  }

  goToSlide(index: number) {
    this.currentIndex = index;
    this.resetAutoplay();
  }

  getIndicators(): any[] {
    const products = this.getProductsWithHighViews();
    // თითო პროდუქტისთვის indicator
    return Array(Math.max(0, products.length - this.itemsPerView + 1)).fill(0);
  }

  // Autoplay Methods
  startAutoplay() {
    if (!isPlatformBrowser(this.platformId) || this.autoplayDelay <= 0) return;
    
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, this.autoplayDelay);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  resetAutoplay() {
    this.stopAutoplay();
    this.startAutoplay();
  }

  // Touch Events for Mobile Swipe
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.stopAutoplay();
  }

  onTouchMove(event: TouchEvent) {
    const touchEndX = event.touches[0].clientX;
    const touchEndY = event.touches[0].clientY;
    
    const diffX = Math.abs(touchEndX - this.touchStartX);
    const diffY = Math.abs(touchEndY - this.touchStartY);
    
    // Prevent vertical scroll if horizontal swipe
    if (diffX > diffY && diffX > 10) {
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - this.touchEndX;
    
    // Minimum swipe distance: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    } else {
      this.startAutoplay();
    }
  }

  // ==================== PRODUCT METHODS ====================

  getProductsWithHighViews(): any[] {
    if (!this.products || this.products.length === 0) {
      return [];
    }

    const highViewProducts = this.products.filter(product => {
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
          this.products = [];
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
          this.products = [];
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
      this.products = productsWithViewData.slice(0, 12);
    } else {
      this.products = sortedProducts.slice(0, 12);
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
        const product = this.products.find(p => (p._id || p.id) === productId);
        if (product) {
          product.viewCount = (product.viewCount || 0) + 1;
        }
      },
      error: (error) => console.error('❌ ნახვის რეგისტრაციის შეცდომა:', error)
    });

    const product = this.products.find(p => (p._id || p.id) === productId);
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

  // ==================== SEO METHODS ====================

  private setupComprehensiveSEO(): void {
    this.translate.get('SEO.PAGE_TITLE').subscribe(title => {
      this.title.setTitle(title);
    });
    
    this.translate.get('SEO.PAGE_DESCRIPTION').subscribe(desc => {
      this.meta.updateTag({ name: 'description', content: desc });
    });
    
    this.translate.get('SEO.KEYWORDS').subscribe(keywords => {
      this.meta.updateTag({ name: 'keywords', content: keywords });
    });
  }

  private addEnhancedStructuredData(): void {
    const existingScript = document.querySelector('script[type="application/ld+json"]#website-schema');
    if (existingScript) existingScript.remove();

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "iMarketZone",
      "alternateName": "იმარკეტ ზონი",
      "url": "https://imarketzone.ge",
      "description": "საქართველოს #1 ონლაინ მარკეტპლეისი - ყიდვა გაყიდვა მარტივად",
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

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'website-schema';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  private addOrganizationSchema(): void {
    const existingScript = document.querySelector('script[type="application/ld+json"]#org-schema');
    if (existingScript) existingScript.remove();

    const orgData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "iMarketZone",
      "alternateName": "იმარკეტ ზონი",
      "url": "https://imarketzone.ge",
      "logo": "https://imarketzone.ge/assets/logo.png",
      "description": "საქართველოს საუკეთესო ონლაინ მარკეტპლეისი",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "თბილისი",
        "addressRegion": "თბილისი",
        "addressCountry": "GE"
      },
      "sameAs": [
        "https://www.facebook.com/imarketzone",
        "https://www.instagram.com/imarketzone"
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'org-schema';
    script.textContent = JSON.stringify(orgData);
    document.head.appendChild(script);
  }

  private addBreadcrumbSchema(): void {
    const existingScript = document.querySelector('script[type="application/ld+json"]#breadcrumb-schema');
    if (existingScript) existingScript.remove();

    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{
        "@type": "ListItem",
        "position": 1,
        "name": "მთავარი",
        "item": "https://imarketzone.ge"
      }]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-schema';
    script.textContent = JSON.stringify(breadcrumbData);
    document.head.appendChild(script);
  }

  private addProductListSchema(products: any[]): void {
    if (!isPlatformBrowser(this.platformId) || products.length === 0) return;

    const existingScript = document.querySelector('script[type="application/ld+json"]#product-list-schema');
    if (existingScript) existingScript.remove();

    const productListData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "პოპულარული პროდუქტები",
      "description": "100+ ნახვის მქონე პროდუქტები iMarketZone-ზე",
      "itemListElement": products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": product.title,
          "description": product.description?.substring(0, 200),
          "image": this.getProductImage(product),
          "offers": {
            "@type": "Offer",
            "price": product.price || 0,
            "priceCurrency": "GEL",
            "availability": "https://schema.org/InStock",
            "url": `https://imarketzone.ge${this.generateProductUrl(product.title)}`
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "reviewCount": product.viewCount || 0
          }
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-list-schema';
    script.textContent = JSON.stringify(productListData);
    document.head.appendChild(script);
  }

  private generateProductUrl(title: string): string {
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
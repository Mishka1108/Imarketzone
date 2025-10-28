// home.component.ts - WITH TRANSLATION SUPPORT

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
import { map, catchError, tap, delay } from 'rxjs/operators';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../pipes/translate.pipe'; // ✅ Import TranslatePipe
import { TranslationService } from '../services/translation.service'; // ✅ Import TranslationService

@Component({
  selector: 'app-home',
  imports: [
    MatButtonModule, 
    RouterLink, 
    FormsModule, 
    CommonModule, 
    CarouselModule, 
    ButtonModule, 
    TagModule,
    TranslatePipe // ✅ Add TranslatePipe to imports
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
    public translationService: TranslationService, // ✅ Add TranslationService
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🏠 HomeComponent constructor');
  }
  
  ngOnInit() {
    this.loadProductsWithRealViews();
    console.log('🏠 HomeComponent ngOnInit started');
    this.setupComprehensiveSEO();
    this.loadAllProducts();
    
    if (isPlatformBrowser(this.platformId)) {
      this.addEnhancedStructuredData();
      this.addBreadcrumbSchema();
      this.addOrganizationSchema();
    }
    
    setTimeout(() => {
      console.log('⏰ Starting loadProductsWithRealViews after 100ms delay');
    }, 100);
    
    this.responsiveOptions = [
      { breakpoint: '1920px', numVisible: 4, numScroll: 1 },
      { breakpoint: '1400px', numVisible: 3, numScroll: 1 },
      { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
      { breakpoint: '962px', numVisible: 2, numScroll: 1 },
      { breakpoint: '768px', numVisible: 2, numScroll: 1 },
      { breakpoint: '480px', numVisible: 1, numScroll: 1 }
    ];
  }

  ngOnDestroy() {
    // cleanup if needed
  }

  getProductsWithHighViews(): any[] {
    if (!this.products || this.products.length === 0) {
      console.log('⚠️ this.products is empty or null');
      return [];
    }

    console.log(`🔍 Checking ${this.products.length} products for high views...`);

    const highViewProducts = this.products.filter(product => {
      const viewCount = product.viewCount || product.views || product.totalViews || 0;
      console.log(`  - ${product.title}: ${viewCount} views`);
      return viewCount >= 100;
    });

    if (highViewProducts.length === 0) {
      console.log('⚠️ არცერთ პროდუქტს არ აქვს 100+ ნახვა');
      return [];
    }

    console.log(`✅ პოპულარული პროდუქტები (100+ ნახვა): ${highViewProducts.length}/${this.products.length}`);

    const sortedProducts = highViewProducts.sort((a, b) => {
      const viewsA = a.viewCount || a.views || a.totalViews || 0;
      const viewsB = b.viewCount || b.views || b.totalViews || 0;
      return viewsB - viewsA;
    });

    return sortedProducts.slice(0, 12);
  }

  hasPopularProducts(): boolean {
    const hasProducts = this.getProductsWithHighViews().length > 0;
    console.log(`🔍 hasPopularProducts: ${hasProducts}`);
    return hasProducts;
  }

  getPopularProductsCount(): number {
    return this.getProductsWithHighViews().length;
  }
     
  loadProductsWithRealViews() {
    console.log('➡️ იწყება პროდუქტების ჩატვირთვა რეალური ნახვებით...');
    this.loading = true;
    this.isLoadingViews = true;
    this.error = null;
    
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        console.log('✅ loadProductsWithRealViews - Subscribe triggered!');
        console.log('🎯 RAW response received:', response);
        
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

        console.log('📦 სულ დამუშავებული პროდუქტები:', allProducts.length);
        
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
    console.log('🔄 იწყება პროდუქტების დამუშავება...', allProducts.length);
    
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

    const highViewCount = this.products.filter(p => (p.viewCount || 0) >= 100).length;
    console.log(`🔥 პროდუქტები 100+ ნახვით: ${highViewCount}/${this.products.length}`);
    
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
    console.log('🔍 იხსნება პროდუქტი:', productId);
    
    if (!productId) {
      console.error('❌ არასწორი პროდუქტის ID');
      this.showSnackBar(this.translationService.translate('home.errorOpeningProduct'));
      return;
    }
    
    this.productService.recordView(productId).subscribe({
      next: (response) => {
        console.log('✅ ნახვა დაფიქსირდა:', response);
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
        else this.showSnackBar(this.translationService.translate('home.errorOpeningProduct'));
      });
    } else {
      this.router.navigate(['/product-details', productId]).then(success => {
        if (success) this.scrollToTop();
        else this.showSnackBar(this.translationService.translate('home.errorOpeningProduct'));
      });
    }
  }

  private showSnackBar(message: string): void {
    if (this.snackBar) {
      this.snackBar.open(message, this.translationService.translate('common.close'), {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['custom-snackbar']
      });
    } else {
      console.warn(message);
    }
  }

  private setupComprehensiveSEO(): void {
    this.title.setTitle('iMarketZone - ყიდვა გაყიდვა საქართველოში | უფასო განცხადებები ონლაინ');
    
    this.meta.updateTag({ 
      name: 'description', 
      content: 'iMarketZone - საქართველოს #1 ონლაინ მარკეტპლეისი. ყიდვა გაყიდვა მარტივად! ტელეფონები, ტექნიკა, მანქანები, ტანსაცმელი, სათამაშოები. უფასო განცხადებები, სწრაფი მყიდველი, უსაფრთხო გარიგება.' 
    });
    
    this.meta.updateTag({ 
      name: 'keywords', 
      content: 'imarketzone, იმარკეტ ზონი, ყიდვა გაყიდვა, უფასო განცხადებები საქართველოში, ონლაინ მაღაზია, მყიდველი, გამყიდველი, ახალი ნივთები, გამოყენებული ნივთები, ტელეფონების ყიდვა, მანქანების გაყიდვა, ტექნიკის ყიდვა, ონლაინ მარკეტპლეისი თბილისი' 
    });

    this.meta.updateTag({ property: 'og:title', content: 'iMarketZone - ყიდვა გაყიდვა საქართველოში' });
    this.meta.updateTag({ property: 'og:description', content: 'საქართველოს საუკეთესო ონლაინ მარკეტპლეისი - ყიდვა გაყიდვა მარტივად!' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://imarketzone.ge' });
    this.meta.updateTag({ property: 'og:image', content: 'https://imarketzone.ge/assets/og-image.jpg' });
    this.meta.updateTag({ property: 'og:locale', content: 'ka_GE' });
    this.meta.updateTag({ property: 'og:site_name', content: 'iMarket Zone' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: 'iMarket Zone - ყიდვა გაყიდვა საქართველოში' });
    this.meta.updateTag({ name: 'twitter:description', content: 'საქართველოს საუკეთესო ონლაინ მარკეტპლეისი' });
    this.meta.updateTag({ name: 'twitter:image', content: 'https://imarketzone.ge/assets/twitter-image.jpg' });

    this.meta.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large' });
    this.meta.updateTag({ name: 'author', content: 'iMarket Zone' });
    this.meta.updateTag({ name: 'language', content: 'Georgian' });
    this.meta.updateTag({ httpEquiv: 'Content-Language', content: 'ka' });
    this.meta.updateTag({ name: 'geo.region', content: 'GE' });
    this.meta.updateTag({ name: 'geo.placename', content: 'Tbilisi' });
    
    this.meta.updateTag({ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' });
    this.meta.updateTag({ name: 'theme-color', content: '#4F46E5' });
    
    if (isPlatformBrowser(this.platformId)) {
      const link: HTMLLinkElement = document.querySelector("link[rel='canonical']") || document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', 'https://imarketzone.ge');
      if (!document.querySelector("link[rel='canonical']")) {
        document.head.appendChild(link);
      }
    }
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
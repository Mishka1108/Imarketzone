// home.component.ts - SEO ოპტიმიზებული ვერსია

import { Component, OnInit, HostListener, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SeoService } from '../../seo.service';
import { ProductService } from '../services/product.service';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  imports: [MatButton, RouterLink, FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  
  searchQuery: string = '';
  showSuggestions: boolean = false;
  filteredSuggestions: any[] = [];
  allProducts: any[] = []; 
  isLoadingProducts: boolean = false;
  
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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  
  ngOnInit() {
    this.setupSEO();
    this.loadAllProducts();
    if (isPlatformBrowser(this.platformId)) {
      this.addStructuredData();
    }
  }

  ngOnDestroy() {
    // Clean up any resources if needed
  }

  private setupSEO(): void {
    // Primary title for buy/sell cluster
    this.title.setTitle('ყიდვა გაყიდვა საქართველოში | iMarket Zone - ონლაინ მარკეტპლეისი');

    // Meta description optimized for buy/sell keywords
    this.meta.updateTag({ 
      name: 'description', 
      content: 'ყიდვა გაყიდვა მარტივად საქართველოში! ახალი და გამოყენებული ნივთები - ტელეფონები, ტექნიკა, მანქანები, ტანსაცმელი. უფასო განცხადებები, სწრაფი მყიდველი, მარტივი გაყიდვა.' 
    });

    // Keywords focused on buy/sell terms
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

    // Canonical URL
    this.meta.updateTag({ rel: 'canonical', href: 'https://imarketzone.ge' });

    // Alternate language versions if needed
    this.meta.updateTag({ rel: 'alternate', hreflang: 'ka', href: 'https://imarketzone.ge' });
    this.meta.updateTag({ rel: 'alternate', hreflang: 'en', href: 'https://imarketzone.ge/en' });
  }

  private addStructuredData(): void {
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Enhanced structured data for buy/sell marketplace
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
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "როგორ ვიყიდო ნივთი iMarket Zone-ზე?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "დარეგისტრირდით, ატვირთეთ ნივთის ფოტოები, მიუთითეთ ფასი და აღწერილობა. თქვენი განცხადება მყისვე გამოჩნდება საიტზე."
            }
          },
          {
            "@type": "Question",
            "name": "უფასოა თუ არა განცხადების განთავსება?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "კი, პირველი 5 განცხადება სრულიად უფასოა!"
            }
          },
          {
            "@type": "Question",
            "name": "რა კატეგორიებია ხელმისაწვდომი?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "ტელეფონები, ტექნიკა, ავტომობილები, ტანსაცმელი, სათამაშოები, კომპიუტერები და ბევრი სხვა."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "მთავარი",
            "item": "https://imarketzone.ge"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "ყიდვა გაყიდვა",
            "item": "https://imarketzone.ge/public-products"
          }
        ]
      }
    ];

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Add additional structured data for local business
    const localBusinessData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "iMarket Zone",
      "description": "ყიდვა გაყიდვის ონლაინ მარკეტპლეისი საქართველოში",
      "url": "https://imarketzone.ge",
      "telephone": "+995-XXX-XXX-XXX",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "GE",
        "addressRegion": "Tbilisi"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "41.7151",
        "longitude": "44.8271"
      },
      "openingHours": "Mo,Tu,We,Th,Fr,Sa,Su 00:00-24:00",
      "areaServed": "Georgia",
      "serviceArea": {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": "41.7151",
          "longitude": "44.8271"
        },
        "geoRadius": "100000"
      }
    };

    const localScript = document.createElement('script');
    localScript.type = 'application/ld+json';
    localScript.textContent = JSON.stringify(localBusinessData);
    document.head.appendChild(localScript);
  }

  // ✅ განახლებული selectProduct მეთოდი - პროდუქტის დეტალებზე გადასვლით
  selectProduct(product: any): void {
    console.log('პროდუქტი არჩეულია:', product);
    this.searchQuery = product.title;
    this.showSuggestions = false;
    
    // Track user interaction for SEO analytics
    if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
      (window as any).gtag('event', 'select_item', {
        item_category: product.category,
        item_name: product.title,
        value: product.price
      });
    }
    
    // ✅ პროდუქტის URL-ის გენერირება title-ის მიხედვით
    const productUrl = this.generateProductUrl(product.title);
    console.log('გადავდივართ URL-ზე:', productUrl);
    
    // ✅ პროდუქტის დეტალების გვერდზე გადასვლა
    this.router.navigate([productUrl]).then(success => {
      if (success) {
        console.log('✅ წარმატებით გადავედით პროდუქტის დეტალებზე');
      } else {
        console.error('❌ გადასვლა ვერ მოხერხდა, ვცადოთ ალტერნატიული გზა');
        // ალტერნატიული გზა - ID-ს გამოყენებით (თუ არსებობს)
        if (product._id || product.id) {
          this.router.navigate(['/product-details', product._id || product.id]);
        }
      }
    }).catch(error => {
      console.error('გადასვლის შეცდომა:', error);
    });
  }

  // ✅ პროდუქტის URL-ის გენერირების მეთოდი (ProductDetailsComponent-ის მსგავსად)
  private generateProductUrl(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '') // სპეციალური სიმბოლოების წაშლა
      .replace(/\s+/g, '-')         // სივრცეების ჩანაცვლება ტირეებით
      .replace(/\-+/g, '-')        // მრავალი ტირის ერთით ჩანაცვლება
      .replace(/^-+|-+$/g, '');    // პირველი და ბოლო ტირეების წაშლა
    
    // URL encoding ქართული ტექსტისთვის
    const encodedSlug = encodeURIComponent(slug);
    
    return `/product-details/${encodedSlug}`;
  }

  // ✅ ძებნის SEO ოპტიმიზაცია
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.scrollToTop();
      this.showSuggestions = false;
      
      // Track search for SEO analytics
      if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
        (window as any).gtag('event', 'search', {
          search_term: this.searchQuery.trim()
        });
      }
      
      console.log(`ძებნა: ${this.searchQuery}`);
      
      // Update page SEO dynamically
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

  // ✅ კატეგორიის SEO ოპტიმიზაცია
  onCategoryClick(category: string): void {
    this.scrollToTop();
    
    // Track category click for SEO analytics
    if (isPlatformBrowser(this.platformId) && (window as any).gtag) {
      (window as any).gtag('event', 'select_content', {
        content_type: 'category',
        item_id: category
      });
    }
    
    console.log(`კატეგორია დაჭერილია: ${category}`);
    
    // Update page SEO for category
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

  // ✅ selectCategory მეთოდი
  selectCategory(category: string): void {
    this.searchQuery = category;
    this.showSuggestions = false;
    this.onCategoryClick(category);
  }

  // დანარჩენი მეთოდები...
  private loadAllProducts(): void {
    if (this.isLoadingProducts) {
      console.log('Already loading products, skipping...');
      return;
    }
    
    this.isLoadingProducts = true;
    console.log('Starting to load products...');
    
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
        
        console.log('Successfully loaded products:', this.allProducts.length);
        console.log('Sample product:', this.allProducts[0]);
        
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
        
        // Fallback data
        this.allProducts = [
          { 
            _id: '1',
            title: 'Samsung Galaxy S24', 
            image: 'https://via.placeholder.com/40', 
            category: 'ტელეფონები',
            price: 1200 
          },
          { 
            _id: '2',
            title: 'iPhone 15 Pro', 
            image: 'https://via.placeholder.com/40', 
            category: 'ტელეფონები',
            price: 1500 
          },
          { 
            _id: '3',
            title: 'MacBook Pro', 
            image: 'https://via.placeholder.com/40', 
            category: 'კომპიუტერები',
            price: 2000 
          }
        ];
        
        console.log('Using fallback products:', this.allProducts.length);
        
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
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
    
    console.log('Search input:', value);
    console.log('Available products:', this.allProducts.length);
    console.log('Is loading products:', this.isLoadingProducts);
    
    if (value.trim().length > 0) {
      this.showSuggestions = true;
      
      if (this.allProducts.length === 0 && !this.isLoadingProducts) {
        console.log('Products not loaded yet, loading...');
        this.loadAllProducts();
      }
      
      this.updateSuggestions();
    } else {
      this.showSuggestions = false;
      this.filteredSuggestions = [];
    }
  }

  private updateSuggestions(): void {
    const query = this.searchQuery.toLowerCase();
    const categories = this.getFilteredCategories();
    const products = this.getFilteredProducts();
    
    console.log('Search query:', query);
    console.log('Filtered categories:', categories.length);
    console.log('Filtered products:', products.length);
    console.log('Products array:', this.allProducts);
    
    this.filteredSuggestions = [...categories, ...products];
  }

  getFilteredCategories(): string[] {
    if (!this.searchQuery.trim()) return [];
    const query = this.searchQuery.toLowerCase();
    return this.categories.filter(category => 
      category.toLowerCase().includes(query)
    );
  }

  getFilteredProducts(): any[] {
    if (!this.searchQuery.trim()) {
      console.log('No search query, returning empty array');
      return [];
    }
    
    if (this.allProducts.length === 0) {
      console.log('No products available for filtering');
      return [];
    }
    
    const query = this.searchQuery.toLowerCase();
    console.log(`Searching for "${query}" in ${this.allProducts.length} products`);
    
    const filtered = this.allProducts.filter(product => {
      const titleMatch = product.title && product.title.toLowerCase().includes(query);
      const descriptionMatch = product.description && product.description.toLowerCase().includes(query);
      const categoryMatch = product.category && product.category.toLowerCase().includes(query);
      
      const isMatch = titleMatch || descriptionMatch || categoryMatch;
      
      if (isMatch) {
        console.log(`Match found: "${product.title}" - titleMatch:${titleMatch}, descriptionMatch:${descriptionMatch}, categoryMatch:${categoryMatch}`);
      }
      
      return isMatch;
    });
    
    console.log(`Found ${filtered.length} matching products:`, filtered.map(p => p.title));
    return filtered.slice(0, 5);
  }

  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    if (product.image) {
      return product.image;
    }
    return 'https://via.placeholder.com/40?text=No+Image';
  }

  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/40?text=No+Image';
  }
}
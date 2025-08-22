// home.component.ts - განახლებული ნაწილი

import { Component, OnInit, HostListener } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SeoService } from '../../seo.service';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-home',
  imports: [MatButton, RouterLink, FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  
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
    private productService: ProductService
  ) {}
  
  ngOnInit() {
    this.loadAllProducts();
  }

  // ✅ განახლებული selectProduct მეთოდი - პროდუქტის დეტალებზე გადასვლით
  selectProduct(product: any): void {
    console.log('პროდუქტი არჩეულია:', product);
    this.searchQuery = product.title;
    this.showSuggestions = false;
    
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

  // ✅ ალტერნატიული მეთოდი - მხოლოდ ID-ს გამოყენებით (საჭიროების შემთხვევაში)
  navigateToProductById(productId: string): void {
    this.router.navigate(['/product-details', productId]);
  }

  // ✅ ალტერნატიული მეთოდი - როუტინგის query params-ით
  navigateToProductWithParams(product: any): void {
    this.router.navigate(['/product-details'], {
      queryParams: {
        id: product._id || product.id,
        title: product.title,
        slug: this.generateSlug(product.title)
      }
    });
  }

  // ✅ slug-ის გენერირება
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ✅ განახლებული onSearch მეთოდი (უცვლელი)
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.scrollToTop();
      this.showSuggestions = false;
      console.log(`ძებნა: ${this.searchQuery}`);
      
      this.seoService.updatePageSEO('search', this.searchQuery);
      this.router.navigate(['/public-products'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
    }
  }

  // ✅ selectCategory მეთოდი (უცვლელი)
  selectCategory(category: string): void {
    this.searchQuery = category;
    this.showSuggestions = false;
    this.onCategoryClick(category);
  }

  onCategoryClick(category: string): void {
    this.scrollToTop();
    console.log(`კატეგორია დაჭერილია: ${category}`);
    this.seoService.updatePageSEO('category', category);
    this.router.navigate(['/public-products'], { 
      queryParams: { category: category } 
    });
  }

  // დანარჩენი მეთოდები იგივეა...
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  private addStructuredData(): void {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "ონლაინ მარკეტპლეისი - ყიდვა გაყიდვა",
      "alternateName": "ყიდვა გაყიდვა საქართველოში",
      "url": "https://imarketzone.ge",
      "description": "ყიდვა და გაყიდვა მარტივად! საუკეთესო ონლაინ მარკეტპლეისი საქართველოში.",
      "inLanguage": "ka-GE",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://imarketzone.ge/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      },
      "sameAs": [
        "https://www.facebook.com/yourpage",
        "https://www.instagram.com/yourpage"
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }
}
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
  allProducts: any[] = []; // Real products from API
  isLoadingProducts: boolean = false;
  
  // Sample data - you can replace with real data from API
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
    // Load real products
    this.loadAllProducts();
  }

  // Load products from API
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
        
        // Handle different response formats
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
        
        // Update suggestions if we have a search query
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
        
        // Fallback to sample data for testing
        this.allProducts = [
          { 
            title: 'Samsung Galaxy S24', 
            image: 'https://via.placeholder.com/40', 
            category: 'ტელეფონები',
            price: 1200 
          },
          { 
            title: 'iPhone 15 Pro', 
            image: 'https://via.placeholder.com/40', 
            category: 'ტელეფონები',
            price: 1500 
          },
          { 
            title: 'MacBook Pro', 
            image: 'https://via.placeholder.com/40', 
            category: 'კომპიუტერები',
            price: 2000 
          }
        ];
        
        console.log('Using fallback products:', this.allProducts.length);
        
        // Update suggestions if we have a search query
        if (this.searchQuery.trim().length > 0) {
          this.updateSuggestions();
        }
      }
    });
  }

  // Close suggestions when clicking outside
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

  // Handle search input changes
  onSearchInput(event: any): void {
    const value = event.target.value;
    this.searchQuery = value;
    
    console.log('Search input:', value);
    console.log('Available products:', this.allProducts.length);
    console.log('Is loading products:', this.isLoadingProducts);
    
    if (value.trim().length > 0) {
      this.showSuggestions = true;
      
      // If products are not loaded yet, try to load them
      if (this.allProducts.length === 0 && !this.isLoadingProducts) {
        console.log('Products not loaded yet, loading...');
        this.loadAllProducts();
      }
      
      // Update suggestions anyway (will show categories at least)
      this.updateSuggestions();
    } else {
      this.showSuggestions = false;
      this.filteredSuggestions = [];
    }
  }

  // Update suggestions based on search query
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

  // Get filtered categories
  getFilteredCategories(): string[] {
    if (!this.searchQuery.trim()) return [];
    const query = this.searchQuery.toLowerCase();
    return this.categories.filter(category => 
      category.toLowerCase().includes(query)
    );
  }

  // Get filtered products
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
      // Check title
      const titleMatch = product.title && product.title.toLowerCase().includes(query);
      
      // Check description
      const descriptionMatch = product.description && product.description.toLowerCase().includes(query);
      
      // Check category
      const categoryMatch = product.category && product.category.toLowerCase().includes(query);
      
      const isMatch = titleMatch || descriptionMatch || categoryMatch;
      
      if (isMatch) {
        console.log(`Match found: "${product.title}" - titleMatch:${titleMatch}, descriptionMatch:${descriptionMatch}, categoryMatch:${categoryMatch}`);
      }
      
      return isMatch;
    });
    
    console.log(`Found ${filtered.length} matching products:`, filtered.map(p => p.title));
    return filtered.slice(0, 5); // Show max 5 suggestions
  }

  // Select category from suggestions
  selectCategory(category: string): void {
    this.searchQuery = category;
    this.showSuggestions = false;
    this.onCategoryClick(category);
  }

  // Select product from suggestions
  selectProduct(product: any): void {
    this.searchQuery = product.title;
    this.showSuggestions = false;
    this.onSearch();
  }

  // Helper method to get product image
  getProductImage(product: any): string {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    if (product.image) {
      return product.image;
    }
    return 'https://via.placeholder.com/40?text=No+Image';
  }

  // Handle image error
  onImageError(event: any): void {
    event.target.src = 'https://via.placeholder.com/40?text=No+Image';
  }

  // Main search function
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.scrollToTop();
      this.showSuggestions = false;
      console.log(`ძებნა: ${this.searchQuery}`);
      
      // SEO განახლება ძებნისთვის
      this.seoService.updatePageSEO('search', this.searchQuery);
      
      // გადავიდეთ პროდუქტების გვერდზე ძებნის ქუერით
      this.router.navigate(['/public-products'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
    }
  }

  onCategoryClick(category: string): void {
    this.scrollToTop();
    console.log(`კატეგორია დაჭერილია: ${category}`);
    // SEO განახლება კატეგორიის მიხედვით
    this.seoService.updatePageSEO('category', category);
    // გადავიდეთ პროდუქტების გვერდზე არჩეული კატეგორიით
    this.router.navigate(['/public-products'], { 
      queryParams: { category: category } 
    });
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
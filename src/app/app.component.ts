import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./navbar/navbar.component";
import { FooterComponent } from "./footer/footer.component";
import { filter } from 'rxjs/internal/operators/filter';
import { GoogleAnalyticsService } from './services/google-analytics.service';
import { ProductService } from './services/product.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'imarketzone';
  
  constructor(
    private router: Router,
    private ga: GoogleAnalyticsService,
    private productService: ProductService // ✅ ProductService დამატება
  ) {}

  ngOnInit(): void {
    // Google Analytics tracking
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.ga.trackPageView(event.urlAfterRedirects);
    });

    // ✅ პროდუქტების პრელოად აპლიკაციის გაშვებისთანავე
    this.preloadProducts();
  }

  // ✅ პროდუქტების პრელოად მეთოდი
  private preloadProducts(): void {
    console.log('🚀 Preloading products on app init...');
    
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        console.log('✅ Products preloaded successfully');
        
        // შევინახოთ პროდუქტები cache-ში
        const products = response.products || response.data || response || [];
        
        if (products.length > 0) {
          this.productService.setCachedProducts(products);
          console.log(`📦 Cached ${products.length} products`);
        } else {
          console.warn('⚠️ No products received from API');
        }
      },
      error: (error) => {
        console.error('❌ Failed to preload products:', error);
        // აპლიკაცია მაინც გაგრძელდება, მაგრამ cache ცარიელი იქნება
      }
    });
  }
}
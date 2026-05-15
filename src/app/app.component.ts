import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./navbar/navbar.component";
import { FooterComponent } from "./footer/footer.component";
import { filter } from 'rxjs/internal/operators/filter';
import { GoogleAnalyticsService } from './services/google-analytics.service';
import { ProductService } from './services/product.service';
import { isPlatformBrowser } from '@angular/common';

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
    private productService: ProductService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.ga.trackPageView(event.urlAfterRedirects);
    });

    this.preloadProducts();
  }

  private preloadProducts(): void {
    if (!isPlatformBrowser(this.platformId)) return; // ← SSR-ზე არ გაეშვება
    
    console.log('🚀 Preloading products on app init...');
    
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        console.log('✅ Products preloaded successfully');
        
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
      }
    });
  }
}
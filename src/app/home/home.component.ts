import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';

import { RouterLink, Router } from '@angular/router';
import { SeoService } from '../../seo.service';

@Component({
  selector: 'app-home',
  imports: [MatButton,  RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  
  constructor(private router: Router,  private seoService: SeoService) {}


   private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
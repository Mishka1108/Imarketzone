import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';

import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [MatButton,  RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  
  constructor(private router: Router) {}


   private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onCategoryClick(category: string): void {
    this.scrollToTop();
    console.log(`კატეგორია დაჭერილია: ${category}`);
    // გადავიდეთ პროდუქტების გვერდზე არჩეული კატეგორიით
    this.router.navigate(['/public-products'], { 
      queryParams: { category: category } 
    });
  }

 
  }

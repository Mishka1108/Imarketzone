// seo.service.ts
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);

  updateTitle(title: string) {
    this.title.setTitle(title);
  }

  updateMetaTags(tags: any) {
    // Update basic meta tags
    this.meta.updateTag({ name: 'description', content: tags.description });
    this.meta.updateTag({ name: 'keywords', content: tags.keywords });
    
    // Update Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: tags.title });
    this.meta.updateTag({ property: 'og:description', content: tags.description });
    this.meta.updateTag({ property: 'og:image', content: tags.image });
    this.meta.updateTag({ property: 'og:url', content: tags.url });
    
    // Update Twitter tags
    this.meta.updateTag({ name: 'twitter:title', content: tags.title });
    this.meta.updateTag({ name: 'twitter:description', content: tags.description });
    this.meta.updateTag({ name: 'twitter:image', content: tags.image });
  }

  updatePageSEO(page: string, category?: string) {
    switch(page) {
      case 'home':
        this.updateTitle('ყიდვა გაყიდვა საქართველოში | ონლაინ მარკეტპლეისი');
        this.updateMetaTags({
          title: 'ყიდვა გაყიდვა საქართველოში | ონლაინ მარკეტპლეისი',
          description: 'ყიდვა და გაყიდვა მარტივად! საუკეთესო ონლაინ მარკეტპლეისი საქართველოში. ტელეფონები, ტექნიკა, ავტომობილები, ტანსაცმელი და სხვა. უფასო რეგისტრაცია.',
          keywords: 'ყიდვა, გაყიდვა, ონლაინ მაღაზია, მარკეტპლეისი, საქართველო, ტელეფონები, ტექნიკა, ავტომობილები, ტანსაცმელი',
          image: 'https://imarketzone.ge/assets/home-image.jpg',
          url: 'https://imarketzone.ge/'
        });
        break;
      
      case 'category':
        this.updateTitle(`${category} - ყიდვა გაყიდვა | ონლაინ მარკეტპლეისი`);
        this.updateMetaTags({
          title: `${category} - ყიდვა გაყიდვა | ონლაინ მარკეტპლეისი`,
          description: `იყიდე და გაყიდე ${category} საქართველოში. ყველაზე კარგი ფასები და ხარისხი. უფასო განცხადებები.`,
          keywords: `${category}, ყიდვა, გაყიდვა, საქართველო, ონლაინ მაღაზია`,
          image: `https://yourwebsite.com/assets/${category}-image.jpg`,
          url: `https://yourwebsite.com/category/${category}`
        });
        break;
        
      case 'products':
        this.updateTitle('პროდუქტები - ყიდვა გაყიდვა | ონლაინ მარკეტპლეისი');
        this.updateMetaTags({
          title: 'პროდუქტები - ყიდვა გაყიდვა | ონლაინ მარკეტპლეისი',
          description: 'იპოვე შენთვის საჭირო პროდუქტები ყველაზე კარგ ფასად. ათასობით განცხადება ყოველდღე.',
          keywords: 'პროდუქტები, ყიდვა, გაყიდვა, განცხადებები, საქართველო',
          image: 'https://imarketzone.ge/assets/products-image.jpg',
          url: 'https://imarketzone.ge/products'
        });
        break;
    }
  }
}
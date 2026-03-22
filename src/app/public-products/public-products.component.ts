import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { User } from '../models/user.model';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CityTranslatePipe } from '../pipes/city-translate.pipe';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-public-products',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    TranslateModule,
    CityTranslatePipe,
    MatPaginatorModule
  ],
  templateUrl: './public-products.component.html',
  styleUrls: ['./public-products.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PublicProductsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  products: Product[] = [];
  isLoading: boolean = true;
  pibliccurrentUser: User | null = null;
  
  pageSize: number = 10;
  pageIndex: number = 0;
  totalProducts: number = 0;
  
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedCity: string = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  filteredCities: string[] = [];
  
  categories: string[] = [
    'ტელეფონები', 'ტექნიკა', 'ავტომობილები', 'ტანსაცმელი', 'სათამაშოები', 'კომპიუტერები'
  ];
  
  public cities: string[] = [
    'თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი', 'გორი', 'ფოთი', 'ზუგდიდი', 
    'თელავი', 'ოზურგეთი', 'მარნეული', 'ახალციხე', 'ახალქალაქი', 'ბოლნისი', 
    'საგარეჯო', 'გარდაბანი', 'ცხინვალი', 'ჭიათურა', 'დუშეთი', 'დმანისი', 
    'წალკა', 'თეთრიწყარო', 'საჩხერე', 'ლაგოდეხი', 'ყვარელი', 'თიანეთი', 
    'კასპი', 'ხაშური', 'ხობი', 'წალენჯიხა', 'მესტია', 'ამბროლაური', 'ცაგერი', 
    'ონი', 'ლანჩხუთი', 'ჩოხატაური', 'ქობულეთი', 'სურამი', 'აბაშა', 'სენაკი', 
    'ტყიბული', 'წყალტუბო', 'ნინოწმინდა', 'ცაგერი', 'ბაკურიანი', 'გუდაური', 
    'წნორი', 'ახმეტა', 'ბარნოვი', 'ყვარელი', 'შორაპანი', 'სოხუმი'
  ];

  constructor(
    private productService: ProductService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private meta: Meta,
    private title: Title,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setupSEO();
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory = params['category'];
      }
      if (params['city']) {
        this.selectedCity = params['city'];
      }
      this.loadProducts();
    });
    this.filterCities();
  }

  private setupSEO(): void {
    this.title.setTitle('პროდუქტები საქართველოში | ყიდვა გაყიდვა - iMarketZone');
    
    this.meta.updateTag({ name: 'description', content: 'იპოვე სასურველი პროდუქტი iMarketZone-ზე - ტელეფონები, ავტომობილები, ტექნიკა, ტანსაცმელი და ათასობით სხვა განცხადება საქართველოში.' });
    this.meta.updateTag({ name: 'keywords', content: 'პროდუქტები საქართველოში, ყიდვა გაყიდვა, განცხადებები, ტელეფონები, ავტომობილები, ტექნიკა, imarketzone' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    
    this.meta.updateTag({ property: 'og:title', content: 'პროდუქტები საქართველოში | iMarketZone' });
    this.meta.updateTag({ property: 'og:description', content: 'იპოვე სასურველი პროდუქტი iMarketZone-ზე - ყიდვა გაყიდვა მარტივად!' });
    this.meta.updateTag({ property: 'og:url', content: 'https://imarketzone.ge/public-products' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    if (isPlatformBrowser(this.platformId)) {
      let canonical = this.document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', 'https://imarketzone.ge/public-products');
      } else {
        const link = this.document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', 'https://imarketzone.ge/public-products');
        this.document.head.appendChild(link);
      }
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadProducts(): void {
    this.isLoading = true;

    const filters: any = {
      page: this.pageIndex,
      limit: this.pageSize
    };

    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedCity) filters.city = this.selectedCity;
    if (this.minPrice) filters.minPrice = this.minPrice;
    if (this.maxPrice) filters.maxPrice = this.maxPrice;
    if (this.searchTerm) filters.search = this.searchTerm;

    this.productService.getAllProducts(filters).subscribe({
      next: (response) => {
        let productsArray: Product[] = [];

        if (response?.success && Array.isArray(response.data)) {
          productsArray = response.data;
          this.totalProducts = response.total || response.count || productsArray.length;
        } else if (Array.isArray(response?.products)) {
          productsArray = response.products;
          this.totalProducts = response.total || response.count || productsArray.length;
        } else if (Array.isArray(response?.data)) {
          productsArray = response.data;
          this.totalProducts = response.total || response.count || productsArray.length;
        } else if (Array.isArray(response?.items)) {
          productsArray = response.items;
          this.totalProducts = response.total || response.count || productsArray.length;
        } else if (Array.isArray(response)) {
          productsArray = response;
          this.totalProducts = productsArray.length;
        }

        if (!productsArray || productsArray.length === 0) {
          this.products = [];
          this.totalProducts = 0;
          this.isLoading = false;
          return;
        }

        productsArray = productsArray.map(product => ({
          ...product,
          id: product.id || product._id || product.productId || product.product_id || '',
          viewCount: product.viewCount || product.views || 0,
          views: product.views || product.viewCount || 0
        }));

        this.products = productsArray;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Load Products Error:', error);
        this.translate.get('PUBLIC_PRODUCTS.ERRORS.LOAD_FAILED').subscribe(msg => {
          this.showSnackBar(msg);
        });
        this.products = [];
        this.totalProducts = 0;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadProducts();
    this.filterCities();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  filterCities(): void {
    const search = this.selectedCity?.toLowerCase() || '';
    this.filteredCities = this.cities.filter(city => 
      city.toLowerCase().includes(search)
    );
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedCity = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadProducts();
  }

  openProductDetails(product: Product): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const productId = this.getProductId(product);
    
    if (!productId) {
      console.error('❌ Product ID not found');
      this.translate.get('PUBLIC_PRODUCTS.ERRORS.PRODUCT_ID_NOT_FOUND').subscribe(msg => {
        this.showSnackBar(msg);
      });
      return;
    }

    const slug = this.generateSlug(product.title);
    this.router.navigate(['/product-details', productId, slug]);
    
    this.productService.recordView(productId).subscribe({
      next: () => {
        const productIndex = this.products.findIndex(p => this.getProductId(p) === productId);
        if (productIndex !== -1) {
          const currentViews = this.getViewCount(this.products[productIndex]);
          this.products[productIndex].viewCount = currentViews + 1;
          this.products[productIndex].views = currentViews + 1;
        }
      },
      error: (error) => {
        console.warn('⚠️ View recording failed:', error);
      }
    });
  }

  getProductId(product: Product): string {
    return product.id || product._id || product.productId || product.product_id || '';
  }

  showSnackBar(message: string): void {
    this.translate.get('PUBLIC_PRODUCTS.CLOSE').subscribe(closeText => {
      this.snackBar.open(message, closeText, {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    });
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\wა-ჰ\-]+/g, '')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  getMainImage(product: Product): string {
    const images = this.getAllProductImages(product);
    return images[0];
  }

  getAdditionalImages(product: Product): string[] {
    const images = this.getAllProductImages(product);
    return images.slice(1, 4);
  }

  getAllProductImages(product: Product): string[] {
    const images: string[] = [];
    
    if (product.image) images.push(product.image);
    
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(image => {
        if (image && !images.includes(image)) images.push(image);
      });
    }
    
    [product.productImage1, product.productImage2, product.productImage3].forEach(image => {
      if (image && !images.includes(image)) images.push(image);
    });
    
    const limitedImages = images.slice(0, 3);
    if (limitedImages.length === 0) limitedImages.push('assets/images/placeholder.jpg');
    
    return limitedImages;
  }

  getViewCount(product: Product): number {
    if (!product) return 0;
    return product.viewCount || product.views || 0;
  }

  formatViewCount(count: number): string {
    if (!count || count === 0) return '0';
    
    if (count < 1000) {
      return count.toString();
    } else if (count < 1000000) {
      const suffix = this.translate.instant('PUBLIC_PRODUCTS.VIEW_SUFFIX_THOUSAND');
      return (count / 1000).toFixed(1) + suffix;
    } else {
      const suffix = this.translate.instant('PUBLIC_PRODUCTS.VIEW_SUFFIX_MILLION');
      return (count / 1000000).toFixed(1) + suffix;
    }
  }
}
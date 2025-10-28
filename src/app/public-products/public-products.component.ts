import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CityTranslatePipe
   

],
  templateUrl: './public-products.component.html',
  styleUrls: ['./public-products.component.scss'],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class PublicProductsComponent implements OnInit {
  products: Product[] = [];
  isLoading: boolean = true;
  pibliccurrentUser: User | null = null;
  
  // ფილტრების პარამეტრები  
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedCity: string = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  filteredCities: string[] = [];
  
  // კატეგორიების სია
  categories: string[] = [
    'ტელეფონები',
    'ტექნიკა',
    'ავტომობილები',
    'ტანსაცმელი',
    'სათამაშოები',
    'კომპიუტერები'
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
    private translate: TranslateService // ✅ დამატება
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory = params['category'];
        console.log(`კატეგორია მიღებულია: ${this.selectedCategory}`);
      }
      if (params['city']) {
        this.selectedCity = params['city'];
        console.log(`ქალაქი მიღებულია: ${this.selectedCity}`);
      }
      this.loadProducts();
    });
    this.filterCities();
  }

  // 🔸 გამასწორებული loadProducts ფუნქცია
  loadProducts(): void {
    this.isLoading = true;

    const filters: any = {};

    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedCity) filters.city = this.selectedCity;
    if (this.minPrice) filters.minPrice = this.minPrice;
    if (this.maxPrice) filters.maxPrice = this.maxPrice;
    if (this.searchTerm) filters.search = this.searchTerm;

    console.log('📡 Sending filters:', filters);

    this.productService.getAllProducts(filters).subscribe({
      next: (response) => {
        console.log('📥 API Full Response:', response);

        let productsArray: Product[] = [];

        // 🔸 უკეთესი response handling
        if (response?.success && Array.isArray(response.data)) {
          productsArray = response.data;
        } else if (Array.isArray(response?.products)) {
          productsArray = response.products;
        } else if (Array.isArray(response?.data)) {
          productsArray = response.data;
        } else if (Array.isArray(response?.items)) {
          productsArray = response.items;
        } else if (Array.isArray(response)) {
          productsArray = response;
        }

        console.log('📦 Processed Products Array:', productsArray);

        if (!productsArray || productsArray.length === 0) {
          this.products = [];
          console.log('❌ No products found');
          this.isLoading = false;
          return;
        }

        // 🔸 ID normalization
        productsArray = productsArray.map(product => ({
          ...product,
          id: product.id || product._id || product.productId || product.product_id || '',
          // 🔹 ნახვების normalization
          viewCount: product.viewCount || product.views || 0,
          views: product.views || product.viewCount || 0
        }));

        this.products = productsArray;
        console.log('✅ Final Products with Views:', this.products);
        
        // 🔸 Debug: რამდენ პროდუქტს აქვს ნახვები
        const productsWithViews = this.products.filter(p => this.getViewCount(p) > 0);
        console.log(`📊 ${productsWithViews.length}/${this.products.length} products have views`);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Load Products Error:', error);
        // ✅ განახლებული თარგმანით
        this.translate.get('PUBLIC_PRODUCTS.ERRORS.LOAD_FAILED').subscribe(msg => {
          this.showSnackBar(msg);
        });
        this.isLoading = false;
      }
    });
  }

  // ფილტრების გამოყენება
  applyFilters(): void {
    this.loadProducts();
    this.filterCities();
  }

  // ძიების გასუფთავება
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

  // ფილტრების გასუფთავება
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedCity = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.loadProducts();
  }

  // 🔸 გამასწორებული პროდუქტის დეტალების გახსნა
  openProductDetails(product: Product): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const productId = this.getProductId(product);
    
    if (!productId) {
      console.error('❌ Product ID not found');
      // ✅ განახლებული თარგმანით
      this.translate.get('PUBLIC_PRODUCTS.ERRORS.PRODUCT_ID_NOT_FOUND').subscribe(msg => {
        this.showSnackBar(msg);
      });
      return;
    }

    console.log(`👁️ Opening product ${productId}, recording view...`);

    const slug = this.generateSlug(product.title);
    
    // 🔹 ნავიგაცია პირველ რიგში
    this.router.navigate(['/product-details', productId, slug]);
    
    // 🔹 ნახვის რეგისტრაცია background-ში
    this.productService.recordView(productId).subscribe({
      next: (response) => {
        console.log('✅ View recorded successfully:', response);
        // 🔸 ლოკალურად ვაუცდიზრებთ ნახვების რაოდენობას
        const productIndex = this.products.findIndex(p => this.getProductId(p) === productId);
        if (productIndex !== -1) {
          const currentViews = this.getViewCount(this.products[productIndex]);
          this.products[productIndex].viewCount = currentViews + 1;
          this.products[productIndex].views = currentViews + 1;
          console.log(`📊 Updated local view count: ${currentViews + 1}`);
        }
      },
      error: (error) => {
        console.warn('⚠️ View recording failed:', error);
        // ნახვის რეგისტრაცია არ უნდა შეაფერხოს ნავიგაციას
      }
    });
  }

  // პროდუქტის ID-ის მიღება
  getProductId(product: Product): string {
    return product.id || product._id || product.productId || product.product_id || '';
  }

  // ✅ განახლებული შეტყობინება
  showSnackBar(message: string): void {
    this.translate.get('PUBLIC_PRODUCTS.CLOSE').subscribe(closeText => {
      this.snackBar.open(message, closeText, {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    });
  }

  // სლუგის გენერაცია
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\wა-ჰ\-]+/g, '')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // მთავარი სურათი
  getMainImage(product: Product): string {
    const images = this.getAllProductImages(product);
    return images[0];
  }

  // დანარჩენი სურათები
  getAdditionalImages(product: Product): string[] {
    const images = this.getAllProductImages(product);
    return images.slice(1, 4);
  }
 
  // 🔸 გამასწორებული getAllProductImages
  getAllProductImages(product: Product): string[] {
    const images: string[] = [];
    
    // პირველ რიგში ძირითადი სურათი
    if (product.image) {
      images.push(product.image);
    }
    
    // შემდეგ images array-დან
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(image => {
        if (image && !images.includes(image)) {
          images.push(image);
        }
      });
    }
    
    // ძველი ველების მხარდაჭერა
    [product.productImage1, product.productImage2, product.productImage3].forEach(image => {
      if (image && !images.includes(image)) {
        images.push(image);
      }
    });
    
    const limitedImages = images.slice(0, 3);
    
    // Placeholder თუ სურათები არ არის
    if (limitedImages.length === 0) {
      limitedImages.push('assets/images/placeholder.jpg');
    }
    
    return limitedImages;
  }

  // 🔸 გამასწორებული ნახვების რაოდენობის მიღება
  getViewCount(product: Product): number {
    if (!product) {
      console.warn('⚠️ Product is null/undefined');
      return 0;
    }

    const viewCount = product.viewCount || product.views || 0;
    
    // 🔸 Debug logging
    if (viewCount > 0) {
      console.log(`📊 Product "${product.title}" has ${viewCount} views`);
    }
    
    return viewCount;
  }

  // ✅ განახლებული ნახვების ფორმატირება თარგმანით
  formatViewCount(count: number): string {
    if (!count || count === 0) return '0';
    
    if (count < 1000) {
      return count.toString();
    } else if (count < 1000000) {
      // ✅ 'ათ' ან 'K' თარგმანის მიხედვით
      const suffix = this.translate.instant('PUBLIC_PRODUCTS.VIEW_SUFFIX_THOUSAND');
      return (count / 1000).toFixed(1) + suffix;
    } else {
      // ✅ 'მ' ან 'M' თარგმანის მიხედვით
      const suffix = this.translate.instant('PUBLIC_PRODUCTS.VIEW_SUFFIX_MILLION');
      return (count / 1000000).toFixed(1) + suffix;
    }
  }
}
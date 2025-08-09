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
    MatAutocompleteModule
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
    'თბილისი',
    'ბათუმი',
    'ქუთაისი',
    'რუსთავი',
    'გორი',
    'ფოთი',
    'ზუგდიდი',
    'თელავი',
    'ოზურგეთი',
    'მარნეული',
    'ახალციხე',
    'ახალქალაქი',
    'ბოლნისი',
    'საგარეჯო',
    'გარდაბანი',
    'ცხინვალი',
    'ჭიათურა',
    'დუშეთი',
    'დმანისი',
    'წალკა',
    'თეთრიწყარო',
    'საჩხერე',
    'ლაგოდეხი',
    'ყვარელი',
    'თიანეთი',
    'კასპი',
    'ხაშური',
    'ხობი',
    'წალენჯიხა',
    'მესტია',
    'ამბროლაური',
    'ცაგერი',
    'ონი',
    'ლანჩხუთი',
    'ჩოხატაური',
    'ქობულეთი',
    'სურამი',
    'აბაშა',
    'სენაკი',
    'ტყიბული',
    'წყალტუბო',
    'ნინოწმინდა',
    'ცაგერი',
    'ბაკურიანი',
    'გუდაური',
    'წნორი',
    'ახმეტა',
    'ბარნოვი',
    'ყვარელი',
    'შორაპანი',
    'სოხუმი'
  ];

  constructor(
    private productService: ProductService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // ვუსმენთ query params ცვლილებებს
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

  // პროდუქტების ჩატვირთვა ფილტრებით ან ფილტრების გარეშე
  loadProducts(): void {
    this.isLoading = true;
    
    const filters: any = {};
    
    if (this.selectedCategory) {
      filters.category = this.selectedCategory;
      console.log(`ფილტრაცია კატეგორიით: ${this.selectedCategory}`);
    }
    if (this.selectedCity) {
      filters.city = this.selectedCity;
    }
    if (this.minPrice) {
      filters.minPrice = this.minPrice;
    }
    
    if (this.maxPrice) {
      filters.maxPrice = this.maxPrice;
    }
    
    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }
    
    this.productService.getAllProducts(filters).subscribe({
      next: (response) => {
        console.log('მიღებული პროდუქტები:', response);
       if (Array.isArray(response.data)) {
  this.products = response.data;
} else if (Array.isArray(response)) {
  this.products = response;
} else {
  this.products = [];
  this.showSnackBar('პროდუქტების მონაცემების ფორმატი არასწორია');
}
        console.log('API response:', response);
        
        // შევამოწმოთ პროდუქტების სტრუქტურა
        if (this.products.length > 0) {
          console.log('პირველი პროდუქტის სტრუქტურა:', this.products[0]);
          
          // შევამოწმოთ აქვთ თუ არა ID ველი
          const hasIdField = this.products.every(product => product.id);
          console.log('ყველა პროდუქტს აქვს ID:', hasIdField);
          
          // შევამოწმოთ რა ველები აქვთ პროდუქტებს
          const firstProduct = this.products[0];
          const fields = Object.keys(firstProduct);
          console.log('პროდუქტის ველები:', fields);
          
          // თუ არ აქვთ id ველი, მაგრამ აქვთ სხვა უნიკალური იდენტიფიკატორი
          if (!hasIdField) {
            // შევამოწმოთ ალტერნატიული ველები (_id, productId, და ა.შ.)
            const possibleIdFields = ['_id', 'productId', 'product_id', 'uid'];
            
            for (const field of possibleIdFields) {
              if (firstProduct[field as keyof Product]) {
                console.log(`ნაპოვნია ალტერნატიული ID ველი: ${field}`);
                // დავარქვათ ამ ველს "id", რომ გამოვიყენოთ აპლიკაციაში
                this.products = this.products.map(product => ({
                  ...product,
                  id: String(product[field as keyof Product])
                }));
                break;
              }
            }
          }
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('პროდუქტების ჩატვირთვის შეცდომა:', error);
        this.showSnackBar('პროდუქტების ჩატვირთვა ვერ მოხერხდა');
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
    const search = this.selectedCity?.toLowerCase();
    this.filteredCities = this.cities.filter(city => city.toLowerCase().includes(search));
  }

  // ფილტრების გასუფთავება
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.loadProducts();
  }

  // შეცვლილი პროდუქტის დეტალების გვერდზე გადასვლა
  openProductDetails(product: Product): void {
    const productId = this.getProductId(product);
    
    if (!productId) {
      console.error('პროდუქტის ID ვერ მოიძებნა');
      this.showSnackBar('პროდუქტის ID ვერ მოიძებნა');
      return;
    }

    const slug = this.generateSlug(product.title);
    this.router.navigate(['/product-details', productId, slug]);
  }

  // პროდუქტის ID-ის მიღება
  getProductId(product: Product): string {
    return product.id || product._id || product.productId || product.product_id || '';
  }

  // შეტყობინება
  showSnackBar(message: string): void {
    this.snackBar.open(message, 'დახურვა', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // მთავარი სურათი (პირველი)
  getMainImage(product: Product): string {
    const images = this.getAllProductImages(product);
    return images[0];
  }
  
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')            // space -> dash
      .replace(/[^\wა-ჰ\-]+/g, '')     // remove special chars (keep Georgian too)
      .replace(/\-+/g, '-')            // remove multiple dashes
      .replace(/^-+|-+$/g, '');        // trim dashes
  }

  // დანარჩენი სურათები (2-4)
  getAdditionalImages(product: Product): string[] {
    const images = this.getAllProductImages(product);
    return images.slice(1, 4); // მაქსიმუმ 3 დამატებითი
  }
 
  getAllProductImages(product: Product): string[] {
    const images: string[] = [];
    
    // პირველ რიგში ვამატებთ ძირითად სურათს
    if (product.image) {
      images.push(product.image);
    }
    
    // შემდეგ ვამატებთ სურათების მასივიდან, მხოლოდ იმ სურათებს რომლებიც არ მეორდება
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(image => {
        if (image && !images.includes(image)) {
          images.push(image);
        }
      });
    }
    
    // ძველი ველების მხარდაჭერა (უკანასკნელი თავსებადობისთვის)
    [product.productImage1, product.productImage2, product.productImage3].forEach(image => {
      if (image && !images.includes(image)) {
        images.push(image);
      }
    });
    
    // მაქსიმუმ 3 სურათი დავტოვოთ
    const limitedImages = images.slice(0, 3);
    
    console.log(`პროდუქტის ${product.title} სურათები:`, limitedImages);
    
    // თუ არ არის სურათები, placeholder დავაბრუნოთ
    if (limitedImages.length === 0) {
      limitedImages.push('assets/images/placeholder.jpg');
    }
    
    return limitedImages;
  }
}
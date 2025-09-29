// dashboard.component.ts - Fixed version with improved product loading

import { Component, OnInit, ViewChild, ElementRef, NgZone, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';
import { ImageCompressionService } from '../services/image-compression.service';
import { User } from '../models/user.model';
import { Product } from '../models/product';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';
import { finalize, catchError, timeout, retry, tap } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatAutocompleteModule, 
    MatButtonModule, 
    ReactiveFormsModule, 
    MatSelectModule, 
    HttpClientModule, 
    FormsModule, 
    MatInputModule, 
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DashboardComponent implements OnInit {
  @ViewChild('profileInput', { static: false }) profileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('productInput1', { static: false }) productInput1Ref!: ElementRef<HTMLInputElement>;
  @ViewChild('productInput2', { static: false }) productInput2Ref!: ElementRef<HTMLInputElement>;
  @ViewChild('productInput3', { static: false }) productInput3Ref!: ElementRef<HTMLInputElement>;

  currentUser: User | null = null;
  productFormVisible: boolean = false;
  isUploading: boolean = false;
  isCompressing: boolean = false;
  isLoadingProducts: boolean = false;
  
  // ✅ Initialize with empty array
  userProducts: Product[] = [];
  
  // ✅ Product limits
  readonly MAX_PRODUCTS_ALLOWED: number = 5;
  readonly MAX_PRODUCT_IMAGES: number = 3;
  
  productForm = new FormGroup({
    title: new FormControl<string>('', [Validators.required]),
    category: new FormControl<string>('', [Validators.required]),
    year: new FormControl<number | null>(null, [Validators.required, Validators.min(2000), Validators.max(new Date().getFullYear())]),
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    description: new FormControl<string>('', [Validators.required]),
    phone: new FormControl<string>('', [Validators.required, Validators.pattern(/^\+?\d{9,15}$/)]),
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    city: new FormControl<string>('', [Validators.required])
  });
  
  // Multiple image arrays
  productImages: (File | null)[] = [null, null, null];
  productImagePreviews: (string | null)[] = [null, null, null];
  
  // Category and city controls
  categoryControl = new FormControl('');
  cityControl = new FormControl('');
  
  filteredCategories: string[] = [];
  filteredCities: string[] = [];

  categories: string[] = [
     'ტელეფონები',
     'ტექნიკა',
     'ავტომობილები',
     'ტანსაცმელი',
     'სათამაშოები',
     'კომპიუტერები',
  ];
  
  public cities: string[] = [
    'თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი', 'გორი', 'ფოთი', 'ზუგდიდი', 'თელავი', 'ოზურგეთი', 'მარნეული',
    'ახალციხე', 'ახალქალაქი', 'ბოლნისი', 'საგარეჯო', 'გარდაბანი', 'ცხინვალი', 'ჭიათურა', 'დუშეთი', 'დმანისი',
    'წალკა', 'თეთრიწყარო', 'საჩხერე', 'ლაგოდეხი', 'ყვარელი', 'თიანეთი', 'კასპი', 'ხაშური', 'ხობი', 'წალენჯიხა',
    'მესტია', 'ამბროლაური', 'ცაგერი', 'ონი', 'ლანჩხუთი', 'ჩოხატაური', 'ქობულეთი', 'სურამი', 'აბაშა', 'სენაკი',
    'ტყიბული', 'წყალტუბო', 'ნინოწმინდა', 'ცაგერი', 'ბაკურიანი', 'გუდაური', 'წნორი', 'ახმეტა', 'ბარნოვი',
    'ყვარელი', 'შორაპანი', 'სოხუმი'
  ];

  private isAndroidChrome = false;

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private imageCompressionService: ImageCompressionService,
    private router: Router,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {
    this.detectAndroidChrome();
  }
  
  ngOnInit(): void {
    console.log('🚀 Dashboard ngOnInit started');
    
    // ✅ FIXED: Better user subscription handling
    this.authService.currentUser$.subscribe({
      next: (user) => {
        console.log('👤 User data received:', user ? 'User logged in' : 'No user');
        this.currentUser = user;
        
        if (!this.currentUser) {
          console.log('❌ No user found, redirecting to login');
          this.router.navigate(['/auth/login']);
          return;
        }
        
        // ✅ Load products when user is available
        console.log('✅ User available, loading products...');
        this.loadUserProducts();
      },
      error: (error) => {
        console.error('❌ Error in user subscription:', error);
        this.router.navigate(['/auth/login']);
      }
    });

    // ✅ Refresh user data on component init
    this.authService.refreshUserData().subscribe({
      next: (user) => {
        console.log('🔄 User data refreshed successfully');
      },
      error: (error) => {
        console.error('❌ Failed to refresh user data:', error);
      }
    });
    
    // Category filtering
    this.productForm.get('category')?.valueChanges
      .pipe(
        startWith(''),
        map((value: string | null) => (value ? this._filterCategories(value) : this.categories.slice()))
      )
      .subscribe((filtered: string[]) => {
        this.filteredCategories = filtered;
      });

    // City filtering
    this.productForm.get('city')?.valueChanges
      .pipe(
        startWith(''),
        map((value: string | null) => (value ? this._filterCities(value) : this.cities.slice()))
      )
      .subscribe((filtered: string[]) => {
        this.filteredCities = filtered;
      });
  }

  private detectAndroidChrome(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    this.isAndroidChrome = userAgent.includes('android') && userAgent.includes('chrome');
    console.log('🤖 Android Chrome detected:', this.isAndroidChrome);
  }
  
  private _filterCategories(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.categories.filter(category =>
      category.toLowerCase().includes(filterValue)
    );
  }

  private _filterCities(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.cities.filter(city =>
      city.toLowerCase().includes(filterValue)
    );
  }
  
  // ✅ COMPLETELY FIXED: Product loading with better error handling
  loadUserProducts(): void {
    console.log('📦 Starting to load user products...');
    console.log('📊 Current products before loading:', this.userProducts.length);
    
    this.isLoadingProducts = true;
    
    this.productService.getUserProducts()
      .pipe(
        tap(response => console.log('🔍 Raw API response:', response)),
        timeout(20000), // 20 second timeout
        retry({count: 3, delay: 1000}), // Retry 3 times with 1 second delay
        finalize(() => {
          this.isLoadingProducts = false;
          console.log('🏁 Product loading process finished');
        }),
        catchError((error) => {
          console.error('❌ Error loading products:', error);
          
          // More detailed error messages
          let errorMessage = 'პროდუქტების ჩატვირთვა ვერ მოხერხდა';
          if (error.name === 'TimeoutError') {
            errorMessage = 'სერვერთან კავშირი ხანგრძლივად არ მოწყდა';
          } else if (error.status === 401) {
            errorMessage = 'ავტორიზაციის შეცდომა - ხელახლა შეხვდით';
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else if (error.status === 404) {
            errorMessage = 'API endpoint ვერ მოიძებნა';
          } else if (error.status === 500) {
            errorMessage = 'სერვერის შიდა შეცდომა';
          } else if (error.status === 0) {
            errorMessage = 'ქსელის კავშირის პრობლემა';
          }
          
          this.showSnackBar(errorMessage);
          return of({ products: [] }); // Return empty result on error
        })
      )
      .subscribe({
        next: (response) => {
          console.log('📨 Processing API response:', response);
          
          try {
            // ✅ IMPROVED: Handle different response formats
            let products: Product[] = [];
            
            if (response && Array.isArray(response.products)) {
              products = response.products;
              console.log('📋 Response format: { products: [...] }');
            } else if (response && Array.isArray(response.data)) {
              products = response.data;
              console.log('📋 Response format: { data: [...] }');
            } else if (Array.isArray(response)) {
              products = response;
              console.log('📋 Response format: [...]');
            } else if (response && response.result && Array.isArray(response.result)) {
              products = response.result;
              console.log('📋 Response format: { result: [...] }');
            } else {
              console.warn('⚠️ Unexpected response format:', response);
              products = [];
            }
            
            // ✅ Validate and clean products array
            if (products && Array.isArray(products)) {
              this.userProducts = products.filter(product => 
                product && 
                (product._id || product.id) && 
                product.title
              );
              console.log(`✅ Successfully loaded ${this.userProducts.length} valid products`);
              console.log('📦 Product titles:', this.userProducts.map(p => p.title));
              console.log('📦 Product IDs:', this.userProducts.map(p => p._id || p.id));
            } else {
              console.warn('⚠️ Products is not an array:', products);
              this.userProducts = [];
            }
            
            // ✅ Log final state
            console.log(`🎯 Final product count: ${this.userProducts.length}`);
            console.log('🎯 Final products:', this.userProducts);
            
            // ✅ AUTO-CLOSE FORM if limit reached
            if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED && this.productFormVisible) {
              this.productFormVisible = false;
              this.resetProductForm();
              this.showSnackBar(`მიღწეულია პროდუქტების მაქსიმალური რაოდენობა (${this.MAX_PRODUCTS_ALLOWED})`);
            }
            
            // ✅ Show success message if products loaded
            if (this.userProducts.length > 0) {
              console.log('✅ Products displayed successfully');
            } else {
              console.log('ℹ️ No products found for this user');
            }
            
          } catch (processingError) {
            console.error('❌ Error processing response:', processingError);
            this.userProducts = [];
            this.showSnackBar('მონაცემების დამუშავების შეცდომა');
          }
        },
        error: (error) => {
          console.error('❌ Final subscription error:', error);
          this.userProducts = [];
        }
      });
  }

  // ✅ ENHANCED: Toggle product form with strict limit check
  toggleProductForm(): void {
    console.log('🔄 Toggle form clicked. Current products:', this.userProducts.length, 'Limit:', this.MAX_PRODUCTS_ALLOWED);
    
    // ✅ PREVENT opening form if limit reached
    if (!this.productFormVisible && this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
      this.showSnackBar(`❌ მიღწეულია პროდუქტების მაქსიმალური რაოდენობა (${this.MAX_PRODUCTS_ALLOWED}). ვერ დაამატებთ ახალ პროდუქტს!`);
      return;
    }
    
    this.productFormVisible = !this.productFormVisible;
    
    if (!this.productFormVisible) {
      this.resetProductForm();
    } else {
      // ✅ Double-check when opening form
      if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
        this.productFormVisible = false;
        this.showSnackBar('❌ პროდუქტების ლიმიტი მიღწეულია!');
        return;
      }
    }
    
    console.log('📱 Form visibility:', this.productFormVisible);
  }

  // ✅ COMPLETELY REFACTORED: Add product method
  addProduct(): void {
    console.log('🚀 Starting add product process...');
    console.log('📊 Current products count:', this.userProducts.length);
    console.log('📊 Max allowed:', this.MAX_PRODUCTS_ALLOWED);
    
    // ✅ FIRST CHECK: Product limit before validation
    if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
      this.showSnackBar(`❌ მიღწეულია პროდუქტების მაქსიმალური რაოდენობა (${this.MAX_PRODUCTS_ALLOWED})!`);
      this.productFormVisible = false;
      this.resetProductForm();
      return;
    }
    
    // ✅ Form validation
    if (this.productForm.invalid) {
      console.log('❌ Form validation failed');
      console.log('❌ Form errors:', this.getFormErrors());
      this.showSnackBar('❌ გთხოვთ შეავსოთ ყველა საჭირო ველი სწორად');
      this.markFormGroupTouched(this.productForm);
      return;
    }
    
    // ✅ Image validation
    if (!this.hasProductImages()) {
      this.showSnackBar('❌ გთხოვთ აირჩიოთ მინიმუმ ერთი პროდუქტის სურათი');
      return;
    }
    
    console.log('✅ All validations passed, proceeding with product addition');
    
    // ✅ Proceed with adding product
    this.performAddProduct();
  }

  // ✅ NEW: Helper method to get form errors
  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // ✅ IMPROVED: Separated method for actual product addition
  private performAddProduct(): void {
    console.log('🔧 Performing product addition...');
    
    // ✅ FINAL SAFETY CHECK
    if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
      this.showSnackBar('❌ პროდუქტების რაოდენობის ლიმიტი მიღწეულია!');
      this.productFormVisible = false;
      this.resetProductForm();
      return;
    }

    const formData = new FormData();
    
    // ✅ Add form fields with better validation
    const formValues = this.productForm.value;
    
    console.log('📋 Form values:', formValues);
    
    // ✅ FIXED: Better field handling
    if (formValues.title) formData.append('title', formValues.title.trim());
    if (formValues.category) formData.append('category', formValues.category.trim());
    if (formValues.year) formData.append('year', formValues.year.toString());
    if (formValues.price) formData.append('price', formValues.price.toString());
    if (formValues.description) formData.append('description', formValues.description.trim());
    if (formValues.city) formData.append('cities', formValues.city.trim()); // Note: API expects 'cities'
    if (formValues.phone) formData.append('phone', formValues.phone.trim());
    if (formValues.email) formData.append('email', formValues.email.trim());
    
    // ✅ Add images with logging
    let imageCount = 0;
    this.productImages.forEach((image, index) => {
      if (image) {
        formData.append('images', image, `product_${Date.now()}_${index}.jpg`);
        imageCount++;
        console.log(`📷 Added image ${index + 1}: ${image.name} (${(image.size / 1024).toFixed(2)} KB)`);
      }
    });

    console.log(`📊 Total ${imageCount} images added to FormData`);
    
    // ✅ Final validation check
    if (imageCount === 0) {
      console.error('❌ No images provided');
      this.showSnackBar('❌ დაამატეთ მინიმუმ ერთი სურათი');
      return;
    }

    // ✅ Debug: Log all FormData entries
    console.log('📤 FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    // ✅ Start upload process
    this.isUploading = true;
    this.showSnackBar('⏳ პროდუქტი იტვირთება...');

    console.log('📤 Starting product upload...');

    this.productService.addProduct(formData)
      .pipe(
        timeout(120000), // Increased timeout for image uploads (2 minutes)
        finalize(() => {
          this.isUploading = false;
          console.log('🏁 Upload process finished');
        }),
        catchError((error) => {
          console.error('❌ Product addition error:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          
          if (error.name === 'TimeoutError') {
            this.showSnackBar('❌ პროცესი ძალიან დიდხანს გრძელდება - სცადეთ მცირე ზომის სურათებით');
          } else if (error.status === 413) {
            this.showSnackBar('❌ სურათები ძალიან დიდია - შეამცირეთ ზომა');
          } else if (error.status === 401) {
            this.showSnackBar('❌ ავტორიზაციის შეცდომა - გთხოვთ ხელახლა შეხვიდეთ');
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else if (error.status === 400) {
            this.showSnackBar('❌ არასწორი მონაცემები - შეამოწმეთ ყველა ველი');
          } else if (error.status === 422) {
            this.showSnackBar('❌ მონაცემების ვალიდაციის შეცდომა');
          } else if (error.status === 0) {
            this.showSnackBar('❌ ქსელის კავშირის პრობლემა');
          } else {
            this.showSnackBar('❌ პროდუქტის დამატება ვერ მოხერხდა: ' + (error.message || 'უცნობი შეცდომა'));
          }
          
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('📨 Server response:', response);
          
          if (response) {
            console.log('✅ Product added successfully');
            this.showSnackBar('🎉 პროდუქტი წარმატებით დაემატა!');
            
            // ✅ IMPORTANT: Reset form and close it FIRST
            this.resetProductForm();
            this.productFormVisible = false;
            
            // ✅ CRITICAL: Multiple reload strategies
            console.log('🔄 Reloading products after successful addition...');
            
            // Strategy 1: Immediate reload
            this.loadUserProducts();
            
            // Strategy 2: Delayed reload as backup
            timer(1000).subscribe(() => {
              console.log('🔄 Backup product reload...');
              this.loadUserProducts();
            });
            
            // Strategy 3: Second delayed reload
            timer(3000).subscribe(() => {
              console.log('🔄 Final product reload...');
              this.loadUserProducts();
            });
            
          } else {
            console.warn('⚠️ Server returned null response');
            this.showSnackBar('⚠️ სერვერმა უცნობი პასუხი დააბრუნა');
          }
        },
        error: (error) => {
          console.error('❌ Unexpected subscription error:', error);
          this.showSnackBar('❌ მოულოდნელი შეცდომა');
        }
      });
  }

  // ✅ IMPROVED: Better form validation feedback
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // ✅ IMPROVED: Delete product with immediate UI update
  deleteProduct(productId: string): void {
    console.log('🗑️ Attempting to delete product:', productId);
    
    if (!productId) {
      console.error('❌ No product ID provided');
      this.showSnackBar('❌ პროდუქტის ID არ არის მითითებული');
      return;
    }
    
    if (!confirm('❓ ნამდვილად გსურთ პროდუქტის წაშლა?')) {
      return;
    }

    // ✅ Optimistic UI update - remove from array immediately
    const originalProducts = [...this.userProducts];
    const productToDelete = this.userProducts.find(p => p._id === productId || p.id === productId);
    this.userProducts = this.userProducts.filter(p => p._id !== productId && p.id !== productId);
    console.log(`🔄 Optimistically removed product. New count: ${this.userProducts.length}`);

    this.productService.deleteProduct(productId).subscribe({
      next: (response) => {
        console.log('✅ Product successfully deleted from server:', response);
        this.showSnackBar('✅ პროდუქტი წარმატებით წაიშალა');
        
        // ✅ Force reload to ensure consistency
        setTimeout(() => {
          this.loadUserProducts();
        }, 500);
      },
      error: (error) => {
        console.error('❌ Product deletion error:', error);
        
        // ✅ Revert optimistic update on error
        this.userProducts = originalProducts;
        console.log('🔄 Reverted optimistic update due to error');
        
        let errorMessage = 'პროდუქტის წაშლა ვერ მოხერხდა';
        if (error.status === 401) {
          errorMessage = 'ავტორიზაციის შეცდომა';
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        } else if (error.status === 404) {
          errorMessage = 'პროდუქტი ვერ მოიძებნა';
        } else if (error.status === 403) {
          errorMessage = 'არ გაქვთ უფლება ამ პროდუქტის წაშლისა';
        }
        
        this.showSnackBar('❌ ' + errorMessage);
      }
    });
  }
  
  // ✅ ENHANCED: Better form reset
  resetProductForm(): void {
    console.log('🧹 Resetting product form...');
    
    this.productForm.reset();
    this.productForm.markAsUntouched();
    this.productForm.markAsPristine();
    
    this.productImages = [null, null, null];
    this.productImagePreviews = [null, null, null];
    
    // ✅ Reset file inputs
    const fileInputIds = ['productImageInput1', 'productImageInput2', 'productImageInput3', 
                         'productImageInput1Alt', 'productImageInput2Alt', 'productImageInput3Alt'];
    fileInputIds.forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    });
    
    console.log('✅ Product form reset complete');
  }
  
  // ✅ ENHANCED: Strict product limit check with logging
  canAddMoreProducts(): boolean {
    const currentCount = this.userProducts?.length || 0;
    const canAdd = currentCount < this.MAX_PRODUCTS_ALLOWED;
    console.log(`🔢 canAddMoreProducts: ${canAdd} (current: ${currentCount}, max: ${this.MAX_PRODUCTS_ALLOWED})`);
    return canAdd;
  }
  
  // ✅ Enhanced remaining count
  getRemainingProductsCount(): number {
    const remaining = Math.max(0, this.MAX_PRODUCTS_ALLOWED - (this.userProducts?.length || 0));
    return remaining;
  }

  // ✅ Get current products count for display
  getCurrentProductsCount(): number {
    return this.userProducts?.length || 0;
  }

  // ✅ Check if limit is reached
  isProductLimitReached(): boolean {
    return (this.userProducts?.length || 0) >= this.MAX_PRODUCTS_ALLOWED;
  }
  
  // ✅ IMPROVED: Better snackbar with more details
  showSnackBar(message: string, duration: number = 5000): void {
    console.log('📢 Showing snackbar:', message);
    this.snackBar.open(message, 'დახურვა', {
      duration: duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: message.includes('❌') ? ['error-snackbar'] : message.includes('🎉') ? ['success-snackbar'] : ['info-snackbar']
    });
  }

  // ✅ NEW: Force reload products (for debugging)
  forceReloadProducts(): void {
    console.log('🔄 Force reloading products...');
    this.userProducts = []; // Clear current products
    this.loadUserProducts();
  }

  // ✅ NEW: Check server connection
  checkServerConnection(): void {
    console.log('🌐 Checking server connection...');
    this.productService.checkConnection().subscribe({
      next: (response) => {
        console.log('✅ Server connection OK:', response);
        this.showSnackBar('✅ სერვერთან კავშირი წარმატებულია');
      },
      error: (error) => {
        console.error('❌ Server connection error:', error);
        this.showSnackBar('❌ სერვერთან კავშირი ვერ დამყარდა');
      }
    });
  }

  // Rest of the methods remain the same...
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'არ არის მითითებული';
    return new Date(date).toLocaleDateString('ka-GE');
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  triggerFileInput(): void {
    this.ngZone.run(() => {
      try {
        const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
        
        if (!fileInput) {
          console.error('Profile image input not found');
          this.showSnackBar('ფაილის არჩევის ველი ვერ მოიძებნა');
          return;
        }

        console.log('Triggering profile file input, Android Chrome:', this.isAndroidChrome);

        if (this.isAndroidChrome) {
          this.handleAndroidChromeFileInput(fileInput, 'profile');
        } else {
          this.handleStandardFileInput(fileInput);
        }

      } catch (error) {
        console.error('Error triggering profile file input:', error);
        this.showSnackBar('ფაილის არჩევისას დაფიქსირდა შეცდომა');
      }
    });
  }

  triggerProductImageInput(imageIndex: number): void {
    this.ngZone.run(() => {
      try {
        const fileInput = document.getElementById(`productImageInput${imageIndex + 1}`) as HTMLInputElement;
        
        if (!fileInput) {
          console.error(`Product image input ${imageIndex + 1} not found`);
          this.showSnackBar('ფაილის არჩევის ველი ვერ მოიძებნა');
          return;
        }

        console.log(`Triggering product file input ${imageIndex + 1}, Android Chrome:`, this.isAndroidChrome);

        if (this.isAndroidChrome) {
          this.handleAndroidChromeFileInput(fileInput, 'product', imageIndex);
        } else {
          this.handleStandardFileInput(fileInput);
        }

      } catch (error) {
        console.error(`Error triggering product file input ${imageIndex + 1}:`, error);
        this.showSnackBar('ფაილის არჩევისას დაფიქსირდა შეცდომა');
      }
    });
  }

  private handleAndroidChromeFileInput(fileInput: HTMLInputElement, type: 'profile' | 'product', imageIndex?: number): void {
    console.log('Handling Android Chrome file input for:', type, imageIndex !== undefined ? `index: ${imageIndex}` : '');
    
    fileInput.value = '';
    fileInput.removeAttribute('value');
    
    const touchEvents = ['touchstart', 'touchend', 'click'];
    
    let attemptCount = 0;
    const maxAttempts = 3;
    
    const attemptClick = () => {
      attemptCount++;
      console.log(`Attempt ${attemptCount} to trigger file input`);
      
      try {
        touchEvents.forEach(eventType => {
          const event = new TouchEvent(eventType, {
            bubbles: true,
            cancelable: true,
            touches: [],
            targetTouches: [],
            changedTouches: []
          });
          fileInput.dispatchEvent(event);
        });
        
        fileInput.focus();
        
        setTimeout(() => {
          fileInput.click();
        }, 10);
        
        setTimeout(() => {
          if (attemptCount < maxAttempts && (!fileInput.files || fileInput.files.length === 0)) {
            attemptClick();
          }
        }, 100);
        
      } catch (error) {
        console.error(`Error in attempt ${attemptCount}:`, error);
        if (attemptCount < maxAttempts) {
          setTimeout(attemptClick, 200);
        }
      }
    };
    
    requestAnimationFrame(() => {
      attemptClick();
    });
  }

  private handleStandardFileInput(fileInput: HTMLInputElement): void {
    fileInput.value = '';
    
    requestAnimationFrame(() => {
      fileInput.click();
    });
  }

  onFileSelected(event: Event, type: 'profile' | 'product', imageIndex?: number): void {
    this.ngZone.run(() => {
      try {
        const input = event.target as HTMLInputElement;
        
        console.log('File selection event triggered for:', type, imageIndex !== undefined ? `index: ${imageIndex}` : '');
        console.log('Input element:', input);
        console.log('Files found:', input?.files?.length || 0);
        
        if (!input || !input.files || input.files.length === 0) {
          console.warn('No file selected immediately, checking for delayed selection...');
          
          const checkDelayedSelection = (attempt: number = 1) => {
            setTimeout(() => {
              console.log(`Delayed check attempt ${attempt}`);
              if (input?.files && input.files.length > 0) {
                console.log('Delayed file detection successful:', input.files[0].name);
                this.processSelectedFile(input.files[0], type, imageIndex);
              } else if (attempt < 5) {
                checkDelayedSelection(attempt + 1);
              } else {
                console.warn('No file detected after multiple attempts');
              }
            }, attempt * 100);
          };
          
          checkDelayedSelection();
          return;
        }
        
        const file = input.files[0];
        console.log('File selected immediately:', file.name);
        this.processSelectedFile(file, type, imageIndex);
        
      } catch (error) {
        console.error('Error in file selection handler:', error);
        this.showSnackBar('სურათის არჩევისას დაფიქსირდა შეცდომა');
      }
    });
  }

  onAlternativeFileSelected(event: Event, type: 'profile' | 'product', imageIndex?: number): void {
    console.log('Alternative file selection triggered for:', type, imageIndex !== undefined ? `index: ${imageIndex}` : '');
    this.onFileSelected(event, type, imageIndex);
  }

  private async processSelectedFile(file: File, type: 'profile' | 'product', imageIndex?: number): Promise<void> {
    console.log('Processing selected file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      imageIndex: imageIndex
    });
    
    if (!file.type.startsWith('image/')) {
      this.showSnackBar('გთხოვთ აირჩიოთ მხოლოდ სურათი');
      return;
    }
    
    if (file.size === 0) {
      this.showSnackBar('არჩეული ფაილი ცარიელია');
      return;
    }
    
    const maxOriginalSize = 20 * 1024 * 1024;
    if (file.size > maxOriginalSize) {
      this.showSnackBar('სურათის ზომა არ უნდა აღემატებოდეს 20MB-ს');
      return;
    }

    try {
      this.isCompressing = true;
      this.showSnackBar('სურათი მუშავდება...');
      
      const compressionOptions = {
        maxWidth: type === 'profile' ? 512 : 1920,
        maxHeight: type === 'profile' ? 512 : 1080,
        quality: 0.8,
        maxSizeInMB: type === 'profile' ? 1 : 3,
        format: 'jpeg' as const
      };

      console.log(`Starting compression for ${type} image...`);
      console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      const compressedFile = await this.imageCompressionService.compressImage(file, compressionOptions);
      
      console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Compression ratio: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
      
      if (type === 'profile') {
        await this.handleProfileImageSelection(compressedFile);
      } else if (type === 'product' && imageIndex !== undefined) {
        await this.handleProductImageSelection(compressedFile, imageIndex);
      }
      
    } catch (error) {
      console.error('Image compression error:', error);
      this.showSnackBar('სურათის დამუშავებისას დაფიქსირდა შეცდომა');
    } finally {
      this.isCompressing = false;
    }
  }
  
  private async handleProfileImageSelection(file: File): Promise<void> {
    console.log('Processing profile image:', file.name);
    this.isUploading = true;
    
    try {
      const previewUrl = await this.createImagePreview(file);
      const previewElement = document.getElementById('profileImagePreview') as HTMLImageElement;
      if (previewElement) {
        previewElement.src = previewUrl;
        console.log('Profile image preview updated successfully');
      }
    } catch (error) {
      console.error('Error creating profile image preview:', error);
      this.showSnackBar('სურათის პრევიუს შექმნისას დაფიქსირდა შეცდომა');
    }
    
    this.authService.updateProfileImage(file)
      .pipe(finalize(() => this.isUploading = false))
      .subscribe({
        next: (response) => {
          console.log('Profile image updated successfully');
          this.showSnackBar('პროფილის სურათი განახლდა');
        },
        error: (error) => {
          console.error('Profile image update error:', error);
          this.showSnackBar('პროფილის სურათის განახლება ვერ მოხერხდა');
          
          if (this.currentUser?.profileImage) {
            const previewElement = document.getElementById('profileImagePreview') as HTMLImageElement;
            if (previewElement) {
              previewElement.src = this.currentUser.profileImage;
            }
          }
        }
      });
  }
  
  private async handleProductImageSelection(file: File, imageIndex: number): Promise<void> {
    console.log(`Processing product image ${imageIndex + 1}:`, file.name);
    
    if (imageIndex < 0 || imageIndex >= this.MAX_PRODUCT_IMAGES) {
      console.error('Invalid image index:', imageIndex);
      return;
    }
    
    this.productImages[imageIndex] = file;
    
    try {
      this.productImagePreviews[imageIndex] = await this.createImagePreview(file);
      console.log(`Product image ${imageIndex + 1} preview updated successfully`);
    } catch (error) {
      console.error(`Error creating product image ${imageIndex + 1} preview:`, error);
      this.showSnackBar(`პროდუქტის სურათის ${imageIndex + 1} პრევიუს შექმნისას დაფიქსირდა შეცდომა`);
      this.productImages[imageIndex] = null;
      this.productImagePreviews[imageIndex] = null;
    }
  }

  removeProductImage(imageIndex: number): void {
    if (imageIndex >= 0 && imageIndex < this.MAX_PRODUCT_IMAGES) {
      this.productImages[imageIndex] = null;
      this.productImagePreviews[imageIndex] = null;
      console.log(`Product image ${imageIndex + 1} removed`);
    }
  }

  hasProductImages(): boolean {
    return this.productImages.some(image => image !== null);
  }

  getUploadedImagesCount(): number {
    return this.productImages.filter(image => image !== null).length;
  }

  private createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  getAllProductImages(product: Product): string[] {
    if (!product) return [];
    
    const imageSet = new Set<string>();

    // New images array support
    if (Array.isArray(product.images)) {
      product.images
        .filter(img => typeof img === 'string' && img.trim() !== '')
        .forEach(img => imageSet.add(img));
    }

    // Legacy image field
    if (product.image && product.image.trim() !== '') {
      imageSet.add(product.image);
    }

    // Legacy productImage1, productImage2, productImage3 fields
    const legacyImages = [product.productImage1, product.productImage2, product.productImage3];
    legacyImages.forEach(img => {
      if (img && img.trim() !== '') {
        imageSet.add(img);
      }
    });

    return Array.from(imageSet);
  }

  getPrimaryImage(product: Product): string {
    if (!product) return '/assets/default-product.jpg';
    
    const images = this.getAllProductImages(product);
    return images.length > 0 ? images[0] : '/assets/default-product.jpg';
  }

  getImageCount(product: Product): number {
    if (!product) return 0;
    
    const images = this.getAllProductImages(product);
    return images ? images.length : 0;
  }

  get isProcessing(): boolean {
    return this.isUploading || this.isCompressing || this.isLoadingProducts;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      console.log('Image load error:', img.src);
      img.src = '/assets/default-product.jpg';
      img.alt = 'სურათი ვერ ჩაიტვირთა';
    }
  }

  hasValidImages(product: Product): boolean {
    if (!product) return false;
    return this.getAllProductImages(product).length > 0;
  }

  isValidImageUrl(url: string): boolean {
    return typeof url === 'string' && url.trim() !== '' && !url.includes('undefined') && !url.includes('null');
  }
  
  getProductId(product: any): string | null {
    if (!product) return null;
    if (typeof product === 'string') return product;
    if (product.id) return product.id;
    if (product._id) return product._id;
    if (product.productId) return product.productId;
    return null;
  }

openProductDetails(product: any): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const productId = this.getProductId(product);
  
  if (!productId) {
    console.error('პროდუქტის ID ვერ მოიძებნა');
    this.showSnackBar('პროდუქტის ID ვერ მოიძებნა');
    return;
  }

  // ✅ Fixed: Check if title exists before generating slug
  let slug = '';
  if (product && product.title) {
    slug = this.generateSlug(product.title);
  } else {
    // ✅ Fallback slug if title is missing
    slug = 'product';
    console.warn('პროდუქტის title ვერ მოიძებნა, დეფოლტი slug-ის გამოყენება');
  }

  console.log('🔗 Navigating to product details:', { productId, slug, title: product?.title });
  this.router.navigate(['/product-details', productId, slug]);
}

// ✅ Fixed generateSlug function
generateSlug(title: any): string {
  // ✅ Handle null, undefined, empty string
  if (!title || title === null || title === undefined || title === '') {
    console.warn('generateSlug: title is empty or null, returning default');
    return 'product';
  }
  
  try {
    return title
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-ქწერტყუიოპასდფგჰჯკლზხცვბნმ]+/g, '')  // Keep Georgian letters and basic chars
      .replace(/\-\-+/g, '-')        // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
  } catch (error) {
    console.error('generateSlug error:', error, 'title:', title);
    return 'product';
  }
}

  trackByProductId(index: number, product: Product): any {
    return product?._id || product?.id || index;
  }

  trackByImageUrl(index: number, imageUrl: string): any {
    return imageUrl || index;
  }
}
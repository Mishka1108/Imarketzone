// dashboard.component.ts - SSR Fixed version

declare var google: any;

import { Component, OnInit, ViewChild, ElementRef, NgZone, CUSTOM_ELEMENTS_SCHEMA, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';
import { ImageCompressionService } from '../services/image-compression.service';
import { User } from '../models/user.model';
import { Product } from '../models/product';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';
import { finalize, catchError, timeout, retry } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfileImageService } from '../services/profileImage.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MessageService } from '../services/message.service';
import { MessagesModalComponent } from '../messages-modal/messages-modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { CityTranslatePipe } from '../pipes/city-translate.pipe';
import { CategoryTranslatePipe } from '../pipes/category-translate.pipe';
import { LogoutConfirmationDialogComponent } from '../logout-confirmation-dialog/logout-confirmation-dialog.component';


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
    MatProgressSpinnerModule,
    MatDialogModule,
    TranslateModule,
    CityTranslatePipe,
    CategoryTranslatePipe,
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

  unreadMessagesCount: number = 0;

  currentUser: User | null = null;
  productFormVisible: boolean = false;
  isUploading: boolean = false;
  isCompressing: boolean = false;
  isLoadingProducts: boolean = false;
  isSavingProfile: boolean = false;

  userProducts: Product[] = [];
  isLoggingOut: boolean = false;

  readonly MAX_PRODUCTS_ALLOWED: number = 5;
  readonly MAX_PRODUCT_IMAGES: number = 3;

  profileEditVisible: boolean = false;

  profileEditForm = new FormGroup({
    phone: new FormControl<string>('', [Validators.required, Validators.pattern(/^\+?\d{9,15}$/)]),
    personalNumber: new FormControl<string>('', [Validators.required, Validators.minLength(9), Validators.maxLength(11)])
  });

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

  productImages: (File | null)[] = [null, null, null];
  productImagePreviews: (string | null)[] = [null, null, null];

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
    'ტყიბული', 'წყალტუბო', 'ნინოწმინდა', 'ბაკურიანი', 'გუდაური', 'წნორი', 'ახმეტა', 'ბარნოვი',
    'შორაპანი', 'სოხუმი'
  ];

  private isAndroidChrome = false;

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private imageCompressionService: ImageCompressionService,
    private router: Router,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private profileImageService: ProfileImageService,
    private dialog: MatDialog,
    private messageService: MessageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.detectAndroidChrome();
    }
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;

        if (!this.currentUser) {
          this.router.navigate(['/auth/login']);
          return;
        }

        this.loadUserProducts();
        this.loadUnreadMessagesCount();
      },
      error: (error) => {
        console.error('❌ Error in user subscription:', error);
        this.router.navigate(['/auth/login']);
      }
    });

    this.authService.refreshUserData().subscribe({
      next: (user) => {},
      error: (error) => {
        console.error('❌ Failed to refresh user data:', error);
      }
    });

    this.productForm.get('category')?.valueChanges
      .pipe(
        startWith(''),
        map((value: string | null) => (value ? this._filterCategories(value) : this.categories.slice()))
      )
      .subscribe((filtered: string[]) => {
        this.filteredCategories = filtered;
      });

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
    if (!isPlatformBrowser(this.platformId)) return;
    const userAgent = navigator.userAgent.toLowerCase();
    this.isAndroidChrome = userAgent.includes('android') && userAgent.includes('chrome');
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

  toggleProfileEdit(): void {
    this.profileEditVisible = !this.profileEditVisible;

    if (this.profileEditVisible) {
      this.profileEditForm.patchValue({
        phone: this.currentUser?.phone ? String(this.currentUser.phone) : '',
        personalNumber: this.currentUser?.personalNumber ? String(this.currentUser.personalNumber) : ''
      });
    }
  }

  saveProfileInfo(): void {
    if (this.profileEditForm.invalid) {
      this.showSnackBar('❌ გთხოვთ შეავსოთ ყველა ველი სწორად');
      return;
    }

    const formValues = this.profileEditForm.value;
    this.isSavingProfile = true;

    this.authService.updateProfile({
      phone: formValues.phone!,
      personalNumber: formValues.personalNumber!
    }).subscribe({
      next: (response) => {
        this.showSnackBar('✅ პროფილი წარმატებით განახლდა!');
        this.profileEditVisible = false;
        this.isSavingProfile = false;

        this.authService.refreshUserData().subscribe({
          next: (user) => {
            if (user) {
              this.currentUser = user;
            }
          }
        });
      },
      error: (error) => {
        console.error('❌ Profile update error:', error);
        this.isSavingProfile = false;
        this.showSnackBar('❌ პროფილის განახლება ვერ მოხერხდა');
      }
    });
  }

  loadUserProducts(): void {
    this.isLoadingProducts = true;

    this.productService.getUserProducts()
      .pipe(
        timeout(20000),
        retry({ count: 3, delay: 1000 }),
        finalize(() => {
          this.isLoadingProducts = false;
        }),
        catchError((error) => {
          console.error('❌ Error loading products:', error);

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
          return of({ products: [] });
        })
      )
      .subscribe({
        next: (response) => {
          try {
            let products: Product[] = [];

            if (response && Array.isArray(response.products)) {
              products = response.products;
            } else if (response && Array.isArray(response.data)) {
              products = response.data;
            } else if (Array.isArray(response)) {
              products = response;
            } else if (response && response.result && Array.isArray(response.result)) {
              products = response.result;
            } else {
              products = [];
            }

            if (products && Array.isArray(products)) {
              this.userProducts = products.filter(product =>
                product &&
                (product._id || product.id) &&
                product.title
              );
            } else {
              this.userProducts = [];
            }

            if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED && this.productFormVisible) {
              this.productFormVisible = false;
              this.resetProductForm();
              this.showSnackBar(`მიღწეულია პროდუქტების მაქსიმალური რაოდენობა (${this.MAX_PRODUCTS_ALLOWED})`);
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

  toggleProductForm(): void {
    if (!this.productFormVisible) {
      if (!this.currentUser?.phone || String(this.currentUser.phone).trim() === '') {
        this.showSnackBar('❌ პროდუქტის დასამატებლად გთხოვთ შეავსოთ პროფილი: ტელეფონის ნომერი');
        return;
      }

      if (!this.currentUser?.personalNumber || String(this.currentUser.personalNumber).trim() === '') {
        this.showSnackBar('❌ პროდუქტის დასამატებლად გთხოვთ შეავსოთ პროფილი: პირადი ნომერი');
        return;
      }
    }

    if (!this.productFormVisible && this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
      this.showSnackBar(`❌ მიღწეულია პროდუქტების მაქსიმალური რაოდენობა (${this.MAX_PRODUCTS_ALLOWED}). ვერ დაამატებთ ახალ პროდუქტს!`);
      return;
    }

    this.productFormVisible = !this.productFormVisible;

    if (!this.productFormVisible) {
      this.resetProductForm();
    } else {
      if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
        this.productFormVisible = false;
        this.showSnackBar('❌ პროდუქტების ლიმიტი მიღწეულია!');
        return;
      }
    }
  }

  addProduct(): void {
    if (!this.currentUser?.phone || String(this.currentUser.phone).trim() === '') {
      this.showSnackBar('❌ პროდუქტის დასამატებლად გთხოვთ შეავსოთ პროფილი: ტელეფონის ნომერი');
      return;
    }

    if (!this.currentUser?.personalNumber || String(this.currentUser.personalNumber).trim() === '') {
      this.showSnackBar('❌ პროდუქტის დასამატებლად გთხოვთ შეავსოთ პროფილი: პირადი ნომერი');
      return;
    }

    if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
      this.showSnackBar(`❌ მიღწეულია პროდუქტების მაქსიმალური რაოდენობა (${this.MAX_PRODUCTS_ALLOWED})!`);
      this.productFormVisible = false;
      this.resetProductForm();
      return;
    }

    if (this.productForm.invalid) {
      this.showSnackBar('❌ გთხოვთ შეავსოთ ყველა საჭირო ველი სწორად');
      this.markFormGroupTouched(this.productForm);
      return;
    }

    if (!this.hasProductImages()) {
      this.showSnackBar('❌ გთხოვთ აირჩიოთ მინიმუმ ერთი პროდუქტის სურათი');
      return;
    }

    this.performAddProduct();
  }

  private performAddProduct(): void {
    if (this.userProducts.length >= this.MAX_PRODUCTS_ALLOWED) {
      this.showSnackBar('❌ პროდუქტების რაოდენობის ლიმიტი მიღწეულია!');
      this.productFormVisible = false;
      this.resetProductForm();
      return;
    }

    const formData = new FormData();
    const formValues = this.productForm.value;

    if (formValues.title) formData.append('title', formValues.title.trim());
    if (formValues.category) formData.append('category', formValues.category.trim());
    if (formValues.year) formData.append('year', formValues.year.toString());
    if (formValues.price) formData.append('price', formValues.price.toString());
    if (formValues.description) formData.append('description', formValues.description.trim());
    if (formValues.city) formData.append('cities', formValues.city.trim());
    if (formValues.phone) formData.append('phone', formValues.phone.trim());
    if (formValues.email) formData.append('email', formValues.email.trim());

    let imageCount = 0;
    this.productImages.forEach((image, index) => {
      if (image) {
        formData.append('images', image, `product_${Date.now()}_${index}.jpg`);
        imageCount++;
      }
    });

    if (imageCount === 0) {
      this.showSnackBar('❌ დაამატეთ მინიმუმ ერთი სურათი');
      return;
    }

    this.isUploading = true;
    this.showSnackBar('⏳ პროდუქტი იტვირთება...');

    this.productService.addProduct(formData)
      .pipe(
        timeout(120000),
        finalize(() => {
          this.isUploading = false;
        }),
        catchError((error) => {
          console.error('❌ Product addition error:', error);

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
          if (response) {
            this.showSnackBar('🎉 პროდუქტი წარმატებით დაემატა!');
            this.resetProductForm();
            this.productFormVisible = false;
            this.loadUserProducts();

            timer(1000).subscribe(() => this.loadUserProducts());
            timer(3000).subscribe(() => this.loadUserProducts());
          } else {
            this.showSnackBar('⚠️ სერვერმა უცნობი პასუხი დააბრუნა');
          }
        },
        error: (error) => {
          console.error('❌ Unexpected subscription error:', error);
          this.showSnackBar('❌ მოულოდნელი შეცდომა');
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  deleteProduct(productId: string): void {
    if (!productId) {
      this.showSnackBar('❌ პროდუქტის ID არ არის მითითებული');
      return;
    }

    if (!isPlatformBrowser(this.platformId)) return;

    if (!confirm('❓ ნამდვილად გსურთ პროდუქტის წაშლა?')) {
      return;
    }

    const originalProducts = [...this.userProducts];
    this.userProducts = this.userProducts.filter(p => p._id !== productId && p.id !== productId);

    this.productService.deleteProduct(productId).subscribe({
      next: (response) => {
        this.showSnackBar('✅ პროდუქტი წარმატებით წაიშალა');
        setTimeout(() => {
          this.loadUserProducts();
        }, 500);
      },
      error: (error) => {
        console.error('❌ Product deletion error:', error);
        this.userProducts = originalProducts;

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

  resetProductForm(): void {
    this.productForm.reset();
    this.productForm.markAsUntouched();
    this.productForm.markAsPristine();

    this.productImages = [null, null, null];
    this.productImagePreviews = [null, null, null];

    if (isPlatformBrowser(this.platformId)) {
      const fileInputIds = [
        'productImageInput1', 'productImageInput2', 'productImageInput3',
        'productImageInput1Alt', 'productImageInput2Alt', 'productImageInput3Alt'
      ];
      fileInputIds.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) input.value = '';
      });
    }
  }

  canAddMoreProducts(): boolean {
    const currentCount = this.userProducts?.length || 0;
    return currentCount < this.MAX_PRODUCTS_ALLOWED;
  }

  getRemainingProductsCount(): number {
    return Math.max(0, this.MAX_PRODUCTS_ALLOWED - (this.userProducts?.length || 0));
  }

  getCurrentProductsCount(): number {
    return this.userProducts?.length || 0;
  }

  isProductLimitReached(): boolean {
    return (this.userProducts?.length || 0) >= this.MAX_PRODUCTS_ALLOWED;
  }

  showSnackBar(message: string, duration: number = 5000): void {
    this.snackBar.open(message, 'დახურვა', {
      duration: duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: message.includes('❌') ? ['error-snackbar'] : message.includes('🎉') ? ['success-snackbar'] : ['info-snackbar']
    });
  }

  forceReloadProducts(): void {
    this.userProducts = [];
    this.loadUserProducts();
  }

  checkServerConnection(): void {
    this.productService.checkConnection().subscribe({
      next: (response) => {
        this.showSnackBar('✅ სერვერთან კავშირი წარმატებულია');
      },
      error: (error) => {
        console.error('❌ Server connection error:', error);
        this.showSnackBar('❌ სერვერთან კავშირი ვერ დამყარდა');
      }
    });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'არ არის მითითებული';
    return new Date(date).toLocaleDateString('ka-GE');
  }

  logout(): void {
    if (this.isLoggingOut) return;

    const dialogRef = this.dialog.open(LogoutConfirmationDialogComponent, {
      width: '400px',
      panelClass: 'logout-confirmation-dialog',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isLoggingOut = true;

      if (isPlatformBrowser(this.platformId)) {
        if (typeof google !== 'undefined') {
          try {
            google.accounts.id.disableAutoSelect();
            google.accounts.id.cancel();
          } catch (e) {
            console.warn('Could not disable Google prompt:', e);
          }
        }
      }

      this.authService.logout().subscribe({
        next: () => {
          this.isLoggingOut = false;
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.error('❌ Logout error:', error);
          this.isLoggingOut = false;
          this.router.navigate(['/auth/login']);
        }
      });
    });
  }

  triggerFileInput(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.run(() => {
      try {
        const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;

        if (!fileInput) {
          this.showSnackBar('ფაილის არჩევის ველი ვერ მოიძებნა');
          return;
        }

        if (this.isAndroidChrome) {
          this.handleAndroidChromeFileInput(fileInput, 'profile');
        } else {
          this.handleStandardFileInput(fileInput);
        }
      } catch (error) {
        this.showSnackBar('ფაილის არჩევისას დაფიქსირდა შეცდომა');
      }
    });
  }

  triggerProductImageInput(imageIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.run(() => {
      try {
        const fileInput = document.getElementById(`productImageInput${imageIndex + 1}`) as HTMLInputElement;

        if (!fileInput) {
          this.showSnackBar('ფაილის არჩევის ველი ვერ მოიძებნა');
          return;
        }

        if (this.isAndroidChrome) {
          this.handleAndroidChromeFileInput(fileInput, 'product', imageIndex);
        } else {
          this.handleStandardFileInput(fileInput);
        }
      } catch (error) {
        this.showSnackBar('ფაილის არჩევისას დაფიქსირდა შეცდომა');
      }
    });
  }

  private handleAndroidChromeFileInput(fileInput: HTMLInputElement, type: 'profile' | 'product', imageIndex?: number): void {
    fileInput.value = '';
    fileInput.removeAttribute('value');

    let attemptCount = 0;
    const maxAttempts = 3;

    const attemptClick = () => {
      attemptCount++;

      try {
        const touchEvents = ['touchstart', 'touchend', 'click'];
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
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.run(() => {
      try {
        const input = event.target as HTMLInputElement;

        if (!input || !input.files || input.files.length === 0) {
          const checkDelayedSelection = (attempt: number = 1) => {
            setTimeout(() => {
              if (input?.files && input.files.length > 0) {
                this.processSelectedFile(input.files[0], type, imageIndex);
              } else if (attempt < 5) {
                checkDelayedSelection(attempt + 1);
              }
            }, attempt * 100);
          };

          checkDelayedSelection();
          return;
        }

        const file = input.files[0];
        this.processSelectedFile(file, type, imageIndex);

      } catch (error) {
        this.showSnackBar('სურათის არჩევისას დაფიქსირდა შეცდომა');
      }
    });
  }

  onAlternativeFileSelected(event: Event, type: 'profile' | 'product', imageIndex?: number): void {
    this.onFileSelected(event, type, imageIndex);
  }

  private async processSelectedFile(file: File, type: 'profile' | 'product', imageIndex?: number): Promise<void> {
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

      let fileToCompress = file;

      if (file.type === 'image/webp' && isPlatformBrowser(this.platformId)) {
        try {
          fileToCompress = await this.convertWebpToJpeg(file);
        } catch (conversionError) {
          fileToCompress = file;
        }
      }

      const compressionOptions = {
        maxWidth: type === 'profile' ? 512 : 1920,
        maxHeight: type === 'profile' ? 512 : 1080,
        quality: 0.8,
        maxSizeInMB: type === 'profile' ? 1 : 3,
        format: 'jpeg' as const
      };

      const compressedFile = await this.imageCompressionService.compressImage(fileToCompress, compressionOptions);

      if (compressedFile.type !== 'image/jpeg' && compressedFile.type !== 'image/jpg' && isPlatformBrowser(this.platformId)) {
        try {
          const finalJpegFile = await this.convertWebpToJpeg(compressedFile);
          if (type === 'profile') {
            await this.handleProfileImageSelection(finalJpegFile);
          } else if (type === 'product' && imageIndex !== undefined) {
            await this.handleProductImageSelection(finalJpegFile, imageIndex);
          }
        } catch (finalError) {
          if (type === 'profile') {
            await this.handleProfileImageSelection(compressedFile);
          } else if (type === 'product' && imageIndex !== undefined) {
            await this.handleProductImageSelection(compressedFile, imageIndex);
          }
        }
      } else {
        if (type === 'profile') {
          await this.handleProfileImageSelection(compressedFile);
        } else if (type === 'product' && imageIndex !== undefined) {
          await this.handleProductImageSelection(compressedFile, imageIndex);
        }
      }

    } catch (error) {
      this.showSnackBar('სურათის დამუშავებისას დაფიქსირდა შეცდომა');
    } finally {
      this.isCompressing = false;
    }
  }

  private async handleProfileImageSelection(file: File): Promise<void> {
    this.isUploading = true;

    try {
      const previewUrl = await this.createImagePreview(file);

      if (isPlatformBrowser(this.platformId)) {
        const previewElement = document.getElementById('profileImagePreview') as HTMLImageElement;
        if (previewElement) {
          previewElement.src = previewUrl;
        }
      }

      this.profileImageService.updateProfileImage(previewUrl);

    } catch (error) {
      this.showSnackBar('სურათის პრევიუს შექმნისას დაფიქსირდა შეცდომა');
    }

    this.authService.updateProfileImage(file)
      .pipe(finalize(() => this.isUploading = false))
      .subscribe({
        next: (response) => {
          if (response && response.profileImage) {
            this.profileImageService.updateProfileImage(response.profileImage);
          }
          this.showSnackBar('პროფილის სურათი განახლდა');
        },
        error: (error) => {
          this.showSnackBar('პროფილის სურათის განახლება ვერ მოხერხდა');

          if (this.currentUser?.profileImage && isPlatformBrowser(this.platformId)) {
            const previewElement = document.getElementById('profileImagePreview') as HTMLImageElement;
            if (previewElement) {
              previewElement.src = this.currentUser.profileImage;
            }
            this.profileImageService.updateProfileImage(this.currentUser.profileImage);
          }
        }
      });
  }

  private async handleProductImageSelection(file: File, imageIndex: number): Promise<void> {
    if (imageIndex < 0 || imageIndex >= this.MAX_PRODUCT_IMAGES) return;

    this.productImages[imageIndex] = file;

    try {
      this.productImagePreviews[imageIndex] = await this.createImagePreview(file);
    } catch (error) {
      this.showSnackBar(`პროდუქტის სურათის ${imageIndex + 1} პრევიუს შექმნისას დაფიქსირდა შეცდომა`);
      this.productImages[imageIndex] = null;
      this.productImagePreviews[imageIndex] = null;
    }
  }

  removeProductImage(imageIndex: number): void {
    if (imageIndex >= 0 && imageIndex < this.MAX_PRODUCT_IMAGES) {
      this.productImages[imageIndex] = null;
      this.productImagePreviews[imageIndex] = null;
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

      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  getAllProductImages(product: Product): string[] {
    if (!product) return [];

    const imageSet = new Set<string>();

    if (Array.isArray(product.images)) {
      product.images
        .filter(img => typeof img === 'string' && img.trim() !== '')
        .forEach(img => imageSet.add(img));
    }

    if (product.image && product.image.trim() !== '') {
      imageSet.add(product.image);
    }

    const legacyImages = [product.productImage1, product.productImage2, product.productImage3];
    legacyImages.forEach(img => {
      if (img && img.trim() !== '') imageSet.add(img);
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
    return this.getAllProductImages(product).length;
  }

  get isProcessing(): boolean {
    return this.isUploading || this.isCompressing || this.isLoadingProducts;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
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
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const productId = this.getProductId(product);

    if (!productId) {
      this.showSnackBar('პროდუქტის ID ვერ მოიძებნა');
      return;
    }

    let slug = '';
    if (product && product.title) {
      slug = this.generateSlug(product.title);
    } else {
      slug = 'product';
    }

    this.router.navigate(['/product-details', productId, slug]);
  }

  generateSlug(title: any): string {
    if (!title || title === null || title === undefined || title === '') {
      return 'product';
    }

    try {
      return title
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-ქწერტყუიოპასდფგჰჯკლზხცვბნმ]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '');
    } catch (error) {
      return 'product';
    }
  }

  trackByProductId(index: number, product: Product): any {
    return product?._id || product?.id || index;
  }

  trackByImageUrl(index: number, imageUrl: string): any {
    return imageUrl || index;
  }

  loadUnreadMessagesCount(): void {
    this.messageService.unreadCount$.subscribe({
      next: (count) => {
        this.unreadMessagesCount = count;
      },
      error: (error) => {
        console.error('❌ Failed to load unread count:', error);
        this.unreadMessagesCount = 0;
      }
    });
  }

  openMessages(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const userId = localStorage.getItem('userId');

    if (!userId) {
      console.error('❌ User not logged in');
      return;
    }

    this.dialog.open(MessagesModalComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      panelClass: 'messages-modal-dialog',
      data: {
        userId: userId,
        userName: localStorage.getItem('userName')
      }
    });
  }

  private async convertWebpToJpeg(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (!e.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to convert canvas to blob'));
                  return;
                }

                const originalName = file.name.replace(/\.webp$/i, '');
                const jpegFile = new File(
                  [blob],
                  `${originalName}.jpg`,
                  { type: 'image/jpeg' }
                );

                resolve(jpegFile);
              },
              'image/jpeg',
              0.92
            );

          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
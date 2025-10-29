import { Title, Meta } from '@angular/platform-browser';
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MessageDialogComponent } from '../message-dialog/message-dialog.component';
import { AuthService } from '../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; 
import { CategoryTranslatePipe } from '../pipes/category-translate.pipe'; 
import { CityTranslatePipe } from '../pipes/city-translate.pipe';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    TranslateModule, 
    CategoryTranslatePipe,
    CityTranslatePipe
  ],
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  isLoading = true;
  error: string | null = null;
  currentImageIndex = 0;
  productImages: string[] = [];
  
  productViews: number = 0;
  todayViews: number = 0;
  weekViews: number = 0;
  monthViews: number = 0;
  isLoadingViews: boolean = false;
  viewsData: any = null;
  
  showImageModal = false;
  currentModalIndex = 0;
  private touchStartX: number | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private location: Location,
    private snackBar: MatSnackBar,
    private titleService: Title,
    private metaService: Meta,
    private dialog: MatDialog,
    private authService: AuthService,
    private translate: TranslateService // ✅ დამატება
  ) {}

  private setSEOData(product: Product): void {
    const title = `${product.title} | Imarketzone`;
    const description = product.description || 'იყიდება პროდუქტი Imarketzone-ზე საუკეთესო ფასად.';
    const image = product.image || 'https://www.imarketzone.ge/assets/images/placeholder.jpg';
    const url = window.location.href;

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
  }

  ngOnInit(): void {
    const rawSlug = this.route.snapshot.paramMap.get('slug');
    
    if (!rawSlug || rawSlug.trim() === '') {
      console.error('❌ პროდუქტის Slug არ არის მოძიებული');
      this.error = 'პროდუქტის Slug არ არის მითითებული';
      this.isLoading = false;
      return;
    }

    this.tryLoadProduct(rawSlug);
  }

  private tryLoadProduct(rawSlug: string): void {
    const decodedSlug = decodeURIComponent(rawSlug);
    
    this.loadProductBySlug(decodedSlug).then(success => {
      if (!success) {
        this.loadProductBySlug(rawSlug).then(success => {
          if (!success) {
            const normalizedSlug = this.normalizeSlug(decodedSlug);
            this.loadProductBySlug(normalizedSlug).then(success => {
              if (!success) {
                this.trySearchProduct(decodedSlug);
              }
            });
          }
        });
      }
    });
  }

  private async loadProductBySlug(slug: string): Promise<boolean> {
    
    return new Promise((resolve) => {
      this.productService.getProductBySlug(slug)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {


            this.product = response.product || response;
            
            if (this.product) {
              this.productImages = this.getAllProductImages(this.product);
              this.setSEOData(this.product);
              this.loadProductViews();
            }
            
            this.isLoading = false;
            resolve(true);
          },
          error: (err) => {
            console.warn(`❌ Slug "${slug}" ვერ მოიძებნა:`, err);
            resolve(false);
          }
        });
    });
  }

  private loadProductViews(): void {
    if (!this.product || !this.product._id) {
      console.warn('⚠️ Product ID not available for view loading');
      return;
    }

    this.isLoadingViews = true;

    (this.productService.recordViewAndGetStats(this.product._id) as unknown as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats: any) => {
          this.processViewStats(stats);
          this.isLoadingViews = false;
        },
        error: (error: any) => {
          console.error('❌ View stats error:', error);
          this.isLoadingViews = false;
          this.getViewStatsOnly();
        }
      });
  }

  private processViewStats(stats: any): void {
    const possibleViewFields = [
      stats.totalViews,
      stats.views,
      stats.viewCount,
      stats.data?.views,
      stats.data?.totalViews,
      stats.monthViews,
      stats.weekViews
    ];

    this.productViews = possibleViewFields.find(val => 
      typeof val === 'number' && val > 0
    ) || 0;

    if (this.productViews === 0) {
      this.productViews = possibleViewFields.find(val => 
        typeof val === 'number' && val >= 0
      ) || 0;
    }

    this.todayViews = stats.todayViews || 0;
    this.weekViews = stats.weekViews || 0;
    this.monthViews = stats.monthViews || 0;
    this.viewsData = stats;
  }

  private getViewStatsOnly(): void {
    if (!this.product?._id) return;
    
    this.productService.getProductViewStats(this.product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.processViewStats(stats);
        },
        error: (error) => {
          console.warn('⚠️ Stats loading failed:', error);
          this.productViews = 0;
        }
      });
  }

  formatViews(views: number | undefined | null): string {
    const numViews = Number(views);
    
    if (isNaN(numViews) || numViews < 0) {
      return '0';
    }
    
    if (numViews >= 1000000) {
      return Math.floor(numViews / 100000) / 10 + 'მ';
    } else if (numViews >= 1000) {
      return Math.floor(numViews / 100) / 10 + 'ც';
    } else {
      return numViews.toString();
    }
  }

  getTotalViews(): number {
    return this.productViews || 0;
  }

  getTodayViews(): number {
    return this.todayViews || 0;
  }

  getWeekViews(): number {
    return this.weekViews || 0;
  }

  getMonthViews(): number {
    return this.monthViews || 0;
  }

  // ✅ განახლებული თარგმანით
  getFormattedViewsWithDetails(): string {
    const total = this.getTotalViews();
    const today = this.getTodayViews();
    
    if (total === 0) {
      return '0 ' + this.translate.instant('PRODUCT_DETAILS.VIEWS.LABEL');
    }
    
    let result = this.formatViews(total) + ' ' + this.translate.instant('PRODUCT_DETAILS.VIEWS.LABEL');
    
    if (today > 0) {
      const todayLabel = this.translate.instant('PRODUCT_DETAILS.VIEWS.TODAY');
      result += ` (${todayLabel}: ${today})`;
    }
    
    return result;
  }

  private normalizeSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private trySearchProduct(searchTerm: string): void {
    this.productService.getAllProducts({ search: searchTerm })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const products = response.products || response;
          
          if (products && products.length > 0) {
            const matchedProduct = products.find((p: any) => 
              p.title && (
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                this.normalizeSlug(p.title) === this.normalizeSlug(searchTerm)
              )
            ) || products[0];
            
            this.product = matchedProduct;
            if (this.product) {
              this.productImages = this.getAllProductImages(this.product);
              this.setSEOData(this.product);
              this.loadProductViews();
            }
            this.isLoading = false;
          } else {
            this.handleNoProductFound();
          }
        },
        error: (err) => {
          console.error('Search error:', err);
          this.handleNoProductFound();
        }
      });
  }

  private handleNoProductFound(): void {
    this.error = 'პროდუქტი ვერ მოიძებნა. შესაძლოა წაშლილი იყოს ან URL არასწორია.';
    this.isLoading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeImageModal();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.showImageModal) {
      switch (event.key) {
        case 'Escape':
          this.closeImageModal();
          break;
        case 'ArrowLeft':
          this.prevModalImage();
          break;
        case 'ArrowRight':
          this.nextModalImage();
          break;
      }
    }
  }

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.showImageModal) {
      this.touchStartX = event.touches[0].clientX;
    }
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (this.showImageModal && this.touchStartX !== null) {
      const touchEndX = event.changedTouches[0].clientX;
      const diff = this.touchStartX - touchEndX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.nextModalImage();
        } else {
          this.prevModalImage();
        }
      }
      
      this.touchStartX = null;
    }
  }

  static generateProductUrl(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const encodedSlug = encodeURIComponent(slug);
    return `/product-details/${encodedSlug}`;
  }

  loadProduct(productId: string): void {
    this.productService.getProductById(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.product = response.product || response.data?.[0] || null;
          if (this.product) {
            this.productImages = this.getAllProductImages(this.product);
            this.setSEOData(this.product);
            this.loadProductViews();
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('პროდუქტის ჩატვირთვის შეცდომა:', err);
          this.error = 'პროდუქტის ჩატვირთვა ვერ მოხერხდა.';
          this.isLoading = false;
        }
      });
  }

  getAllProductImages(product: Product | null): string[] {
    if (!product) {
      return ['assets/images/placeholder.jpg'];
    }
    
    const images: string[] = [];
    
    if (product.image) {
      images.push(product.image);
    }
    
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(image => {
        if (image && !images.includes(image)) {
          images.push(image);
        }
      });
    }
    
    [product.productImage1, product.productImage2, product.productImage3].forEach(image => {
      if (image && !images.includes(image)) {
        images.push(image);
      }
    });
    
    if (images.length === 0) {
      images.push('assets/images/placeholder.jpg');
    }
    
    return images;
  }

  changeImage(index: number): void {
    this.currentImageIndex = index;
    this.updateSwiperSlide(index);
  }

  private updateSwiperSlide(index: number): void {
    try {
      const swiperElement = document.querySelector('.main-swiper') as any;
      if (swiperElement && swiperElement.swiper) {
        swiperElement.swiper.slideTo(index);
      }
    } catch (error) {
      console.warn('Swiper update failed:', error);
    }
  }

  nextImage(): void {
    if (this.currentImageIndex < this.productImages.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }
    this.updateSwiperSlide(this.currentImageIndex);
  }

  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.productImages.length - 1;
    }
    this.updateSwiperSlide(this.currentImageIndex);
  }

  openImageModal(imageUrl: string, index: number): void {
    this.currentModalIndex = index;
    this.showImageModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.showImageModal = false;
    document.body.style.overflow = 'auto';
  }

  nextModalImage(): void {
    if (this.currentModalIndex < this.productImages.length - 1) {
      this.currentModalIndex++;
    }
  }

  prevModalImage(): void {
    if (this.currentModalIndex > 0) {
      this.currentModalIndex--;
    }
  }

  // ✅ განახლებული თარგმანით
  sendEmail(): void {
    const notSpecified = this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    
    if (!this.product?.email || this.product.email === notSpecified) {
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.EMAIL_NOT_AVAILABLE').subscribe(msg => {
        this.showSnackBar(msg);
      });
      return;
    }

    try {
      const subject = this.translate.instant('PRODUCT_DETAILS.EMAIL_TEMPLATE.SUBJECT', {
        title: this.product.title
      });
      
      const body = this.translate.instant('PRODUCT_DETAILS.EMAIL_TEMPLATE.BODY', {
        title: this.product.title,
        price: this.formatPrice(this.product.price)
      });
      
      const mailtoLink = `mailto:${this.product.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      window.open(mailtoLink, '_blank');
      
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.EMAIL_OPENED').subscribe(msg => {
        this.showSnackBar(msg);
      });
    } catch (error) {
      console.error('იმეილის გაგზავნის შეცდომა:', error);
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.EMAIL_ERROR').subscribe(msg => {
        this.showSnackBar(msg);
      });
    }
  }

  // ✅ განახლებული თარგმანით
  callPhone(): void {
    const notSpecified = this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    
    if (!this.product?.phone || this.product.phone === notSpecified) {
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.PHONE_NOT_AVAILABLE').subscribe(msg => {
        this.showSnackBar(msg);
      });
      return;
    }

    try {
      const cleanPhone = this.product.phone.replace(/[^\d+]/g, '');
      const telLink = `tel:${cleanPhone}`;
      window.location.href = telLink;
      
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.PHONE_OPENED').subscribe(msg => {
        this.showSnackBar(msg);
      });
    } catch (error) {
      console.error('დარეკვის შეცდომა:', error);
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.PHONE_ERROR').subscribe(msg => {
        this.showSnackBar(msg);
      });
    }
  }

  // ✅ განახლებული თარგმანით
  shareProduct(): void {
    if (!this.product) return;
    
    const productUrl = window.location.origin + ProductDetailsComponent.generateProductUrl(
      this.product.title || 'პროდუქტი'
    );
    
    const title = this.product?.title || 'პროდუქტი';
    const viewsText = this.getTotalViews() > 0 ? 
      ` - ${this.translate.instant('PRODUCT_DETAILS.VIEWS.LABEL')}: ${this.formatViews(this.getTotalViews())}` : '';
    
    const text = this.translate.instant('PRODUCT_DETAILS.SHARE_TEXT', {
      title: title,
      views: viewsText
    });

    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: productUrl
      }).then(() => {
        this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.SHARED').subscribe(msg => {
          this.showSnackBar(msg);
        });
      }).catch((error) => {
        this.fallbackShare(productUrl);
      });
    } else {
      this.fallbackShare(productUrl);
    }
  }

  // ✅ განახლებული თარგმანით
  private fallbackShare(url: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.LINK_COPIED').subscribe(msg => {
          this.showSnackBar(msg);
        });
      }).catch(() => {
        this.openFacebookShare(url);
      });
    } else {
      this.openFacebookShare(url);
    }
  }

  // ✅ განახლებული თარგმანით
  private openFacebookShare(url: string): void {
    const encodedUrl = encodeURIComponent(url);
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
    
    this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.FACEBOOK_OPENED').subscribe(msg => {
      this.showSnackBar(msg);
    });
  }

  goBack(): void {
    this.location.back();
  }

  // ✅ განახლებული თარგმანით
  private showSnackBar(message: string): void {
    this.snackBar.open(message, this.translate.instant('PRODUCT_DETAILS.NOTIFICATIONS.CLOSE'), {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
  }

  // ✅ განახლებული თარგმანით
  getSellerName(): string {
    return this.product?.userName || this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
  }

  // ✅ განახლებული თარგმანით
  getSellerEmail(): string {
    return this.product?.email || this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
  }

  // ✅ განახლებული თარგმანით
  getSellerPhone(): string {
    return this.product?.phone || this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
  }

  formatPrice(price: number): string {
    if (!price) return '0₾';
    return price.toLocaleString('ka-GE') + '₾';
  }

  // ✅ განახლებული თარგმანით
  formatDate(date: string): string {
    if (!date) {
      return this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    }
    try {
      const currentLang = this.translate.currentLang || 'ka';
      const locale = currentLang === 'ka' ? 'ka-GE' : 'en-US';
      return new Date(date).toLocaleDateString(locale);
    } catch {
      return this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    }
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.dataset['errorHandled']) {
      target.src = 'assets/images/placeholder.jpg';
      target.dataset['errorHandled'] = 'true';
    }
  }

  onThumbnailError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['errorHandled']) {
      img.src = 'assets/images/placeholder.jpg';
      img.dataset['errorHandled'] = 'true';
    }
  }

  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.classList.add('loaded');
    }
  }

  // ✅ განახლებული თარგმანით
  openMessageDialog(): void {
    const currentUser = this.authService.getCurrentUser();
    const userId = localStorage.getItem('userId');
    
    if (!currentUser && !userId) {
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.LOGIN_REQUIRED').subscribe(msg => {
        this.snackBar.open(msg, this.translate.instant('PRODUCT_DETAILS.NOTIFICATIONS.CLOSE'), {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      });
      this.router.navigate(['/login']);
      return;
    }

    // Extract seller ID correctly with type casting
    const sellerData = this.product?.userId || this.product?.sellerId;
    const sellerId = typeof sellerData === 'object' 
      ? ((sellerData as any)?._id || (sellerData as any)?.id)
      : sellerData;
    
    // Extract seller name correctly
    const sellerName = typeof sellerData === 'object'
      ? (sellerData as any)?.name
      : (this.product?.userName || this.product?.sellerName || 'გამყიდველი');
    
    // Extract seller avatar correctly
    const sellerAvatar = typeof sellerData === 'object'
      ? (sellerData as any)?.avatar
      : this.product?.userAvatar;

    // Extract product ID correctly
    const productData = this.product?._id || this.product?.id;
    const productId = typeof productData === 'object'
      ? ((productData as any)?._id || (productData as any)?.id)
      : productData;

    // Check if trying to message yourself
    if (userId === sellerId) {
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.OWN_PRODUCT').subscribe(msg => {
        this.snackBar.open(msg, this.translate.instant('PRODUCT_DETAILS.NOTIFICATIONS.CLOSE'), {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      });
      return;
    }

    // Validate required fields
    if (!sellerId) {
      this.translate.get('PRODUCT_DETAILS.NOTIFICATIONS.SELLER_INFO_NOT_AVAILABLE').subscribe(msg => {
        this.snackBar.open(msg, this.translate.instant('PRODUCT_DETAILS.NOTIFICATIONS.CLOSE'), {
          duration: 3000
        });
      });
      return;
    }

    // All IDs are now strings
    const dialogData = {
      senderId: userId!,
      receiverId: sellerId as string,
      receiverName: sellerName || 'გამყიდველი',
      receiverAvatar: sellerAvatar,
      productId: productId as string,
      productTitle: this.product?.title
    };


    const dialogRef = this.dialog.open(MessageDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      height: '700px',
      maxHeight: '90vh',
      data: dialogData,
      panelClass: 'message-dialog-container',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
    });
  }
}
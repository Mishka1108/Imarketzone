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
    MatDialogModule
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
    private authService: AuthService
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
    console.log('=== PRODUCT DETAILS DEBUG START ===');
    const rawSlug = this.route.snapshot.paramMap.get('slug');
    console.log('Raw Product Slug from route:', rawSlug);
    
    if (!rawSlug || rawSlug.trim() === '') {
      console.error('❌ პროდუქტის Slug არ არის მოძიებული');
      this.error = 'პროდუქტის Slug არ არის მითითებული';
      this.isLoading = false;
      return;
    }

    this.tryLoadProduct(rawSlug);
  }

  private tryLoadProduct(rawSlug: string): void {
    console.log('🔄 პირველი მცდელობა - URL decode-ით');
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
    console.log('ვცდილობთ პროდუქტის ჩატვირთვას Slug-ით:', slug);
    
    return new Promise((resolve) => {
      this.productService.getProductBySlug(slug)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ პროდუქტი მოიძებნა:', response);
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

    this.productService.recordViewAndGetStats(this.product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.processViewStats(stats);
          this.isLoadingViews = false;
        },
        error: (error) => {
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

  getFormattedViewsWithDetails(): string {
    const total = this.getTotalViews();
    const today = this.getTodayViews();
    
    if (total === 0) {
      return '0 ნახვა';
    }
    
    let result = this.formatViews(total) + ' ნახვა';
    
    if (today > 0) {
      result += ` (დღეს: ${today})`;
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

  sendEmail(): void {
    if (!this.product?.email || this.product.email === 'არ არის მითითებული') {
      this.showSnackBar('იმეილის მისამართი არ არის ხელმისაწვდომი');
      return;
    }

    try {
      const subject = encodeURIComponent(`${this.product.title} - პროდუქტთან დაკავშირებით`);
      const body = encodeURIComponent(`გამარჯობა,\n\nმაინტერესებს თქვენი პროდუქტი: ${this.product.title}\nფასი: ${this.formatPrice(this.product.price)}\n\nგთხოვთ, დამიკავშირდით დეტალური ინფორმაციისთვის.\n\nმადლობა!`);
      const mailtoLink = `mailto:${this.product.email}?subject=${subject}&body=${body}`;
      
      window.open(mailtoLink, '_blank');
      this.showSnackBar('იმეილის კლიენტი გაიხსნა');
    } catch (error) {
      console.error('იმეილის გაგზავნის შეცდომა:', error);
      this.showSnackBar('იმეილის გაგზავნისას წარმოიშვა შეცდომა');
    }
  }

  callPhone(): void {
    if (!this.product?.phone || this.product.phone === 'არ არის მითითებული') {
      this.showSnackBar('ტელეფონის ნომერი არ არის ხელმისაწვდომი');
      return;
    }

    try {
      const cleanPhone = this.product.phone.replace(/[^\d+]/g, '');
      const telLink = `tel:${cleanPhone}`;
      window.location.href = telLink;
      this.showSnackBar('ტელეფონის აპლიკაცია გაიხსნა');
    } catch (error) {
      console.error('დარეკვის შეცდომა:', error);
      this.showSnackBar('დარეკვისას წარმოიშვა შეცდომა');
    }
  }

  shareProduct(): void {
    if (!this.product) return;
    
    const productUrl = window.location.origin + ProductDetailsComponent.generateProductUrl(
      this.product.title || 'პროდუქტი'
    );
    
    const title = this.product?.title || 'პროდუქტი';
    const viewsText = this.getTotalViews() > 0 ? 
      ` - ნახვები: ${this.formatViews(this.getTotalViews())}` : '';
    const text = `შეხედეთ ამ საინტერესო პროდუქტს: ${title}${viewsText}`;

    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: productUrl
      }).then(() => {
        this.showSnackBar('პროდუქტი გაზიარდა');
      }).catch((error) => {
        this.fallbackShare(productUrl);
      });
    } else {
      this.fallbackShare(productUrl);
    }
  }

  private fallbackShare(url: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.showSnackBar('ლინკი კოპირებულია ბუფერში');
      }).catch(() => {
        this.openFacebookShare(url);
      });
    } else {
      this.openFacebookShare(url);
    }
  }

  private openFacebookShare(url: string): void {
    const encodedUrl = encodeURIComponent(url);
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
    this.showSnackBar('Facebook გაზიარების ფანჯარა გაიხსნა');
  }

  goBack(): void {
    this.location.back();
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'დახურვა', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
  }

  getSellerName(): string {
    return this.product?.userName || 'არ არის მითითებული';
  }

  getSellerEmail(): string {
    return this.product?.email || 'არ არის მითითებული';
  }

  getSellerPhone(): string {
    return this.product?.phone || 'არ არის მითითებული';
  }

  formatPrice(price: number): string {
    if (!price) return '0₾';
    return price.toLocaleString('ka-GE') + '₾';
  }

  formatDate(date: string): string {
    if (!date) return 'არ არის მითითებული';
    try {
      return new Date(date).toLocaleDateString('ka-GE');
    } catch {
      return 'არ არის მითითებული';
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

  // ✅ მხოლოდ ერთი openMessageDialog() ფუნქცია
 // ✅ ახალი (სწორი):
openMessageDialog(): void {
  const currentUser = this.authService.getCurrentUser();
  const userId = localStorage.getItem('userId');
  
  if (!currentUser && !userId) {
    this.snackBar.open('გთხოვთ გაიაროთ ავტორიზაცია', 'დახურვა', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
    this.router.navigate(['/login']);
    return;
  }

  // ✅ Extract seller ID correctly with type casting
  const sellerData = this.product?.userId || this.product?.sellerId;
  const sellerId = typeof sellerData === 'object' 
    ? ((sellerData as any)?._id || (sellerData as any)?.id)
    : sellerData;
  
  // ✅ Extract seller name correctly
  const sellerName = typeof sellerData === 'object'
    ? (sellerData as any)?.name
    : (this.product?.userName || this.product?.sellerName || 'გამყიდველი');
  
  // ✅ Extract seller avatar correctly
  const sellerAvatar = typeof sellerData === 'object'
    ? (sellerData as any)?.avatar
    : this.product?.userAvatar;

  // ✅ Extract product ID correctly
  const productData = this.product?._id || this.product?.id;
  const productId = typeof productData === 'object'
    ? ((productData as any)?._id || (productData as any)?.id)
    : productData;

  // ✅ Check if trying to message yourself
  if (userId === sellerId) {
    this.snackBar.open('ეს თქვენი პროდუქტია', 'დახურვა', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
    return;
  }

  // ✅ Validate required fields
  if (!sellerId) {
    this.snackBar.open('გამყიდველის ინფორმაცია არ არის ხელმისაწვდომი', 'დახურვა', {
      duration: 3000
    });
    return;
  }

  // ✅ All IDs are now strings
  const dialogData = {
    senderId: userId!,
    receiverId: sellerId as string,
    receiverName: sellerName || 'გამყიდველი',
    receiverAvatar: sellerAvatar,
    productId: productId as string,
    productTitle: this.product?.title
  };

  console.log('💬 Opening message dialog with data:', dialogData);

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
    console.log('Dialog closed:', result);
  });
}


}
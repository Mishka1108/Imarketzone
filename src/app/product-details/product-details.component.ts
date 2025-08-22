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
    MatChipsModule
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
  
  // ✅ ნახვების სტატისტიკა - განახლებული
  productViews: number = 0;
  todayViews: number = 0;
  weekViews: number = 0;
  monthViews: number = 0;
  isLoadingViews: boolean = false;
  viewsData: any = null; // მთელი ობიექტის შესანახად
  
  // Image modal properties
  showImageModal = false;
  currentModalIndex = 0;
  private touchStartX: number | null = null;

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private location: Location,
    private snackBar: MatSnackBar,
    private titleService: Title,
    private metaService: Meta
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
    console.log('Current URL:', window.location.href);
    console.log('Route snapshot params:', this.route.snapshot.params);
    
    const rawSlug = this.route.snapshot.paramMap.get('slug');
    console.log('Raw Product Slug from route:', rawSlug);
    
    if (!rawSlug || rawSlug.trim() === '') {
      console.error('❌ პროდუქტის Slug არ არის მოძიებული');
      this.error = 'პროდუქტის Slug არ არის მითითებული';
      this.isLoading = false;
      return;
    }

    // ✅ რამდენიმე მცდელობა სხვადასხვა მეთოდით
    this.tryLoadProduct(rawSlug);
  }

  // ✅ ახალი მეთოდი - რამდენიმე სტრატეგია
  private tryLoadProduct(rawSlug: string): void {
    console.log('🔄 პირველი მცდელობა - URL decode-ით');
    
    // Strategy 1: URL decode
    const decodedSlug = decodeURIComponent(rawSlug);
    console.log('Decoded slug:', decodedSlug);
    
    this.loadProductBySlug(decodedSlug).then(success => {
      if (!success) {
        console.log('🔄 მეორე მცდელობა - raw slug-ით');
        
        // Strategy 2: Raw slug
        this.loadProductBySlug(rawSlug).then(success => {
          if (!success) {
            console.log('🔄 მესამე მცდელობა - normalized slug-ით');
            
            // Strategy 3: Normalized slug
            const normalizedSlug = this.normalizeSlug(decodedSlug);
            console.log('Normalized slug:', normalizedSlug);
            
            this.loadProductBySlug(normalizedSlug).then(success => {
              if (!success) {
                console.log('🔄 მეოთხე მცდელობა - search-ით');
                this.trySearchProduct(decodedSlug);
              }
            });
          }
        });
      }
    });
  }

  // ✅ Promise-based slug loading
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
              
              // ✅ ნახვების სტატისტიკის ჩატვირთვა
              this.loadProductViews();
              
              console.log('კონტაქტის ინფორმაცია კომპონენტში:', {
                email: this.product.email,
                phone: this.product.phone,
                userName: this.product.userName
              });
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

  // ✅ განახლებული ნახვების სტატისტიკის ჩატვირთვა
  private loadProductViews(): void {
    if (!this.product || !this.product._id) {
      console.warn('⚠️ Product ID not available for view loading');
      return;
    }

    console.log('📊 Loading view statistics for product:', this.product._id);
    this.isLoadingViews = true;

    // ✅ Option 1: Combined method (რეკომენდებული)
    this.productService.recordViewAndGetStats(this.product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          console.log('📊 Raw view stats received:', stats);
          this.processViewStats(stats);
          this.isLoadingViews = false;
        },
        error: (error) => {
          console.error('❌ Combined view operation failed:', error);
          this.isLoadingViews = false;
          // Fallback - მაინც ვცადოთ stats-ის მიღება
          this.getViewStatsOnly();
        }
      });
  }

  // ✅ ნახვების მონაცემების დამუშავება
  private processViewStats(stats: any): void {
    console.log('🔍 Processing view stats:', stats);
    
    // სხვადასხვა ველებიდან ნახვების ამოღება
    const possibleViewFields = [
      stats.totalViews,
      stats.views,
      stats.viewCount,
      stats.data?.views,
      stats.data?.totalViews,
      stats.data?.viewCount,
      stats.monthViews, // დავამატოთ monthViews როგორც ალტერნატივა
      stats.weekViews   // დავამატოთ weekViews როგორც ალტერნატივა
    ];

    // პირველი ვალიდური მნიშვნელობის მიღება (> 0)
    this.productViews = possibleViewFields.find(val => 
      typeof val === 'number' && val > 0
    ) || 0;

    // თუ მაინც 0-ია, ვცადოთ ნებისმიერი ვალიდური რიცხვი >= 0
    if (this.productViews === 0) {
      this.productViews = possibleViewFields.find(val => 
        typeof val === 'number' && val >= 0
      ) || 0;
    }

    // დამატებითი სტატისტიკა
    this.todayViews = stats.todayViews || 0;
    this.weekViews = stats.weekViews || 0;
    this.monthViews = stats.monthViews || 0;
    
    // მთელი ობიექტის შენახვა debugging-ისთვის
    this.viewsData = stats;

    console.log('✅ Processed view stats:', {
      totalViews: this.productViews,
      todayViews: this.todayViews,
      weekViews: this.weekViews,
      monthViews: this.monthViews
    });
  }

  private getViewStatsOnly(): void {
    if (!this.product?._id) return;
    
    this.productService.getProductViewStats(this.product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          console.log('📊 Stats only received:', stats);
          this.processViewStats(stats);
        },
        error: (error) => {
          console.warn('⚠️ Even stats loading failed:', error);
          this.productViews = 0;
        }
      });
  }

  // ✅ განახლებული ნახვების ფორმატირება
  formatViews(views: number | undefined | null): string {
    // ✅ უფრო მკაცრი შემოწმება
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

  // ✅ დამატებითი helper მეთოდები ნახვების ფორმატირებისთვის
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

  // ✅ დეტალური ნახვების ფორმატირება (template-ისთვის)
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

  // Slug normalization
  private normalizeSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '') // სპეციალური სიმბოლოების წაშლა
      .replace(/\s+/g, '-')         // სივრცეების ჩანაცვლება ტირეებით
      .replace(/\-+/g, '-')        // მრავალი ტირის ერთით ჩანაცვლება
      .replace(/^-+|-+$/g, '');    // პირველი და ბოლო ტირეების წაშლა
  }

  // ✅ Fallback - search ყველა პროდუქტში
  private trySearchProduct(searchTerm: string): void {
    console.log('🔍 ვცდილობთ პროდუქტის მოძიებას search-ით:', searchTerm);
    
    this.productService.getAllProducts({ search: searchTerm })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const products = response.products || response;
          
          if (products && products.length > 0) {
            // პირველი რელევანტური პროდუქტის არჩევა
            const matchedProduct = products.find((p: any) => 
              p.title && (
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                this.normalizeSlug(p.title) === this.normalizeSlug(searchTerm)
              )
            ) || products[0];
            
            console.log('✅ მოიძებნა პროდუქტი search-ით:', matchedProduct);
            
            this.product = matchedProduct;
            if (this.product) {
              this.productImages = this.getAllProductImages(this.product);
              this.setSEOData(this.product);
              
              // ✅ ნახვების სტატისტიკის ჩატვირთვა
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

  // ✅ პროდუქტის არ მოძიებნის შემთხვევის მუშაობა
  private handleNoProductFound(): void {
    console.error('❌ პროდუქტი ვერ მოიძებნა არცერთი მეთოდით');
    this.error = 'პროდუქტი ვერ მოიძებნა. შესაძლოა წაშლილი იყოს ან URL არასწორია.';
    this.isLoading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeImageModal();
  }

  // Keyboard event listener for modal navigation
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

  // Touch event handling for mobile swipe
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
      
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          this.nextModalImage();
        } else {
          this.prevModalImage();
        }
      }
      
      this.touchStartX = null;
    }
  }

  // ✅ განახლებული URL generator - უკეთესი ქართული slug-ებისთვის
  static generateProductUrl(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '') // სპეციალური სიმბოლოების წაშლა
      .replace(/\s+/g, '-')         // სივრცეების ჩანაცვლება ტირეებით
      .replace(/\-+/g, '-')        // მრავალი ტირის ერთით ჩანაცვლება
      .replace(/^-+|-+$/g, '');    // პირველი და ბოლო ტირეების წაშლა
    
    // ✅ slug-ის URL encoding
    const encodedSlug = encodeURIComponent(slug);
    
    return `/product-details/${encodedSlug}`;
  }

  // ✅ შეუცვლელი loadProduct მეთოდი ID-ისთვის (უკუთავსებადობისთვის)
  loadProduct(productId: string): void {
    console.log('ვიწყებთ პროდუქტის ჩატვირთვას ID-ით:', productId);
    
    this.productService.getProductById(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('მივიღეთ პასუხი ProductDetailsComponent-ში:', response);
          
          this.product = response.product || response.data?.[0] || null;

          if (this.product) {
            this.productImages = this.getAllProductImages(this.product);
            this.setSEOData(this.product);
            
            // ✅ ნახვების სტატისტიკის ჩატვირთვა
            this.loadProductViews();
            
            console.log('კონტაქტის ინფორმაცია კომპონენტში:', {
              email: this.product.email,
              phone: this.product.phone,
              userName: this.product.userName
            });
          }
          
          this.isLoading = false;
        },
        error: (err) => {
          console.error('პროდუქტის ჩატვირთვის შეცდომა:', err);
          this.error = 'პროდუქტის ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.';
          this.isLoading = false;
        }
      });
  }

  // პროდუქტის ყველა სურათის მიღება
  getAllProductImages(product: Product | null): string[] {
    if (!product) {
      return ['assets/images/placeholder.jpg'];
    }
    
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
    
    console.log(`პროდუქტის ${product.title} სურათები:`, images);
    
    // თუ არ არის სურათები, placeholder დავაბრუნოთ
    if (images.length === 0) {
      images.push('assets/images/placeholder.jpg');
    }
    
    return images;
  }

  // სურათის ინდექსის შეცვლა
  changeImage(index: number): void {
    this.currentImageIndex = index;
    this.updateSwiperSlide(index);
  }

  // Update swiper to specific slide
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

  // შემდეგი სურათი
  nextImage(): void {
    if (this.currentImageIndex < this.productImages.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }
    this.updateSwiperSlide(this.currentImageIndex);
  }

  // წინა სურათი
  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.productImages.length - 1;
    }
    this.updateSwiperSlide(this.currentImageIndex);
  }

  // Image Modal Functions
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

  // იმეილის გაგზავნა
  sendEmail(): void {
    if (!this.product?.email || this.product.email === 'არ არის მითითებული') {
      this.showSnackBar('იმეილის მისამართი არ არის ხელმისაწვდომი');
      return;
    }

    try {
      const subject = encodeURIComponent(`${this.product.title} - პროდუქტთან დაკავშირებით`);
      const body = encodeURIComponent(`გამარჯობა,

მაინტერესებს თქვენი პროდუქტი: ${this.product.title}
ფასი: ${this.formatPrice(this.product.price)}

გთხოვთ, დამიკავშირდით დეტალური ინფორმაციისთვის.

მადლობა!`);
      const mailtoLink = `mailto:${this.product.email}?subject=${subject}&body=${body}`;
      
      window.open(mailtoLink, '_blank');
      this.showSnackBar('იმეილის კლიენტი გაიხსნა');
    } catch (error) {
      console.error('იმეილის გაგზავნის შეცდომა:', error);
      this.showSnackBar('იმეილის გაგზავნისას წარმოიშვა შეცდომა');
    }
  }

  // ტელეფონზე დარეკვა
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

  // ✅ განახლებული shareProduct რეალური ნახვების რიცხვით
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
        console.log('Web Share API error:', error);
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

  // დამხმარე მეთოდები Template-ისთვის
  getSellerName(): string {
    if (!this.product) return 'არ არის მითითებული';
    return this.product.userName || 'არ არის მითითებული';
  }

  getSellerEmail(): string {
    if (!this.product) return 'არ არის მითითებული';
    return this.product.email || 'არ არის მითითებული';
  }

  getSellerPhone(): string {
    if (!this.product) return 'არ არის მითითებული';
    return this.product.phone || 'არ არის მითითებული';
  }

  // ფასის ფორმატირება
  formatPrice(price: number): string {
    if (!price) return '0₾';
    return price.toLocaleString('ka-GE') + '₾';
  }

  // თარიღის ფორმატირება
  formatDate(date: string): string {
    if (!date) return 'არ არის მითითებული';
    try {
      return new Date(date).toLocaleDateString('ka-GE');
    } catch {
      return 'არ არის მითითებული';
    }
  }

  // Error handling for images
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.dataset['errorHandled']) {
      target.src = 'assets/images/placeholder.jpg';
      target.dataset['errorHandled'] = 'true';
      console.error('სურათის ჩატვირთვის შეცდომა:', event);
    }
  }

  onThumbnailError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['errorHandled']) {
      img.src = 'assets/images/placeholder.jpg';
      img.dataset['errorHandled'] = 'true';
      console.error('თამბნილის სურათის შეცდომა:', event);
    }
  }

  // Check if image is valid URL
  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Lazy loading optimization
  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.classList.add('loaded');
    }
  }
}
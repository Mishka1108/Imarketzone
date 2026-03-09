import { Title, Meta } from '@angular/platform-browser';
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, HostListener, OnDestroy, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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

  // ─── SEO: საიტის ბაზური URL ───────────────────────────────────────────────
  private readonly SITE_URL = 'https://www.imarketzone.ge';
  private readonly SITE_NAME = 'Imarketzone';
  private readonly FALLBACK_IMAGE = `${this.SITE_URL}/assets/images/placeholder.jpg`;

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
    private translate: TranslateService,
    @Inject(DOCUMENT) private document: Document   // ← DOM-ზე უსაფრთხო წვდომა
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // SEO მეთოდები
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * მთავარი SEO მეთოდი — ყველა მეტა თეგს ადგენს.
   * გამოიძახება პროდუქტის ჩატვირთვის შემდეგ.
   */
  private setSEOData(product: Product): void {
    const title       = `${product.title} - ${this.formatPrice(product.price)} | ${this.SITE_NAME}`;
    const description = this.buildDescription(product);
    const image       = product.image || this.FALLBACK_IMAGE;
    const canonicalUrl = `${this.SITE_URL}${ProductDetailsComponent.generateProductUrl(product.title || '')}`;

    // ── Page Title ────────────────────────────────────────────────────────
    this.titleService.setTitle(title);

    // ── სტანდარტული მეტა თეგები ───────────────────────────────────────────
    this.setMeta('name',     'description',       description);
    this.setMeta('name',     'keywords',          this.buildKeywords(product));
    this.setMeta('name',     'robots',            'index, follow');
    this.setMeta('name',     'author',            this.SITE_NAME);
    this.setMeta('name',     'language',          'Georgian');
    this.setMeta('name',     'geo.region',        'GE');
    this.setMeta('name',     'geo.placename',     product.cities || 'საქართველო');

    // ── Open Graph (Facebook / LinkedIn / WhatsApp) ───────────────────────
    this.setMeta('property', 'og:type',           'product');
    this.setMeta('property', 'og:site_name',      this.SITE_NAME);
    this.setMeta('property', 'og:title',          title);
    this.setMeta('property', 'og:description',    description);
    this.setMeta('property', 'og:image',          image);
    this.setMeta('property', 'og:image:secure_url', image);
    this.setMeta('property', 'og:image:width',    '1200');
    this.setMeta('property', 'og:image:height',   '630');
    this.setMeta('property', 'og:image:alt',      product.title);
    this.setMeta('property', 'og:url',            canonicalUrl);
    this.setMeta('property', 'og:locale',         'ka_GE');

    // Open Graph — პროდუქტის სპეციფიური (ფასი)
    if (product.price) {
      this.setMeta('property', 'product:price:amount',   String(product.price));
      this.setMeta('property', 'product:price:currency', 'GEL');
      this.setMeta('property', 'product:availability',   'in stock');
    }
    if (product.category) {
      this.setMeta('property', 'product:category', product.category);
    }

    // ── Twitter Card ──────────────────────────────────────────────────────
    this.setMeta('name', 'twitter:card',        'summary_large_image');
    this.setMeta('name', 'twitter:site',        '@imarketzone');
    this.setMeta('name', 'twitter:creator',     '@imarketzone');
    this.setMeta('name', 'twitter:title',       title);
    this.setMeta('name', 'twitter:description', description);
    this.setMeta('name', 'twitter:image',       image);
    this.setMeta('name', 'twitter:image:alt',   product.title);

    // ── Canonical URL ─────────────────────────────────────────────────────
    this.setCanonicalLink(canonicalUrl);

    // ── JSON-LD Structured Data (Schema.org) ──────────────────────────────
    this.setStructuredData(product, image, canonicalUrl);
  }

  /** meta updateTag-ის wrapper — property ან name ატრიბუტს ამატებს/განაახლებს */
  private setMeta(attr: 'name' | 'property', key: string, value: string): void {
    if (!value) return;
    this.metaService.updateTag({ [attr]: key, content: value });
  }

  /** აგებს SEO-სთვის ოპტიმიზებულ მოკლე description-ს (≤ 160 სიმბოლო) */
  private buildDescription(product: Product): string {
    if (product.description && product.description.length > 10) {
      return product.description.substring(0, 155).trim() + (product.description.length > 155 ? '…' : '');
    }
    const parts: string[] = [];
    parts.push(`${product.title} — ${this.formatPrice(product.price)}`);
    if (product.category) parts.push(product.category);
    if (product.cities)   parts.push(product.cities);
    if (product.year)     parts.push(String(product.year));
    parts.push('Imarketzone.ge');
    return parts.join(' | ').substring(0, 155);
  }

  /** SEO keywords-ს ქმნის პროდუქტის მონაცემებიდან */
  private buildKeywords(product: Product): string {
    const kw = new Set<string>([
      'imarketzone', 'განცხადება', 'საქართველო', 'იყიდება', 'ყიდვა', 'გაყიდვა'
    ]);
    if (product.title)    product.title.split(' ').forEach(w => w.length > 2 && kw.add(w));
    if (product.category) kw.add(product.category);
    if (product.cities)   kw.add(product.cities);
    if (product.year)     kw.add(String(product.year));
    return [...kw].join(', ');
  }

  /** Canonical <link> თეგს ამატებს ან განაახლებს */
  private setCanonicalLink(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * JSON-LD Structured Data — Product Schema.org
   * Google-ს საშუალებას აძლევს Rich Results-ში გამოჩნდეს
   */
  private setStructuredData(product: Product, image: string, url: string): void {
    const existingScript = this.document.getElementById('product-schema-ld');
    if (existingScript) existingScript.remove();

    const images: string[] = this.getAllProductImages(product).filter(
      img => img !== 'assets/images/placeholder.jpg'
    );
    if (images.length === 0) images.push(image);

    const schema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: this.buildDescription(product),
      image: images,
      url: url,
      offers: {
        '@type': 'Offer',
        price: product.price ?? 0,
        priceCurrency: 'GEL',
        availability: 'https://schema.org/InStock',
        url: url,
        priceValidUntil: this.oneYearFromNow(),
        seller: {
          '@type': 'Person',
          name: product.userName || 'გამყიდველი'
        }
      }
    };

    if (product.category) {
      schema['category'] = product.category;
    }

    if (product.cities) {
      schema['offers']['availableAtOrFrom'] = {
        '@type': 'Place',
        name: product.cities,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'GE',
          addressLocality: product.cities
        }
      };
    }

    // BreadcrumbList — Google-ს breadcrumb-ებისთვის
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'მთავარი',     item: this.SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'განცხადებები', item: `${this.SITE_URL}/products` },
        { '@type': 'ListItem', position: 3, name: product.title,  item: url }
      ]
    };

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id   = 'product-schema-ld';
    // ორი schema ობიექტი ერთ ტეგში მასივად
    script.text = JSON.stringify([schema, breadcrumb]);
    this.document.head.appendChild(script);
  }

  /** ერთი წლის შემდეგ თარიღი (priceValidUntil-ისთვის) */
  private oneYearFromNow(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  /** SEO თეგების გასუფთავება კომპონენტის განადგურებისას */
  private clearSEOData(): void {
    const schemaScript = this.document.getElementById('product-schema-ld');
    if (schemaScript) schemaScript.remove();

    const canonical = this.document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════════════

ngOnInit(): void {
  // ✅ Resolver-იდან პირდაპირ მიიღება - SSR-ში სერვერზე უკვე ჩატვირთულია
  const resolvedData = this.route.snapshot.data['productData'];

  if (resolvedData) {
    // Resolver-მა წარმატებით დააბრუნა პროდუქტი
    this.product = resolvedData.product || resolvedData;

    if (this.product) {
      this.productImages = this.getAllProductImages(this.product);
      this.setSEOData(this.product);  // ← SSR-ში meta tags სერვერზე დაიყენება
      this.isLoading = false;
      this.loadProductViews();        // ← views მხოლოდ client-ზე
    } else {
      this.handleNoProductFound();
    }
  } else {
    // Resolver ვერ მოიძია (fallback)
    const rawSlug = this.route.snapshot.paramMap.get('slug');
    if (rawSlug) {
      this.tryLoadProduct(rawSlug);
    } else {
      this.handleNoProductFound();
    }
  }
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeImageModal();
    this.clearSEOData();   // ← SEO თეგები იწმება route-ის შეცვლისას
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Product Loading
  // ══════════════════════════════════════════════════════════════════════════

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
      stats.totalViews, stats.views, stats.viewCount,
      stats.data?.views, stats.data?.totalViews,
      stats.monthViews, stats.weekViews
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
    this.weekViews  = stats.weekViews  || 0;
    this.monthViews = stats.monthViews || 0;
    this.viewsData  = stats;
  }

  private getViewStatsOnly(): void {
    if (!this.product?._id) return;

    this.productService.getProductViewStats(this.product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (stats) => this.processViewStats(stats),
        error: ()      => { this.productViews = 0; }
      });
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
        error: () => this.handleNoProductFound()
      });
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

  private handleNoProductFound(): void {
    this.error = 'პროდუქტი ვერ მოიძებნა. შესაძლოა წაშლილი იყოს ან URL არასწორია.';
    this.isLoading = false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Views
  // ══════════════════════════════════════════════════════════════════════════

  formatViews(views: number | undefined | null): string {
    const n = Number(views);
    if (isNaN(n) || n < 0) return '0';
    if (n >= 1_000_000) return (Math.floor(n / 100_000) / 10) + 'მ';
    if (n >= 1_000)     return (Math.floor(n / 100) / 10) + 'ც';
    return n.toString();
  }

  getTotalViews():  number { return this.productViews || 0; }
  getTodayViews():  number { return this.todayViews   || 0; }
  getWeekViews():   number { return this.weekViews    || 0; }
  getMonthViews():  number { return this.monthViews   || 0; }

  getFormattedViewsWithDetails(): string {
    const total = this.getTotalViews();
    const today = this.getTodayViews();
    const label = this.translate.instant('PRODUCT_DETAILS.VIEWS.LABEL');

    if (total === 0) return `0 ${label}`;

    let result = `${this.formatViews(total)} ${label}`;
    if (today > 0) {
      const todayLabel = this.translate.instant('PRODUCT_DETAILS.VIEWS.TODAY');
      result += ` (${todayLabel}: ${today})`;
    }
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Image Handling
  // ══════════════════════════════════════════════════════════════════════════

  getAllProductImages(product: Product | null): string[] {
    if (!product) return ['assets/images/placeholder.jpg'];

    const images: string[] = [];
    if (product.image) images.push(product.image);

    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => { if (img && !images.includes(img)) images.push(img); });
    }

    [product.productImage1, product.productImage2, product.productImage3].forEach(img => {
      if (img && !images.includes(img)) images.push(img);
    });

    return images.length ? images : ['assets/images/placeholder.jpg'];
  }

  changeImage(index: number): void {
    this.currentImageIndex = index;
    this.updateSwiperSlide(index);
  }

  private updateSwiperSlide(index: number): void {
    try {
      const swiper = (this.document.querySelector('.main-swiper') as any)?.swiper;
      if (swiper) swiper.slideTo(index);
    } catch { /* ignore */ }
  }

  nextImage(): void {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.productImages.length;
    this.updateSwiperSlide(this.currentImageIndex);
  }

  prevImage(): void {
    this.currentImageIndex = this.currentImageIndex > 0
      ? this.currentImageIndex - 1
      : this.productImages.length - 1;
    this.updateSwiperSlide(this.currentImageIndex);
  }

  openImageModal(imageUrl: string, index: number): void {
    this.currentModalIndex = index;
    this.showImageModal = true;
    this.document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.document.body.style.overflow = 'auto';
  }

  nextModalImage(): void {
    if (this.currentModalIndex < this.productImages.length - 1) this.currentModalIndex++;
  }

  prevModalImage(): void {
    if (this.currentModalIndex > 0) this.currentModalIndex--;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['errorHandled']) {
      img.src = 'assets/images/placeholder.jpg';
      img.dataset['errorHandled'] = 'true';
    }
  }

  onThumbnailError(event: Event): void { this.onImageError(event); }

  isValidImageUrl(url: string): boolean {
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  }

  onImageLoad(event: Event): void {
    (event.target as HTMLImageElement)?.classList.add('loaded');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Keyboard / Touch
  // ══════════════════════════════════════════════════════════════════════════

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.showImageModal) return;
    if (event.key === 'Escape')     this.closeImageModal();
    if (event.key === 'ArrowLeft')  this.prevModalImage();
    if (event.key === 'ArrowRight') this.nextModalImage();
  }

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.showImageModal) this.touchStartX = event.touches[0].clientX;
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (this.showImageModal && this.touchStartX !== null) {
      const diff = this.touchStartX - event.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? this.nextModalImage() : this.prevModalImage(); }
      this.touchStartX = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // URL / Slug
  // ══════════════════════════════════════════════════════════════════════════

  static generateProductUrl(title: string): string {
    const slug = title
      .toLowerCase().trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `/product-details/${encodeURIComponent(slug)}`;
  }

  private normalizeSlug(title: string): string {
    return title
      .toLowerCase().trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Actions (Phone / Email / Share / Message)
  // ══════════════════════════════════════════════════════════════════════════

  callPhone(): void {
    const notSpecified = this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    if (!this.product?.phone || this.product.phone === notSpecified) {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.PHONE_NOT_AVAILABLE').then(m => this.showSnackBar(m));
      return;
    }
    try {
      window.location.href = `tel:${this.product.phone.replace(/[^\d+]/g, '')}`;
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.PHONE_OPENED').then(m => this.showSnackBar(m));
    } catch {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.PHONE_ERROR').then(m => this.showSnackBar(m));
    }
  }

  sendEmail(): void {
    const notSpecified = this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    if (!this.product?.email || this.product.email === notSpecified) {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.EMAIL_NOT_AVAILABLE').then(m => this.showSnackBar(m));
      return;
    }
    try {
      const subject = this.translate.instant('PRODUCT_DETAILS.EMAIL_TEMPLATE.SUBJECT', { title: this.product.title });
      const body    = this.translate.instant('PRODUCT_DETAILS.EMAIL_TEMPLATE.BODY',    { title: this.product.title, price: this.formatPrice(this.product.price) });
      window.open(`mailto:${this.product.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.EMAIL_OPENED').then(m => this.showSnackBar(m));
    } catch {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.EMAIL_ERROR').then(m => this.showSnackBar(m));
    }
  }

  shareProduct(): void {
    if (!this.product) return;
    const productUrl = window.location.origin + ProductDetailsComponent.generateProductUrl(this.product.title || 'პროდუქტი');
    const viewsText  = this.getTotalViews() > 0
      ? ` - ${this.translate.instant('PRODUCT_DETAILS.VIEWS.LABEL')}: ${this.formatViews(this.getTotalViews())}`
      : '';
    const text = this.translate.instant('PRODUCT_DETAILS.SHARE_TEXT', {
      title: this.product.title, views: viewsText
    });

    if (navigator.share) {
      navigator.share({ title: this.product.title, text, url: productUrl })
        .then(() => this.t('PRODUCT_DETAILS.NOTIFICATIONS.SHARED').then(m => this.showSnackBar(m)))
        .catch(() => this.fallbackShare(productUrl));
    } else {
      this.fallbackShare(productUrl);
    }
  }

  private fallbackShare(url: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => this.t('PRODUCT_DETAILS.NOTIFICATIONS.LINK_COPIED').then(m => this.showSnackBar(m)))
        .catch(() => this.openFacebookShare(url));
    } else {
      this.openFacebookShare(url);
    }
  }

  private openFacebookShare(url: string): void {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    this.t('PRODUCT_DETAILS.NOTIFICATIONS.FACEBOOK_OPENED').then(m => this.showSnackBar(m));
  }

  openMessageDialog(): void {
    const currentUser = this.authService.getCurrentUser();
    const userId = localStorage.getItem('userId');

    if (!currentUser && !userId) {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.LOGIN_REQUIRED').then(m => this.showSnackBar(m));
      this.router.navigate(['/login']);
      return;
    }

    const sellerData   = this.product?.userId || this.product?.sellerId;
    const sellerId     = typeof sellerData === 'object' ? ((sellerData as any)?._id || (sellerData as any)?.id) : sellerData;
    const sellerName   = typeof sellerData === 'object' ? (sellerData as any)?.name  : (this.product?.userName   || 'გამყიდველი');
    const sellerAvatar = typeof sellerData === 'object' ? (sellerData as any)?.avatar : this.product?.userAvatar;
    const productData  = this.product?._id || this.product?.id;
    const productId    = typeof productData === 'object' ? ((productData as any)?._id || (productData as any)?.id) : productData;

    if (userId === sellerId) {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.OWN_PRODUCT').then(m => this.showSnackBar(m));
      return;
    }

    if (!sellerId) {
      this.t('PRODUCT_DETAILS.NOTIFICATIONS.SELLER_INFO_NOT_AVAILABLE').then(m => this.showSnackBar(m));
      return;
    }

    this.dialog.open(MessageDialogComponent, {
      width: '600px', maxWidth: '95vw', height: '700px', maxHeight: '90vh',
      data: { senderId: userId!, receiverId: sellerId, receiverName: sellerName || 'გამყიდველი',
              receiverAvatar: sellerAvatar, productId, productTitle: this.product?.title },
      panelClass: 'message-dialog-container', disableClose: false, autoFocus: true
    });
  }

  goBack(): void { this.location.back(); }

  // ══════════════════════════════════════════════════════════════════════════
  // Formatters & Helpers
  // ══════════════════════════════════════════════════════════════════════════

  formatPrice(price: number): string {
    if (!price) return '0₾';
    return price.toLocaleString('ka-GE') + '₾';
  }

  formatDate(date: string): string {
    if (!date) return this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    try {
      const locale = (this.translate.currentLang || 'ka') === 'ka' ? 'ka-GE' : 'en-US';
      return new Date(date).toLocaleDateString(locale);
    } catch {
      return this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED');
    }
  }

  getSellerName():  string { return this.product?.userName || this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED'); }
  getSellerEmail(): string { return this.product?.email    || this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED'); }
  getSellerPhone(): string { return this.product?.phone    || this.translate.instant('PRODUCT_DETAILS.INFO.NOT_SPECIFIED'); }

  /** translate.get-ს Promise-ად ბრუნავს */
  private t(key: string, params?: object): Promise<string> {
    return new Promise(resolve => this.translate.get(key, params).subscribe(resolve));
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, this.translate.instant('PRODUCT_DETAILS.NOTIFICATIONS.CLOSE'), {
      duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom',
      panelClass: ['custom-snackbar']
    });
  }
}
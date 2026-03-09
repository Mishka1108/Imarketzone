import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { tap, map, catchError, retry, timeout, switchMap } from 'rxjs/operators';
import { Product } from '../models/product';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = environment.apiUrl;

  private cachedProducts$ = new BehaviorSubject<any[]>([]);
  public cachedProducts = this.cachedProducts$.asObservable();

  // ✅ PLATFORM_ID დამატება SSR-ისთვის
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  setCachedProducts(products: any[]): void {
    this.cachedProducts$.next(products);
  }

  getCachedProducts(): any[] {
    return this.cachedProducts$.value;
  }

  hasCachedProducts(): boolean {
    return this.cachedProducts$.value.length > 0;
  }

  clearCache(): void {
    this.cachedProducts$.next([]);
  }

  // ✅ localStorage მხოლოდ browser-ში
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();

    if (this.isBrowser()) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    headers = headers.set('Content-Type', 'application/json');
    headers = headers.set('Accept', 'application/json');

    return headers;
  }

  // ✅ localStorage მხოლოდ browser-ში
  private getFormDataHeaders(): HttpHeaders {
    let headers = new HttpHeaders();

    if (this.isBrowser()) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    headers = headers.set('Accept', 'application/json');
    return headers;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ HTTP Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });

    let errorMessage = 'უცნობი შეცდომა';

    if (error.status === 0) {
      errorMessage = 'ქსელის შეცდომა - შეამოწმეთ ინტერნეტი და სერვერის მდგომარეობა';
    } else if (error.status === 401) {
      errorMessage = 'ავტორიზაციის შეცდომა';
    } else if (error.status === 403) {
      errorMessage = 'წვდომა აკრძალულია';
    } else if (error.status === 404) {
      errorMessage = 'რესურსი ვერ მოიძებნა';
    } else if (error.status === 500) {
      errorMessage = 'სერვერის შეცდომა';
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  getAllProducts(filters?: {
    page?: number,
    limit?: number,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string,
    city?: string,
    sortBy?: string
  }): Observable<any> {
    let params = new HttpParams();

    const page = filters?.page !== undefined ? filters.page : 0;
    const limit = filters?.limit !== undefined ? filters.limit : 10;

    params = params.set('page', page.toString());
    params = params.set('limit', limit.toString());

    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
      if (filters.city) params = params.set('city', filters.city);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    }

    return this.http.get(`${this.baseUrl}/products`, {
      params,
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ getAllProducts Error:', error);
        return this.handleError(error);
      })
    );
  }

  getProductBySlug(slug: string): Observable<any> {
    const url = `${this.baseUrl}/products/by-slug/${encodeURIComponent(slug)}`;

    return this.http.get<any>(url, {
      headers: this.getHeaders()
    }).pipe(
      timeout(8000),
      map((response: any) => {
        if (response.success && response.data) {
          return { product: response.data };
        }
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn(`⚠️ Primary endpoint failed (${error.status}), trying fallback...`);
        return this.fallbackSearchProduct(slug);
      })
    );
  }

  private fallbackSearchProduct(searchTerm: string): Observable<any> {
    return this.getAllProducts({ search: searchTerm }).pipe(
      timeout(8000),
      map((response: any) => {
        const products = response.products || response.data || response || [];

        if (!Array.isArray(products) || products.length === 0) {
          throw new Error('No products found in fallback search');
        }

        let product = products.find((p: any) => {
          const productSlug = this.generateSlug(p.title);
          const searchSlug = this.generateSlug(searchTerm);
          return productSlug === searchSlug;
        });

        if (product) return { product };

        product = products.find((p: any) =>
          p.title && p.title.toLowerCase() === searchTerm.toLowerCase()
        );

        if (product) return { product };

        product = products.find((p: any) =>
          p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (product) return { product };

        const normalizedSearch = searchTerm.toLowerCase().replace(/[-_]/g, '');
        product = products.find((p: any) => {
          if (!p.title) return false;
          const normalizedTitle = p.title.toLowerCase().replace(/[-_\s]/g, '');
          return normalizedTitle.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedTitle);
        });

        if (product) return { product };

        return { product: products[0] };
      }),
      catchError(error => {
        console.error('❌ All fallback strategies failed:', error);
        return throwError(() => new Error('პროდუქტი ვერ მოიძებნა'));
      })
    );
  }

  private generateSlug(title: string): string {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  recordViewAndGetStats(productId: string): Observable<any> {
    if (!productId || productId.trim() === '') {
      return of({ success: false, totalViews: 0, todayViews: 0, weekViews: 0, monthViews: 0 });
    }

    return this.recordView(productId).pipe(
      switchMap(recordResponse => {
        if (recordResponse.views !== undefined || recordResponse.totalViews !== undefined) {
          return of(recordResponse);
        }
        return this.getProductViewStats(productId);
      }),
      map(stats => ({
        success: true,
        totalViews: stats.totalViews || stats.views || stats.viewCount || 0,
        todayViews: stats.todayViews || 0,
        weekViews: stats.weekViews || 0,
        monthViews: stats.monthViews || 0,
        data: stats
      })),
      catchError(() => of({ success: false, totalViews: 0, todayViews: 0, weekViews: 0, monthViews: 0 }))
    );
  }

  recordView(productId: string): Observable<any> {
    if (!productId || productId.trim() === '') {
      return of({ success: false, message: 'Invalid product ID' });
    }

    // ✅ navigator და document მხოლოდ browser-ში
    const viewData = {
      productId: productId,
      timestamp: new Date().toISOString(),
      userAgent: this.isBrowser() ? navigator.userAgent : 'SSR',
      referrer: this.isBrowser() ? (document.referrer || 'direct') : 'SSR'
    };

    return this.http.post(`${this.baseUrl}/products/${productId}/view`, viewData, {
      headers: this.getHeaders()
    }).pipe(
      timeout(8000),
      catchError((error: HttpErrorResponse) => {
        console.warn('⚠️ View recording failed:', error.message);
        return of({ success: false, message: 'ნახვის რეგისტრაცია ვერ მოხერხდა', fallback: true });
      })
    );
  }

  getProductViewStats(productId: string): Observable<any> {
    if (!productId || productId.trim() === '') {
      return of({ views: 0, success: false });
    }

    return this.http.get<any>(`${this.baseUrl}/products/${productId}/views`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(8000),
      catchError((error: HttpErrorResponse) => {
        console.warn('⚠️ Stats fetch failed:', error.message);
        return of({ views: 0, totalViews: 0, success: false });
      })
    );
  }

  addProduct(productData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/products`, productData, {
      headers: this.getFormDataHeaders()
    }).pipe(
      timeout(30000),
      retry(1),
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }

  getUserProducts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/user`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      catchError(this.handleError)
    );
  }

  deleteProduct(productId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/products/${productId}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      tap(() => this.clearCache()),
      catchError(this.handleError)
    );
  }

  checkConnection(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`, {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      })
    }).pipe(
      timeout(5000),
      catchError((error) => this.handleError(error))
    );
  }

  getProductById(productId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/${productId}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      map((response: any) => {
        let product = response.product || response;

        const contactSources = [
          { email: product.email, phone: product.phone, name: product.userName },
          { email: product.user?.email, phone: product.user?.phone, name: product.user?.name || product.user?.firstName },
          { email: product.seller?.email || product.sellerEmail, phone: product.seller?.phone || product.sellerPhone, name: product.seller?.name || product.seller?.firstName || product.sellerName },
          { email: product.owner?.email, phone: product.owner?.phone, name: product.owner?.name || product.owner?.firstName },
          { email: product.userEmail, phone: product.userPhone, name: product.userName }
        ];

        let finalContact = { email: '', phone: '', name: '' };

        for (const source of contactSources) {
          if (!finalContact.email && source.email) finalContact.email = source.email;
          if (!finalContact.phone && source.phone) finalContact.phone = source.phone;
          if (!finalContact.name && source.name) finalContact.name = source.name;
          if (finalContact.email && finalContact.phone && finalContact.name) break;
        }

        product.email = finalContact.email || 'არ არის მითითებული';
        product.phone = finalContact.phone || 'არ არის მითითებული';
        product.userName = finalContact.name || 'არ არის მითითებული';

        return response.product ? { product } : product;
      }),
      catchError(this.handleError)
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/products/categories`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      retry(1),
      catchError(this.handleError)
    );
  }

  getProductStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/products/stats`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      retry(1),
      catchError(this.handleError)
    );
  }

  getProductViews(id: string | undefined): Observable<any> {
    if (!id) return of({ views: 0, success: false });
    return this.getProductViewStats(id);
  }
}
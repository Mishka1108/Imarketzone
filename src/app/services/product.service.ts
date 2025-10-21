import { Injectable } from '@angular/core';
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

  // ✅ პროდუქტების Cache
  private cachedProducts$ = new BehaviorSubject<any[]>([]);
  public cachedProducts = this.cachedProducts$.asObservable();

  constructor(private http: HttpClient) { 
    console.log('ProductService initialized with baseUrl:', this.baseUrl);
  }

  // ✅ Cache Management Methods
  setCachedProducts(products: any[]): void {
    console.log(`💾 Caching ${products.length} products`);
    this.cachedProducts$.next(products);
  }

  getCachedProducts(): any[] {
    const cached = this.cachedProducts$.value;
    console.log(`📦 Retrieved ${cached.length} cached products`);
    return cached;
  }

  hasCachedProducts(): boolean {
    const hasCached = this.cachedProducts$.value.length > 0;
    console.log(`🔍 Cache check: ${hasCached ? 'YES' : 'NO'} (${this.cachedProducts$.value.length} products)`);
    return hasCached;
  }

  clearCache(): void {
    console.log('🗑️ Clearing product cache');
    this.cachedProducts$.next([]);
  }

  // ავთენტიფიკაციის ტოკენის მიღება
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    headers = headers.set('Content-Type', 'application/json');
    headers = headers.set('Accept', 'application/json');
    
    return headers;
  }

  // FormData-სთვის სპეციალური headers
  private getFormDataHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    headers = headers.set('Accept', 'application/json');
    
    return headers;
  }

  // Enhanced Error handling method
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('HTTP Error Details:', {
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

  // ✅ განახლებული getAllProducts - Cache-ის გამოყენებით
  getAllProducts(filters?: {
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string
    city?: string
  }): Observable<any> {
    
    // ✅ თუ არ არის ფილტრები და cache არსებობს, დავაბრუნოთ cache
    if (!filters && this.hasCachedProducts()) {
      console.log('⚡ Using cached products (no filters applied)');
      return of({ 
        success: true, 
        products: this.getCachedProducts(),
        source: 'cache'
      });
    }
    
    let params = new HttpParams();
    
    if (filters) {
      if (filters.category) params = params.append('category', filters.category);
      if (filters.minPrice) params = params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.append('maxPrice', filters.maxPrice.toString());
      if (filters.city) params = params.append('city', filters.city);
      if (filters.search) params = params.append('search', filters.search);
    }
    
    console.log('📡 Making getAllProducts API request:', {
      url: `${this.baseUrl}/products`,
      params: params.toString(),
      hasFilters: !!filters
    });
    
    return this.http.get(`${this.baseUrl}/products`, { 
      params,
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      tap(response => {
        console.log('✅ getAllProducts API response received');
        
        // ✅ თუ ფილტრები არ არის, cache-ში შევინახოთ
        if (!filters) {
          const products = (response as any).products || 
                          (response as any).data || 
                          response || [];
          
          if (products.length > 0) {
            this.setCachedProducts(products);
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  // ✅ 🔥 FIXED: Enhanced getProductBySlug with automatic fallback
  getProductBySlug(slug: string): Observable<any> {
    console.log(`🔍 Looking for product with slug: "${slug}"`);
    
    const url = `${this.baseUrl}/products/by-slug/${encodeURIComponent(slug)}`;
    console.log(`📡 Trying primary endpoint: ${url}`);
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      timeout(8000),
      tap(response => {
        console.log('✅ Primary endpoint success:', response);
      }),
      map((response: any) => {
        if (response.success && response.data) {
          return { product: response.data };
        }
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn(`⚠️ Primary endpoint failed (${error.status}), trying fallback...`);
        
        // ✅ AUTOMATIC FALLBACK - ყველა შეცდომაზე
        return this.fallbackSearchProduct(slug);
      })
    );
  }

  // ✅ 🔥 IMPROVED: Fallback search with multiple strategies
  private fallbackSearchProduct(searchTerm: string): Observable<any> {
    console.log('🔄 FALLBACK SEARCH START');
    console.log('Search term:', searchTerm);
    
    // Strategy 1: Try exact title match via search
    return this.getAllProducts({ search: searchTerm }).pipe(
      timeout(8000),
      map((response: any) => {
        const products = response.products || response.data || response || [];
        
        console.log(`📦 Fallback found ${products.length} products`);
        
        if (!Array.isArray(products) || products.length === 0) {
          throw new Error('No products found in fallback search');
        }
        
        // Strategy 1: Exact slug match
        let product = products.find((p: any) => {
          const productSlug = this.generateSlug(p.title);
          const searchSlug = this.generateSlug(searchTerm);
          return productSlug === searchSlug;
        });
        
        if (product) {
          console.log('✅ Found by exact slug match:', product.title);
          return { product };
        }
        
        // Strategy 2: Exact title match (case-insensitive)
        product = products.find((p: any) => 
          p.title && p.title.toLowerCase() === searchTerm.toLowerCase()
        );
        
        if (product) {
          console.log('✅ Found by exact title match:', product.title);
          return { product };
        }
        
        // Strategy 3: Partial title match
        product = products.find((p: any) => 
          p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (product) {
          console.log('✅ Found by partial title match:', product.title);
          return { product };
        }
        
        // Strategy 4: Slug similarity check
        const normalizedSearch = searchTerm.toLowerCase().replace(/[-_]/g, '');
        product = products.find((p: any) => {
          if (!p.title) return false;
          const normalizedTitle = p.title.toLowerCase().replace(/[-_\s]/g, '');
          return normalizedTitle.includes(normalizedSearch) || 
                 normalizedSearch.includes(normalizedTitle);
        });
        
        if (product) {
          console.log('✅ Found by normalized similarity:', product.title);
          return { product };
        }
        
        // Strategy 5: Return first result as last resort
        console.warn('⚠️ No exact match found, returning first result');
        return { product: products[0] };
      }),
      catchError(error => {
        console.error('❌ All fallback strategies failed:', error);
        return throwError(() => new Error('პროდუქტი ვერ მოიძებნა'));
      })
    );
  }

  // ✅ Slug generation helper (matches backend logic)
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

  // ====================================
  // 🔥 VIEW TRACKING METHODS 🔥
  // ====================================

  recordViewAndGetStats(productId: string): Observable<any> {
    console.log('🔍 RECORD VIEW AND GET STATS - START');
    console.log('Product ID:', productId);
    
    if (!productId || productId.trim() === '') {
      console.error('❌ Invalid product ID');
      return of({ 
        success: false, 
        totalViews: 0,
        todayViews: 0,
        weekViews: 0,
        monthViews: 0
      });
    }
    
    // ✅ Combined endpoint for recording view and getting stats
    return this.recordView(productId).pipe(
      switchMap(recordResponse => {
        console.log('📊 View recorded, now fetching stats...');
        
        // If recording includes stats, return them
        if (recordResponse.views !== undefined || recordResponse.totalViews !== undefined) {
          return of(recordResponse);
        }
        
        // Otherwise fetch stats separately
        return this.getProductViewStats(productId);
      }),
      map(stats => {
        console.log('✅ Final view stats:', stats);
        return {
          success: true,
          totalViews: stats.totalViews || stats.views || stats.viewCount || 0,
          todayViews: stats.todayViews || 0,
          weekViews: stats.weekViews || 0,
          monthViews: stats.monthViews || 0,
          data: stats
        };
      }),
      catchError(error => {
        console.error('❌ View tracking error:', error);
        return of({ 
          success: false, 
          totalViews: 0,
          todayViews: 0,
          weekViews: 0,
          monthViews: 0
        });
      })
    );
  }

  recordView(productId: string): Observable<any> {
    console.log('📝 Recording view for product:', productId);
    
    if (!productId || productId.trim() === '') {
      return of({ success: false, message: 'Invalid product ID' });
    }
    
    const viewData = {
      productId: productId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct'
    };
    
    const url = `${this.baseUrl}/products/${productId}/view`;
    
    return this.http.post(url, viewData, {
      headers: this.getHeaders()
    }).pipe(
      timeout(8000),
      tap(response => {
        console.log('✅ View recorded:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('⚠️ View recording failed:', error.message);
        return of({ 
          success: false, 
          message: 'ნახვის რეგისტრაცია ვერ მოხერხდა',
          fallback: true
        });
      })
    );
  }

  getProductViewStats(productId: string): Observable<any> {
    console.log('📊 Fetching view stats for:', productId);
    
    if (!productId || productId.trim() === '') {
      return of({ views: 0, success: false });
    }
    
    const url = `${this.baseUrl}/products/${productId}/views`;
    
    return this.http.get<any>(url, {
      headers: this.getHeaders()
    }).pipe(
      timeout(8000),
      tap(response => {
        console.log('✅ View stats received:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('⚠️ Stats fetch failed:', error.message);
        return of({ 
          views: 0, 
          totalViews: 0,
          success: false 
        });
      })
    );
  }

  // Rest of existing methods...
  addProduct(productData: FormData): Observable<any> {
    console.log('პროდუქტის დამატება იწყება...');
    
    return this.http.post(`${this.baseUrl}/products`, productData, {
      headers: this.getFormDataHeaders()
    }).pipe(
      timeout(30000),
      retry(1),
      tap((response: any) => {
        console.log('პროდუქტი წარმატებით დაემატა:', response);
        this.clearCache();
      }),
      catchError(this.handleError)
    );
  }

  getUserProducts(): Observable<any> {
    console.log('მომხმარებლის პროდუქტების მიღება...');
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
      tap(() => {
        this.clearCache();
      }),
      catchError(this.handleError)
    );
  }

  checkConnection(): Observable<any> {
    console.log('კონექციის შემოწმება:', `${this.baseUrl}/health`);
    return this.http.get(`${this.baseUrl}/health`, {
      headers: new HttpHeaders({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      })
    }).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('კონექციის შეცდომა:', error);
        return this.handleError(error);
      })
    );
  }

  getProductById(productId: string): Observable<any> {
    console.log(`მოითხოვება პროდუქტი ID-ით: ${productId}`);
    return this.http.get(`${this.baseUrl}/products/${productId}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      catchError(this.handleError),
      tap((response: any) => {
        console.log('API-დან მიღებული პასუხი:', response);
      }),
      map((response: any) => {
        let product = response.product || response;
        
        const contactSources = [
          {
            email: product.email,
            phone: product.phone,
            name: product.userName
          },
          {
            email: product.user?.email,
            phone: product.user?.phone,
            name: product.user?.name || product.user?.firstName
          },
          {
            email: product.seller?.email || product.sellerEmail,
            phone: product.seller?.phone || product.sellerPhone,
            name: product.seller?.name || product.seller?.firstName || product.sellerName
          },
          {
            email: product.owner?.email,
            phone: product.owner?.phone,
            name: product.owner?.name || product.owner?.firstName
          },
          {
            email: product.userEmail,
            phone: product.userPhone,
            name: product.userName
          }
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
      })
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
    if (!id) {
      return of({ views: 0, success: false });
    }
    return this.getProductViewStats(id);
  }
}
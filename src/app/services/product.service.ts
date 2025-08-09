import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, map, catchError, retry, timeout, switchMap } from 'rxjs/operators';
import { Product } from '../models/product';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { 
    console.log('ProductService initialized with baseUrl:', this.baseUrl);
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

  // ✅ Enhanced getProductBySlug with comprehensive debugging
 // ✅ გამარტივებული და სწორი getProductBySlug მეთოდი
getProductBySlug(slug: string): Observable<any> {
  console.log(`🔍 Looking for product with slug: "${slug}"`);
  
  // ✅ სწორი URL - რაც ბექენდში გაქვთ განსაზღვრული
  const url = `${this.baseUrl}/products/by-slug/${encodeURIComponent(slug)}`;
  
  console.log(`📡 Making request to: ${url}`);
  
  return this.http.get<any>(url, { 
    headers: this.getHeaders() 
  }).pipe(
    timeout(10000),
    tap(response => {
      console.log('✅ Successfully found product:', response);
    }),
    map((response: any) => {
      // ✅ ბექენდი აბრუნებს { success: true, data: product }
      // ფრონტენდი მოელის { product: ... }
      if (response.success && response.data) {
        return { product: response.data };
      }
      return response;
    }),
    catchError((error: HttpErrorResponse) => {
      console.error(`❌ Failed: ${url} - Status: ${error.status}`, error);
      
      // თუ 404 არის, ვცდით fallback-ს
      if (error.status === 404) {
        return this.fallbackSearchProduct(slug);
      }
      
      return this.handleError(error);
    })
  );
}

  // Create different variations of the slug to try
private fallbackSearchProduct(searchTerm: string): Observable<any> {
  console.log('🔍 Fallback: Searching in all products for:', searchTerm);
  
  return this.getAllProducts({ search: searchTerm }).pipe(
    map((response: any) => {
      const products = response.products || response.data || response || [];
      
      if (!Array.isArray(products) || products.length === 0) {
        throw new Error('პროდუქტი ვერ მოიძებნა');
      }
      
      // ვეძებთ ზუსტ დამთხვევას title-ში
      let product = products.find((p: any) => 
        p.title && p.title.toLowerCase() === searchTerm.toLowerCase()
      );
      
      // თუ ზუსტი არ არის, ვეძებთ ნაწილობრივ დამთხვევას
      if (!product) {
        product = products.find((p: any) => 
          p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // თუ მაინც არ არის, ვუბრუნებთ პირველს
      if (!product) {
        product = products[0];
      }
      
      console.log('✅ Found product via fallback:', product);
      return { product };
    }),
    catchError(error => {
      console.error('❌ Fallback search also failed:', error);
      return throwError(() => new Error('პროდუქტი ვერ მოიძებნა'));
    })
  );
}
  // Try all slug variations across multiple endpoints
 

  // Recursively try endpoint/slug combinations
  private tryEndpointSlugCombinations(
    endpoints: string[], 
    slugs: string[], 
    currentIndex: number
  ): Observable<any> {
    if (currentIndex >= endpoints.length * slugs.length) {
      return throwError(() => new Error('All endpoint/slug combinations failed'));
    }
    
    const endpointIndex = Math.floor(currentIndex / slugs.length);
    const slugIndex = currentIndex % slugs.length;
    
    const endpoint = endpoints[endpointIndex];
    const slug = slugs[slugIndex];
    const fullUrl = `${this.baseUrl}${endpoint}${slug}`;
    
    console.log(`🌐 Attempt ${currentIndex + 1}: ${fullUrl}`);
    
    return this.http.get<any>(fullUrl, { 
      headers: this.getHeaders() 
    }).pipe(
      timeout(5000),
      tap(response => {
        console.log(`✅ Success with: ${fullUrl}`, response);
      }),
      catchError(error => {
        console.warn(`❌ Failed: ${fullUrl} - ${error.message}`);
        return this.tryEndpointSlugCombinations(endpoints, slugs, currentIndex + 1);
      })
    );
  }

  // Fallback: search through all products
  private fallbackProductSearch(searchTerm: string): Observable<any> {
    console.log('🔍 Fallback: Searching through all products for:', searchTerm);
    
    return this.getAllProducts({ search: searchTerm }).pipe(
      map((response: any) => {
        const products = response.products || response.data || response;
        console.log('Search response:', response);
        console.log('Found products:', products);
        
        if (!Array.isArray(products) || products.length === 0) {
          throw new Error('No products found in search');
        }
        
        // Try different matching strategies
        const searchStrategies = [
          // Exact match
          (p: any) => p.title && p.title.toLowerCase() === searchTerm.toLowerCase(),
          // Normalized slug match
          (p: any) => p.title && this.normalizeSlug(p.title) === this.normalizeSlug(searchTerm),
          // Contains match
          (p: any) => p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase()),
          // Slug field match (if exists)
          (p: any) => p.slug && p.slug.toLowerCase() === searchTerm.toLowerCase(),
          // Partial slug match
          (p: any) => p.slug && p.slug.toLowerCase().includes(searchTerm.toLowerCase()),
          // ID match (if search term looks like ID)
          (p: any) => p._id && p._id === searchTerm,
          // Any field contains search term
          (p: any) => JSON.stringify(p).toLowerCase().includes(searchTerm.toLowerCase())
        ];
        
        for (let i = 0; i < searchStrategies.length; i++) {
          const strategy = searchStrategies[i];
          const match = products.find(strategy);
          
          if (match) {
            console.log(`✅ Found match using strategy ${i + 1}:`, match);
            return { product: match };
          }
        }
        
        // If no match found, return first product as last resort
        console.log('⚠️ No exact match found, returning first product');
        return { product: products[0] };
      }),
      catchError(error => {
        console.error('Fallback search failed:', error);
        return this.tryAlternativeApis(searchTerm);
      })
    );
  }

  // Try alternative API structures
  private tryAlternativeApis(searchTerm: string): Observable<any> {
    console.log('🔄 Trying alternative API structures...');
    
    const alternativeEndpoints = [
      `${this.baseUrl}/api/products?title=${encodeURIComponent(searchTerm)}`,
      `${this.baseUrl}/products?q=${encodeURIComponent(searchTerm)}`,
      `${this.baseUrl}/search/products?term=${encodeURIComponent(searchTerm)}`,
      `${this.baseUrl}/products/search?query=${encodeURIComponent(searchTerm)}`,
      `${this.baseUrl}/api/search?type=product&q=${encodeURIComponent(searchTerm)}`
    ];
    
    return this.tryAlternativeEndpoints(alternativeEndpoints, 0);
  }

  private tryAlternativeEndpoints(endpoints: string[], index: number): Observable<any> {
    if (index >= endpoints.length) {
      return throwError(() => new Error('All alternative endpoints failed'));
    }
    
    const endpoint = endpoints[index];
    console.log(`🌐 Trying alternative: ${endpoint}`);
    
    return this.http.get<any>(endpoint, { 
      headers: this.getHeaders() 
    }).pipe(
      timeout(5000),
      map(response => this.normalizeProductResponse(response)),
      catchError(error => {
        console.warn(`❌ Alternative endpoint failed: ${endpoint}`);
        return this.tryAlternativeEndpoints(endpoints, index + 1);
      })
    );
  }

  // Normalize different response formats
  private normalizeProductResponse(response: any): any {
    console.log('Normalizing response:', response);
    
    // Direct product object
    if (response.title || response._id) {
      return { product: response };
    }
    
    // Wrapped in product property
    if (response.product) {
      return response;
    }
    
    // Array in data property
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return { product: response.data[0] };
    }
    
    // Direct array
    if (Array.isArray(response) && response.length > 0) {
      return { product: response[0] };
    }
    
    // Products array property
    if (response.products && Array.isArray(response.products) && response.products.length > 0) {
      return { product: response.products[0] };
    }
    
    throw new Error('Invalid response format');
  }

  // Enhanced slug normalization
  private normalizeSlug(title: string): string {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .trim()
      // Remove special characters but keep Georgian letters and basic punctuation
      .replace(/[^\w\s\-ა-ჰ]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Replace spaces with hyphens
      .replace(/\s/g, '-')
      // Replace multiple hyphens with single hyphen
      .replace(/\-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');
  }

  // Debug method to test API connectivity
  testApiConnectivity(): Observable<any> {
    console.log('🔧 Testing API connectivity...');
    
    const testEndpoints = [
      `${this.baseUrl}/health`,
      `${this.baseUrl}/api/health`,
      `${this.baseUrl}/status`,
      `${this.baseUrl}/products`,
      `${this.baseUrl}/api/products`
    ];
    
    const tests = testEndpoints.map(endpoint => 
      this.http.get(endpoint, { headers: this.getHeaders() }).pipe(
        timeout(5000),
        map(() => ({ endpoint, status: 'success' })),
        catchError(error => of({ endpoint, status: 'failed', error: error.message }))
      )
    );
    
    return of(tests).pipe(
      switchMap(() => Promise.all(tests.map(test => test.toPromise()))),
      tap(results => {
        console.log('API Connectivity Test Results:', results);
      })
    );
  }

  // Rest of your existing methods remain the same...
  addProduct(productData: FormData): Observable<any> {
    console.log('პროდუქტის დამატება იწყება...');
    console.log('API URL:', `${this.baseUrl}/products`);
    
    return this.http.post(`${this.baseUrl}/products`, productData, {
      headers: this.getFormDataHeaders()
    }).pipe(
      timeout(30000),
      retry(1),
      catchError(this.handleError),
      tap((response: any) => {
        console.log('პროდუქტი წარმატებით დაემატა:', response);
      })
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
      catchError(this.handleError)
    );
  }

  getAllProducts(filters?: {
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string
    city?: string
  }): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.category) params = params.append('category', filters.category);
      if (filters.minPrice) params = params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.append('maxPrice', filters.maxPrice.toString());
      if (filters.city) params = params.append('city', filters.city);
      if (filters.search) params = params.append('search', filters.search);
    }
    
    console.log('📡 Making getAllProducts request:', {
      url: `${this.baseUrl}/products`,
      params: params.toString()
    });
    
    return this.http.get(`${this.baseUrl}/products`, { 
      params,
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      tap(response => console.log('getAllProducts response:', response)),
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
        console.log('API-დან მიღებული რო პასუხი:', response);
      }),
      map((response: any) => {
        let product = response.product || response;
        
        console.log('დამუშავებამდე პროდუქტი:', product);
        
        // Contact info processing remains the same...
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
        
        console.log('საბოლოო კონტაქტი:', finalContact);
        
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
}
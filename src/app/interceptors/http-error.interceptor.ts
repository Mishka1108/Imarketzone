import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timer, of } from 'rxjs';
import { catchError, retryWhen, mergeMap, tap, finalize, share } from 'rxjs/operators';

// Cache storage (singleton)
export const requestCache = new Map<string, { response: any; timestamp: number }>();
export const pendingRequests = new Map<string, any>();

const CACHE_TTL = 30000; // 30 წამი
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  
  // GET Request-ებისთვის cache logic
  if (req.method === 'GET') {
    const cacheKey = req.urlWithParams;
    
    // 1️⃣ შევამოწმოთ cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('✅ Cache hit:', cacheKey);
      // ✅ გამოსწორება: ვაბრუნებთ HttpResponse-ს
      return of(new HttpResponse({ 
        body: cached, 
        status: 200,
        statusText: 'OK (from cache)',
        url: req.url
      }));
    }

    // 2️⃣ თუ იგივე request უკვე მიმდინარეობს
    if (pendingRequests.has(cacheKey)) {
      console.log('✅ Sharing pending request:', cacheKey);
      return pendingRequests.get(cacheKey);
    }

    // 3️⃣ ახალი request
    const request$ = next(req).pipe(
      tap(event => {
        // ✅ შევინახოთ მხოლოდ HttpResponse body
        if (event instanceof HttpResponse) {
          console.log('💾 Saving to cache:', cacheKey, event.body);
          saveToCache(cacheKey, event.body);
        }
      }),
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, index) => {
            if ((error instanceof HttpErrorResponse && 
                 (error.status === 429 || error.status === 0)) && 
                index < MAX_RETRIES) {
              const delay = RETRY_DELAYS[index] || 4000;
              console.log(`⏳ Retry ${index + 1}/${MAX_RETRIES} after ${delay}ms`, req.url);
              return timer(delay);
            }
            return throwError(() => error);
          })
        )
      ),
      catchError(error => handleError(error, req.url)),
      finalize(() => {
        console.log('🧹 Cleaning up pending request:', cacheKey);
        pendingRequests.delete(cacheKey);
      }),
      share() // ✅ დავამატოთ share() multicast-ისთვის
    );

    pendingRequests.set(cacheKey, request$);
    return request$;
  }

  // POST, PUT, DELETE - მხოლოდ retry logic
  return next(req).pipe(
    retryWhen(errors =>
      errors.pipe(
        mergeMap((error, index) => {
          if (error instanceof HttpErrorResponse && 
              error.status === 429 && 
              index < MAX_RETRIES) {
            const delay = RETRY_DELAYS[index] || 4000;
            console.log(`⏳ Retry ${index + 1}/${MAX_RETRIES} after ${delay}ms`);
            return timer(delay);
          }
          return throwError(() => error);
        })
      )
    ),
    catchError(error => handleError(error, req.url))
  );
};

// Helper functions
function getFromCache(key: string): any {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('📦 Cache valid, age:', (Date.now() - cached.timestamp) / 1000, 'seconds');
    return cached.response;
  }
  
  if (cached) {
    console.log('⏰ Cache expired, age:', (Date.now() - cached.timestamp) / 1000, 'seconds');
  }
  
  requestCache.delete(key);
  return null;
}

function saveToCache(key: string, response: any): void {
  console.log('💾 Caching response for:', key);
  requestCache.set(key, { response, timestamp: Date.now() });
  
  // გავასუფთავოთ ძველი cache (მაქს 50 ჩანაწერი)
  if (requestCache.size > 50) {
    const oldestKey = requestCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      console.log('🗑️ Removing oldest cache entry:', oldestKey);
      requestCache.delete(oldestKey);
    }
  }
}

function handleError(error: HttpErrorResponse, url: string) {
  let errorMessage = 'უცნობი შეცდომა';

  if (error.status === 429) {
    errorMessage = 'ძალიან ბევრი მოთხოვნა. გთხოვთ, დაელოდოთ.';
    console.error('❌ 429 Too Many Requests:', url);
  } else if (error.status === 0) {
    errorMessage = 'სერვერთან კავშირის პრობლემა';
    console.error('❌ Network Error:', url);
  } else if (error.error?.message) {
    errorMessage = error.error.message;
  }

  return throwError(() => new Error(errorMessage));
}
import { Injectable } from '@angular/core';
import { requestCache, pendingRequests } from '../interceptors/http-error.interceptor';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  
  clearAll(): void {
    requestCache.clear();
    pendingRequests.clear();
    console.log('🗑️ Cache cleared');
  }

  clearUrl(url: string): void {
    for (const key of requestCache.keys()) {
      if (key.includes(url)) {
        requestCache.delete(key);
      }
    }
    console.log('🗑️ Cache cleared for:', url);
  }

  getCacheSize(): number {
    return requestCache.size;
  }
}
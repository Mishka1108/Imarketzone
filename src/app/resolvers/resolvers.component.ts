// src/app/resolvers/product.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { ProductService } from '../services/product.service';
import { catchError, of } from 'rxjs';

// ✅ SSR-ისთვის კრიტიკული:
// პროდუქტი სერვერზე იტვირთება, HTML-ში ჩაიშენება,
// Google-ი სრულ კონტენტს კითხულობს
export const productResolver: ResolveFn<any> = (
  route: ActivatedRouteSnapshot
) => {
  const productService = inject(ProductService);
  const slug = decodeURIComponent(route.paramMap.get('slug') || '');

  if (!slug) return of(null);

  return productService.getProductBySlug(slug).pipe(
    catchError(() => of(null))
  );
};
/// <reference types="node" />

import { CommonEngine } from '@angular/ssr/node';
import { render } from '@netlify/angular-runtime/common-engine.mjs';

const commonEngine = new CommonEngine();

const SITE_URL = 'https://www.imarketzone.ge';

function generateSlug(title: string) {
  if (!title) return '';
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s\-ა-ჰ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function netlifyCommonEngineHandler(
  request: Request,
  _context: any
): Promise<Response> {

  const pathname = new URL(request.url).pathname;

  // ✅ robots.txt
  if (pathname === '/robots.txt') {
    return new Response(
      `User-agent: *
Allow: /
Allow: /product-details/
Allow: /public-products
Allow: /home

Disallow: /admin/
Disallow: /dashboard
Disallow: /login
Disallow: /register
Disallow: /auth/
Disallow: /complete-profile
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${SITE_URL}/sitemap.xml`,
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // ✅ sitemap.xml
  if (pathname === '/sitemap.xml') {
    try {
      const apiUrl = process.env['API_URL'] || 'http://localhost:5000/api';

      const response = await fetch(`${apiUrl}/products?page=0&limit=10000`);
      const data = await response.json();

      const products = data.products || data.data || data || [];
      const today = new Date().toISOString().split('T')[0];

      const staticUrls = `
  <url><loc>${SITE_URL}/</loc><priority>1.0</priority><changefreq>daily</changefreq><lastmod>${today}</lastmod></url>
  <url><loc>${SITE_URL}/public-products</loc><priority>0.9</priority><changefreq>hourly</changefreq><lastmod>${today}</lastmod></url>
  <url><loc>${SITE_URL}/contact</loc><priority>0.5</priority><changefreq>monthly</changefreq></url>`;

      const productUrls = Array.isArray(products)
        ? products.map((product: any) => {
            const slug = generateSlug(product.title || '');
            if (!slug) return '';

            const lastmod = product.updatedAt || product.createdAt
              ? new Date(product.updatedAt || product.createdAt)
                  .toISOString()
                  .split('T')[0]
              : today;

            return `
  <url>
    <loc>${SITE_URL}/product-details/${encodeURIComponent(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          }).filter(Boolean).join('')
        : '';

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${productUrls}
</urlset>`;

      return new Response(sitemap, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600'
        }
      });

    } catch (err) {
      console.error('Sitemap error:', err);

      const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
</urlset>`;

      return new Response(fallback, {
        headers: { 'Content-Type': 'application/xml' }
      });
    }
  }

  // ✅ SSR render
  return await render(commonEngine);
}
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

const SITE_URL = 'https://www.imarketzone.ge';

// ══════════════════════════════════════════════════════
// Slug გენერატორი (იგივე ლოგიკა Angular-ში)
// ══════════════════════════════════════════════════════
function generateSlug(title: string) {
  if (!title) return '';
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s\-ა-ჰ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ══════════════════════════════════════════════════════
// ROBOTS.TXT
// ══════════════════════════════════════════════════════
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
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

Sitemap: ${SITE_URL}/sitemap.xml`);
});

// ══════════════════════════════════════════════════════
// SITEMAP.XML
// ══════════════════════════════════════════════════════
app.get('/sitemap.xml', async (req, res) => {
  try {
    // ✅ შენი API-დან ყველა პროდუქტის მოძიება
    const apiUrl = process.env['API_URL'] || 'http://localhost:5000/api';

    const response = await fetch(`${apiUrl}/products?page=0&limit=10000`);
    const data = await response.json();

    const products = data.products || data.data || data || [];

    // ── სტატიკური გვერდები ──────────────────────────
    const staticUrls = `
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/public-products</loc>
    <priority>0.9</priority>
    <changefreq>hourly</changefreq>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/contact</loc>
    <priority>0.5</priority>
    <changefreq>monthly</changefreq>
  </url>`;

    // ── პროდუქტების URL-ები ──────────────────────────
    const productUrls = Array.isArray(products)
      ? products.map(product => {
          const slug = generateSlug(product.title || '');
          if (!slug) return '';

          const lastmod = product.updatedAt || product.createdAt
            ? new Date(product.updatedAt || product.createdAt)
                .toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${staticUrls}
  ${productUrls}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // 1 საათი cache
    res.send(sitemap);

  } catch (err) {
    console.error('❌ Sitemap error:', err);

    // Fallback - მინიმალური sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/public-products</loc>
    <priority>0.9</priority>
  </url>
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(fallbackSitemap);
  }
});

// ══════════════════════════════════════════════════════
// სტატიკური ფაილები /browser-დან
// ══════════════════════════════════════════════════════
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

// ══════════════════════════════════════════════════════
// Angular SSR - ყველა დანარჩენი request
// ══════════════════════════════════════════════════════
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

// ══════════════════════════════════════════════════════
// სერვერის გაშვება
// ══════════════════════════════════════════════════════
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
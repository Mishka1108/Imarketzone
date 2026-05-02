/// <reference types="node" />

import { CommonEngine } from '@angular/ssr/node';
import { join } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
// @ts-ignore
import bootstrap from './src/main.server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const SITE_URL = 'https://www.imarketzone.ge';
const DIST_FOLDER = join(__dirname, '../browser');

function generateSlug(title: string) {
  if (!title) return '';
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s\-ა-ჰ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function app(): express.Express {
  const server = express();
  const commonEngine = new CommonEngine();

  // robots.txt
  server.get('/robots.txt', (req, res) => {
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

  // sitemap.xml
  server.get('/sitemap.xml', async (req, res) => {
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
              ? new Date(product.updatedAt || product.createdAt).toISOString().split('T')[0]
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

      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(sitemap);
    } catch (err) {
      console.error('Sitemap error:', err);
      res.set('Content-Type', 'application/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
</urlset>`);
    }
  });

  // Static files
  server.get('*.*', express.static(DIST_FOLDER, { maxAge: '1y' }));

  // SSR
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, headers } = req;
    commonEngine
      .render({
        bootstrap,
        documentFilePath: join(DIST_FOLDER, 'index.html'),
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: DIST_FOLDER,
        providers: [
          { provide: 'REQUEST', useValue: req },
          { provide: 'RESPONSE', useValue: res }
        ],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

run();
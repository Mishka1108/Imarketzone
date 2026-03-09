import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig, RenderMode, ServerRoute } from '@angular/ssr';
import { appConfig } from './app.config';

const serverRoutes: ServerRoute[] = [
  // ✅ პროდუქტის გვერდი - Server render (დინამიური კონტენტი SEO-სთვის)
  {
    path: 'product-details/:slug',
    renderMode: RenderMode.Server
  },

  // ✅ პროდუქტების სია - Server render (ფილტრები, პაგინაცია)
  {
    path: 'public-products',
    renderMode: RenderMode.Server
  },

  // ✅ მთავარი გვერდი - Server render
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'home',
    renderMode: RenderMode.Server
  },

  // ✅ სტატიკური გვერდები - Client render (SEO არ სჭირდება)
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'auth/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'complete-profile',
    renderMode: RenderMode.Client
  },

  // ✅ დანარჩენი ყველაფერი
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes)
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
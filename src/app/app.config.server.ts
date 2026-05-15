import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig, RenderMode, ServerRoute } from '@angular/ssr';
import { appConfig } from './app.config';

const serverRoutes: ServerRoute[] = [
  // ✅ მთავარი გვერდი მხოლოდ
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'home',
    renderMode: RenderMode.Server
  },

  // ✅ ყველა დანარჩენი - Client render
  {
    path: 'product-details/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'public-products',
    renderMode: RenderMode.Client
  },
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
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
// დაამატე withHashLocation აქ:
import { provideRouter, withHashLocation } from '@angular/router'; 
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
  HttpClient
} from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { httpErrorInterceptor } from './interceptors/http-error.interceptor';
import { routes } from './app.routes';
import { Observable } from 'rxjs';

export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`./assets/i18n/${lang}.json`);
  }
}

export function createTranslateLoader(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

export const appConfig: ApplicationConfig = {
  providers: [
    // აქ დავამატეთ withHashLocation():
    provideRouter(routes, withHashLocation()),

    // ✅ SSR Hydration
    provideClientHydration(withEventReplay()),

    // ✅ withFetch()
    provideHttpClient(
      withFetch(),
      withInterceptors([httpErrorInterceptor])
    ),

    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'ka',
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient]
        }
      })
    )
  ]
};
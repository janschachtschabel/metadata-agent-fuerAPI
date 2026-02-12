import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of, ReplaySubject } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';

/**
 * Custom TranslateLoader that loads i18n files from the API.
 *
 * In web-component mode the api-url attribute arrives AFTER ngx-translate
 * requests its first translation.  Instead of failing with a 404 and caching
 * empty translations forever, the loader now *defers* the HTTP call until
 * apiUrl becomes available (via the ReplaySubject).
 *
 * In local-dev mode (ng serve) the local ./assets/i18n/ files are tried first;
 * if they exist, they resolve immediately and the ReplaySubject path is never
 * reached.
 *
 * Usage (called from CanvasComponent.apiUrl setter):
 *   DynamicTranslateLoader.setApiUrl('https://my-api.example.com');
 */
export class DynamicTranslateLoader implements TranslateLoader {
  static apiUrl: string = '';

  /** Emits once when apiUrl is first set. */
  private static apiUrl$ = new ReplaySubject<string>(1);

  /** Call this instead of setting apiUrl directly. */
  static setApiUrl(url: string): void {
    const clean = url.replace(/\/$/, '');
    DynamicTranslateLoader.apiUrl = clean;
    DynamicTranslateLoader.apiUrl$.next(clean);
  }

  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    const apiUrl = DynamicTranslateLoader.apiUrl;

    // apiUrl already known → fetch immediately
    if (apiUrl) {
      return this.http.get(`${apiUrl}/widget/i18n/${lang}.json`).pipe(
        catchError(() => of({}))
      );
    }

    // Local dev (ng serve on localhost): try local assets immediately.
    // Web-component mode (any other host): skip local request to avoid
    // a 404 console error; wait for apiUrl instead.
    const isLocalDev = typeof window !== 'undefined'
      && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalDev) {
      return this.http.get(`./assets/i18n/${lang}.json`).pipe(
        catchError(() => of({}))
      );
    }

    // Web-component mode: wait for apiUrl, then fetch from API
    return DynamicTranslateLoader.apiUrl$.pipe(
      take(1),
      switchMap(url => this.http.get(`${url}/widget/i18n/${lang}.json`)),
      catchError(() => of({}))
    );
  }
}

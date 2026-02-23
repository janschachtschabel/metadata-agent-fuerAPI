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

    // Local fallback: try ./assets/i18n/ (works on localhost and in
    // Chrome extension sidebar where build-extension.ps1 copies i18n files)
    const localFallback = () =>
      this.http.get(`./assets/i18n/${lang}.json`).pipe(catchError(() => of({})));

    // apiUrl already known → fetch from API, fallback to local assets
    if (apiUrl) {
      return this.http.get(`${apiUrl}/widget/i18n/${lang}.json`).pipe(
        catchError(() => localFallback())
      );
    }

    // Local dev (ng serve) or extension page: try local assets immediately
    const isLocalOrExtension = typeof window !== 'undefined'
      && (window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.protocol === 'chrome-extension:'
        || window.location.protocol === 'moz-extension:');

    if (isLocalOrExtension) {
      return this.http.get(`./assets/i18n/${lang}.json`).pipe(
        catchError(() => of({}))
      );
    }

    // Web-component mode: wait for apiUrl, then fetch from API (fallback to local)
    return DynamicTranslateLoader.apiUrl$.pipe(
      take(1),
      switchMap(url =>
        this.http.get(`${url}/widget/i18n/${lang}.json`).pipe(
          catchError(() => localFallback())
        )
      )
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of, ReplaySubject } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { WidgetDebug } from './debug';

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
    const localFallback = () => {
      const localUrl = `./assets/i18n/${lang}.json`;
      if (WidgetDebug.enabled) console.debug(`[i18n] Fallback → ${localUrl}`);
      return this.http.get(localUrl).pipe(catchError((err) => {
        if (WidgetDebug.enabled) console.warn(`[i18n] ✗ Fallback failed: ${localUrl}`, err.status);
        return of({});
      }));
    };

    const logSuccess = (url: string) => (data: any) => {
      if (WidgetDebug.enabled) console.debug(`[i18n] ✓ Loaded ${lang} from ${url} (${Object.keys(data || {}).length} keys)`);
      return data;
    };

    // apiUrl already known → fetch from API, fallback to local assets
    if (apiUrl) {
      const url = `${apiUrl}/widget/assets/i18n/${lang}.json`;
      if (WidgetDebug.enabled) console.debug(`[i18n] Loading ${lang} from apiUrl: ${url}`);
      return this.http.get(url).pipe(
        switchMap(data => of(logSuccess(url)(data))),
        catchError((err) => {
          if (WidgetDebug.enabled) console.warn(`[i18n] ✗ Failed: ${url} (${err.status})`, err.message);
          return localFallback();
        })
      );
    }

    // Local dev (ng serve) or extension page: try local assets immediately
    const isLocal = typeof window !== 'undefined'
      && (window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1');
    const isExtension = typeof window !== 'undefined'
      && (window.location.protocol === 'chrome-extension:'
        || window.location.protocol === 'moz-extension:');

    if (isExtension) {
      const url = `./assets/i18n/${lang}.json`;
      if (WidgetDebug.enabled) console.debug(`[i18n] Extension mode → ${url}`);
      return this.http.get(url).pipe(
        switchMap(data => of(logSuccess(url)(data))),
        catchError(() => of({}))
      );
    }

    if (isLocal) {
      // Try origin-based API path first (works when widget is served from subdirectory),
      // then fall back to local ./assets/i18n/ (works with ng serve)
      const origin = window.location.origin;
      const url = `${origin}/widget/assets/i18n/${lang}.json`;
      if (WidgetDebug.enabled) console.debug(`[i18n] Local mode → ${url}`);
      return this.http.get(url).pipe(
        switchMap(data => of(logSuccess(url)(data))),
        catchError((err) => {
          if (WidgetDebug.enabled) console.warn(`[i18n] ✗ Failed: ${url} (${err.status})`);
          return localFallback();
        })
      );
    }

    // Web-component mode: wait for apiUrl, then fetch from API (fallback to local)
    if (WidgetDebug.enabled) console.debug(`[i18n] Deferred mode — waiting for apiUrl...`);
    return DynamicTranslateLoader.apiUrl$.pipe(
      take(1),
      switchMap(url => {
        const fullUrl = `${url}/widget/assets/i18n/${lang}.json`;
        if (WidgetDebug.enabled) console.debug(`[i18n] apiUrl received → ${fullUrl}`);
        return this.http.get(fullUrl).pipe(
          switchMap(data => of(logSuccess(fullUrl)(data))),
          catchError((err) => {
            if (WidgetDebug.enabled) console.warn(`[i18n] ✗ Failed: ${fullUrl} (${err.status})`, err.message);
            return localFallback();
          })
        );
      })
    );
  }
}

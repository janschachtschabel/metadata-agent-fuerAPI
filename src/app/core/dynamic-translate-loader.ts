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
    // Early resolution: check window.__ENV.agentUrl (set before Angular boots)
    // This allows external embedders on localhost to provide the API URL upfront:
    //   <script>window.__ENV = { agentUrl: 'https://metadata-agent-api.vercel.app' };</script>
    const envUrl = (typeof window !== 'undefined' && (window as any).__ENV?.agentUrl) as string | undefined;
    if (envUrl && !DynamicTranslateLoader.apiUrl) {
      if (WidgetDebug.enabled) console.debug(`[i18n] Using window.__ENV.agentUrl: ${envUrl}`);
      DynamicTranslateLoader.setApiUrl(envUrl);
    }

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

    // Extension page: try local assets immediately
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

    // Local dev (ng serve) without __ENV: try origin-based path, then local fallback.
    // If __ENV.agentUrl was set, we already resolved above via apiUrl — never reach here.
    const isLocal = typeof window !== 'undefined'
      && (window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1');

    if (isLocal) {
      // Try local ./assets/i18n/ first (works with ng serve),
      // then fall back to origin-based /widget/assets/i18n/ (works when API serves widget)
      const localUrl = `./assets/i18n/${lang}.json`;
      if (WidgetDebug.enabled) console.debug(`[i18n] Local mode → ${localUrl}`);
      return this.http.get(localUrl).pipe(
        switchMap(data => of(logSuccess(localUrl)(data))),
        catchError(() => {
          const origin = window.location.origin;
          const widgetUrl = `${origin}/widget/assets/i18n/${lang}.json`;
          if (WidgetDebug.enabled) console.debug(`[i18n] Local fallback → ${widgetUrl}`);
          return this.http.get(widgetUrl).pipe(
            switchMap(data => of(logSuccess(widgetUrl)(data))),
            catchError((err) => {
              if (WidgetDebug.enabled) console.warn(`[i18n] ✗ Failed: ${widgetUrl} (${err.status})`);
              return of({});
            })
          );
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

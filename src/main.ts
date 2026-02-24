import { bootstrapApplication, createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { appConfig } from './app/app.config';
import { CanvasComponent } from './app/components/canvas/canvas.component';
import { AppComponent } from './app/app.component';

import { WIDGET_VERSION } from './app/version';

/**
 * Ensure Google Material Icons fonts are loaded.
 * Injects the stylesheet if not already present in the document.
 */
function ensureMaterialIconsFont(): void {
  const fontHref = 'https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined';
  const existing = document.querySelector(`link[href*="Material+Icons"]`) ||
                   document.querySelector(`link[href*="material-icons"]`);
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontHref;
    document.head.appendChild(link);
  }
}

ensureMaterialIconsFont();

/**
 * Bootstrap mode detection:
 * - Web Component mode: When embedded via <metadata-agent-canvas>
 * - Standalone mode: When running as Angular app directly
 */
const isWebComponentMode = !document.querySelector('app-root');

if (isWebComponentMode) {
  // Web Component Mode: Register as Custom Element
  (async () => {
    const app = await createApplication(appConfig);
    
    const canvasElement = createCustomElement(CanvasComponent, {
      injector: app.injector
    });
    
    customElements.define('metadata-agent-canvas', canvasElement);
    
    console.log(`✅ Web Component <metadata-agent-canvas> v${WIDGET_VERSION} registered`);
  })();
} else {
  // Standalone Mode: Bootstrap Angular App
  bootstrapApplication(AppComponent, appConfig)
    .catch(err => console.error('Bootstrap error:', err));
}

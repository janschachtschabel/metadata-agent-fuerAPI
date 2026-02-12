import { NgModule, Injector } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { DynamicTranslateLoader } from './core/dynamic-translate-loader';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new DynamicTranslateLoader(http),
        deps: [HttpClient]
      }
    }),
    AppComponent, // Standalone Component
    CanvasComponent // Standalone Component
  ]
})
export class AppModule {
  constructor(private injector: Injector) {}

  ngDoBootstrap() {
    // Register Web Component
    if (!customElements.get('metadata-agent-canvas')) {
      const canvasElement = createCustomElement(CanvasComponent, {
        injector: this.injector
      });
      customElements.define('metadata-agent-canvas', canvasElement);
    }
  }
}

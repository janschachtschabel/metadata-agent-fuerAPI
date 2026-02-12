import { Injectable } from '@angular/core';

/**
 * Integration Mode Types
 * 
 * - standalone: Direct access (local dev, Vercel, Docker)
 * - browser-extension: Running inside browser extension panel
 * - bookmarklet: Running in iframe from bookmarklet
 * - webcomponent: Embedded as Angular Element (<app-canvas>)
 */
export type IntegrationMode = 
  | 'standalone' 
  | 'browser-extension' 
  | 'bookmarklet' 
  | 'webcomponent';

/**
 * Page data passed from parent context
 */
export interface PageData {
  url: string;
  title?: string;
  content?: string;
  metaTags?: Record<string, string>;
  structuredData?: unknown[];
}

/**
 * User info from parent context
 */
export interface UserInfo {
  isLoggedIn: boolean;
  username: string;
  systemName?: string;
}

/**
 * Integration Mode Service
 * 
 * Detects how the canvas is being used and provides context:
 * - Standalone: Direct access via URL
 * - Browser Extension: Running in extension panel
 * - Bookmarklet: Running in iframe from bookmarklet
 * - Web Component: Embedded as Angular Element
 * 
 * Each mode can have different default layouts and behaviors.
 */
@Injectable({
  providedIn: 'root'
})
export class IntegrationModeService {
  
  private mode: IntegrationMode = 'standalone';
  private pageData: PageData | null = null;
  private userInfo: UserInfo = {
    isLoggedIn: false,
    username: 'Gast'
  };
  
  constructor() {
    this.detectMode();
  }
  
  /**
   * Detect integration mode from multiple signals
   */
  private detectMode(): void {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    
    // Priority 1: Explicit URL parameter
    if (modeParam) {
      if (modeParam === 'browser-extension' || modeParam === 'extension') {
        this.mode = 'browser-extension';
        this.loadExtensionData(params);
        return;
      } else if (modeParam === 'bookmarklet') {
        this.mode = 'bookmarklet';
        this.loadBookmarkletData(params);
        return;
      } else if (modeParam === 'webcomponent' || modeParam === 'embed') {
        this.mode = 'webcomponent';
        return;
      }
    }
    
    // Priority 2: Check if used as custom element
    const isCustomElement = document.querySelector('app-canvas')?.tagName === 'APP-CANVAS';
    if (isCustomElement && window.customElements?.get('app-canvas')) {
      this.mode = 'webcomponent';
      return;
    }
    
    // Priority 3: Check if running in iframe
    const isInIframe = window !== window.parent;
    if (isInIframe) {
      // Listen for mode identification from parent
      window.addEventListener('message', (event) => {
        if (event.data?.mode === 'browser-extension') {
          this.mode = 'browser-extension';
        } else if (event.data?.mode === 'bookmarklet') {
          this.mode = 'bookmarklet';
        }
      }, { once: true });
      
      // Default: Deployed in iframe = bookmarklet, local = extension testing
      const isDeployed = !this.isLocalhost();
      this.mode = isDeployed ? 'bookmarklet' : 'browser-extension';
      return;
    }
    
    // Default: Standalone
    this.mode = 'standalone';
  }
  
  private isLocalhost(): boolean {
    return window.location.hostname.includes('localhost') || 
           window.location.hostname.includes('127.0.0.1');
  }
  
  private loadExtensionData(params: URLSearchParams): void {
    const encodedData = params.get('data');
    if (!encodedData) return;
    
    try {
      const jsonString = decodeURIComponent(atob(encodedData));
      const data = JSON.parse(jsonString);
      
      this.pageData = {
        url: data.url,
        title: data.title,
        content: data.content?.main || data.content?.cleaned || data.content?.full || '',
        metaTags: data.meta || data.metaTags,
        structuredData: data.structuredData
      };
      
      this.userInfo = data.userInfo || { isLoggedIn: false, username: 'Gast' };
    } catch (error) {
      console.error('❌ Failed to parse Extension data:', error);
    }
  }
  
  private loadBookmarkletData(params: URLSearchParams): void {
    const encodedData = params.get('data');
    if (!encodedData) return;
    
    try {
      const jsonString = decodeURIComponent(atob(encodedData));
      const data = JSON.parse(jsonString);
      
      this.pageData = {
        url: data.url,
        title: data.title,
        content: data.content,
        metaTags: data.metaTags
      };
    } catch (error) {
      console.error('❌ Failed to parse Bookmarklet data:', error);
    }
    
    // Always guest mode in bookmarklet
    this.userInfo = { isLoggedIn: false, username: 'Gast' };
  }
  
  // ===== PUBLIC API =====
  
  getMode(): IntegrationMode {
    return this.mode;
  }
  
  setMode(mode: IntegrationMode): void {
    this.mode = mode;
    console.log(`🎯 Integration mode set: ${mode}`);
  }
  
  isStandalone(): boolean {
    return this.mode === 'standalone';
  }
  
  isBrowserExtension(): boolean {
    return this.mode === 'browser-extension';
  }
  
  isBookmarklet(): boolean {
    return this.mode === 'bookmarklet';
  }
  
  isWebComponent(): boolean {
    return this.mode === 'webcomponent';
  }
  
  /**
   * Returns true if running in a parent context (extension, bookmarklet)
   */
  hasParentContext(): boolean {
    return this.isBrowserExtension() || this.isBookmarklet();
  }
  
  getPageData(): PageData | null {
    return this.pageData;
  }
  
  setPageData(data: PageData): void {
    this.pageData = data;
  }
  
  getUserInfo(): UserInfo {
    return this.userInfo;
  }
  
  isLoggedIn(): boolean {
    return this.userInfo.isLoggedIn;
  }
  
  /**
   * Get recommended layout for current mode
   */
  getRecommendedLayout(): 'default' {
    // All modes use default layout. Use readonly attribute for read-only mode.
    return 'default';
  }
  
  /**
   * Send metadata back to parent context
   */
  sendMetadataToParent(metadata: unknown): void {
    if (this.hasParentContext()) {
      window.parent.postMessage({
        type: 'CANVAS_METADATA_READY',
        metadata,
        mode: this.mode
      }, '*');
    }
  }
  
  /**
   * Request close from parent
   */
  requestClose(): void {
    if (this.hasParentContext()) {
      window.parent.postMessage({ type: 'CANVAS_CLOSE' }, '*');
    }
  }
}

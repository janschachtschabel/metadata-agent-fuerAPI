import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  LayoutConfig, 
  LayoutPreset, 
  MODE_LAYOUT_MAP,
  LAYOUT_PRESETS,
  DEFAULT_LAYOUT,
  CanvasElements
} from '../shared/layouts';
import { I18nService } from './i18n.service';
import { IntegrationModeService, IntegrationMode } from './integration-mode.service';

/**
 * Layout Service
 * 
 * Manages canvas layouts with i18n support.
 * 
 * LAYOUT SYSTEM:
 * - Multiple layouts: default, metadatenpruefdialog, prueftisch, prueftisch-gross
 * - Each element can be individually toggled via component inputs
 * - IntegrationMode automatically selects appropriate layout
 * 
 * INTEGRATION MODE → LAYOUT MAPPING:
 * - standalone → default
 * - browser-extension → default
 * - bookmarklet → default
 * - readonly mode can be combined with any layout
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private layouts = new Map<string, LayoutConfig>();
  private activeLayout$ = new BehaviorSubject<LayoutConfig>(DEFAULT_LAYOUT);
  
  constructor(
    private i18n: I18nService,
    private integrationMode: IntegrationModeService
  ) {
    this.registerDefaultLayouts();
  }
  
  private registerDefaultLayouts(): void {
    Object.entries(LAYOUT_PRESETS).forEach(([name, layout]) => {
      this.layouts.set(name, layout);
    });
  }
  
  /**
   * Get layout by name (supports mode aliases like 'bookmarklet', 'webcomponent', etc.)
   */
  getLayout(name: string): LayoutConfig {
    const mappedName = MODE_LAYOUT_MAP[name.toLowerCase()];
    if (mappedName) {
      return this.layouts.get(mappedName) || DEFAULT_LAYOUT;
    }
    return this.layouts.get(name) || DEFAULT_LAYOUT;
  }
  
  /**
   * Get layout for viewer mode (backward compat - returns default, use readonly attribute instead)
   */
  getLayoutForMode(viewerMode: boolean): LayoutConfig {
    return this.getLayout('default');
  }
  
  /**
   * Register a custom layout
   */
  registerLayout(name: string, layout: LayoutConfig): void {
    this.layouts.set(name, layout);
  }
  
  /**
   * Get all available layout names
   */
  getAvailableLayouts(): string[] {
    return Array.from(this.layouts.keys());
  }
  
  /**
   * Get layout with localized name and description
   */
  getLayoutWithI18n(name: string): LayoutConfig & { displayName: string; displayDescription: string } {
    const layout = this.getLayout(name);
    return {
      ...layout,
      displayName: this.i18n.instant(layout.i18nKey) || layout.name,
      displayDescription: layout.i18nDescription 
        ? this.i18n.instant(layout.i18nDescription) 
        : ''
    };
  }
  
  /**
   * Apply a layout (makes it active)
   */
  applyLayout(name: string): LayoutConfig {
    const layout = this.getLayout(name);
    this.activeLayout$.next(layout);
    return layout;
  }
  
  /**
   * Get currently active layout as observable
   */
  getActiveLayout$(): Observable<LayoutConfig> {
    return this.activeLayout$.asObservable();
  }
  
  /**
   * Get currently active layout
   */
  getActiveLayout(): LayoutConfig {
    return this.activeLayout$.value;
  }
  
  /**
   * Create a merged layout (base layout with element overrides)
   */
  createMergedLayout(baseName: string, overrides: Partial<LayoutConfig>): LayoutConfig {
    const base = this.getLayout(baseName);
    return {
      ...base,
      ...overrides,
      elements: { ...base.elements, ...overrides.elements },
      style: { ...base.style, ...overrides.style },
      behavior: { ...base.behavior, ...overrides.behavior }
    };
  }
  
  /**
   * Get CSS classes for a layout
   */
  getLayoutClasses(layout: LayoutConfig): string[] {
    const classes: string[] = [];
    
    // Base layout class
    if (layout.style.cssClass) {
      classes.push(layout.style.cssClass);
    }
    
    // Modifier classes
    if (layout.style.borderless) {
      classes.push('layout-borderless');
    }
    if (layout.behavior.readonly) {
      classes.push('layout-readonly');
    }
    if (layout.style.compact) {
      classes.push('layout-compact');
    }
    
    return classes;
  }
  
  /**
   * Get layout based on current integration mode
   */
  getLayoutForIntegrationMode(): LayoutConfig {
    const mode = this.integrationMode.getMode();
    return this.getLayout(mode);
  }
  
  /**
   * Get recommended layout preset for integration mode
   */
  getRecommendedLayoutName(): LayoutPreset {
    return this.integrationMode.getRecommendedLayout();
  }
  
  /**
   * Check if current mode uses viewer layout (deprecated - use readonly attribute instead)
   */
  isViewerMode(): boolean {
    return false;
  }
  
  /**
   * Create layout with specific element overrides
   */
  createLayoutWithOverrides(
    baseName: string,
    elementOverrides: Partial<CanvasElements>
  ): LayoutConfig {
    const base = this.getLayout(baseName);
    return {
      ...base,
      elements: { ...base.elements, ...elementOverrides }
    };
  }
}

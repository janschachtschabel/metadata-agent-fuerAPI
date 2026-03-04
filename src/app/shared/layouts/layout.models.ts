/**
 * Layout Models
 * Defines the structure for canvas layouts
 * 
 * ============================================================
 * KEY PRINCIPLE: All elements are independently toggleable!
 * ============================================================
 * 
 * The layout presets provide sensible defaults,
 * but EVERY element can be overridden via component inputs.
 * 
 * USAGE EXAMPLES:
 * 
 *   <!-- Default layout with custom overrides -->
 *   <app-canvas 
 *     layout="default"
 *     show-footer="false"
 *     show-header="false">
 *   </app-canvas>
 * 
 *   <!-- Read-only mode -->
 *   <app-canvas 
 *     layout="default"
 *     readonly="true">
 *   </app-canvas>
 * 
 *   <!-- Minimal embed: only fields, no controls -->
 *   <app-canvas 
 *     layout="default"
 *     readonly="true"
 *     show-status-bar="false"
 *     show-floating-controls="false"
 *     borderless="true">
 *   </app-canvas>
 */

/**
 * All controllable canvas elements
 * Each element can be shown/hidden via component input
 */
export interface CanvasElements {
  // ===== HEADER AREA =====
  /** Header bar with logo, mode indicator, close button */
  header: boolean;
  /** Close button (in header or floating) */
  closeButton: boolean;
  
  // ===== INPUT AREA =====
  /** Text input area for AI extraction */
  inputArea: boolean;
  /** Extract button in input area */
  extractButton: boolean;
  /** Reset button in input area */
  resetButton: boolean;
  
  // ===== STATUS AREA =====
  /** Status bar with content type selector and progress */
  statusBar: boolean;
  /** Content type selector (in status bar or floating) */
  contentTypeSelector: boolean;
  /** Progress bar/indicator */
  progressBar: boolean;
  
  // ===== FIELDS AREA =====
  /** Core fields section (title, description, keywords, etc.) */
  coreFields: boolean;
  /** Special fields section (content-type specific) */
  specialFields: boolean;
  /** Field action icons (status, info, geo, copy) */
  fieldActions: boolean;
  /** Group collapse/expand controls */
  groupCollapse: boolean;
  
  // ===== FOOTER AREA =====
  /** Footer with submit/save buttons */
  footer: boolean;
  
  // ===== FLOATING CONTROLS =====
  /** Floating controls container */
  floatingControls: boolean;
  /** JSON loader button (in floating controls) */
  jsonLoader: boolean;
  /** Save/Download JSON button */
  saveButton: boolean;
  /** Upload/Submit button */
  uploadButton: boolean;
  /** Reset button (in floating controls) */
  floatingResetButton: boolean;
  /** Language switcher */
  languageSwitcher: boolean;
}

/**
 * Style configuration
 */
export interface LayoutStyle {
  /** Remove borders/padding for seamless embedding */
  borderless: boolean;
  /** Compact spacing for smaller viewports */
  compact: boolean;
  /** Number of columns for field display (1-4) */
  columns: 1 | 2 | 3 | 4;
  /** Custom CSS class for theming */
  cssClass?: string;
}

/**
 * Behavior configuration
 */
export interface LayoutBehavior {
  /** Disable all editing (read-only mode) */
  readonly: boolean;
  /** Emit metadataChange events on field changes */
  emitChanges: boolean;
  /** Auto-start extraction when text is pasted */
  autoExtract: boolean;
  /** Show only content type in floating controls (hide other buttons) */
  contentTypeOnly: boolean;
}

/**
 * Complete layout configuration
 */
export interface LayoutConfig {
  /** Unique layout name */
  name: string;
  /** i18n key for display name */
  i18nKey: string;
  /** i18n key for description */
  i18nDescription?: string;
  /** Element visibility defaults */
  elements: CanvasElements;
  /** Style options */
  style: LayoutStyle;
  /** Behavior options */
  behavior: LayoutBehavior;
}

/**
 * Available layout presets
 */
export type LayoutPreset = 'default' | 'plugin' | 'dialog' | 'detail' | 'clean' | 'prueftisch' | 'prueftisch-org';

/**
 * Maps integration modes to layout presets
 * 
 * DEFAULT LAYOUT: Full editing capabilities
 * - standalone: Direct access (local, Vercel, Docker)
 * - browser-extension: Running in extension panel
 * - bookmarklet: Running in iframe from bookmarklet
 * 
 * ALIASES (backward compat, map to default):
 * - viewer/view/embed/readonly: Default layout (use readonly attribute for read-only)
 */
export const MODE_LAYOUT_MAP: Record<string, LayoutPreset> = {
  // === DEFAULT LAYOUT ===
  'standalone': 'default',
  'local': 'default',
  'normal': 'default',
  'edit': 'default',
  'bookmarklet': 'default',
  
  // === PLUGIN LAYOUT ===
  'browser-extension': 'plugin',
  'extension': 'plugin',
  'plugin': 'plugin',
  'sidebar': 'plugin',
  
  // === DIALOG LAYOUT ===
  'dialog': 'dialog',
  'modal': 'dialog',
  'review': 'dialog',
  'redaktion': 'dialog',
  
  // === DETAIL LAYOUT ===
  'detail': 'detail',
  'preview': 'detail',
  'print': 'detail',
  
  // === ALIASES (backward compat → default) ===
  'webcomponent': 'default',
  'embed': 'default',
  'embedded': 'default',
  'viewer': 'default',
  'view': 'default',
  'readonly': 'default',
  
  // === CLEAN LAYOUT ===
  'clean': 'clean',
  'metadatenpruefdialog': 'clean',
  'pruefung': 'clean',
  'validation': 'clean',
  'check': 'clean',
  
  // === PRUEFTISCH LAYOUT ===
  'prueftisch': 'prueftisch',
  'reviewtable': 'prueftisch',
  'table': 'prueftisch',
  'qa': 'prueftisch',
  
  // === PRUEFTISCH GROSS → alias for prueftisch (use columns=2 instead) ===
  'prueftisch-gross': 'prueftisch',
  'prueftisch-large': 'prueftisch',
  'reviewtable-large': 'prueftisch',
  'qa-large': 'prueftisch',
  
  // === PRUEFTISCH ORG LAYOUT ===
  'prueftisch-org': 'prueftisch-org',
  'reviewtable-org': 'prueftisch-org',
  'qa-org': 'prueftisch-org',
  
  // === PRUEFTISCH ORG LARGE → alias for prueftisch-org (use columns=2 instead) ===
  'prueftisch-org-large': 'prueftisch-org',
  'reviewtable-org-large': 'prueftisch-org',
  'qa-org-large': 'prueftisch-org'
};

/**
 * All available component input parameters
 * Use this as reference for HTML attributes
 */
export const CANVAS_INPUT_PARAMETERS = {
  // Layout Selection
  layout: 'string: "default" | "plugin" | "dialog" | "detail" | "clean" | "prueftisch" | "prueftisch-org"',
  mode: 'string: integration mode name',
  
  // API Configuration
  apiUrl: 'string: URL to Metadata Agent API',
  contextName: 'string: schema context name',
  schemaVersion: 'string: schema version (default: latest)',
  
  // Layout Shortcuts
  viewerMode: 'boolean: backward compat, maps to readonly=true',
  readonly: 'boolean: disable all editing',
  borderless: 'boolean: remove borders for embedding',
  flatGroups: 'boolean: merge all field groups into one group per schema (header = content type name)',
  
  // Element Visibility (all boolean)
  showHeader: 'boolean',
  showCloseButton: 'boolean',
  showInputArea: 'boolean',
  showExtractButton: 'boolean',
  showStatusBar: 'boolean',
  showContentTypeSelector: 'boolean',
  showProgressBar: 'boolean',
  showCoreFields: 'boolean',
  showSpecialFields: 'boolean',
  showFieldActions: 'boolean',
  showGroupCollapse: 'boolean',
  showFooter: 'boolean',
  showFloatingControls: 'boolean: master toggle for entire floating bar',
  showJsonLoader: 'boolean: JSON file loader in floating bar (default/plugin)',
  showSaveButton: 'boolean: save/submit button in floating bar',
  showUploadButton: 'boolean: upload-to-repository button in floating bar',
  showLanguageSwitcher: 'boolean: i18n language switcher pill in floating bar',
  showContentType: 'boolean: content type split-button in floating bar',
  showResetButton: 'boolean: reset button (input area + floating bar)',
  
  // Behavior
  controls: 'boolean: alias for showFloatingControls',
  showContentTypeOnly: 'boolean: hide all except content type',
  autoExtract: 'boolean: auto-start extraction on paste',
  columns: 'number: 1-4 columns for field display',
  
  // Data
  backgroundColor: 'string: CSS color value',
  metadataInput: 'object: initial metadata to display'
} as const;

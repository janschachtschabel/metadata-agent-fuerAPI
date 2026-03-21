import { 
  Component, 
  OnInit, 
  OnDestroy, 
  OnChanges, 
  SimpleChanges, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy, 
  ChangeDetectorRef,
  NgZone,
  HostListener,
  HostBinding
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { WIDGET_VERSION } from '../../version';
import { CanvasService } from '../../core/canvas.service';
import { SchemaService } from '../../core/schema.service';
import { ApiService } from '../../core/api.service';
import { LayoutService } from '../../core/layout.service';
import { I18nService } from '../../core/i18n.service';
import { DynamicTranslateLoader } from '../../core/dynamic-translate-loader';
import { InstanceRegistry } from '../../core/instance-registry';
import { WidgetDebug } from '../../core/debug';
import { CanvasState, ContentType } from '../../shared/models/canvas.models';
import { LayoutConfig, DEFAULT_LAYOUT } from '../../shared/layouts';
import { DefaultLayoutComponent } from '../layouts/default-layout/default-layout.component';
import { PluginLayoutComponent } from '../layouts/plugin-layout/plugin-layout.component';
import { DialogLayoutComponent } from '../layouts/dialog-layout/dialog-layout.component';
import { DetailLayoutComponent } from '../layouts/detail-layout/detail-layout.component';
import { CleanLayoutComponent } from '../layouts/clean-layout/clean-layout.component';
import { PrueftischLayoutComponent } from '../layouts/prueftisch-layout/prueftisch-layout.component';
import { PrueftischOrgLayoutComponent } from '../layouts/prueftisch-org-layout/prueftisch-org-layout.component';

/**
 * Canvas Component - Orchestrator
 * 
 * This component manages state and delegates rendering to layout components.
 * It does NOT render UI directly - that's the job of the layout components.
 * 
 * Usage:
 *   <app-canvas layout="default"></app-canvas>
 *   <app-canvas [readonly]="true"></app-canvas>
 */
@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [
    CommonModule,
    DefaultLayoutComponent,
    PluginLayoutComponent,
    DialogLayoutComponent,
    DetailLayoutComponent,
    CleanLayoutComponent,
    PrueftischLayoutComponent,
    PrueftischOrgLayoutComponent
  ],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CanvasService]
})
export class CanvasComponent implements OnInit, OnDestroy, OnChanges {
  /** Readable widget version (accessible via element.version) */
  readonly version = WIDGET_VERSION;

  /** Unique component ID for event deduplication across same-instance components */
  private static _nextId = 0;
  private _componentId = `canvas-${CanvasComponent._nextId++}`;
  private _instanceId = 'default';
  private _isPrimary = true;

  @HostBinding('class.borderless') get isBorderless(): boolean {
    return this._borderless === true || (this._borderless === undefined && this._layout.style.borderless);
  }

  @HostBinding('class.ready') get isReady(): boolean {
    return this._initialized;
  }

  // ===== INPUT PROPERTIES =====

  /**
   * Instance ID for multi-instance support.
   * - Different IDs → fully isolated state & events.
   * - Same ID       → shared state, events fire only once (from the primary component).
   * - Default: 'default' (backward-compatible — all untagged components share state).
   */
  @Input() set instanceId(value: string) {
    if (WidgetDebug.enabled) console.log(`[${this._componentId}] instanceId setter called: "${value}" (current: "${this._instanceId}")`);
    if (value && value !== this._instanceId) {
      // Unregister from old instance
      InstanceRegistry.unregister(this._instanceId, this._componentId);
      this._instanceId = value;
      this.canvas.bindToInstance(value);
      this._isPrimary = InstanceRegistry.register(value, this._componentId);
      if (WidgetDebug.enabled) console.log(`[${this._componentId}] → bound to instance "${value}", isPrimary=${this._isPrimary}`);
    }
  }
  
  /**
   * Enable debug logging to the browser console.
   * HTML: debug="true"  /  JS: element.debug = true
   * Default: false (no debug output).
   */
  @Input() set debug(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    WidgetDebug.enabled = value === true || value === 'true';
  }

  @Input() set apiUrl(value: string) {
    if (WidgetDebug.enabled) console.log(`[${this._componentId}] apiUrl setter called: "${value}"`);
    if (value) {
      this._apiUrl = value;
      this.apiService.setApiUrl(value);
      // Set API URL for i18n loader and force reload so cached empty translations are replaced
      DynamicTranslateLoader.setApiUrl(value);
      this.i18n.reloadTranslations();
    }
  }
  
  @Input() set contextName(value: string) {
    if (value) this._contextName = value;
  }
  
  @Input() set schemaVersion(value: string) {
    if (value) this._schemaVersion = value;
  }
  
  @Input() set viewerMode(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    // Backward compat: viewerMode now maps to readonly
    this._readonly = value === true || value === 'true';
  }
  
  @Input() set readonly(value: boolean | string | undefined) {
    if (value === undefined) return;
    this._readonly = value === true || value === 'true';
  }
  
  @Input() set borderless(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    this._borderless = value === true || value === 'true';
  }
  
  @Input() set flatGroups(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    this._flatGroups = value === true || value === 'true';
  }
  
  @Input() backgroundColor = '';
  
  @Input() set columns(value: number | string | undefined) {
    if (value === undefined || value === null) return;
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (num >= 1 && num <= 4) this._columnsOverride = num as 1 | 2 | 3 | 4;
  }
  
  @Input() set layout(value: string) {
    this._layout = this.layoutService.getLayout(value);
    this._layoutName = this._layout.name; // Use canonical name after alias resolution
  }
  
  // Individual element visibility (override layout defaults)
  @Input() set showInputArea(value: boolean | string | undefined) {
    this._showInputArea = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showStatusBar(value: boolean | string | undefined) {
    this._showStatusBar = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showCoreFields(value: boolean | string | undefined) {
    this._showCoreFields = value === undefined ? undefined : (value !== false && value !== 'false');
  }
  
  @Input() set showSpecialFields(value: boolean | string | undefined) {
    this._showSpecialFields = value === undefined ? undefined : (value !== false && value !== 'false');
  }
  
  @Input() set showFooter(value: boolean | string | undefined) {
    this._showFooter = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showFloatingControls(value: boolean | string | undefined) {
    this._showFloatingControls = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  // Alias for showFloatingControls (OEH compatibility)
  @Input() set controls(value: boolean | string | undefined) {
    this._showFloatingControls = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showFieldActions(value: boolean | string | undefined) {
    this._showFieldActions = value === undefined ? undefined : (value !== false && value !== 'false');
  }
  
  @Input() set showUploadButton(value: boolean | string | undefined) {
    this._showUploadButton = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showSaveButton(value: boolean | string | undefined) {
    this._showSaveButton = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showJsonLoader(value: boolean | string | undefined) {
    this._showJsonLoader = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showLanguageSwitcher(value: boolean | string | undefined) {
    this._showLanguageSwitcher = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showContentType(value: boolean | string | undefined) {
    this._showContentType = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showResetButton(value: boolean | string | undefined) {
    this._showResetButton = value === undefined ? undefined : (value === true || value === 'true');
  }
  
  @Input() set showPreview(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    this._showPreview = value !== false && value !== 'false';
  }

  @Input() set showPageMode(value: boolean | string | undefined) {
    this._showPageMode = value === true || value === 'true';
  }
  
  // OEH compatibility: Show only content type selector in floating controls
  @Input() set showContentTypeOnly(value: boolean | string | undefined) {
    if (value === undefined) return;
    this._showContentTypeOnly = value === true || value === 'true';
  }
  
  // Highlight AI-generated fields with purple text (default: true)
  @Input() set highlightAi(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    this._highlightAi = value !== false && value !== 'false';
  }
  
  @Input() metadataInput: Record<string, unknown> | null = null;
  
  @Input() set previewImage(value: string | undefined) {
    if (value !== undefined && value !== null) {
      this._previewImageUrl = value;
      // Also update state so layouts can access it
      if (this.state) {
        this.state = { ...this.state, previewImageUrl: value };
      }
    }
  }
  
  // Screenshot: enable/disable and method configuration
  @Input() set enableScreenshot(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    const enabled = value !== false && value !== 'false';
    this._screenshotEnabled = enabled;
    this.canvas.setScreenshotEnabled(enabled);
  }

  @Input() set screenshotMethod(value: 'pageshot' | 'playwright' | string) {
    if (value === 'pageshot' || value === 'playwright') {
      this._screenshotMethod = value;
      this.canvas.setScreenshotMethod(value);
    }
  }

  // Content type: set schema file name or URI from outside (e.g. 'event.json' or 'http://w3id.org/openeduhub/vocabs/contentTypes/event')
  @Input() set contentType(value: string) {
    if (value) {
      this._pendingContentType = value;
      // Only apply immediately if content types are already loaded (i.e. after ngOnInit).
      // Otherwise ngOnInit will re-apply the pending content type after core schema is loaded.
      if (this.contentTypes.length > 0) {
        this.applyContentType(value);
      }
    }
  }
  
  // Input mode: 'text' | 'url' | 'nodeId'
  @Input() set inputMode(value: 'text' | 'url' | 'nodeId') {
    this._inputMode = value;
  }
  get inputModeValue(): 'text' | 'url' | 'nodeId' {
    return this._inputMode;
  }
  
  // Browser plugin integration: settable text/URL + auto-extract trigger
  @Input() set text(value: string) {
    if (value !== undefined && value !== null) {
      this.ngZone.run(() => {
        this.userText = value;
        this.cdr.markForCheck();
      });
    }
  }
  
  @Input() set url(value: string) {
    if (value !== undefined && value !== null) {
      this.ngZone.run(() => {
        this.sourceUrl = value;
        this.cdr.markForCheck();
      });
    }
  }
  
  @Input() set autoExtract(value: boolean | string | number) {
    // Accept boolean, string 'true', or any truthy value (e.g. timestamp/counter)
    // to ensure repeated calls always trigger even if previous value was also truthy
    if (value && String(value) !== 'false' && String(value) !== '0') {
      this._autoExtractPending = true;
      // Use ngZone.run to ensure Angular detects changes from external JS (browser plugin)
      this.ngZone.run(() => {
        setTimeout(() => this.triggerAutoExtract(), 0);
      });
    }
  }

  // Programmatic reset without confirmation dialog (for browser plugin)
  @Input() set forceReset(value: boolean | string | number) {
    if (value && String(value) !== 'false' && String(value) !== '0') {
      this.ngZone.run(() => {
        this.canvas.reset();
        this.userText = '';
        this.sourceUrl = '';
        this.nodeId = '';
        this.cdr.markForCheck();
      });
    }
  }
  
  // ===== OUTPUT EVENTS =====
  
  @Output() metadataChange = new EventEmitter<Record<string, unknown>>();
  @Output() metadataSubmit = new EventEmitter<Record<string, unknown>>();
  @Output() uploadResult = new EventEmitter<{ success: boolean; nodeId?: string; error?: string; duplicate?: boolean; repositoryUrl?: string }>();
  @Output() reloadFromPage = new EventEmitter<void>();
  
  // ===== INTERNAL STATE =====
  
  state: CanvasState | null = null;
  userText = '';
  sourceUrl = '';
  nodeId = '';
  _inputMode: 'text' | 'url' | 'nodeId' = 'text';
  _autoExtractPending = false;
  _pendingContentType: string | null = null;
  contentTypes: ContentType[] = [];
  
  // Configuration
  _apiUrl = '';
  _contextName = 'default';
  _schemaVersion = 'latest';
  _readonly: boolean | undefined = undefined;
  _borderless: boolean | undefined = undefined;
  _flatGroups = false;
  _layoutName = 'default';
  _layout: LayoutConfig = DEFAULT_LAYOUT;
  
  // Element visibility overrides (undefined = use layout default)
  _showInputArea: boolean | undefined = undefined;
  _showStatusBar: boolean | undefined = undefined;
  _showCoreFields: boolean | undefined = undefined;
  _showSpecialFields: boolean | undefined = undefined;
  _showFooter: boolean | undefined = undefined;
  _showFloatingControls: boolean | undefined = undefined;
  _showFieldActions: boolean | undefined = undefined;
  _showUploadButton: boolean | undefined = undefined;
  _showSaveButton: boolean | undefined = undefined;
  _showJsonLoader: boolean | undefined = undefined;
  _showLanguageSwitcher: boolean | undefined = undefined;
  _showContentType: boolean | undefined = undefined;
  _showResetButton: boolean | undefined = undefined;
  _showPageMode = false;
  _showContentTypeOnly = false;  // OEH: Show only content type in floating controls
  _highlightAi = false;  // Highlight AI-generated fields with purple text (disabled by default)
  _showPreview = true;  // Show preview thumbnail (default: true)
  _previewImageUrl: string | undefined = undefined;
  _columnsOverride: 1 | 2 | 3 | 4 | undefined = undefined;
  _screenshotEnabled = true;
  _screenshotMethod: 'pageshot' | 'playwright' = 'pageshot';

  /** Prevents rendering until all initial @Input setters have fired (anti-flicker) */
  _initialized = false;
  
  private _metadataChangeTimer: any = null;
  private destroy$ = new Subject<void>();
  
  constructor(
    public canvas: CanvasService,
    private schema: SchemaService,
    private apiService: ApiService,
    private layoutService: LayoutService,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    // Bind to default instance and register for event dedup
    this.canvas.bindToInstance(this._instanceId);
    this._isPrimary = InstanceRegistry.register(this._instanceId, this._componentId);
  }
  
  // ===== PLUGIN EVENT BRIDGE =====
  // CustomEvent-based extraction trigger — much more reliable than @Input setters
  // for external JS (browser plugin) because events always fire inside Angular's zone
  // via @HostListener, and there are no change detection timing issues.
  //
  // Usage from plugin:
  //   element.dispatchEvent(new CustomEvent('plugin-extract', {
  //     detail: { text: '...', url: '...', inputMode: 'text', reset: true }
  //   }));
  @HostListener('plugin-extract', ['$event'])
  onPluginExtract(event: CustomEvent): void {
    const { text, url, inputMode, reset } = event.detail || {};
    if (WidgetDebug.enabled) console.log('📩 plugin-extract event received:', { textLength: text?.length, url, inputMode, reset });

    // Reset state if requested (new URL)
    if (reset) {
      this.canvas.reset();
    }

    // Set input mode
    if (inputMode) {
      this._inputMode = inputMode;
    }

    // Set data
    if (text) {
      this.userText = text;
    }
    if (url) {
      this.sourceUrl = url;
    }

    this.cdr.markForCheck();

    // Trigger extraction immediately
    this._autoExtractPending = true;
    setTimeout(() => this.triggerAutoExtract(), 0);
  }

  // ===== LIFECYCLE =====
  
  async ngOnInit(): Promise<void> {
    // All @Input setters have fired by now → safe to render
    this._initialized = true;

    // Subscribe to state changes (always, even if schema load fails)
    this.canvas.state$.pipe(takeUntil(this.destroy$)).subscribe((state: CanvasState) => {
      this.state = state;
      // Debounce metadataChange emissions (50ms) to avoid flooding the host page.
      // Skip emission entirely while extracting — the expensive getMetadataForRepository()
      // + ngZone.run() would cause full CD cycles that block scrolling.
      // The final emission fires automatically when isExtracting turns false.
      if (this._isPrimary && !state.isExtracting) {
        clearTimeout(this._metadataChangeTimer);
        this._metadataChangeTimer = setTimeout(() => {
          this.ngZone.run(() => this.metadataChange.emit(this.canvas.getMetadataForRepository()));
        }, 50);
      }
      this.cdr.markForCheck();
    });
    
    // Subscribe to language changes
    this.i18n.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshContentTypes();
    });

    try {
      // Initialize schema context with optional version
      await this.schema.setContext(this._contextName, this._schemaVersion);
      await this.schema.loadCoreSchema();
      
      // Load content types
      this.contentTypes = await this.schema.getContentTypes();
      
      // Re-apply pending content type now that core schema is loaded (URI resolution requires it)
      if (this._pendingContentType) {
        await this.applyContentType(this._pendingContentType);
        this._pendingContentType = null;
      }
    } catch (error: any) {
      console.error('Failed to initialize schema:', error);
      const msg = error?.error?.detail || error?.message || 'API unreachable';
      this.canvas.setError(`Schema initialization failed: ${msg}`);
    }
    
    this.cdr.markForCheck();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metadataInput']?.currentValue) {
      this.loadMetadata(changes['metadataInput'].currentValue);
    }
  }
  
  ngOnDestroy(): void {
    InstanceRegistry.unregister(this._instanceId, this._componentId);
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ===== ACTIONS =====
  
  private triggerAutoExtract(): void {
    if (!this._autoExtractPending) return;
    this._autoExtractPending = false;
    
    if (WidgetDebug.enabled) console.log('🤖 Auto-extract triggered:', { mode: this._inputMode, hasText: !!this.userText, hasUrl: !!this.sourceUrl });
    
    if (this._inputMode === 'url' && this.sourceUrl.trim()) {
      this.startUrlExtraction(this.sourceUrl);
    } else if (this._inputMode === 'nodeId' && this.nodeId.trim()) {
      this.startNodeIdExtraction(this.nodeId);
    } else if (this.userText.trim()) {
      this.startExtraction();
    } else if (this.sourceUrl.trim()) {
      // Fallback: if text mode but no text, try URL
      this.startUrlExtraction(this.sourceUrl);
    }
  }
  
  startExtraction(): void {
    if (!this.userText.trim()) {
      alert(this.i18n.instant('ALERTS.INPUT_REQUIRED'));
      return;
    }
    const text = this.userText;
    this.userText = ''; // Clear immediately
    // Run outside Angular zone so zone.js doesn't track it as a long task
    this.ngZone.runOutsideAngular(() => setTimeout(async () => {
      await this.canvas.startExtraction(text);
      this.ngZone.run(() => this.cdr.markForCheck());
    }));
  }
  
  startUrlExtraction(url: string): void {
    if (!url.trim()) {
      alert(this.i18n.instant('ALERTS.INPUT_REQUIRED'));
      return;
    }
    this.ngZone.runOutsideAngular(() => setTimeout(async () => {
      await this.canvas.startUrlExtraction(url);
      this.ngZone.run(() => this.cdr.markForCheck());
    }));
  }
  
  startNodeIdExtraction(nodeId: string): void {
    if (!nodeId.trim()) {
      alert(this.i18n.instant('ALERTS.INPUT_REQUIRED'));
      return;
    }
    this.ngZone.runOutsideAngular(() => setTimeout(async () => {
      await this.canvas.startNodeIdExtraction(nodeId);
      this.ngZone.run(() => this.cdr.markForCheck());
    }));
  }
  
  async selectContentType(contentType: ContentType): Promise<void> {
    await this.canvas.changeContentTypeManually(contentType.schemaFile, contentType.label, contentType.icon);
    this.cdr.markForCheck();
  }
  
  private async applyContentType(schemaFileOrUri: string): Promise<void> {
    // Resolve URI to schema filename if needed (e.g. 'http://w3id.org/openeduhub/vocabs/contentTypes/event' → 'event.json')
    const schemaFile = this.schema.resolveSchemaFileOrUri(schemaFileOrUri);
    // Find label from loaded content types, or use schema file name as fallback
    const ct = this.contentTypes.find(c => c.schemaFile === schemaFile);
    const label = ct?.label || schemaFile;
    const icon = ct?.icon || 'category';
    await this.canvas.changeContentTypeManually(schemaFile, label, icon);
    this.cdr.markForCheck();
  }
  
  submit(): void {
    const metadata = this.canvas.getMetadataForRepository();
    if (this._isPrimary) {
      this.metadataSubmit.emit(metadata);
    }
  }
  
  async uploadToRepository(repository: 'staging' | 'prod' = 'staging'): Promise<void> {
    const metadata = this.canvas.getMetadataForRepository();
    const state = this.canvas.getCurrentState();
    const extendedText = state.userText || undefined;
    
    try {
      const result = await this.apiService.upload({
        metadata,
        repository,
        check_duplicates: true,
        start_workflow: true,
        write_extended_data: true,
        extended_text: extendedText
      });
      
      this.uploadResult.emit({
        success: result.success,
        nodeId: result.node?.nodeId,
        error: result.error,
        duplicate: result.duplicate,
        repositoryUrl: result.node?.repositoryUrl
      });
      
      if (result.success) {
        alert(this.i18n.instant('ALERTS.UPLOAD_SUCCESS', { 
          nodeId: result.node?.nodeId || '',
          url: result.node?.repositoryUrl || ''
        }));
      } else if (result.duplicate) {
        const again = confirm(this.i18n.instant('ALERTS.UPLOAD_DUPLICATE', {
          title: result.node?.title || '',
          url: result.node?.repositoryUrl || ''
        }));
        if (again) {
          const retryResult = await this.apiService.upload({
            metadata,
            repository,
            check_duplicates: false,
            start_workflow: true,
            write_extended_data: true,
            extended_text: extendedText
          });
          this.uploadResult.emit({
            success: retryResult.success,
            nodeId: retryResult.node?.nodeId,
            error: retryResult.error,
            repositoryUrl: retryResult.node?.repositoryUrl
          });
        }
      } else {
        alert(this.i18n.instant('ALERTS.UPLOAD_ERROR', { error: result.error || 'Unknown error' }));
      }
    } catch (error: any) {
      const msg = error?.error?.detail || error?.message || 'Upload failed';
      alert(this.i18n.instant('ALERTS.UPLOAD_ERROR', { error: msg }));
      this.uploadResult.emit({ success: false, error: msg });
    }
    
    this.cdr.markForCheck();
  }
  
  reset(): void {
    if (confirm(this.i18n.instant('ALERTS.CONFIRM_RESET'))) {
      this.canvas.reset();
      this.userText = '';
    }
  }
  
  // ===== JSON Import/Export =====
  
  downloadJson(): void {
    const metadata = this.canvas.getMetadataForRepository();
    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async onJsonLoaded(jsonData: Record<string, unknown>): Promise<void> {
    try {
      await this.canvas.importJsonData(jsonData);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error importing JSON:', error);
      alert(this.i18n.instant('ALERTS.JSON_LOAD_ERROR'));
    }
  }
  
  // ===== HELPERS =====
  
  private async loadMetadata(metadata: Record<string, unknown>): Promise<void> {
    await this.canvas.importJsonData(metadata);
  }
  
  private async refreshContentTypes(): Promise<void> {
    this.contentTypes = await this.schema.getContentTypes();
    this.cdr.markForCheck();
  }
  
  // ===== LAYOUT HELPERS =====
  
  /**
   * Determine which layout component to use
   */
  get activeLayout(): 'default' | 'plugin' | 'dialog' | 'detail' | 'clean' | 'prueftisch' | 'prueftisch-org' {
    if (this._layoutName === 'plugin') {
      return 'plugin';
    }
    if (this._layoutName === 'dialog') {
      return 'dialog';
    }
    if (this._layoutName === 'detail') {
      return 'detail';
    }
    if (this._layoutName === 'clean') {
      return 'clean';
    }
    if (this._layoutName === 'prueftisch') {
      return 'prueftisch';
    }
    if (this._layoutName === 'prueftisch-org') {
      return 'prueftisch-org';
    }
    return 'default';
  }
  
  /**
   * Get effective element visibility (override ?? layout default)
   */
  get effectiveShowInputArea(): boolean {
    return this._showInputArea ?? this._layout.elements.inputArea;
  }
  
  get effectiveShowStatusBar(): boolean {
    return this._showStatusBar ?? this._layout.elements.statusBar;
  }
  
  get effectiveShowCoreFields(): boolean {
    return this._showCoreFields ?? this._layout.elements.coreFields;
  }
  
  get effectiveShowSpecialFields(): boolean {
    return this._showSpecialFields ?? this._layout.elements.specialFields;
  }
  
  get effectiveShowFooter(): boolean {
    return this._showFooter ?? this._layout.elements.footer;
  }
  
  get effectiveShowFloatingControls(): boolean {
    return this._showFloatingControls ?? this._layout.elements.floatingControls;
  }
  
  get effectiveShowFieldActions(): boolean {
    return this._showFieldActions ?? this._layout.elements.fieldActions;
  }
  
  get effectiveShowUploadButton(): boolean {
    return this._showUploadButton ?? this._layout.elements.uploadButton;
  }
  
  get effectiveShowSaveButton(): boolean {
    return this._showSaveButton ?? this._layout.elements.saveButton;
  }
  
  get effectiveShowJsonLoader(): boolean {
    return this._showJsonLoader ?? this._layout.elements.jsonLoader;
  }
  
  get effectiveShowLanguageSwitcher(): boolean {
    return this._showLanguageSwitcher ?? this._layout.elements.languageSwitcher;
  }
  
  get effectiveShowContentType(): boolean {
    return this._showContentType ?? this._layout.elements.contentTypeSelector;
  }
  
  get effectiveShowResetButton(): boolean {
    return this._showResetButton ?? this._layout.elements.floatingResetButton;
  }
  
  get effectiveReadonly(): boolean {
    return this._readonly !== undefined ? this._readonly : this._layout.behavior.readonly;
  }
  
  get effectiveColumns(): 1 | 2 | 3 | 4 {
    return this._columnsOverride ?? this._layout.style.columns;
  }
}

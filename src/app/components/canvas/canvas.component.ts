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
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CanvasService } from '../../core/canvas.service';
import { SchemaService } from '../../core/schema.service';
import { ApiService } from '../../core/api.service';
import { LayoutService } from '../../core/layout.service';
import { I18nService } from '../../core/i18n.service';
import { DynamicTranslateLoader } from '../../core/dynamic-translate-loader';
import { CanvasState, ContentType } from '../../shared/models/canvas.models';
import { LayoutConfig, DEFAULT_LAYOUT } from '../../shared/layouts';
import { DefaultLayoutComponent } from '../layouts/default-layout/default-layout.component';
import { PluginLayoutComponent } from '../layouts/plugin-layout/plugin-layout.component';
import { DialogLayoutComponent } from '../layouts/dialog-layout/dialog-layout.component';
import { DetailLayoutComponent } from '../layouts/detail-layout/detail-layout.component';
import { MetadatenpruefdialogLayoutComponent } from '../layouts/metadatenpruefdialog-layout/metadatenpruefdialog-layout.component';
import { PrueftischLayoutComponent } from '../layouts/prueftisch-layout/prueftisch-layout.component';

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
    MetadatenpruefdialogLayoutComponent,
    PrueftischLayoutComponent
  ],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CanvasComponent implements OnInit, OnDestroy, OnChanges {
  // ===== INPUT PROPERTIES =====
  
  @Input() set apiUrl(value: string) {
    if (value) {
      this._apiUrl = value;
      this.apiService.setApiUrl(value);
      // Set API URL for i18n loader (triggers deferred translation fetch)
      DynamicTranslateLoader.setApiUrl(value);
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
  
  @Input() set showPageMode(value: boolean | string | undefined) {
    this._showPageMode = value === true || value === 'true';
  }
  
  // OEH compatibility: Show only content type selector in floating controls
  @Input() set showContentTypeOnly(value: boolean | string) {
    this._showContentTypeOnly = value === true || value === 'true';
  }
  
  // Highlight AI-generated fields with purple text (default: true)
  @Input() set highlightAi(value: boolean | string | undefined) {
    if (value === undefined || value === null) return;
    this._highlightAi = value !== false && value !== 'false';
  }
  
  @Input() metadataInput: Record<string, unknown> | null = null;
  
  // Content type: set schema file name from outside (e.g. 'event.json')
  @Input() set contentType(value: string) {
    if (value) {
      this._pendingContentType = value;
      this.applyContentType(value);
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
  _showPageMode = false;
  _showContentTypeOnly = false;  // OEH: Show only content type in floating controls
  _highlightAi = false;  // Highlight AI-generated fields with purple text (disabled by default)
  _columnsOverride: 1 | 2 | 3 | 4 | undefined = undefined;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    public canvas: CanvasService,
    private schema: SchemaService,
    private apiService: ApiService,
    private layoutService: LayoutService,
    public i18n: I18nService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}
  
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
    console.log('📩 plugin-extract event received:', { textLength: text?.length, url, inputMode, reset });

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
    // Subscribe to state changes (always, even if schema load fails)
    this.canvas.state$.pipe(takeUntil(this.destroy$)).subscribe((state: CanvasState) => {
      this.state = state;
      this.metadataChange.emit(this.canvas.getMetadataForRepository());
      this.cdr.markForCheck();
    });
    
    // Subscribe to language changes
    this.i18n.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshContentTypes();
    });

    try {
      // Initialize schema context with optional version
      await this.schema.setContext(this._contextName, this._schemaVersion !== 'latest' ? this._schemaVersion : undefined);
      await this.schema.loadCoreSchema();
      
      // Load content types
      this.contentTypes = await this.schema.getContentTypes();
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
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ===== ACTIONS =====
  
  private async triggerAutoExtract(): Promise<void> {
    if (!this._autoExtractPending) return;
    this._autoExtractPending = false;
    
    console.log('🤖 Auto-extract triggered:', { mode: this._inputMode, hasText: !!this.userText, hasUrl: !!this.sourceUrl });
    
    if (this._inputMode === 'url' && this.sourceUrl.trim()) {
      await this.startUrlExtraction(this.sourceUrl);
    } else if (this._inputMode === 'nodeId' && this.nodeId.trim()) {
      await this.startNodeIdExtraction(this.nodeId);
    } else if (this.userText.trim()) {
      await this.startExtraction();
    } else if (this.sourceUrl.trim()) {
      // Fallback: if text mode but no text, try URL
      await this.startUrlExtraction(this.sourceUrl);
    }
  }
  
  async startExtraction(): Promise<void> {
    if (!this.userText.trim()) {
      alert(this.i18n.instant('ALERTS.INPUT_REQUIRED'));
      return;
    }
    
    await this.canvas.startExtraction(this.userText);
    this.userText = ''; // Clear after extraction
    this.cdr.markForCheck();
  }
  
  async startUrlExtraction(url: string): Promise<void> {
    if (!url.trim()) {
      alert(this.i18n.instant('ALERTS.INPUT_REQUIRED'));
      return;
    }
    
    await this.canvas.startUrlExtraction(url);
    this.cdr.markForCheck();
  }
  
  async startNodeIdExtraction(nodeId: string): Promise<void> {
    if (!nodeId.trim()) {
      alert(this.i18n.instant('ALERTS.INPUT_REQUIRED'));
      return;
    }
    
    await this.canvas.startNodeIdExtraction(nodeId);
    this.cdr.markForCheck();
  }
  
  async selectContentType(contentType: ContentType): Promise<void> {
    await this.canvas.changeContentTypeManually(contentType.schemaFile, contentType.label, contentType.icon);
    this.cdr.markForCheck();
  }
  
  private async applyContentType(schemaFile: string): Promise<void> {
    // Find label from loaded content types, or use schema file name as fallback
    const ct = this.contentTypes.find(c => c.schemaFile === schemaFile);
    const label = ct?.label || schemaFile;
    const icon = ct?.icon || 'category';
    await this.canvas.changeContentTypeManually(schemaFile, label, icon);
    this.cdr.markForCheck();
  }
  
  submit(): void {
    const metadata = this.canvas.getMetadataForRepository();
    this.metadataSubmit.emit(metadata);
  }
  
  async uploadToRepository(repository: 'staging' | 'prod' = 'staging'): Promise<void> {
    const metadata = this.canvas.getMetadataForRepository();
    
    try {
      const result = await this.apiService.upload({
        metadata,
        repository,
        check_duplicates: true,
        start_workflow: true
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
            start_workflow: true
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
  get activeLayout(): 'default' | 'plugin' | 'dialog' | 'detail' | 'metadatenpruefdialog' | 'prueftisch' | 'prueftisch-gross' {
    if (this._layoutName === 'plugin') {
      return 'plugin';
    }
    if (this._layoutName === 'dialog') {
      return 'dialog';
    }
    if (this._layoutName === 'detail') {
      return 'detail';
    }
    if (this._layoutName === 'metadatenpruefdialog') {
      return 'metadatenpruefdialog';
    }
    if (this._layoutName === 'prueftisch') {
      return 'prueftisch';
    }
    if (this._layoutName === 'prueftisch-gross') {
      return 'prueftisch-gross';
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
  
  get effectiveReadonly(): boolean {
    return this._readonly !== undefined ? this._readonly : this._layout.behavior.readonly;
  }
  
  get effectiveColumns(): 1 | 2 | 3 | 4 {
    return this._columnsOverride ?? this._layout.style.columns;
  }
}

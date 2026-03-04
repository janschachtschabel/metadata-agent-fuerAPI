import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanvasComponent } from './components/canvas/canvas.component';

/**
 * Root App Component
 * 
 * Reads URL query parameters to configure the canvas:
 *   ?layout=plugin       - Use plugin layout
 *   ?viewerMode=true     - Backward compat, maps to readonly=true
 *   ?readonly=true       - Enable readonly mode
 *   ?borderless=true     - Enable borderless mode
 *   ?flatGroups=true     - Merge field groups into one per schema
 *   ?showStatusBar=true  - Show status bar
 *   ?controls=true       - Show floating controls
 *   ?showContentType=false - Hide content type button
 *   ?showSaveButton=false  - Hide save button
 *   ?showUploadButton=true - Show upload button
 *   ?showJsonLoader=false  - Hide JSON loader
 *   ?showLanguageSwitcher=false - Hide language switcher
 *   ?showResetButton=false - Hide reset button
 *   ?showContentTypeOnly=true - Only show content type
 *   ?dataUrl=assets/example-event.json - Load JSON data from URL
 * 
 * Layout values: default, plugin, dialog, detail, clean, prueftisch, prueftisch-org
 * (alias: metadatenpruefdialog → clean)
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CanvasComponent],
  template: `
    <app-canvas 
      [apiUrl]="apiUrl"
      [contextName]="contextName"
      [schemaVersion]="schemaVersion"
      [layout]="layout"
      [columns]="columns"
      [viewerMode]="viewerMode"
      [readonly]="readonly"
      [borderless]="borderless"
      [showStatusBar]="showStatusBar"
      [controls]="controls"
      [showContentType]="showContentType"
      [showSaveButton]="showSaveButton"
      [showUploadButton]="showUploadButton"
      [showJsonLoader]="showJsonLoader"
      [showLanguageSwitcher]="showLanguageSwitcher"
      [showResetButton]="showResetButton"
      [showContentTypeOnly]="showContentTypeOnly"
      [inputMode]="inputMode"
      [highlightAi]="highlightAi"
      [flatGroups]="flatGroups"
      [metadataInput]="metadataInput">
    </app-canvas>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit {
  apiUrl = '';
  contextName = 'default';
  schemaVersion = 'latest';
  layout = 'default';
  metadataInput: Record<string, unknown> | null = null;
  viewerMode: boolean | undefined = undefined;
  readonly: boolean | undefined = undefined;
  borderless: boolean | undefined = undefined;
  showStatusBar: boolean | undefined = undefined;
  controls: boolean | undefined = undefined;
  columns: number | undefined = undefined;
  inputMode: 'text' | 'url' | 'nodeId' = 'text';
  highlightAi: boolean | undefined = undefined;
  showContentType: boolean | undefined = undefined;
  showSaveButton: boolean | undefined = undefined;
  showUploadButton: boolean | undefined = undefined;
  showJsonLoader: boolean | undefined = undefined;
  showLanguageSwitcher: boolean | undefined = undefined;
  showResetButton: boolean | undefined = undefined;
  showContentTypeOnly: boolean | undefined = undefined;
  flatGroups: boolean | undefined = undefined;
  
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.parseQueryParams();
  }
  
  private parseQueryParams(): void {
    const params = new URLSearchParams(window.location.search);
    
    // API URL
    const apiUrlParam = params.get('apiUrl');
    if (apiUrlParam) this.apiUrl = apiUrlParam;
    
    // Schema context
    const contextParam = params.get('context') || params.get('contextName');
    if (contextParam) this.contextName = contextParam;
    
    // Schema version
    const versionParam = params.get('version') || params.get('schemaVersion');
    if (versionParam) this.schemaVersion = versionParam;
    
    // Layout - accept any valid layout name or alias
    const layoutParam = params.get('layout');
    if (layoutParam) {
      this.layout = layoutParam; // CanvasComponent resolves aliases via LayoutService
    }
    
    // Viewer Mode (backward compat → readonly)
    if (params.has('viewerMode') || params.has('viewer')) {
      this.viewerMode = params.get('viewerMode') === 'true' || params.get('viewer') === 'true';
    }
    
    // Readonly
    if (params.has('readonly')) {
      this.readonly = params.get('readonly') === 'true';
    }
    
    // Borderless
    if (params.has('borderless')) {
      this.borderless = params.get('borderless') === 'true';
    }
    
    // Flat Groups
    if (params.has('flatGroups')) {
      this.flatGroups = params.get('flatGroups') === 'true';
    }
    
    // Status Bar
    if (params.has('showStatusBar')) {
      this.showStatusBar = params.get('showStatusBar') === 'true';
    }
    
    // Floating Controls
    if (params.has('controls')) {
      this.controls = params.get('controls') === 'true';
    }
    
    // Columns
    const columnsParam = params.get('columns');
    if (columnsParam) {
      const num = parseInt(columnsParam, 10);
      if (num >= 1 && num <= 4) this.columns = num;
    }
    
    // Input Mode
    const inputModeParam = params.get('inputMode');
    if (inputModeParam && ['text', 'url', 'nodeId'].includes(inputModeParam)) {
      this.inputMode = inputModeParam as 'text' | 'url' | 'nodeId';
    }
    
    // Highlight AI-generated fields
    if (params.has('highlightAi')) {
      this.highlightAi = params.get('highlightAi') !== 'false';
    }
    
    // Floating control buttons
    const boolParam = (name: string) => params.has(name) ? params.get(name) === 'true' : undefined;
    this.showContentType = boolParam('showContentType');
    this.showSaveButton = boolParam('showSaveButton');
    this.showUploadButton = boolParam('showUploadButton');
    this.showJsonLoader = boolParam('showJsonLoader');
    this.showLanguageSwitcher = boolParam('showLanguageSwitcher');
    this.showResetButton = boolParam('showResetButton');
    this.showContentTypeOnly = boolParam('showContentTypeOnly');
    
    // Load JSON data from URL
    const dataUrl = params.get('dataUrl');
    if (dataUrl) {
      this.http.get<Record<string, unknown>>(dataUrl).subscribe({
        next: (data) => {
          console.log('� Loaded data from:', dataUrl);
          this.metadataInput = data;
        },
        error: (err) => console.error('Failed to load dataUrl:', dataUrl, err)
      });
    }
    
    console.log('�📋 App Config from URL:', {
      apiUrl: this.apiUrl || '(environment default)',
      context: this.contextName,
      version: this.schemaVersion,
      layout: this.layout,
      viewerMode: this.viewerMode,
      readonly: this.readonly,
      borderless: this.borderless,
      flatGroups: this.flatGroups,
      showStatusBar: this.showStatusBar,
      controls: this.controls,
      dataUrl: dataUrl || '(none)'
    });
  }
}

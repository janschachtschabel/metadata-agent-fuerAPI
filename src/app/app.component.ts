import { Component, OnInit } from '@angular/core';
import { CanvasComponent } from './components/canvas/canvas.component';

/**
 * Root App Component
 * 
 * Reads URL query parameters to configure the canvas:
 *   ?layout=plugin       - Use plugin layout
 *   ?viewerMode=true     - Backward compat, maps to readonly=true
 *   ?readonly=true       - Enable readonly mode
 *   ?borderless=true     - Enable borderless mode
 *   ?showStatusBar=true  - Show status bar
 *   ?controls=true       - Show floating controls
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
      [inputMode]="inputMode"
      [highlightAi]="highlightAi">
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
  viewerMode: boolean | undefined = undefined;
  readonly: boolean | undefined = undefined;
  borderless: boolean | undefined = undefined;
  showStatusBar: boolean | undefined = undefined;
  controls: boolean | undefined = undefined;
  columns: number | undefined = undefined;
  inputMode: 'text' | 'url' | 'nodeId' = 'text';
  highlightAi: boolean | undefined = undefined;
  
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
    
    console.log('📋 App Config from URL:', {
      apiUrl: this.apiUrl || '(environment default)',
      context: this.contextName,
      version: this.schemaVersion,
      layout: this.layout,
      viewerMode: this.viewerMode,
      readonly: this.readonly,
      borderless: this.borderless,
      showStatusBar: this.showStatusBar,
      controls: this.controls
    });
  }
}

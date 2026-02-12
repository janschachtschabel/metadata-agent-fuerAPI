import { LayoutConfig } from '../layout.models';

/**
 * Plugin Layout
 * 
 * Optimized for Browser Extension sidebar integration.
 * 
 * USED IN:
 * - Browser Extension panel
 * - Narrow sidebar views
 * 
 * FEATURES:
 * - Compact input area
 * - Status bar with content type
 * - All fields visible
 * - Floating controls for quick actions
 * - Compact spacing
 */
export const PLUGIN_LAYOUT: LayoutConfig = {
  name: 'plugin',
  i18nKey: 'LAYOUT.PLUGIN.NAME',
  i18nDescription: 'LAYOUT.PLUGIN.DESCRIPTION',
  elements: {
    // Header
    header: false,
    closeButton: false,
    
    // Input
    inputArea: true,
    extractButton: true,
    resetButton: true,
    
    // Status
    statusBar: true,
    contentTypeSelector: true,
    progressBar: true,
    
    // Fields
    coreFields: true,
    specialFields: true,
    fieldActions: true,
    groupCollapse: true,
    
    // Footer
    footer: false,
    
    // Floating Controls
    floatingControls: true,
    jsonLoader: false,
    saveButton: true,
    uploadButton: true,
    languageSwitcher: false
  },
  style: {
    borderless: true,
    compact: true,
    columns: 1,
    cssClass: 'layout-plugin'
  },
  behavior: {
    readonly: false,
    emitChanges: true,
    autoExtract: false,
    contentTypeOnly: false
  }
};

import { LayoutConfig } from '../layout.models';

/**
 * Default Layout
 * 
 * Full-featured layout for standalone usage.
 * 
 * USED IN:
 * - Local development (npm start)
 * - Vercel deployment
 * - Docker container
 * - Browser Extension panel
 * - Bookmarklet iframe
 * 
 * FEATURES:
 * - Full input area with extract/reset buttons
 * - Status bar with content type and progress
 * - All field groups visible
 * - Footer with save/submit
 * - Floating controls for quick actions
 * 
 * Each element can be individually hidden via component inputs.
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
  name: 'default',
  i18nKey: 'LAYOUT.DEFAULT.NAME',
  i18nDescription: 'LAYOUT.DEFAULT.DESCRIPTION',
  elements: {
    // Header
    header: true,
    closeButton: true,
    
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
    footer: true,
    
    // Floating Controls
    floatingControls: true,
    jsonLoader: true,
    saveButton: true,
    uploadButton: true,
    floatingResetButton: true,
    languageSwitcher: true
  },
  style: {
    borderless: false,
    compact: false,
    columns: 1,
    cssClass: 'layout-default'
  },
  behavior: {
    readonly: false,
    emitChanges: true,
    autoExtract: false,
    contentTypeOnly: false
  }
};

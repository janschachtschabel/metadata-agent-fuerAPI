import { LayoutConfig } from '../layout.models';

/**
 * Detail Layout
 * 
 * Multi-column read-only detail view.
 * 
 * USED IN:
 * - Repository detail pages
 * - Metadata preview
 * - Print/Export views
 * 
 * FEATURES:
 * - No input/editing UI
 * - Multi-column display (2-4 columns)
 * - Grouped field display
 * - Read-only
 * - No floating controls
 */
export const DETAIL_LAYOUT: LayoutConfig = {
  name: 'detail',
  i18nKey: 'LAYOUT.DETAIL.NAME',
  i18nDescription: 'LAYOUT.DETAIL.DESCRIPTION',
  elements: {
    // Header
    header: false,
    closeButton: false,
    
    // Input - disabled for detail view
    inputArea: false,
    extractButton: false,
    resetButton: false,
    
    // Status - disabled for detail view
    statusBar: false,
    contentTypeSelector: false,
    progressBar: false,
    
    // Fields
    coreFields: true,
    specialFields: true,
    fieldActions: false,
    groupCollapse: false,
    
    // Footer
    footer: false,
    
    // Floating Controls - enabled for content type selection
    floatingControls: true,
    jsonLoader: false,
    saveButton: false,
    uploadButton: false,
    floatingResetButton: true,
    languageSwitcher: true
  },
  style: {
    borderless: true,
    compact: false,
    columns: 4,
    cssClass: 'layout-detail'
  },
  behavior: {
    readonly: true,
    emitChanges: false,
    autoExtract: false,
    contentTypeOnly: false
  }
};

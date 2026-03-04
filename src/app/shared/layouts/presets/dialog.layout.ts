import { LayoutConfig } from '../layout.models';

/**
 * Dialog Layout
 * 
 * Metadata review dialog for editorial environment.
 * 
 * USED IN:
 * - Repository editorial interface
 * - Metadata validation dialogs
 * - Quick review modals
 * 
 * FEATURES:
 * - No input area (metadata already exists)
 * - No status bar
 * - Floating buttons for save/cancel
 * - Fields are editable
 * - Compact for modal usage
 */
export const DIALOG_LAYOUT: LayoutConfig = {
  name: 'dialog',
  i18nKey: 'LAYOUT.DIALOG.NAME',
  i18nDescription: 'LAYOUT.DIALOG.DESCRIPTION',
  elements: {
    // Header
    header: false,
    closeButton: false,
    
    // Input - disabled for dialog
    inputArea: false,
    extractButton: false,
    resetButton: false,
    
    // Status - disabled for dialog
    statusBar: false,
    contentTypeSelector: false,
    progressBar: false,
    
    // Fields
    coreFields: true,
    specialFields: true,
    fieldActions: true,
    groupCollapse: true,
    
    // Footer
    footer: false,
    
    // Floating Controls - for save/cancel
    floatingControls: true,
    jsonLoader: false,
    saveButton: true,
    uploadButton: false,
    floatingResetButton: true,
    languageSwitcher: true
  },
  style: {
    borderless: true,
    compact: true,
    columns: 1,
    cssClass: 'layout-dialog'
  },
  behavior: {
    readonly: false,
    emitChanges: true,
    autoExtract: false,
    contentTypeOnly: false
  }
};

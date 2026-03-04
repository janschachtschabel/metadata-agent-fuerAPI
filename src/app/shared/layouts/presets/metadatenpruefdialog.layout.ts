import { LayoutConfig } from '../layout.models';

/**
 * Clean Layout
 * 
 * Minimal, borderless layout for embedding in dialogs or external applications.
 * No input area, compact spacing, editable fields with floating controls.
 * 
 * USED IN:
 * - edu-sharing Metadatenprüfdialog
 * - Review/validation workflows
 * - Clean embedded views
 * - External control via events/buttons
 * 
 * FEATURES:
 * - No text input (controlled externally)
 * - Minimal margins for dialog embedding
 * - Floating content type selector
 * - Editable fields for corrections
 * - External control via events/buttons
 * 
 * ACTIVATION:
 * - URL: ?layout=clean
 * - Attribute: layout="clean"
 * - Alias: layout="metadatenpruefdialog"
 */
export const METADATENPRUEFDIALOG_LAYOUT: LayoutConfig = {
  name: 'clean',
  i18nKey: 'LAYOUT.CLEAN.NAME',
  i18nDescription: 'LAYOUT.CLEAN.DESCRIPTION',
  elements: {
    // Header - hidden for dialog embedding
    header: false,
    closeButton: false,
    
    // Input - disabled (data provided externally)
    inputArea: false,
    extractButton: false,
    resetButton: false,
    
    // Status - hidden by default (can be enabled via URL param)
    statusBar: false,
    contentTypeSelector: true,
    progressBar: true,
    
    // Fields - show all with actions
    coreFields: true,
    specialFields: true,
    fieldActions: true,
    groupCollapse: true,
    
    // Footer - hidden (external control)
    footer: false,
    
    // Floating Controls - minimal
    floatingControls: true,
    jsonLoader: false,
    saveButton: false,
    uploadButton: false,
    floatingResetButton: true,
    languageSwitcher: true
  },
  style: {
    borderless: true,
    compact: true,  // Less padding for dialog
    columns: 1,
    cssClass: 'layout-clean'
  },
  behavior: {
    readonly: false,  // Editable for corrections
    emitChanges: true,  // Emit changes to parent
    autoExtract: false,
    contentTypeOnly: false
  }
};

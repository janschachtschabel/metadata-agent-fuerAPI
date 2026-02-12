import { LayoutConfig } from '../layout.models';

/**
 * Metadatenprüfdialog Layout
 * 
 * Dialog layout for metadata review/validation in edu-sharing.
 * Based on viewer layout but optimized for review workflows.
 * 
 * USED IN:
 * - edu-sharing Metadatenprüfdialog
 * - Review/validation workflows
 * - External control via flying buttons
 * 
 * FEATURES:
 * - No text input (controlled externally)
 * - Minimal margins for dialog embedding
 * - Floating content type selector
 * - Editable fields for corrections
 * - External control via events/buttons
 * 
 * ACTIVATION:
 * - URL: ?layout=metadatenpruefdialog
 * - Attribute: layout="metadatenpruefdialog"
 */
export const METADATENPRUEFDIALOG_LAYOUT: LayoutConfig = {
  name: 'metadatenpruefdialog',
  i18nKey: 'LAYOUT.METADATENPRUEFDIALOG.NAME',
  i18nDescription: 'LAYOUT.METADATENPRUEFDIALOG.DESCRIPTION',
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
    languageSwitcher: true
  },
  style: {
    borderless: true,
    compact: true,  // Less padding for dialog
    columns: 1,
    cssClass: 'layout-metadatenpruefdialog'
  },
  behavior: {
    readonly: false,  // Editable for corrections
    emitChanges: true,  // Emit changes to parent
    autoExtract: false,
    contentTypeOnly: false
  }
};

import { LayoutConfig } from '../layout.models';

/**
 * Prüftisch Layout
 * 
 * Review table layout for metadata inspection in edu-sharing.
 * Clean, card-based display optimized for reviewing metadata.
 * 
 * USED IN:
 * - edu-sharing Prüftisch (Review Table)
 * - Metadata inspection workflows
 * - Quality assurance processes
 * 
 * FEATURES:
 * - No text input (data loaded externally)
 * - No status bar (clean view)
 * - Card-based field groups with icons
 * - Floating controls at bottom only
 * - Clean, minimal styling
 * 
 * ACTIVATION:
 * - URL: ?layout=prueftisch
 * - Attribute: layout="prueftisch"
 */
export const PRUEFTISCH_LAYOUT: LayoutConfig = {
  name: 'prueftisch',
  i18nKey: 'LAYOUT.PRUEFTISCH.NAME',
  i18nDescription: 'LAYOUT.PRUEFTISCH.DESCRIPTION',
  elements: {
    // Header - hidden for embedding
    header: false,
    closeButton: false,
    
    // Input - disabled (data provided externally)
    inputArea: false,
    extractButton: false,
    resetButton: false,
    
    // Status - hidden for clean view
    statusBar: false,
    contentTypeSelector: true,
    progressBar: false,
    
    // Fields - show all with actions
    coreFields: true,
    specialFields: true,
    fieldActions: true,
    groupCollapse: true,
    
    // Footer - hidden
    footer: false,
    
    // Floating Controls - only content type and language
    floatingControls: true,
    jsonLoader: false,
    saveButton: false,
    uploadButton: false,
    floatingResetButton: true,
    languageSwitcher: true
  },
  style: {
    borderless: true,
    compact: false,  // Normal padding for readability
    columns: 1,
    cssClass: 'layout-prueftisch'
  },
  behavior: {
    readonly: false,  // Editable for corrections
    emitChanges: true,
    autoExtract: false,
    contentTypeOnly: false
  }
};

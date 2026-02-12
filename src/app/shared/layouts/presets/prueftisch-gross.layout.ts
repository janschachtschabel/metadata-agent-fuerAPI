import { LayoutConfig } from '../layout.models';

/**
 * Prüftisch Groß Layout
 * 
 * Large review table layout with 2-column field display.
 * Based on prueftisch but wider, matching the edu-sharing
 * "Prüftisch groß" design with card-based groups.
 * 
 * USED IN:
 * - edu-sharing Prüftisch groß (Large Review Table)
 * - Full-width metadata editing workflows
 * 
 * FEATURES:
 * - 2-column field layout
 * - No text input (data loaded externally)
 * - No status bar (clean view)
 * - Card-based field groups with icons
 * - Floating controls at bottom
 * - Clean, spacious styling
 * 
 * ACTIVATION:
 * - URL: ?layout=prueftisch-gross
 * - Attribute: layout="prueftisch-gross"
 */
export const PRUEFTISCH_GROSS_LAYOUT: LayoutConfig = {
  name: 'prueftisch-gross',
  i18nKey: 'LAYOUT.PRUEFTISCH_GROSS.NAME',
  i18nDescription: 'LAYOUT.PRUEFTISCH_GROSS.DESCRIPTION',
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
    
    // Floating Controls
    floatingControls: true,
    jsonLoader: false,
    saveButton: false,
    uploadButton: false,
    languageSwitcher: true
  },
  style: {
    borderless: true,
    compact: false,
    columns: 2,
    cssClass: 'layout-prueftisch-gross'
  },
  behavior: {
    readonly: false,
    emitChanges: true,
    autoExtract: false,
    contentTypeOnly: false
  }
};

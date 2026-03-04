import { LayoutConfig } from '../layout.models';

/**
 * Prüftisch Org Layout
 * 
 * edu-sharing organizational review table layout.
 * Light gray group headers with bottom border, borderless fields,
 * row-wise field arrangement with detail-view-like typography.
 * 
 * USED IN:
 * - edu-sharing organizational metadata review
 * - Quality assurance processes
 * 
 * FEATURES:
 * - Gray group headers with icon and uppercase label
 * - Borderless fields, clean typography
 * - Row-wise (single column) field arrangement
 * - Bold comma-separated multi-value display
 * - Default readonly
 * 
 * ACTIVATION:
 * - URL: ?layout=prueftisch-org
 * - Attribute: layout="prueftisch-org"
 */
export const PRUEFTISCH_ORG_LAYOUT: LayoutConfig = {
  name: 'prueftisch-org',
  i18nKey: 'LAYOUT.PRUEFTISCH_ORG.NAME',
  i18nDescription: 'LAYOUT.PRUEFTISCH_ORG.DESCRIPTION',
  elements: {
    header: false,
    closeButton: false,
    
    inputArea: false,
    extractButton: false,
    resetButton: false,
    
    statusBar: false,
    contentTypeSelector: true,
    progressBar: false,
    
    coreFields: true,
    specialFields: true,
    fieldActions: false,
    groupCollapse: false,
    
    footer: false,
    
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
    columns: 1,
    cssClass: 'layout-prueftisch-org'
  },
  behavior: {
    readonly: true,
    emitChanges: false,
    autoExtract: false,
    contentTypeOnly: false
  }
};

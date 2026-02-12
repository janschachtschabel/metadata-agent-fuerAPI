/**
 * Layout Components Index
 * 
 * Each layout is a fully independent component with its own template and styles.
 * readonly mode can be combined with any layout via [readonly]="true".
 * 
 * - DefaultLayoutComponent: Full editing mode (standalone, bookmarklet)
 * - PluginLayoutComponent: Compact sidebar (browser extension)
 * - DialogLayoutComponent: Review dialog (modals, editorial)
 * - DetailLayoutComponent: Multi-column read-only preview
 * - MetadatenpruefdialogLayoutComponent: Metadata review dialog
 * - PrueftischLayoutComponent: Review table (prueftisch + prueftisch-gross)
 */

export { DefaultLayoutComponent } from './default-layout/default-layout.component';
export { PluginLayoutComponent } from './plugin-layout/plugin-layout.component';
export { DialogLayoutComponent } from './dialog-layout/dialog-layout.component';
export { DetailLayoutComponent } from './detail-layout/detail-layout.component';
export { MetadatenpruefdialogLayoutComponent } from './metadatenpruefdialog-layout/metadatenpruefdialog-layout.component';
export { PrueftischLayoutComponent } from './prueftisch-layout/prueftisch-layout.component';

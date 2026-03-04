/**
 * Layout System - Central Export
 * 
 * Two main layouts with individually toggleable elements.
 * 
 * ## Usage
 * 
 * ### Via layout attribute:
 * ```html
 * <app-canvas layout="default"></app-canvas>
 * <app-canvas layout="default" [readonly]="true"></app-canvas>
 * ```
 * 
 * ### Via readonly:
 * ```html
 * <app-canvas layout="default" [readonly]="true"></app-canvas>
 * ```
 * 
 * ### Individual element control (works in any layout):
 * ```html
 * <app-canvas 
 *   layout="default"
 *   [showInputArea]="true"
 *   [showStatusBar]="true"
 *   [showCoreFields]="true"
 *   [showSpecialFields]="true"
 *   [showFooter]="true"
 *   [showFloatingControls]="true"
 *   [showFieldActions]="true">
 * </app-canvas>
 * ```
 * 
 * ## Layouts
 * 
 * | Layout | Use Case |
 * |--------|----------|
 * | `default` | Local, Standalone, Bookmarklet, Extension, Vercel |
 * | `readonly` | Use [readonly]="true" attribute on any layout |
 */

// Models
export * from './layout.models';

// Presets
export { DEFAULT_LAYOUT } from './presets/default.layout';
export { PLUGIN_LAYOUT } from './presets/plugin.layout';
export { DIALOG_LAYOUT } from './presets/dialog.layout';
export { DETAIL_LAYOUT } from './presets/detail.layout';
export { METADATENPRUEFDIALOG_LAYOUT } from './presets/metadatenpruefdialog.layout';
export { PRUEFTISCH_LAYOUT } from './presets/prueftisch.layout';
export { PRUEFTISCH_ORG_LAYOUT } from './presets/prueftisch-org.layout';

// All layouts as object
import { DEFAULT_LAYOUT } from './presets/default.layout';
import { PLUGIN_LAYOUT } from './presets/plugin.layout';
import { DIALOG_LAYOUT } from './presets/dialog.layout';
import { DETAIL_LAYOUT } from './presets/detail.layout';
import { METADATENPRUEFDIALOG_LAYOUT } from './presets/metadatenpruefdialog.layout';
import { PRUEFTISCH_LAYOUT } from './presets/prueftisch.layout';
import { PRUEFTISCH_ORG_LAYOUT } from './presets/prueftisch-org.layout';
import { LayoutConfig, LayoutPreset, MODE_LAYOUT_MAP } from './layout.models';

export const LAYOUT_PRESETS: Record<LayoutPreset, LayoutConfig> = {
  default: DEFAULT_LAYOUT,
  plugin: PLUGIN_LAYOUT,
  dialog: DIALOG_LAYOUT,
  detail: DETAIL_LAYOUT,
  clean: METADATENPRUEFDIALOG_LAYOUT,
  prueftisch: PRUEFTISCH_LAYOUT,
  'prueftisch-org': PRUEFTISCH_ORG_LAYOUT
};

/**
 * Get layout by name (supports mode aliases)
 */
export function getLayout(name: string): LayoutConfig {
  const mappedName = MODE_LAYOUT_MAP[name.toLowerCase()];
  if (mappedName) {
    return LAYOUT_PRESETS[mappedName];
  }
  return LAYOUT_PRESETS[name as LayoutPreset] || DEFAULT_LAYOUT;
}

/**
 * Get layout for viewer mode (backward compat - returns default, use readonly attribute instead)
 */
export function getLayoutForMode(viewerMode: boolean): LayoutConfig {
  return DEFAULT_LAYOUT;
}

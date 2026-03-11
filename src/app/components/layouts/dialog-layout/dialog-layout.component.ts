import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CanvasState, ContentType, CanvasFieldState, FieldGroup, FieldStatus } from '../../../shared/models/canvas.models';
import { FieldComponent } from '../../field/field.component';
import { InputAreaComponent } from '../../shared/input-area/input-area.component';
import { StatusBarComponent } from '../../shared/status-bar/status-bar.component';
import { LanguageSwitcherComponent } from '../../language-switcher/language-switcher.component';
import { PreviewThumbnailComponent } from '../../shared/preview-thumbnail/preview-thumbnail.component';

/**
 * Dialog Layout Component
 * 
 * Compact dialog for metadata review and editing.
 * No input area - data is provided externally.
 * 
 * Activation:
 * - URL: ?layout=dialog
 * - Attribute: layout="dialog"
 */
@Component({
  selector: 'app-dialog-layout',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    FieldComponent,
    InputAreaComponent,
    StatusBarComponent,
    LanguageSwitcherComponent,
    PreviewThumbnailComponent
  ],
  templateUrl: './dialog-layout.component.html',
  styleUrls: ['./dialog-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogLayoutComponent implements OnChanges {
  @Input() state: CanvasState | null = null;
  @Input() contentTypes: ContentType[] = [];
  @Input() backgroundColor = '';
  @Input() columns: 1 | 2 | 3 | 4 = 1;

  @Input() userText = '';
  @Input() sourceUrl = '';
  @Input() nodeId = '';
  @Input() inputMode: 'text' | 'url' | 'nodeId' = 'text';

  @Input() showInputArea = false;
  @Input() showStatusBar = false;
  @Input() showCoreFields = true;
  @Input() showSpecialFields = true;
  @Input() showFieldActions = true;
  @Input() showFloatingControls = true;
  @Input() showContentTypeOnly = false;
  @Input() showUploadButton = false;
  @Input() showSaveButton = true;
  @Input() showLanguageSwitcher = true;
  @Input() showContentType = true;
  @Input() showResetButton = true;
  @Input() readonly = false;
  @Input() highlightAi = true;
  @Input() flatGroups = false;
  @Input() showPreview = true;
  @Input() screenshotEnabled = true;

  // Cached computed values (recomputed in ngOnChanges, not every CD cycle)
  _displayGroups: FieldGroup[] = [];
  _visibleFieldsMap = new Map<string, CanvasFieldState[]>();
  _filledCountMap = new Map<string, number>();
  _flatCountMap = new Map<string, number>();

  private mergeGroupsBySchema(groups: FieldGroup[]): FieldGroup[] {
    if (groups.length === 0) return [];
    const allFields: CanvasFieldState[] = [];
    let schemaLabel = '';
    let schemaIcon = '';
    for (const group of groups) {
      if (group.isCore && !this.showCoreFields) continue;
      if (!group.isCore && !this.showSpecialFields) continue;
      allFields.push(...group.fields);
      if (!group.isCore && !schemaLabel) {
        schemaLabel = group.schemaName;
        schemaIcon = group.icon || '';
      }
    }
    if (allFields.length === 0) return [];
    return [{
      id: 'flat-all',
      label: this.state?.contentTypeLabel || schemaLabel || 'Felder',
      icon: schemaIcon,
      schemaName: schemaLabel || 'Core',
      fields: allFields,
      isCore: false
    }];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state'] || changes['flatGroups'] || changes['showCoreFields'] || changes['showSpecialFields'] || changes['readonly']) {
      this._displayGroups = this.computeDisplayGroups();
      this.precomputeGroupData();
    }
  }

  private computeDisplayGroups(): FieldGroup[] {
    if (!this.state?.fieldGroups) return [];
    if (!this.flatGroups) return this.state.fieldGroups;
    return this.mergeGroupsBySchema(this.state.fieldGroups);
  }

  private precomputeGroupData(): void {
    this._visibleFieldsMap.clear();
    this._filledCountMap.clear();
    this._flatCountMap.clear();
    for (const group of this._displayGroups) {
      const visible = this.getVisibleFields(group.fields);
      this._visibleFieldsMap.set(group.id, visible);
      const flat = this.getFlattenedFields(group.fields);
      this._filledCountMap.set(group.id, flat.filter(f => f.status === FieldStatus.FILLED).length);
      this._flatCountMap.set(group.id, flat.length);
    }
  }

  @Output() userTextChange = new EventEmitter<string>();
  @Output() sourceUrlChange = new EventEmitter<string>();
  @Output() nodeIdChange = new EventEmitter<string>();
  @Output() startExtraction = new EventEmitter<void>();
  @Output() startUrlExtraction = new EventEmitter<string>();
  @Output() startNodeIdExtraction = new EventEmitter<string>();
  @Output() inputModeChange = new EventEmitter<'text' | 'url' | 'nodeId'>();
  @Output() selectContentType = new EventEmitter<ContentType>();
  @Output() fieldValueChange = new EventEmitter<{ fieldId: string; value: any }>();
  @Output() submit = new EventEmitter<void>();
  @Output() upload = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() screenshotToggle = new EventEmitter<boolean>();

  trackByFieldId(index: number, field: CanvasFieldState): string {
    return field.fieldId;
  }

  trackByGroupId(index: number, group: FieldGroup): string {
    return group.id;
  }

  getFilledCount(group: FieldGroup): number {
    const flatFields = this.getFlattenedFields(group.fields);
    return flatFields.filter(f => f.status === FieldStatus.FILLED).length;
  }

  getFlattenedFields(fields: CanvasFieldState[]): CanvasFieldState[] {
    const flattened: CanvasFieldState[] = [];
    for (const field of fields) {
      if (field.isParent && field.subFields && field.subFields.length > 0) {
        flattened.push(...field.subFields);
      } else if (!field.isParent) {
        flattened.push(field);
      }
    }
    return flattened;
  }

  getVisibleFields(fields: CanvasFieldState[]): CanvasFieldState[] {
    const flat = this.getFlattenedFields(fields);
    if (!this.readonly) return flat;
    return flat.filter(f => {
      if (f.value === null || f.value === undefined || f.value === '') return false;
      if (Array.isArray(f.value) && f.value.length === 0) return false;
      return true;
    });
  }

  getGroupIcon(group: FieldGroup): string {
    const iconMap: Record<string, string> = {
      'beschreibung': 'description',
      'description': 'description',
      'paedagogisches': 'school',
      'pedagogical': 'school',
      'zielgruppe': 'groups',
      'target_audience': 'groups',
      'technisches': 'settings',
      'technical': 'settings',
      'rechtliches': 'gavel',
      'legal': 'gavel',
      'klassifikation': 'category',
      'classification': 'category',
      'core': 'star',
      'special': 'extension'
    };
    return iconMap[group.id.toLowerCase()] || 'folder';
  }
}

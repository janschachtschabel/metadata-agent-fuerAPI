import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { CanvasState, ContentType, CanvasFieldState, FieldGroup, FieldStatus } from '../../../shared/models/canvas.models';
import { FieldComponent } from '../../field/field.component';
import { JsonLoaderComponent } from '../../json-loader/json-loader.component';
import { LanguageSwitcherComponent } from '../../language-switcher/language-switcher.component';
import { PreviewThumbnailComponent } from '../../shared/preview-thumbnail/preview-thumbnail.component';

/**
 * Default Layout Component
 * 
 * Full-featured editing layout for:
 * - Local/Standalone mode
 * - Browser Extension
 * - Bookmarklet
 * - Vercel deployment
 * 
 * Features all UI elements: Input, StatusBar, Fields, Footer, FloatingControls
 */
@Component({
  selector: 'app-default-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule,
    FieldComponent,
    JsonLoaderComponent,
    LanguageSwitcherComponent,
    PreviewThumbnailComponent
  ],
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DefaultLayoutComponent {
  // Data from parent
  @Input() state: CanvasState | null = null;
  @Input() contentTypes: ContentType[] = [];
  @Input() userText = '';
  @Input() sourceUrl = '';
  @Input() nodeId = '';
  @Input() backgroundColor = '';
  
  // Input mode: 'text' | 'url' | 'nodeId'
  @Input() inputMode: 'text' | 'url' | 'nodeId' = 'text';
  
  // Multi-column support
  @Input() columns: 1 | 2 | 3 | 4 = 1;
  
  // Element visibility (can override defaults)
  @Input() showInputArea = true;
  @Input() showStatusBar = true;
  @Input() showCoreFields = true;
  @Input() showSpecialFields = true;
  @Input() showFooter = true;
  @Input() showFloatingControls = true;
  @Input() showFieldActions = true;
  @Input() showContentTypeOnly = false;
  @Input() showUploadButton = false;
  @Input() showSaveButton = true;
  @Input() showJsonLoader = true;
  @Input() showLanguageSwitcher = true;
  @Input() showContentType = true;
  @Input() showResetButton = true;
  @Input() readonly = false;
  @Input() highlightAi = true;
  @Input() flatGroups = false;
  @Input() showPreview = true;
  @Input() screenshotEnabled = true;
  
  get displayGroups(): FieldGroup[] {
    if (!this.state?.fieldGroups) return [];
    if (!this.flatGroups) return this.state.fieldGroups;
    return this.mergeGroupsBySchema(this.state.fieldGroups);
  }
  
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
  
  // Events
  @Output() userTextChange = new EventEmitter<string>();
  @Output() sourceUrlChange = new EventEmitter<string>();
  @Output() nodeIdChange = new EventEmitter<string>();
  @Output() startExtraction = new EventEmitter<void>();
  @Output() startUrlExtraction = new EventEmitter<string>();
  @Output() startNodeIdExtraction = new EventEmitter<string>();
  @Output() inputModeChange = new EventEmitter<'text' | 'url' | 'nodeId'>();
  @Output() reset = new EventEmitter<void>();
  @Output() selectContentType = new EventEmitter<ContentType>();
  @Output() fieldValueChange = new EventEmitter<{fieldId: string, value: unknown}>();
  @Output() jsonLoaded = new EventEmitter<Record<string, unknown>>();
  @Output() downloadJson = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() upload = new EventEmitter<void>();
  @Output() dismissError = new EventEmitter<void>();
  @Output() screenshotToggle = new EventEmitter<boolean>();
  
  // Track functions
  trackByFieldId(index: number, field: CanvasFieldState): string {
    return field.fieldId;
  }
  
  trackByGroupId(index: number, group: FieldGroup): string {
    return group.id;
  }
  
  // Helpers
  getProgressPercent(): number {
    if (!this.state || this.state.totalFields === 0) return 0;
    return Math.round((this.state.filledFields / this.state.totalFields) * 100);
  }
  
  getRequiredFieldsStatus(): { filled: number; total: number } {
    if (!this.state?.fieldGroups) return { filled: 0, total: 0 };
    
    let filled = 0;
    let total = 0;
    
    for (const group of this.state.fieldGroups) {
      const flatFields = this.getFlattenedFields(group.fields);
      for (const field of flatFields) {
        if (field.isRequired) {
          total++;
          if (field.status === FieldStatus.FILLED) {
            filled++;
          }
        }
      }
    }
    
    return { filled, total };
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
  
  onEnterKey(event: Event): void {
    event.preventDefault();
  }
  
  onDismissError(): void {
    this.dismissError.emit();
  }
  
  onFieldChange(fieldId: string, value: unknown): void {
    this.fieldValueChange.emit({ fieldId, value });
  }
}

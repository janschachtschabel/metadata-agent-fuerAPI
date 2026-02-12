import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

import { CanvasState, ContentType, CanvasFieldState, FieldGroup, FieldStatus } from '../../../shared/models/canvas.models';
import { FieldComponent } from '../../field/field.component';
import { LanguageSwitcherComponent } from '../../language-switcher/language-switcher.component';
import { InputAreaComponent } from '../../shared/input-area/input-area.component';
import { StatusBarComponent } from '../../shared/status-bar/status-bar.component';

/**
 * Metadatenprüfdialog Layout Component
 * 
 * Dialog layout for metadata review/validation in edu-sharing.
 * No text input area - controlled externally via events.
 * Compact design with minimal margins for dialog embedding.
 * 
 * Used in:
 * - edu-sharing Metadatenprüfdialog
 * - Review/validation workflows
 * - External control via flying buttons
 * 
 * Activation:
 * - URL: ?layout=metadatenpruefdialog
 * - Attribute: layout="metadatenpruefdialog"
 */
@Component({
  selector: 'app-metadatenpruefdialog-layout',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    FieldComponent,
    LanguageSwitcherComponent,
    InputAreaComponent,
    StatusBarComponent
  ],
  templateUrl: './metadatenpruefdialog-layout.component.html',
  styleUrls: ['./metadatenpruefdialog-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetadatenpruefdialogLayoutComponent {
  // Data from parent
  @Input() state: CanvasState | null = null;
  @Input() contentTypes: ContentType[] = [];
  @Input() backgroundColor = '';
  @Input() columns: 1 | 2 | 3 | 4 = 2;

  @Input() userText = '';
  @Input() sourceUrl = '';
  @Input() nodeId = '';
  @Input() inputMode: 'text' | 'url' | 'nodeId' = 'text';
  
  // Element visibility
  @Input() showInputArea = false;
  @Input() showStatusBar = true;
  @Input() showCoreFields = true;
  @Input() showSpecialFields = true;
  @Input() showFieldActions = true;
  @Input() showFloatingControls = true;
  @Input() showContentTypeOnly = false;
  @Input() readonly = false;  // Editable by default
  @Input() highlightAi = true;
  
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
  @Output() fieldValueChange = new EventEmitter<{ fieldId: string; value: any }>();
  
  // Track functions
  trackByFieldId(index: number, field: CanvasFieldState): string {
    return field.fieldId;
  }
  
  trackByGroupId(index: number, group: FieldGroup): string {
    return group.id;
  }
  
  // Helpers
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
  
}

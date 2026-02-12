import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy 
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
    StatusBarComponent
  ],
  templateUrl: './dialog-layout.component.html',
  styleUrls: ['./dialog-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogLayoutComponent {
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
  @Input() readonly = false;
  @Input() highlightAi = true;

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

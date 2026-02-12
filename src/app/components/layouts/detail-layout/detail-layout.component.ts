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
import { InputAreaComponent } from '../../shared/input-area/input-area.component';
import { StatusBarComponent } from '../../shared/status-bar/status-bar.component';

/**
 * Detail Layout Component
 * 
 * Multi-column detail/preview view for metadata display.
 * Optimized for read-only preview, print, and export.
 * No floating controls, no input area.
 * 
 * Activation:
 * - URL: ?layout=detail
 * - Attribute: layout="detail"
 */
@Component({
  selector: 'app-detail-layout',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    FieldComponent,
    InputAreaComponent,
    StatusBarComponent
  ],
  templateUrl: './detail-layout.component.html',
  styleUrls: ['./detail-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailLayoutComponent {
  @Input() state: CanvasState | null = null;
  @Input() contentTypes: ContentType[] = [];
  @Input() backgroundColor = '';
  @Input() columns: 1 | 2 | 3 | 4 = 4;

  @Input() userText = '';
  @Input() sourceUrl = '';
  @Input() nodeId = '';
  @Input() inputMode: 'text' | 'url' | 'nodeId' = 'text';

  @Input() showInputArea = false;
  @Input() showStatusBar = false;
  @Input() showCoreFields = true;
  @Input() showSpecialFields = true;
  @Input() showFieldActions = false;
  @Input() showFloatingControls = true;
  @Input() showContentTypeOnly = false;
  @Input() readonly = true;
  @Input() highlightAi = true;

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

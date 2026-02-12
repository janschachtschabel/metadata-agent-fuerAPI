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
 * Prüftisch Layout Component
 * 
 * Review table layout for metadata inspection in edu-sharing.
 * Clean, card-based display with icons in group headers.
 * No input area, no status bar - just fields and floating controls.
 * 
 * Used in:
 * - edu-sharing Prüftisch (Review Table)
 * - Metadata inspection workflows
 * - Quality assurance processes
 * 
 * Activation:
 * - URL: ?layout=prueftisch
 * - Attribute: layout="prueftisch"
 */
@Component({
  selector: 'app-prueftisch-layout',
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
  templateUrl: './prueftisch-layout.component.html',
  styleUrls: ['./prueftisch-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrueftischLayoutComponent {
  // Data from parent
  @Input() state: CanvasState | null = null;
  @Input() contentTypes: ContentType[] = [];
  @Input() backgroundColor = '';
  @Input() columns: 1 | 2 | 3 | 4 = 2;
  @Input() layoutVariant: 'prueftisch' | 'prueftisch-gross' = 'prueftisch';

  @Input() userText = '';
  @Input() sourceUrl = '';
  @Input() nodeId = '';
  @Input() inputMode: 'text' | 'url' | 'nodeId' = 'text';
  
  // Element visibility
  @Input() showInputArea = false;
  @Input() showStatusBar = false;
  @Input() showCoreFields = true;
  @Input() showSpecialFields = true;
  @Input() showFieldActions = true;
  @Input() showFloatingControls = true;
  @Input() showContentTypeOnly = false;
  @Input() readonly = false;
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
  
  getGroupIcon(group: FieldGroup): string {
    // Map group IDs to Material icons
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
    
    const groupId = group.id.toLowerCase();
    return iconMap[groupId] || 'folder';
  }
}

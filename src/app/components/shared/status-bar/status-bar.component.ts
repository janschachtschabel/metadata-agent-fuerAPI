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
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CanvasState, ContentType, CanvasFieldState, FieldGroup, FieldStatus } from '../../../shared/models/canvas.models';

/**
 * Shared Status Bar Component
 * 
 * Reusable status bar with content type selector, field stats, and progress bar.
 * Can be dropped into any layout.
 */
@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule
  ],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBarComponent implements OnChanges {
  @Input() state: CanvasState | null = null;
  @Input() contentTypes: ContentType[] = [];
  @Input() compact = false;

  @Output() selectContentType = new EventEmitter<ContentType>();

  // Cached computed values (recomputed in ngOnChanges, not every CD cycle)
  _progressPercent = 0;
  _requiredStatus = { filled: 0, total: 0 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state']) {
      this._progressPercent = this.computeProgressPercent();
      this._requiredStatus = this.computeRequiredFieldsStatus();
    }
  }

  private computeProgressPercent(): number {
    if (!this.state || this.state.totalFields === 0) return 0;
    return Math.round((this.state.filledFields / this.state.totalFields) * 100);
  }

  private computeRequiredFieldsStatus(): { filled: number; total: number } {
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

  private getFlattenedFields(fields: CanvasFieldState[]): CanvasFieldState[] {
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

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
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Shared Input Area Component
 * 
 * Reusable text/URL/nodeId input with extraction buttons.
 * Can be dropped into any layout that needs input capability.
 */
@Component({
  selector: 'app-input-area',
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
    MatTooltipModule
  ],
  templateUrl: './input-area.component.html',
  styleUrls: ['./input-area.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputAreaComponent {
  @Input() userText = '';
  @Input() sourceUrl = '';
  @Input() nodeId = '';
  @Input() inputMode: 'text' | 'url' | 'nodeId' = 'text';
  @Input() isExtracting = false;
  @Input() compact = false;
  @Input() showModeSwitcher = true;
  @Input() showPageMode = false;

  @Output() inputModeChange = new EventEmitter<'text' | 'url' | 'nodeId'>();
  @Output() userTextChange = new EventEmitter<string>();
  @Output() sourceUrlChange = new EventEmitter<string>();
  @Output() nodeIdChange = new EventEmitter<string>();
  @Output() startExtraction = new EventEmitter<void>();
  @Output() startUrlExtraction = new EventEmitter<string>();
  @Output() startNodeIdExtraction = new EventEmitter<string>();
  @Output() reset = new EventEmitter<void>();
  @Output() reloadFromPage = new EventEmitter<void>();

  onEnterKey(event: Event): void {
    event.preventDefault();
  }
}

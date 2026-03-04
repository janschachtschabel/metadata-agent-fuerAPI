import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-preview-thumbnail',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './preview-thumbnail.component.html',
  styleUrls: ['./preview-thumbnail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreviewThumbnailComponent {
  @Input() imageUrl: string | undefined;
  @Input() compact = false;

  isExpanded = false;

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }
}

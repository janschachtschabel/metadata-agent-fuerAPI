import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ContentType } from '../../shared/models/canvas.models';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <div class="floating-controls" [class.content-type-only]="mode === 'content-type-only'">
      <!-- Content Type Button -->
      <div class="content-type-split">
        <button 
          mat-button
          class="content-type-main"
          [disabled]="isExtracting">
          <mat-icon>{{ currentIcon }}</mat-icon>
          <span>{{ currentContentType || ('CONTENT_TYPE.NOT_DETECTED' | translate) }}</span>
        </button>
        
        <button 
          mat-icon-button
          [matMenuTriggerFor]="contentTypeMenu"
          [disabled]="isExtracting"
          class="content-type-dropdown">
          <mat-icon>expand_more</mat-icon>
        </button>
      </div>
      
      <mat-menu #contentTypeMenu="matMenu">
        <button 
          mat-menu-item 
          *ngFor="let ct of contentTypes"
          (click)="contentTypeSelected.emit(ct)"
          [class.active]="currentContentType === ct.label">
          <mat-icon>{{ ct.icon }}</mat-icon>
          <span>{{ ct.label }}</span>
        </button>
      </mat-menu>
      
      <!-- Action Buttons (hidden in content-type-only mode) -->
      <ng-container *ngIf="mode === 'full'">
        <button 
          mat-icon-button
          [matTooltip]="'CONTROLS.SAVE' | translate"
          (click)="submit.emit()">
          <mat-icon>save</mat-icon>
        </button>
        
        <button 
          mat-icon-button
          [matTooltip]="'CONTROLS.RESET' | translate"
          (click)="reset.emit()">
          <mat-icon>refresh</mat-icon>
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    .floating-controls {
      position: sticky;
      bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #e8eaf6;
      border-radius: 28px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      width: fit-content;
      margin: 0 auto;
      z-index: 100;
    }
    
    .content-type-split {
      display: flex;
      align-items: center;
      background: white;
      border-radius: 24px;
      overflow: hidden;
    }
    
    .content-type-main {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: none;
      background: transparent;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }
    
    .content-type-dropdown {
      border-left: 1px solid #e0e0e0;
    }
    
    .active {
      background: #e3f2fd;
      font-weight: 500;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlsComponent {
  @Input() contentTypes: ContentType[] = [];
  @Input() currentContentType = '';
  @Input() currentIcon = 'category';
  @Input() mode: 'full' | 'content-type-only' | 'none' = 'full';
  @Input() isExtracting = false;
  
  @Output() contentTypeSelected = new EventEmitter<ContentType>();
  @Output() submit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
}

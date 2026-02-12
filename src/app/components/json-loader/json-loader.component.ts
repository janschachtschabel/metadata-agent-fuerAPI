import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-json-loader',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslateModule],
  template: `
    <input 
      type="file" 
      #fileInput 
      accept=".json"
      style="display: none"
      (change)="onFileSelected($event)">
    
    <button 
      mat-icon-button
      class="control-button"
      (click)="fileInput.click()"
      [matTooltip]="'CONTROLS.LOAD_JSON' | translate">
      <mat-icon>folder_open</mat-icon>
    </button>
  `,
  styles: [`
    .control-button {
      color: inherit;
    }
  `]
})
export class JsonLoaderComponent {
  @Output() jsonLoaded = new EventEmitter<any>();
  @Output() loadError = new EventEmitter<string>();

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      this.jsonLoaded.emit(json);
    } catch (error) {
      console.error('JSON parse error:', error);
      this.loadError.emit('Ungültige JSON-Datei');
    }
    
    // Reset input for re-selection of same file
    input.value = '';
  }
}

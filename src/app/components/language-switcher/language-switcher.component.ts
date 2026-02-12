import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button 
      mat-button
      class="lang-button"
      (click)="toggleLanguage()"
      [matTooltip]="currentLang === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'">
      <mat-icon class="lang-icon">language</mat-icon>
      <span class="lang-label">{{ currentLang === 'de' ? 'DE' : 'EN' }}</span>
    </button>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
    }
    .lang-button {
      display: flex !important;
      align-items: center;
      gap: 4px;
      min-width: auto !important;
      padding: 0 12px !important;
      height: 36px !important;
      line-height: 36px !important;
      background: #e2e8f6 !important;
      border-radius: 20px !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15);
    }
    .lang-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #1f2a3d;
    }
    .lang-label {
      font-size: 13px;
      font-weight: 500;
      color: #1f2a3d;
    }
  `]
})
export class LanguageSwitcherComponent {
  get currentLang(): string {
    return this.i18n.currentLang;
  }

  constructor(private i18n: I18nService) {}

  toggleLanguage(): void {
    const newLang = this.currentLang === 'de' ? 'en' : 'de';
    this.i18n.setLanguage(newLang);
  }
}

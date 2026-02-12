import { Injectable } from '@angular/core';

/**
 * Local Validation Service
 * Provides basic validation and normalization for manual user inputs.
 * For complex AI-based validation, use the API service.
 */
@Injectable({ providedIn: 'root' })
export class LocalValidationService {

  /**
   * Normalize a value based on its datatype
   */
  normalizeValue(value: any, datatype: string, multiple: boolean = false): any {
    if (value === null || value === undefined || value === '') {
      return multiple ? [] : null;
    }

    switch (datatype) {
      case 'string':
        return this.normalizeString(value, multiple);
      case 'boolean':
        return this.normalizeBoolean(value);
      case 'number':
      case 'integer':
        return this.normalizeNumber(value, multiple);
      case 'date':
        return this.normalizeDate(value);
      case 'url':
        return this.normalizeUrl(value, multiple);
      case 'array':
        return this.normalizeArray(value);
      default:
        return value;
    }
  }

  private normalizeString(value: any, multiple: boolean): string | string[] {
    if (multiple) {
      if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(v => v.length > 0);
      }
      // Split comma-separated values
      return String(value)
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    }
    return String(value).trim();
  }

  private normalizeBoolean(value: any): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (['true', 'yes', 'ja', '1'].includes(lower)) return true;
      if (['false', 'no', 'nein', '0'].includes(lower)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return null;
  }

  private normalizeNumber(value: any, multiple: boolean): number | number[] | null {
    if (multiple) {
      if (Array.isArray(value)) {
        return value.map(v => this.parseNumber(v)).filter(v => v !== null) as number[];
      }
      return [];
    }
    return this.parseNumber(value);
  }

  private parseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value).replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeDate(value: any): string | null {
    if (!value) return null;
    
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
      return String(value).split('T')[0];
    }
    
    // German format DD.MM.YYYY
    const germanMatch = String(value).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try parsing as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  }

  private normalizeUrl(value: any, multiple: boolean): string | string[] | null {
    if (multiple) {
      if (Array.isArray(value)) {
        return value.map(v => this.normalizeUrlValue(v)).filter(v => v !== null) as string[];
      }
      return [];
    }
    return this.normalizeUrlValue(value);
  }

  private normalizeUrlValue(value: any): string | null {
    if (!value) return null;
    let url = String(value).trim();
    
    // Add protocol if missing
    if (url && !url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }
    
    // Validate URL
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }

  private normalizeArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    }
    return [value];
  }

  /**
   * Validate a value against field constraints
   */
  validateValue(value: any, field: {
    datatype: string;
    required: boolean;
    multiple: boolean;
    vocabulary?: { type: string; concepts: any[] };
    validation?: any;
  }): { valid: boolean; error?: string } {
    // Required check
    if (field.required) {
      if (value === null || value === undefined) {
        return { valid: false, error: 'Pflichtfeld' };
      }
      if (Array.isArray(value) && value.length === 0) {
        return { valid: false, error: 'Pflichtfeld - mindestens ein Wert erforderlich' };
      }
      if (typeof value === 'string' && value.trim() === '') {
        return { valid: false, error: 'Pflichtfeld' };
      }
    }

    // Skip validation for empty optional fields
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }

    // Vocabulary check for closed vocabularies
    if (field.vocabulary?.type === 'closed' && field.vocabulary?.concepts) {
      const allowedLabels = field.vocabulary.concepts.map((c: any) => c.label);
      const values = Array.isArray(value) ? value : [value];
      
      for (const v of values) {
        if (!allowedLabels.includes(v)) {
          return { valid: false, error: `Wert "${v}" nicht im Vokabular erlaubt` };
        }
      }
    }

    // Type-specific validation
    switch (field.datatype) {
      case 'url':
        const urls = Array.isArray(value) ? value : [value];
        for (const url of urls) {
          try {
            new URL(url);
          } catch {
            return { valid: false, error: `Ungültige URL: ${url}` };
          }
        }
        break;
        
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
          return { valid: false, error: 'Ungültiges Datumsformat (erwartet: YYYY-MM-DD)' };
        }
        break;
        
      case 'number':
      case 'integer':
        const nums = Array.isArray(value) ? value : [value];
        for (const n of nums) {
          if (typeof n !== 'number' || isNaN(n)) {
            return { valid: false, error: `Ungültige Zahl: ${n}` };
          }
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Format a value for display
   */
  formatForDisplay(value: any, datatype: string): string {
    if (value === null || value === undefined) return '';
    
    if (Array.isArray(value)) {
      return value.map(v => this.formatSingleValue(v, datatype)).join(', ');
    }
    
    return this.formatSingleValue(value, datatype);
  }

  private formatSingleValue(value: any, datatype: string): string {
    switch (datatype) {
      case 'boolean':
        return value === true ? 'Ja' : value === false ? 'Nein' : '';
      case 'date':
        // Format as German date
        if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
          const [year, month, day] = String(value).split('-');
          return `${day}.${month}.${year}`;
        }
        return String(value);
      default:
        return String(value);
    }
  }
}

import { Injectable } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  normalizedValue?: unknown;
}

/**
 * Vocabulary Concept
 */
export interface VocabularyConcept {
  uri?: string;
  value?: string;
  label: string | { de?: string; en?: string };
  altLabels?: string[];
  description?: string;
}

/**
 * Vocabulary Definition
 */
export interface VocabularyDef {
  type: 'closed' | 'open';
  concepts: VocabularyConcept[];
}

/**
 * Field Validation Configuration
 */
export interface FieldValidationConfig {
  datatype: string;
  required?: boolean;
  multiple?: boolean;
  vocabulary?: VocabularyDef;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Field Validation Service
 * 
 * Provides validation and normalization for all field types:
 * - String validation (pattern, length)
 * - Number validation (range, format)
 * - Date/DateTime validation
 * - Boolean normalization
 * - URL validation
 * - Vocabulary validation (closed vs open)
 * - Array handling
 * 
 * VOCABULARY TYPES:
 * - "closed": Only values from vocabulary allowed
 * - "open": Vocabulary provides suggestions, but free text allowed
 */
@Injectable({ providedIn: 'root' })
export class FieldValidationService {
  
  constructor(private i18n: I18nService) {}
  
  /**
   * Validate and normalize a field value
   */
  validate(value: unknown, config: FieldValidationConfig): ValidationResult {
    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      if (config.required) {
        return { valid: false, error: this.i18n.instant('VALIDATION.REQUIRED_FIELD') };
      }
      return { valid: true, normalizedValue: null };
    }
    
    // Handle arrays
    if (config.multiple || config.datatype === 'array') {
      return this.validateArray(value, config);
    }
    
    // Vocabulary check BEFORE datatype dispatch
    if (config.vocabulary) {
      return this.validateVocabulary(value, config.vocabulary);
    }
    
    // Validate by datatype
    switch (config.datatype) {
      case 'boolean':
        return this.validateBoolean(value);
      case 'number':
      case 'integer':
        return this.validateNumber(value, config);
      case 'date':
        return this.validateDate(value);
      case 'datetime':
        return this.validateDateTime(value);
      case 'time':
        return this.validateTime(value);
      case 'url':
      case 'uri':
        return this.validateUrl(value);
      case 'duration':
        return this.validateDuration(value);
      case 'json':
        return this.validateJson(value);
      case 'object':
        return this.validateObject(value);
      default:
        // Handle union types like "union(uri,string)"
        if (config.datatype?.startsWith('union(')) {
          return this.validateUnion(value, config.datatype);
        }
        return this.validateString(value, config);
    }
  }
  
  /**
   * Validate array values
   */
  private validateArray(value: unknown, config: FieldValidationConfig): ValidationResult {
    const arr = Array.isArray(value) ? value : [value];
    const validatedItems: unknown[] = [];
    const errors: string[] = [];
    
    for (const item of arr) {
      if (item === null || item === undefined || item === '') continue;
      
      const itemResult = this.validateSingleValue(item, config);
      if (itemResult.valid) {
        validatedItems.push(itemResult.normalizedValue ?? item);
      } else if (itemResult.error) {
        errors.push(`"${item}": ${itemResult.error}`);
      }
    }
    
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; '),
        normalizedValue: validatedItems // Return valid items anyway
      };
    }
    
    return { valid: true, normalizedValue: validatedItems };
  }
  
  /**
   * Validate single value (string, vocabulary, etc.)
   */
  private validateSingleValue(value: unknown, config: FieldValidationConfig): ValidationResult {
    // If vocabulary exists, validate against it
    if (config.vocabulary) {
      return this.validateVocabulary(value, config.vocabulary);
    }
    
    // Otherwise validate as string
    return this.validateString(value, config);
  }
  
  /**
   * Validate string value
   */
  private validateString(value: unknown, config: FieldValidationConfig): ValidationResult {
    const str = String(value).trim();
    
    // Pattern validation
    if (config.validation?.pattern) {
      const regex = new RegExp(config.validation.pattern);
      if (!regex.test(str)) {
        return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_FORMAT') };
      }
    }
    
    // Length validation
    if (config.validation?.minLength && str.length < config.validation.minLength) {
      return { 
        valid: false, 
        error: this.i18n.instant('VALIDATION.MIN_LENGTH', { min: config.validation.minLength }) 
      };
    }
    if (config.validation?.maxLength && str.length > config.validation.maxLength) {
      return { 
        valid: false, 
        error: this.i18n.instant('VALIDATION.MAX_LENGTH', { max: config.validation.maxLength }) 
      };
    }
    
    return { valid: true, normalizedValue: str };
  }
  
  /**
   * Validate vocabulary value
   * 
   * For CLOSED vocabularies: Only exact matches allowed
   * For OPEN vocabularies: Matches preferred, but free text allowed with warning
   */
  validateVocabulary(value: unknown, vocabulary: VocabularyDef): ValidationResult {
    const inputStr = String(value).trim();
    
    // Try to find matching concept
    const match = this.findVocabularyMatch(inputStr, vocabulary.concepts);
    
    if (match) {
      // Return URI if vocabulary uses URIs, otherwise canonical label
      const hasUris = vocabulary.concepts.some(c => c.uri);
      const normalizedValue = hasUris && match.uri ? match.uri : this.getConceptLabel(match);
      return { 
        valid: true, 
        normalizedValue
      };
    }
    
    // No match found - try fuzzy match for closed vocabularies
    if (vocabulary.type === 'closed') {
      const fuzzyMatch = this.findFuzzyMatch(inputStr, vocabulary.concepts);
      if (fuzzyMatch) {
        const label = this.getConceptLabel(fuzzyMatch);
        const hasUris = vocabulary.concepts.some(c => c.uri);
        return {
          valid: true,
          normalizedValue: hasUris && fuzzyMatch.uri ? fuzzyMatch.uri : label
        };
      }
      // Strict validation: reject
      return { 
        valid: false, 
        error: this.i18n.instant('VALIDATION.VOCABULARY_CLOSED', { value: inputStr })
      };
    } else {
      // Open vocabulary: allow with warning
      return { 
        valid: true, 
        warning: this.i18n.instant('VALIDATION.VOCABULARY_SUGGESTION'),
        normalizedValue: inputStr
      };
    }
  }
  
  /**
   * Find matching concept in vocabulary
   * Matches by: URI, value, label, altLabels (case-insensitive)
   */
  private findVocabularyMatch(
    input: string, 
    concepts: VocabularyConcept[]
  ): VocabularyConcept | null {
    const inputLower = input.toLowerCase();
    
    for (const concept of concepts) {
      // Match by URI
      if (concept.uri && concept.uri === input) {
        return concept;
      }
      
      // Match by value
      if (concept.value && concept.value === input) {
        return concept;
      }
      
      // Match by label (exact or case-insensitive)
      const label = this.getConceptLabel(concept);
      if (label === input || label.toLowerCase() === inputLower) {
        return concept;
      }
      
      // Match by altLabels
      if (concept.altLabels) {
        for (const alt of concept.altLabels) {
          if (alt === input || alt.toLowerCase() === inputLower) {
            return concept;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get display label from concept
   */
  private getConceptLabel(concept: VocabularyConcept): string {
    if (typeof concept.label === 'string') {
      return concept.label;
    }
    const lang = this.i18n.currentLang;
    return concept.label?.[lang as 'de' | 'en'] || concept.label?.['de'] || concept.label?.['en'] || '';
  }
  
  /**
   * Validate boolean
   */
  private validateBoolean(value: unknown): ValidationResult {
    if (typeof value === 'boolean') {
      return { valid: true, normalizedValue: value };
    }
    
    const str = String(value).toLowerCase().trim();
    const trueValues = ['true', 'ja', 'yes', '1', 'wahr'];
    const falseValues = ['false', 'nein', 'no', '0', 'falsch'];
    
    if (trueValues.includes(str)) {
      return { valid: true, normalizedValue: true };
    }
    if (falseValues.includes(str)) {
      return { valid: true, normalizedValue: false };
    }
    
    return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_BOOLEAN') };
  }
  
  /**
   * Validate number
   */
  private validateNumber(value: unknown, config: FieldValidationConfig): ValidationResult {
    let num: number;
    
    if (typeof value === 'number') {
      num = value;
    } else {
      const str = String(value).replace(',', '.').trim();
      num = config.datatype === 'integer' ? parseInt(str, 10) : parseFloat(str);
    }
    
    if (isNaN(num)) {
      return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_NUMBER') };
    }
    
    // Range validation
    if (config.validation?.min !== undefined && num < config.validation.min) {
      return { 
        valid: false, 
        error: this.i18n.instant('VALIDATION.MIN_VALUE', { min: config.validation.min }) 
      };
    }
    if (config.validation?.max !== undefined && num > config.validation.max) {
      return { 
        valid: false, 
        error: this.i18n.instant('VALIDATION.MAX_VALUE', { max: config.validation.max }) 
      };
    }
    
    return { valid: true, normalizedValue: num };
  }
  
  /**
   * Validate date (YYYY-MM-DD)
   */
  private validateDate(value: unknown): ValidationResult {
    const str = String(value).trim();
    
    // ISO date format
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return { valid: true, normalizedValue: str };
      }
    }
    
    // German format DD.MM.YYYY
    const deMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (deMatch) {
      const [_, day, month, year] = deMatch;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(isoDate);
      if (!isNaN(date.getTime())) {
        return { valid: true, normalizedValue: isoDate };
      }
    }
    
    // Try native parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const iso = parsed.toISOString().split('T')[0];
      return { valid: true, normalizedValue: iso };
    }
    
    return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_DATE') };
  }
  
  /**
   * Validate datetime (ISO 8601)
   */
  private validateDateTime(value: unknown): ValidationResult {
    const str = String(value).trim();
    
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return { valid: true, normalizedValue: str };
      }
    }
    
    // Date only - append T00:00
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return { valid: true, normalizedValue: `${str}T00:00:00` };
    }
    
    // Try native parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return { valid: true, normalizedValue: parsed.toISOString() };
    }
    
    return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_DATETIME') };
  }
  
  /**
   * Validate URL / URI
   */
  private validateUrl(value: unknown): ValidationResult {
    const str = String(value).trim();
    
    // Auto-add https:// if missing
    let url = str;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
      return { valid: true, normalizedValue: url };
    } catch {
      return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_URL') };
    }
  }
  
  /**
   * Validate time (HH:MM or HH:MM:SS)
   */
  private validateTime(value: unknown): ValidationResult {
    const str = String(value).trim();
    
    // HH:MM or HH:MM:SS format
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const [_, hours, minutes, seconds] = timeMatch;
      const h = parseInt(hours, 10);
      const m = parseInt(minutes, 10);
      const s = seconds ? parseInt(seconds, 10) : 0;
      
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
        const normalized = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return { valid: true, normalizedValue: normalized };
      }
    }
    
    return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_TIME') };
  }
  
  /**
   * Validate ISO 8601 duration (P1D, PT3H, P2DT4H30M, etc.)
   */
  private validateDuration(value: unknown): ValidationResult {
    const str = String(value).trim().toUpperCase();
    
    // ISO 8601 duration pattern
    // P[n]Y[n]M[n]DT[n]H[n]M[n]S or P[n]W
    const durationPattern = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const weekPattern = /^P(\d+)W$/;
    
    if (durationPattern.test(str) || weekPattern.test(str)) {
      // Validate it's not just "P" or "PT"
      if (str === 'P' || str === 'PT') {
        return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_DURATION') };
      }
      return { valid: true, normalizedValue: str };
    }
    
    // Try to parse common formats and convert to ISO 8601
    const normalized = this.parseDurationToISO(str);
    if (normalized) {
      return { valid: true, normalizedValue: normalized };
    }
    
    return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_DURATION') };
  }
  
  /**
   * Parse common duration formats to ISO 8601
   */
  private parseDurationToISO(input: string): string | null {
    const str = input.toLowerCase().trim();
    
    // "2 Stunden" / "2 hours" → PT2H
    const hoursMatch = str.match(/^(\d+)\s*(stunden?|hours?|h)$/i);
    if (hoursMatch) return `PT${hoursMatch[1]}H`;
    
    // "30 Minuten" / "30 minutes" → PT30M
    const minutesMatch = str.match(/^(\d+)\s*(minuten?|minutes?|min|m)$/i);
    if (minutesMatch) return `PT${minutesMatch[1]}M`;
    
    // "2 Tage" / "2 days" → P2D
    const daysMatch = str.match(/^(\d+)\s*(tage?|days?|d)$/i);
    if (daysMatch) return `P${daysMatch[1]}D`;
    
    // "1 Woche" / "1 week" → P1W
    const weeksMatch = str.match(/^(\d+)\s*(wochen?|weeks?|w)$/i);
    if (weeksMatch) return `P${weeksMatch[1]}W`;
    
    // "90 min" → PT90M, "1.5h" → PT1H30M
    const shortMatch = str.match(/^(\d+(?:\.\d+)?)\s*(h|m)$/i);
    if (shortMatch) {
      const num = parseFloat(shortMatch[1]);
      const unit = shortMatch[2].toLowerCase();
      if (unit === 'h') {
        if (Number.isInteger(num)) return `PT${num}H`;
        const hours = Math.floor(num);
        const minutes = Math.round((num - hours) * 60);
        return hours > 0 ? `PT${hours}H${minutes}M` : `PT${minutes}M`;
      }
      return `PT${Math.round(num)}M`;
    }
    
    return null;
  }
  
  /**
   * Validate JSON string
   */
  private validateJson(value: unknown): ValidationResult {
    // If already an object, it's valid
    if (typeof value === 'object' && value !== null) {
      return { valid: true, normalizedValue: value };
    }
    
    const str = String(value).trim();
    if (!str) {
      return { valid: true, normalizedValue: null };
    }
    
    try {
      const parsed = JSON.parse(str);
      return { valid: true, normalizedValue: parsed };
    } catch {
      return { valid: false, error: this.i18n.instant('VALIDATION.INVALID_JSON') };
    }
  }
  
  /**
   * Validate object value
   * Objects are passed through as-is, strings are tried as JSON
   */
  private validateObject(value: unknown): ValidationResult {
    // Already an object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { valid: true, normalizedValue: value };
    }
    
    // Try to parse string as JSON object
    if (typeof value === 'string') {
      const str = value.trim();
      if (!str) {
        return { valid: true, normalizedValue: null };
      }
      
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return { valid: true, normalizedValue: parsed };
        }
        return { valid: false, error: this.i18n.instant('VALIDATION.EXPECTED_OBJECT') };
      } catch {
        // Not valid JSON - might be a simple value, accept as-is
        return { valid: true, normalizedValue: value };
      }
    }
    
    return { valid: true, normalizedValue: value };
  }
  
  /**
   * Validate union types like "union(uri,string)"
   * Tries each type in order and returns first valid result
   */
  private validateUnion(value: unknown, unionType: string): ValidationResult {
    // Parse union types: "union(uri,string)" -> ["uri", "string"]
    const match = unionType.match(/^union\(([^)]+)\)$/);
    if (!match) {
      return { valid: true, normalizedValue: value };
    }
    
    const types = match[1].split(',').map(t => t.trim());
    
    // Try each type in order
    for (const type of types) {
      let result: ValidationResult;
      
      switch (type) {
        case 'uri':
        case 'url':
          result = this.validateUrl(value);
          break;
        case 'string':
          result = { valid: true, normalizedValue: String(value).trim() };
          break;
        case 'number':
          result = this.validateNumber(value, { datatype: 'number' });
          break;
        case 'boolean':
          result = this.validateBoolean(value);
          break;
        case 'date':
          result = this.validateDate(value);
          break;
        default:
          result = { valid: true, normalizedValue: value };
      }
      
      if (result.valid) {
        return result;
      }
    }
    
    // None matched, return as string
    return { valid: true, normalizedValue: String(value).trim() };
  }
  
  /**
   * Fuzzy match using Levenshtein distance
   */
  private findFuzzyMatch(
    input: string,
    concepts: VocabularyConcept[]
  ): VocabularyConcept | null {
    const inputLower = input.toLowerCase();
    let bestMatch: { concept: VocabularyConcept; distance: number } | null = null;

    for (const concept of concepts) {
      const label = this.getConceptLabel(concept).toLowerCase();
      const distance = this.levenshteinDistance(inputLower, label);

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { concept, distance };
      }

      // Also check altLabels
      if (concept.altLabels) {
        for (const alt of concept.altLabels) {
          const altDist = this.levenshteinDistance(inputLower, alt.toLowerCase());
          if (!bestMatch || altDist < bestMatch.distance) {
            bestMatch = { concept, distance: altDist };
          }
        }
      }
    }

    // Allow fuzzy match if distance <= 30% of input length, max 3
    const maxDistance = Math.min(3, Math.ceil(input.length * 0.3));
    if (bestMatch && bestMatch.distance <= maxDistance) {
      return bestMatch.concept;
    }

    return null;
  }

  /**
   * Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get autocomplete suggestions for input
   */
  getAutocompleteSuggestions(
    input: string, 
    vocabulary: VocabularyDef,
    limit = 10
  ): string[] {
    if (!input.trim()) {
      // Return first N options when empty
      return vocabulary.concepts
        .slice(0, limit)
        .map(c => this.getConceptLabel(c));
    }
    
    const searchTerm = input.toLowerCase();
    const matches: { label: string; score: number }[] = [];
    
    for (const concept of vocabulary.concepts) {
      const label = this.getConceptLabel(concept);
      const labelLower = label.toLowerCase();
      
      // Exact match - highest score
      if (labelLower === searchTerm) {
        matches.push({ label, score: 100 });
        continue;
      }
      
      // Starts with - high score
      if (labelLower.startsWith(searchTerm)) {
        matches.push({ label, score: 80 });
        continue;
      }
      
      // Contains - medium score
      if (labelLower.includes(searchTerm)) {
        matches.push({ label, score: 60 });
        continue;
      }
      
      // AltLabels match
      if (concept.altLabels) {
        for (const alt of concept.altLabels) {
          const altLower = alt.toLowerCase();
          if (altLower.includes(searchTerm)) {
            matches.push({ label, score: 40 });
            break;
          }
        }
      }
    }
    
    // Sort by score and return labels
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(m => m.label);
  }
}

import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  Injectable,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS, MatNativeDateModule, DateAdapter, NativeDateAdapter } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { TextFieldModule } from '@angular/cdk/text-field';

import { CanvasFieldState, FieldStatus } from '../../shared/models/canvas.models';
import { FieldValidationService, VocabularyDef } from '../../core/field-validation.service';
import { VocabTreePickerComponent } from '../shared/vocab-tree-picker/vocab-tree-picker.component';

const DE_DATE_FORMATS = {
  parse: { dateInput: 'DD.MM.YYYY', timeInput: 'HH:MM' },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearA11yLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    timeInput: { hour: '2-digit', minute: '2-digit', hour12: false } as Intl.DateTimeFormatOptions,
    timeOptionLabel: { hour: '2-digit', minute: '2-digit', hour12: false } as Intl.DateTimeFormatOptions,
  }
};

@Injectable()
class GermanDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === DE_DATE_FORMATS.display.dateInput) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }
    return super.format(date, displayFormat);
  }

  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const parts = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (parts) {
        return new Date(+parts[3], +parts[2] - 1, +parts[1]);
      }
    }
    return super.parse(value);
  }

  override getFirstDayOfWeek(): number {
    return 1; // Monday
  }
}

@Component({
  selector: 'app-field',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    NgxMatTimepickerModule,
    TextFieldModule,
    VocabTreePickerComponent
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
    { provide: DateAdapter, useClass: GermanDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DE_DATE_FORMATS }
  ],
  templateUrl: './field.component.html',
  styleUrls: ['./field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldComponent implements OnInit, OnChanges, OnDestroy {
  @Input() field!: CanvasFieldState;
  @Input() readonly = false;
  @Input() showActions = true;
  @Input() highlightAi = true;
  
  @Output() valueChange = new EventEmitter<unknown>();
  @ViewChild('autoTrigger') autocompleteTrigger?: MatAutocompleteTrigger;
  
  FieldStatus = FieldStatus;
  
  // Local input value for editing (always empty for array fields)
  inputValue = '';
  dateValue: Date | null = null;
  dateTimeTimeValue = '00:00';
  filteredOptions: string[] = [];
  
  // Tree picker state
  pickerOpen = false;
  
  // Validation state
  validationError: string | null = null;
  validationWarning: string | null = null;

  // Cached template properties (recomputed only in ngOnChanges, not every CD cycle)
  _isRadioField = false;
  _useTreePicker = false;
  _isSpecialDatatype = false;
  _hasVocabulary = false;
  _statusClass = '';
  _radioOptions: { label: string; value: string }[] = [];
  _selectedValues: string[] = [];
  _chipDisplayCache = new Map<unknown, string>();
  
  // Pre-resolved placeholder texts (avoids translate pipe issues in property bindings
  // under OnPush ancestors, e.g. in browser extension web-component context)
  placeholderVocabPicker = '';
  placeholderArrayInput = '';
  private i18nSubs: Subscription[] = [];
  
  constructor(
    private cdr: ChangeDetectorRef,
    private validation: FieldValidationService,
    private translate: TranslateService
  ) {}
  
  ngOnInit(): void {
    this.updateInputValue();
    this.updateFilteredOptions();
    this.resolveTranslatedPlaceholders();
    // Re-resolve when translations arrive or language changes
    this.i18nSubs.push(
      this.translate.onTranslationChange.subscribe(() => {
        this.resolveTranslatedPlaceholders();
        this.cdr.markForCheck();
      }),
      this.translate.onLangChange.subscribe(() => {
        this.resolveTranslatedPlaceholders();
        this.cdr.markForCheck();
      })
    );
  }
  
  ngOnDestroy(): void {
    this.i18nSubs.forEach(s => s.unsubscribe());
  }
  
  private resolveTranslatedPlaceholders(): void {
    this.placeholderVocabPicker = this.translate.instant('FIELD.VOCAB_OPEN_PICKER');
    this.placeholderArrayInput = this.translate.instant('FIELD.ARRAY_PLACEHOLDER');
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field']) {
      this.updateInputValue();
      this.updateFilteredOptions();
      this.updateCachedProperties();
    }
  }

  /** Recompute all cached template properties when field changes */
  private updateCachedProperties(): void {
    this._isRadioField = this.isRadioField();
    this._useTreePicker = this.useTreePicker();
    this._isSpecialDatatype = this.isSpecialDatatype();
    this._hasVocabulary = this.hasVocabulary();
    this._statusClass = this.getStatusClass();
    this._radioOptions = this.getRadioOptions();
    this._selectedValues = this.getSelectedValues();
    this._chipDisplayCache.clear();
  }
  
  private updateInputValue(): void {
    // For array fields, input is always empty (values shown as chips)
    if (Array.isArray(this.field.value)) {
      this.inputValue = '';
    } else if (this.field.datatype === 'time' && this.field.value) {
      // Extract HH:MM from any format (ISO datetime, plain time, etc.)
      const timeMatch = String(this.field.value).match(/(\d{2}):(\d{2})/);
      this.inputValue = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : String(this.field.value);
    } else if (this.field.datatype === 'datetime' && this.field.value) {
      // Format datetime as German "DD.MM.YYYY HH:MM"
      this.inputValue = this.formatDateTimeGerman(String(this.field.value));
      // Extract time part for timepicker
      const timeMatch = String(this.field.value).match(/(\d{2}):(\d{2})/);
      this.dateTimeTimeValue = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '00:00';
    } else if (this.field.value !== null && this.field.value !== undefined) {
      // Translate URI to label if vocabulary exists
      this.inputValue = this.getChipDisplayValue(this.field.value);
    } else {
      this.inputValue = '';
    }
    // Parse date string to Date object for mat-datepicker (date-only fields)
    if (this.field.datatype === 'date' && this.field.value) {
      const parsed = new Date(String(this.field.value) + 'T00:00:00');
      this.dateValue = isNaN(parsed.getTime()) ? null : parsed;
    } else if (this.field.datatype !== 'datetime') {
      this.dateValue = null;
    }
  }

  private formatDateTimeGerman(val: string): string {
    // Parse ISO "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD HH:MM" into "DD.MM.YYYY HH:MM"
    const match = val.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (match) {
      return `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`;
    }
    // Try date-only "YYYY-MM-DD"
    const dateMatch = val.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return `${dateMatch[3]}.${dateMatch[2]}.${dateMatch[1]} 00:00`;
    }
    // Already in German format or unrecognized — return as-is
    return val;
  }

  private parseDateTimeGerman(val: string): string | null {
    // Parse German "DD.MM.YYYY HH:MM" into ISO "YYYY-MM-DDTHH:MM"
    const match = val.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      const hour = match[4].padStart(2, '0');
      const minute = match[5];
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }
    // Try date-only "DD.MM.YYYY"
    const dateMatch = val.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      return `${year}-${month}-${day}T00:00`;
    }
    return null;
  }
  
  private updateFilteredOptions(): void {
    if (this.field.vocabulary?.concepts) {
      this.filteredOptions = this.field.vocabulary.concepts.map((c: any) => {
        if (typeof c.label === 'string') return c.label;
        return c.label?.['de'] || c.label?.['en'] || '';
      });
    }
  }
  
  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.inputValue = target.value;
    this.validationError = null;
    this.validationWarning = null;
    
    // Filter autocomplete options using validation service
    if (this.field.vocabulary?.concepts) {
      const vocab = this.getVocabularyDef();
      if (vocab) {
        this.filteredOptions = this.validation.getAutocompleteSuggestions(
          this.inputValue, 
          vocab, 
          10
        );
      }
    }
  }
  
  /**
   * Get vocabulary definition for validation
   * SKOS vocabularies are also treated as closed (controlled) vocabularies
   */
  private getVocabularyDef(): VocabularyDef | null {
    if (!this.field.vocabulary?.concepts) return null;
    // Both 'closed' and 'skos' are treated as controlled vocabularies
    const vocabType = this.field.vocabulary.type as string;
    const isClosed = vocabType === 'closed' || vocabType === 'skos';
    return {
      type: isClosed ? 'closed' : 'open',
      concepts: this.field.vocabulary.concepts.map((c: any) => ({
        uri: c.uri,
        value: c.value,
        label: c.label,
        altLabels: c.altLabels,
        description: c.description
      }))
    };
  }
  
  onBlur(): void {
    // Delay to allow autocomplete click
    setTimeout(() => {
      if (this.inputValue.trim()) {
        this.processInputValue();
      }
    }, 200);
  }
  
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.processInputValue();
    }
  }
  
  private processInputValue(): void {
    const value = this.inputValue.trim();
    if (!value) return;
    
    // Validate the input
    const result = this.validation.validate(value, {
      datatype: this.field.datatype || 'string',
      required: this.field.isRequired,
      multiple: this.field.multiple,
      vocabulary: this.getVocabularyDef() || undefined
    });
    
    // Handle validation result
    if (!result.valid) {
      this.validationError = result.error || null;
      // For closed vocabulary: reset to previous valid value on rejection
      const vocabDef = this.getVocabularyDef();
      if (vocabDef?.type === 'closed') {
        // Revert to the current field value display
        this.inputValue = this.field.value ? this.getChipDisplayValue(this.field.value) : '';
        this.cdr.markForCheck();
      }
      return; // Don't emit invalid values
    }
    
    this.validationWarning = result.warning || null;
    const normalizedValue = result.normalizedValue ?? value;
    
    if (this.field.multiple || this.field.datatype === 'array') {
      // Add to array
      const currentValues = Array.isArray(this.field.value) ? [...this.field.value] : [];
      const newValues = Array.isArray(normalizedValue) 
        ? normalizedValue.filter(v => !currentValues.includes(v))
        : [normalizedValue].filter(v => !currentValues.includes(v));
      
      if (newValues.length > 0) {
        this.valueChange.emit([...currentValues, ...newValues]);
      }
      this.inputValue = '';
      this.cdr.markForCheck();
    } else {
      // Update input display with normalized/corrected value
      this.inputValue = this.getChipDisplayValue(normalizedValue);
      this.valueChange.emit(normalizedValue);
      this.cdr.markForCheck();
    }
  }
  
  selectOption(option: string): void {
    // Resolve the selected label to its canonical value (URI if available)
    const resolvedValue = this.resolveVocabValue(option);
    
    if (this.field.multiple || this.field.datatype === 'array') {
      const currentValues = Array.isArray(this.field.value) ? [...this.field.value] : [];
      if (!currentValues.includes(resolvedValue)) {
        this.valueChange.emit([...currentValues, resolvedValue]);
      }
      // Clear input after selection
      setTimeout(() => {
        this.inputValue = '';
        this.validationError = null;
        this.updateFilteredOptions();
        this.cdr.markForCheck();
      }, 0);
    } else {
      this.inputValue = option; // Display the label
      this.validationError = null;
      this.valueChange.emit(resolvedValue);
      this.cdr.markForCheck();
    }
  }
  
  /**
   * Resolve a vocabulary label to its canonical value (URI or label)
   */
  private resolveVocabValue(label: string): string {
    if (!this.field.vocabulary?.concepts) return label;
    
    const concept = this.field.vocabulary.concepts.find((c: any) => {
      const conceptLabel = typeof c.label === 'string' ? c.label : (c.label?.['de'] || c.label?.['en'] || '');
      return conceptLabel === label || conceptLabel.toLowerCase() === label.toLowerCase();
    });
    
    if (concept) {
      const hasUris = this.field.vocabulary.concepts.some((c: any) => c.uri);
      if (hasUris && concept.uri) return concept.uri;
    }
    return label;
  }
  
  removeChip(item: any): void {
    if (!Array.isArray(this.field.value)) return;
    const newValue = this.field.value.filter(v => v !== item);
    this.valueChange.emit(newValue);
  }
  
  onDateChange(event: any): void {
    const date: Date | null = event.value;
    if (date instanceof Date && !isNaN(date.getTime())) {
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      this.inputValue = iso;
      this.valueChange.emit(iso);
      this.validationError = '';
    }
  }

  onTimeStringChange(timeStr: string): void {
    if (timeStr) {
      this.inputValue = timeStr;
      this.valueChange.emit(timeStr);
      this.validationError = '';
    }
  }

  onDateTimeBlur(): void {
    if (!this.inputValue) {
      this.valueChange.emit(null);
      return;
    }
    const iso = this.parseDateTimeGerman(this.inputValue);
    if (iso) {
      this.inputValue = this.formatDateTimeGerman(iso);
      this.valueChange.emit(iso);
      this.validationError = '';
    }
  }

  onDateTimePickerSelect(event: any): void {
    const date: Date | null = event.value;
    if (!(date instanceof Date) || isNaN(date.getTime())) return;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    // Preserve existing time part, default 00:00
    const timeMatch = this.inputValue?.match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '00:00';
    this.inputValue = `${day}.${month}.${year} ${time}`;
    this.dateTimeTimeValue = time;
    this.valueChange.emit(`${year}-${month}-${day}T${time}`);
    this.validationError = '';
  }

  onDateTimeTimeChange(timeStr: string): void {
    if (!timeStr) return;
    // Parse current datetime to get the date part
    const currentIso = this.parseDateTimeGerman(this.inputValue);
    let datePart: string;
    if (currentIso) {
      datePart = currentIso.split('T')[0];
    } else {
      // No date yet — use today
      const today = new Date();
      datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    // Normalize time to HH:MM (strip seconds if present)
    const tMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    const normalizedTime = tMatch ? `${tMatch[1].padStart(2, '0')}:${tMatch[2]}` : timeStr;
    const newIso = `${datePart}T${normalizedTime}`;
    this.inputValue = this.formatDateTimeGerman(newIso);
    this.dateTimeTimeValue = normalizedTime;
    this.valueChange.emit(newIso);
    this.validationError = '';
  }

  onBooleanChange(value: string | null): void {
    if (value === null || value === '') {
      this.valueChange.emit(null);
    } else {
      this.valueChange.emit(value === 'true');
    }
  }
  
  // ===== Helpers =====
  
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value.map(v => this.getChipDisplayValue(v)).join(', ');
    }
    return this.getChipDisplayValue(value);
  }
  
  private formatSingleValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    // Handle objects
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      
      // Location object
      if (obj['name'] && obj['address']) {
        const addr = obj['address'] as Record<string, unknown>;
        return `${obj['name']} (${addr?.['addressLocality'] || ''})`;
      }
      
      // Schedule/openingHours object
      if (obj['startDate'] || obj['opens']) {
        const date = (obj['startDate'] || obj['validFrom'] || '') as string;
        const time = obj['opens'] ? `${obj['opens']}-${obj['closes']}` : '';
        const dayOfWeek = obj['dayOfWeek'] as string[] | undefined;
        const byDay = obj['byDay'] as string[] | undefined;
        const days = dayOfWeek?.join(', ') || byDay?.join(', ') || '';
        return [date, time, days].filter(Boolean).join(' ');
      }
      
      // Actor/person object
      if (obj['name'] && !obj['address']) {
        return obj['name'] as string;
      }
      
      // Generic object with name/description
      if (obj['name']) return obj['name'] as string;
      if (obj['description']) return obj['description'] as string;
      
      // Fallback: show key properties
      const keys = Object.keys(obj).slice(0, 3);
      const summary = keys.map(k => `${k}: ${obj[k]}`).join(', ');
      return summary || JSON.stringify(obj);
    }
    
    return String(value);
  }
  
  private parseInput(input: string): unknown {
    const trimmed = input.trim();
    
    if (!trimmed) return null;
    
    // Array fields
    if (this.field.multiple || this.field.datatype === 'array') {
      return trimmed.split(/[,;]/).map(s => s.trim()).filter(s => s);
    }
    
    // Boolean
    if (this.field.datatype === 'boolean') {
      return trimmed.toLowerCase() === 'true' || trimmed === 'ja' || trimmed === '1';
    }
    
    // Number
    if (this.field.datatype === 'number') {
      return parseFloat(trimmed.replace(',', '.'));
    }
    
    return trimmed;
  }
  
  getStatusClass(): string {
    const classes: string[] = [];
    
    switch (this.field.status) {
      case FieldStatus.FILLED:
        classes.push('status-filled');
        break;
      case FieldStatus.EXTRACTING:
        classes.push('status-extracting');
        break;
      case FieldStatus.ERROR:
        classes.push('status-error');
        break;
      default:
        classes.push(this.field.isRequired ? 'status-required' : 'status-empty');
    }
    
    if (this.highlightAi && this.field.isAiGenerated && this.field.status === FieldStatus.FILLED) {
      classes.push('ai-generated');
    }
    
    return classes.join(' ');
  }
  
  getStatusIcon(): string {
    switch (this.field.status) {
      case FieldStatus.FILLED:
        return 'check_circle';
      case FieldStatus.EXTRACTING:
        return 'sync';
      case FieldStatus.ERROR:
        return 'error';
      default:
        return this.field.isRequired ? 'warning' : 'radio_button_unchecked';
    }
  }
  
  hasVocabulary(): boolean {
    return !!this.field.vocabulary?.concepts?.length;
  }

  /**
   * Check if field should use the tree picker instead of autocomplete dropdown.
   * Used for vocabularies with >= 5 concepts or hierarchical vocabularies.
   */
  useTreePicker(): boolean {
    if (!this.field.vocabulary?.concepts?.length) return false;
    if (this.isRadioField()) return false;
    if (this.isSpecialDatatype()) return false;
    const isHierarchical = !!(this.field.vocabulary as any).hierarchical;
    const hasManyOptions = this.field.vocabulary.concepts.length >= 5;
    return isHierarchical || hasManyOptions;
  }

  openPicker(): void {
    this.pickerOpen = true;
  }

  closePicker(): void {
    this.pickerOpen = false;
  }

  getSelectedValues(): string[] {
    if (!this.field.value) return [];
    if (Array.isArray(this.field.value)) return this.field.value;
    return [this.field.value];
  }

  onTreeSelectionChange(selected: string[]): void {
    if (this.field.multiple || this.field.datatype === 'array') {
      this.valueChange.emit(selected);
    } else {
      this.valueChange.emit(selected.length > 0 ? selected[0] : null);
      // For single-select, close the picker after selection
      if (selected.length > 0) {
        this.pickerOpen = false;
      }
    }
    this.validationError = null;
  }
  
  /**
   * Check if field should render as radio buttons
   * Auto-detect: boolean fields OR closed vocabulary with ≤ 4 concepts and single-select
   */
  isRadioField(): boolean {
    if (this.field.datatype === 'boolean') return true;
    if (!this.field.vocabulary?.concepts) return false;
    if (this.field.vocabulary.type !== 'closed') return false;
    if (this.field.multiple || this.field.datatype === 'array') return false;
    return this.field.vocabulary.concepts.length >= 2 && this.field.vocabulary.concepts.length <= 4;
  }

  /**
   * Get radio options from vocabulary concepts or boolean values
   */
  getRadioOptions(): { label: string; value: string }[] {
    if (this.field.datatype === 'boolean') {
      return [
        { label: this.translate.instant('FIELD.BOOLEAN.TRUE'), value: 'true' },
        { label: this.translate.instant('FIELD.BOOLEAN.FALSE'), value: 'false' }
      ];
    }
    if (!this.field.vocabulary?.concepts) return [];
    return this.field.vocabulary.concepts.map((c: any) => {
      const label = typeof c.label === 'string' ? c.label : (c.label?.['de'] || c.label?.['en'] || '');
      const value = c.uri || label;
      return { label, value };
    });
  }

  onRadioChange(value: string): void {
    this.valueChange.emit(value);
    this.validationError = null;
  }

  /**
   * Check if field has a special datatype with dedicated input
   */
  isSpecialDatatype(): boolean {
    if (this.isRadioField()) return true;
    const specialTypes = [
      'boolean', 
      'date', 
      'datetime', 
      'time', 
      'number', 
      'integer',
      'url',
      'uri',
      'duration',
      'json',
      'object'
    ];
    return specialTypes.includes(this.field.datatype || '');
  }
  
  getVocabularyLabels(): string[] {
    if (!this.field.vocabulary?.concepts) return [];
    return this.field.vocabulary.concepts.map((c: any) => {
      if (typeof c.label === 'string') return c.label;
      return c.label['de'] || c.label['en'] || '';
    });
  }
  
  /**
   * Returns display label for a chip value.
   * If the value is a URI and vocabulary is available, returns the vocabulary label.
   */
  getChipDisplayValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    
    // Handle objects
    if (typeof value === 'object') {
      return this.formatSingleValue(value);
    }
    
    const stringValue = String(value);
    
    // Check if we have vocabulary and can find a matching concept
    if (this.field.vocabulary?.concepts) {
      const concept = this.field.vocabulary.concepts.find((c: any) => {
        // Match by URI
        if (c.uri === stringValue) return true;
        // Match by value (some schemas use value instead of uri)
        if (c.value === stringValue) return true;
        // Match by label (already translated)
        const label = typeof c.label === 'string' ? c.label : (c.label?.['de'] || c.label?.['en'] || '');
        if (label === stringValue) return true;
        return false;
      });
      if (concept) {
        if (typeof concept.label === 'string') return concept.label;
        return concept.label?.['de'] || concept.label?.['en'] || stringValue;
      }
    }
    
    return stringValue;
  }
}

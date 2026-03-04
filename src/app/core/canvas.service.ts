import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  CanvasState, 
  CanvasFieldState, 
  FieldGroup, 
  FieldStatus,
  createInitialState 
} from '../shared/models/canvas.models';
import { SchemaService } from './schema.service';
import { ApiService, GenerateResponse } from './api.service';
import { I18nService } from './i18n.service';
import { LoggerService } from './logger.service';
import { ShapeExpanderService } from './shape-expander.service';

/**
 * Canvas Service - Simplified State Management
 * Uses API for all AI operations, no local LLM calls
 */
@Injectable({ providedIn: 'root' })
export class CanvasService {
  private stateSubject = new BehaviorSubject<CanvasState>(createInitialState());
  public state$: Observable<CanvasState> = this.stateSubject.asObservable();

  /** Cache field values per content type so switching back restores them */
  private fieldValueCache = new Map<string, { values: Record<string, any>, origins: Record<string, boolean> }>();

  constructor(
    private schema: SchemaService,
    private api: ApiService,
    private i18n: I18nService,
    private logger: LoggerService,
    private shapeExpander: ShapeExpanderService,
    private ngZone: NgZone
  ) {
    this.logger.info('CanvasService initialized (API mode)');
  }

  getCurrentState(): CanvasState {
    return this.stateSubject.value;
  }

  private updateState(partial: Partial<CanvasState>): void {
    const current = this.getCurrentState();
    this.stateSubject.next({ ...current, ...partial });
  }

  // ===== Screenshot Configuration =====

  setScreenshotEnabled(enabled: boolean): void {
    this.updateState({ screenshotEnabled: enabled });
    this.logger.info(`📸 Screenshot ${enabled ? 'enabled' : 'disabled'}`);
  }

  setScreenshotMethod(method: 'pageshot' | 'playwright'): void {
    this.updateState({ screenshotMethod: method });
    this.logger.info(`📸 Screenshot method: ${method}`);
  }

  // ===== API-based Extraction =====

  async startExtraction(userText: string): Promise<void> {
    this.logger.group('🚀 startExtraction (API)');
    this.logger.info(`Input text length: ${userText.length} chars`);

    // Collect existing metadata from current fields for re-extraction
    const existingMetadata = this.collectCurrentMetadata();
    const hasExistingData = Object.keys(existingMetadata).length > 0;
    
    if (hasExistingData) {
      this.logger.debug('Re-extraction with existing metadata:', Object.keys(existingMetadata).length, 'fields');
    }

    this.updateState({
      userText: userText,
      isExtracting: true,
      extractionProgress: 0,
      extractionError: null
    });

    try {
      // Initialize fields from schema (only if no existing fields)
      if (!hasExistingData) {
        await this.initializeCoreFields();
      }
      
      // Get pre-selected content type (if any)
      const state = this.getCurrentState();
      const preSelectedSchemaFile = state.selectedContentType;
      
      // Call API for metadata generation
      const response = await this.api.generate({
        text: userText,
        context: this.schema.getContextName(),
        version: 'latest',
        language: this.i18n.currentLang,
        include_core: true,
        enable_geocoding: true,
        existing_metadata: hasExistingData ? existingMetadata : undefined,
        schema_file: preSelectedSchemaFile || undefined
      });

      // Apply generated metadata to fields
      await this.applyGeneratedMetadata(response);
      
      this.logger.info(`Extraction completed: ${response.processing.fields_extracted}/${response.processing.fields_total} fields`);

      // Text mode: if ccm:wwwurl found and screenshot enabled, capture screenshot asynchronously
      const afterState = this.getCurrentState();
      if (afterState.screenshotEnabled && !afterState.previewImageUrl) {
        const wwwurl = response.metadata?.['ccm:wwwurl'];
        const targetUrl = Array.isArray(wwwurl) ? wwwurl[0] : wwwurl;
        if (targetUrl && typeof targetUrl === 'string' && targetUrl.startsWith('http')) {
          this.logger.info(`📸 Text mode: URL found in metadata (ccm:wwwurl), capturing screenshot: ${targetUrl}`);
          // Fire-and-forget: capture screenshot in background, don't block extraction
          this.captureScreenshotAsync(targetUrl, afterState.screenshotMethod);
        }
      }
    } catch (error: any) {
      this.logger.error('Extraction failed:', error);
      const msg = error?.error?.detail || error?.message || 'Unknown error';
      this.updateState({ extractionError: `Extraction failed: ${msg}` });
    } finally {
      this.ngZone.run(() => {
        this.updateState({ isExtracting: false, extractionProgress: 100 });
      });
      this.logger.groupEnd();
    }
  }

  // ===== URL-based Extraction =====

  async startUrlExtraction(url: string): Promise<void> {
    this.logger.group('🌐 startUrlExtraction (API)');
    this.logger.info(`URL: ${url}`);

    const existingMetadata = this.collectCurrentMetadata();
    const hasExistingData = Object.keys(existingMetadata).length > 0;

    this.updateState({
      isExtracting: true,
      extractionProgress: 0,
      extractionError: null
    });

    try {
      if (!hasExistingData) {
        await this.initializeCoreFields();
      }
      
      const state = this.getCurrentState();
      const preSelectedSchemaFile = state.selectedContentType;
      
      const generateRequest: any = {
        input_source: 'url',
        text: '',
        source_url: url,
        extraction_method: 'browser',
        context: this.schema.getContextName(),
        version: 'latest',
        language: this.i18n.currentLang,
        include_core: true,
        enable_geocoding: true,
        normalize: true,
        existing_metadata: hasExistingData ? existingMetadata : undefined,
        schema_file: preSelectedSchemaFile || undefined
      };

      // Include screenshot request if enabled (captured in parallel by API)
      if (state.screenshotEnabled) {
        generateRequest.screenshot_method = state.screenshotMethod;
        generateRequest.preview_url = url;
        this.logger.info(`📸 Screenshot requested: ${state.screenshotMethod}`);
      }

      const response = await this.api.generate(generateRequest);

      await this.applyGeneratedMetadata(response);
      
      this.logger.info(`URL extraction completed: ${response.processing.fields_extracted}/${response.processing.fields_total} fields`);
    } catch (error: any) {
      this.logger.error('URL extraction failed:', error);
      const msg = error?.error?.detail || error?.message || 'Unknown error';
      this.updateState({ extractionError: `URL extraction failed: ${msg}` });
    } finally {
      this.ngZone.run(() => {
        this.updateState({ isExtracting: false, extractionProgress: 100 });
      });
      this.logger.groupEnd();
    }
  }

  // ===== NodeId-based Extraction =====

  async startNodeIdExtraction(nodeId: string): Promise<void> {
    this.logger.group('📦 startNodeIdExtraction (API)');
    this.logger.info(`NodeId: ${nodeId}`);

    const existingMetadata = this.collectCurrentMetadata();
    const hasExistingData = Object.keys(existingMetadata).length > 0;

    this.updateState({
      isExtracting: true,
      extractionProgress: 0,
      extractionError: null
    });

    try {
      if (!hasExistingData) {
        await this.initializeCoreFields();
      }
      
      const state = this.getCurrentState();
      const preSelectedSchemaFile = state.selectedContentType;
      
      const response = await this.api.generate({
        input_source: 'node_id',
        text: '',
        node_id: nodeId,
        repository: 'staging',
        context: this.schema.getContextName(),
        version: 'latest',
        language: this.i18n.currentLang,
        include_core: true,
        enable_geocoding: true,
        normalize: true,
        existing_metadata: hasExistingData ? existingMetadata : undefined,
        schema_file: preSelectedSchemaFile || undefined
      });

      await this.applyGeneratedMetadata(response);
      
      this.logger.info(`NodeId extraction completed: ${response.processing.fields_extracted}/${response.processing.fields_total} fields`);
    } catch (error: any) {
      this.logger.error('NodeId extraction failed:', error);
      const msg = error?.error?.detail || error?.message || 'Unknown error';
      this.updateState({ extractionError: `NodeId extraction failed: ${msg}` });
    } finally {
      this.ngZone.run(() => {
        this.updateState({ isExtracting: false, extractionProgress: 100 });
      });
      this.logger.groupEnd();
    }
  }

  // ===== Apply API Response to Fields =====

  private async applyGeneratedMetadata(response: GenerateResponse): Promise<void> {
    const state = this.getCurrentState();
    const metadata = response.metadata || {};

    this.logger.debug('API Response metadata:', metadata);

    // Update content type if detected
    if (response.metadataset && response.metadataset !== 'core.json') {
      await this.loadSpecialSchema(response.metadataset);
      
      // Get label and icon for detected content type
      const concept = this.schema.getContentTypeConcepts().find(c => c.schema_file === response.metadataset);
      
      this.updateState({
        detectedContentType: response.metadataset,
        selectedContentType: response.metadataset,
        contentTypeLabel: concept?.label || response.metadataset.replace('.json', ''),
        contentTypeIcon: concept?.icon || 'category'
      });
    }

    // Re-fetch state after potential schema load
    const currentState = this.getCurrentState();

    // Update all fields with values from API (with subfield expansion for complex objects)
    const updatedCoreFields = (currentState.coreFields || []).map(field => {
      const value = metadata[field.fieldId];
      if (value !== undefined && value !== null) {
        return this.applyValueToField(field, value);
      }
      return field;
    });

    const updatedSpecialFields = (currentState.specialFields || []).map(field => {
      const value = metadata[field.fieldId];
      if (value !== undefined && value !== null) {
        return this.applyValueToField(field, value);
      }
      return field;
    });

    const allFields = [...updatedCoreFields, ...updatedSpecialFields];
    const visibleFields = this.getCountableFields(allFields);
    const filledFields = visibleFields.filter(f => f.status === FieldStatus.FILLED).length;

    // Build state update
    const stateUpdate: any = {
      coreFields: updatedCoreFields,
      specialFields: updatedSpecialFields,
      fieldGroups: this.groupFields(allFields),
      metadata: metadata,
      filledFields,
      totalFields: visibleFields.length,
      extractionProgress: 100
    };

    // Set preview image URL if returned by API (async screenshot during generation)
    if (response.preview_image_url) {
      stateUpdate.previewImageUrl = response.preview_image_url;
      this.logger.info('📸 Preview image received from API');
    }

    this.updateState(stateUpdate);
  }

  // ===== Collect Current Metadata =====

  private collectCurrentMetadata(): Record<string, any> {
    const state = this.getCurrentState();
    const metadata: Record<string, any> = {};

    // Collect values from all fields
    const allFields = [...state.coreFields, ...state.specialFields];
    
    for (const field of allFields) {
      // For parent fields with subfields, reconstruct the complex object
      if (field.isParent && field.subFields && field.subFields.length > 0) {
        const reconstructed = this.shapeExpander.reconstructObjectFromSubFields(field, allFields);
        if (reconstructed !== undefined && reconstructed !== null) {
          metadata[field.fieldId] = reconstructed;
        }
        continue;
      }
      
      // Skip subfields (they're handled via parent reconstruction)
      if (field.parentFieldId) continue;
      
      if (field.value !== undefined && field.value !== null && field.value !== '') {
        if (Array.isArray(field.value) && field.value.length === 0) {
          continue;
        }
        metadata[field.fieldId] = field.value;
      }
    }

    return metadata;
  }

  // ===== Initialize Fields from Schema =====

  private async initializeCoreFields(): Promise<void> {
    const coreSchemaFields = await this.schema.getFields('core.json');
    if (!coreSchemaFields) return;

    const groups = await this.schema.getGroups('core.json');
    const language = this.schema.getActiveLanguage();
    const groupMap = new Map((groups || []).map((g: any) => [g.id, this.schema.localizeString(g.label, language)]));
    const groupOrderMap = new Map(groups?.map((g: any, index: number) => [g.id, index]) || []);
    const groupIconMap = new Map((groups || []).map((g: any) => [g.id, g.icon || '']));
    
    const coreFields: CanvasFieldState[] = coreSchemaFields
      .filter((field: any) => field.system?.ask_user !== false)
      .map((field: any) => this.createFieldState(field, 'Core', groupMap, groupOrderMap, groupIconMap, language));

    const fieldGroups = this.groupFields(coreFields);
    const visibleFields = this.getCountableFields(coreFields);

    this.updateState({
      coreFields: coreFields,
      fieldGroups: fieldGroups,
      totalFields: visibleFields.length,
      metadata: {}
    });
  }

  private async loadSpecialSchema(schemaFile: string): Promise<void> {
    const specialSchemaFields = await this.schema.getFields(schemaFile);
    if (!specialSchemaFields) return;

    const groups = await this.schema.getGroups(schemaFile);
    const language = this.schema.getActiveLanguage();
    const groupMap = new Map((groups || []).map((g: any) => [g.id, this.schema.localizeString(g.label, language)]));
    const groupOrderMap = new Map(groups?.map((g: any, index: number) => [g.id, index]) || []);
    const groupIconMap = new Map((groups || []).map((g: any) => [g.id, g.icon || '']));
    
    const schemaName = schemaFile.replace('.json', '')
      .split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    const specialFields: CanvasFieldState[] = specialSchemaFields
      .filter((field: any) => field.system?.ask_user !== false)
      .map((field: any) => this.createFieldState(field, schemaName, groupMap, groupOrderMap, groupIconMap, language));

    const state = this.getCurrentState();
    const allFields = [...state.coreFields, ...specialFields];
    const fieldGroups = this.groupFields(allFields);
    const visibleFields = this.getCountableFields(allFields);

    this.updateState({
      specialFields: specialFields,
      fieldGroups: fieldGroups,
      totalFields: visibleFields.length
    });
  }

  private createFieldState(
    field: any, 
    schemaName: string, 
    groupMap: Map<string, string>, 
    groupOrderMap: Map<string, number>,
    groupIconMap: Map<string, string>,
    language: string
  ): CanvasFieldState {
    const groupId = field.group || 'other';
    const groupLabel = this.schema.localizeString(field.group_label, language) 
      || groupMap.get(groupId) 
      || this.schema.getFallbackGroupLabel(language);
    const groupOrder = groupOrderMap.get(groupId) ?? 999;
    const groupIcon = groupIconMap.get(groupId) || '';
    const localizedField = this.schema.localizeFieldFull(field, language);

    return {
      fieldId: field.id,
      uri: field.system?.uri || field.id,
      group: groupId,
      groupLabel: String(groupLabel),
      groupIcon: groupIcon,
      groupOrder: groupOrder,
      schemaName: schemaName,
      aiFillable: field.system?.ai_fillable !== false,
      repoField: field.system?.repo_field !== false,
      label: localizedField.label,
      description: localizedField.description,
      value: field.system?.multiple ? [] : null,
      status: FieldStatus.EMPTY,
      confidence: 0,
      isRequired: field.system?.required || false,
      datatype: field.system?.datatype || 'string',
      multiple: field.system?.multiple || false,
      vocabulary: localizedField.vocabulary,
      validation: field.system?.validation,
      shape: field.system?.items?.shape,
      examples: localizedField.examples,
      prompt: localizedField.prompt
    };
  }

  // ===== Manual Field Updates =====

  updateFieldValue(fieldId: string, value: any): void {
    const state = this.getCurrentState();
    
    const updateField = (f: CanvasFieldState): CanvasFieldState => {
      // Direct match on top-level field
      if (f.fieldId === fieldId) {
        const isFilled = this.isValueFilled(value);
        return {
          ...f,
          value: value,
          status: isFilled ? FieldStatus.FILLED : FieldStatus.EMPTY,
          isAiGenerated: false
        };
      }
      // Check subfields of parent fields
      if (f.isParent && f.subFields) {
        const updatedSubs = f.subFields.map(sf => {
          if (sf.fieldId === fieldId) {
            return {
              ...sf,
              value: value,
              status: this.isValueFilled(value) ? FieldStatus.FILLED : FieldStatus.EMPTY,
              isAiGenerated: false
            };
          }
          return sf;
        });
        const subChanged = updatedSubs.some((sf, i) => sf !== f.subFields![i]);
        if (subChanged) {
          const updatedParent = { ...f, subFields: updatedSubs };
          // Reconstruct the parent object value from subfields
          updatedParent.value = this.shapeExpander.reconstructObjectFromSubFields(
            updatedParent, []
          );
          return updatedParent;
        }
      }
      return f;
    };
    
    const updatedCoreFields = state.coreFields.map(updateField);
    const updatedSpecialFields = state.specialFields.map(updateField);
    const allFields = [...updatedCoreFields, ...updatedSpecialFields];
    const visibleFields = this.getCountableFields(allFields);
    const filledFields = visibleFields.filter(f => f.status === FieldStatus.FILLED).length;
    
    // For subfield updates, also update the parent's metadata entry
    const metadata = { ...state.metadata };
    for (const f of allFields) {
      if (f.isParent && f.subFields?.some(sf => sf.fieldId === fieldId)) {
        metadata[f.fieldId] = f.value;
      }
    }
    metadata[fieldId] = value;

    this.updateState({
      coreFields: updatedCoreFields,
      specialFields: updatedSpecialFields,
      fieldGroups: this.groupFields(allFields),
      metadata,
      filledFields,
      totalFields: visibleFields.length
    });
  }

  // ===== Content Type Selection =====

  async selectContentType(schemaFileOrUri: string): Promise<void> {
    // Resolve URI to schema filename if needed
    const schemaFile = this.schema.resolveSchemaFileOrUri(schemaFileOrUri);
    
    const state = this.getCurrentState();
    
    // Save current field values to cache before switching
    const currentCt = state.selectedContentType;
    if (currentCt) {
      this.cacheFieldValues(currentCt, state);
    }
    
    // Load schema and update UI
    await this.loadSpecialSchema(schemaFile);
    
    // Restore cached values for the new content type (if any)
    this.restoreCachedFieldValues(schemaFile);
    
    const concept = this.schema.getContentTypeConcepts().find(c => c.schema_file === schemaFile);
    
    this.updateState({
      selectedContentType: schemaFile,
      detectedContentType: schemaFile,
      contentTypeLabel: concept?.label || schemaFile.replace('.json', ''),
      contentTypeIcon: concept?.icon || 'category'
    });
    
    // If user text exists and no cached data for this type, regenerate
    const hasExistingData = state.filledFields > 0;
    if (hasExistingData && state.userText && !this.fieldValueCache.has(schemaFile)) {
      this.logger.info(`Content type changed to ${schemaFile}, regenerating...`);
      await this.regenerateWithContentType(schemaFile);
    }
  }

  private cacheFieldValues(schemaFile: string, state: CanvasState): void {
    const values: Record<string, any> = {};
    const origins: Record<string, boolean> = {};
    
    // Cache special fields
    for (const field of state.specialFields) {
      if (field.status === FieldStatus.FILLED) {
        values[field.fieldId] = field.value;
        origins[field.fieldId] = field.isAiGenerated || false;
      }
      // Also cache subfield values
      if (field.subFields) {
        for (const sf of field.subFields) {
          if (sf.status === FieldStatus.FILLED) {
            values[sf.fieldId] = sf.value;
            origins[sf.fieldId] = sf.isAiGenerated || false;
          }
        }
      }
    }
    
    if (Object.keys(values).length > 0) {
      this.fieldValueCache.set(schemaFile, { values, origins });
      this.logger.info(`Cached ${Object.keys(values).length} field values for ${schemaFile}`);
    }
  }

  private restoreCachedFieldValues(schemaFile: string): void {
    const cached = this.fieldValueCache.get(schemaFile);
    if (!cached) return;
    
    const state = this.getCurrentState();
    
    const restoredSpecialFields = state.specialFields.map(field => {
      const cachedValue = cached.values[field.fieldId];
      if (cachedValue !== undefined) {
        const isAi = cached.origins[field.fieldId] || false;
        let updated = this.applyValueToField(field, cachedValue, isAi);
        // Also restore subfield values
        if (updated.subFields) {
          updated = {
            ...updated,
            subFields: updated.subFields.map(sf => {
              const sfValue = cached.values[sf.fieldId];
              if (sfValue !== undefined) {
                return this.applyValueToField(sf, sfValue, cached.origins[sf.fieldId] || false);
              }
              return sf;
            })
          };
        }
        return updated;
      }
      return field;
    });
    
    const allFields = [...state.coreFields, ...restoredSpecialFields];
    const visibleFields = this.getCountableFields(allFields);
    const filledFields = visibleFields.filter(f => f.status === FieldStatus.FILLED).length;
    
    // Update metadata
    const metadata = { ...state.metadata };
    for (const [key, val] of Object.entries(cached.values)) {
      metadata[key] = val;
    }
    
    this.updateState({
      specialFields: restoredSpecialFields,
      fieldGroups: this.groupFields(allFields),
      metadata,
      filledFields,
      totalFields: visibleFields.length
    });
    
    this.logger.info(`Restored ${Object.keys(cached.values).length} cached field values for ${schemaFile}`);
  }

  private async regenerateWithContentType(schemaFile: string): Promise<void> {
    const state = this.getCurrentState();
    const userText = state.userText;
    
    if (!userText) return;
    
    // Clear existing field values
    this.updateState({
      isExtracting: true,
      extractionProgress: 0
    });
    
    try {
      // Re-initialize fields (clear values)
      await this.initializeCoreFields();
      await this.loadSpecialSchema(schemaFile);
      
      // Call API with explicit schema_file
      const response = await this.api.generate({
        text: userText,
        context: this.schema.getContextName(),
        version: 'latest',
        language: this.i18n.currentLang,
        include_core: true,
        enable_geocoding: true,
        schema_file: schemaFile
      });
      
      await this.applyGeneratedMetadata(response);
      this.logger.info(`Regeneration completed: ${response.processing.fields_extracted}/${response.processing.fields_total} fields`);
    } catch (error: any) {
      this.logger.error('Regeneration failed:', error);
      const msg = error?.error?.detail || error?.message || 'Unknown error';
      this.updateState({ extractionError: `Regeneration failed: ${msg}` });
    } finally {
      this.ngZone.run(() => {
        this.updateState({ isExtracting: false, extractionProgress: 100 });
      });
    }
  }

  // ===== Load Existing Metadata =====

  async loadMetadata(metadata: Record<string, any>, schemaFile?: string, origins?: Record<string, 'ai' | 'user'>, options?: { skipCore?: boolean }): Promise<void> {
    this.logger.info('Loading existing metadata', origins ? '(with origins)' : '(no origins)');
    
    // Resolve URI to schema filename if needed
    if (schemaFile) {
      schemaFile = this.schema.resolveSchemaFileOrUri(schemaFile);
    }
    
    // Initialize core fields unless explicitly skipped
    if (!options?.skipCore) {
      try {
        await this.initializeCoreFields();
      } catch (err) {
        this.logger.warn('Core schema not available, continuing without core fields');
      }
    }
    
    if (schemaFile && schemaFile !== 'core.json') {
      await this.loadSpecialSchema(schemaFile);
      
      // Set content type label and icon so UI (floating buttons) reflects the loaded type
      const concept = this.schema.getContentTypeConcepts().find(c => c.schema_file === schemaFile);
      this.updateState({
        detectedContentType: schemaFile,
        selectedContentType: schemaFile,
        contentTypeLabel: concept?.label || schemaFile.replace('.json', ''),
        contentTypeIcon: concept?.icon || 'category'
      });
    }

    const state = this.getCurrentState();
    
    const updatedCoreFields = state.coreFields.map(field => {
      const value = metadata[field.fieldId];
      if (value !== undefined && value !== null) {
        const isAi = origins ? origins[field.fieldId] !== 'user' : true;
        return this.applyValueToField(field, value, isAi);
      }
      return field;
    });

    const updatedSpecialFields = state.specialFields.map(field => {
      const value = metadata[field.fieldId];
      if (value !== undefined && value !== null) {
        const isAi = origins ? origins[field.fieldId] !== 'user' : true;
        return this.applyValueToField(field, value, isAi);
      }
      return field;
    });

    const allFields = [...updatedCoreFields, ...updatedSpecialFields];
    const visibleFields = this.getCountableFields(allFields);
    const filledFields = visibleFields.filter(f => f.status === FieldStatus.FILLED).length;

    this.updateState({
      coreFields: updatedCoreFields,
      specialFields: updatedSpecialFields,
      fieldGroups: this.groupFields(allFields),
      metadata: metadata,
      filledFields,
      totalFields: visibleFields.length
    });
    
    // Cache loaded values so switching content types and back preserves them
    if (schemaFile && schemaFile !== 'core.json') {
      const afterState = this.getCurrentState();
      this.cacheFieldValues(schemaFile, afterState);
    }
  }

  // ===== Export Metadata =====

  getMetadata(): Record<string, any> {
    return this.getCurrentState().metadata;
  }

  getMetadataForExport(): Record<string, any> {
    const state = this.getCurrentState();
    const allFields = [...state.coreFields, ...state.specialFields];
    
    // Reconstruct complex objects from subfields
    const exportMetadata: Record<string, any> = { ...state.metadata };
    for (const field of allFields) {
      if (field.isParent && field.subFields) {
        exportMetadata[field.fieldId] = this.shapeExpander.reconstructObjectFromSubFields(field, allFields);
      }
    }
    
    // Build origins map: track which fields were set by AI vs user
    const origins: Record<string, 'ai' | 'user'> = {};
    for (const field of allFields) {
      if (field.status === FieldStatus.FILLED) {
        origins[field.fieldId] = field.isAiGenerated ? 'ai' : 'user';
      }
      // Also track subfield origins
      if (field.isParent && field.subFields) {
        for (const sf of field.subFields) {
          if (sf.status === FieldStatus.FILLED) {
            origins[sf.fieldId] = sf.isAiGenerated ? 'ai' : 'user';
          }
        }
      }
    }
    
    // Resolve metadataset_uri from selected content type
    const metadataset = state.selectedContentType || 'core.json';
    const concept = this.schema.getContentTypeConcepts().find(c => c.schema_file === metadataset);
    
    const result: Record<string, any> = {
      contextName: this.schema.getContextName(),
      schemaVersion: this.schema.getSchemaVersion(),
      metadataset,
      metadataset_uri: concept?.uri || null,
      language: this.i18n.currentLang,
      exportedAt: new Date().toISOString(),
      metadata: exportMetadata,
      _origins: origins
    };

    // Include raw source text for extended data upload
    if (state.userText) {
      result['_source_text'] = state.userText;
    }

    // Include preview image URL if available (screenshot base64 or URL)
    if (state.previewImageUrl) {
      result['preview_image_url'] = state.previewImageUrl;
    }

    return result;
  }

  getMetadataForRepository(): Record<string, any> {
    return this.getMetadataForExport();
  }

  // ===== Async Screenshot Capture =====

  /**
   * Capture a screenshot in the background and update preview image when done.
   * Fire-and-forget: does not block UI or extraction flow.
   */
  private captureScreenshotAsync(url: string, method: 'pageshot' | 'playwright'): void {
    this.api.captureScreenshot(url, method).then(dataUrl => {
      if (dataUrl) {
        this.ngZone.run(() => {
          this.updateState({ previewImageUrl: dataUrl });
          this.logger.info('📸 Screenshot loaded into preview');
        });
      }
    }).catch(err => {
      this.logger.warn('📸 Async screenshot failed:', err);
    });
  }

  // ===== Error Management =====

  setError(message: string): void {
    this.updateState({ extractionError: message });
  }

  clearError(): void {
    this.updateState({ extractionError: null });
  }

  // ===== Reset =====

  reset(): void {
    this.stateSubject.next(createInitialState());
    this.logger.info('Canvas state reset');
  }

  // ===== Content Type Change =====

  async changeContentTypeManually(schemaFileOrUri: string, label?: string, icon?: string): Promise<void> {
    await this.selectContentType(schemaFileOrUri);
    if (label) {
      this.updateState({ contentTypeLabel: label });
    }
    if (icon) {
      this.updateState({ contentTypeIcon: icon });
    }
  }

  // ===== JSON Import =====

  async importJsonData(data: Record<string, any>): Promise<void> {
    this.logger.info('Importing JSON data');
    const metadata = data['metadata'] || data;
    const schemaFile = data['metadataset'] || data['metadataset_uri'] || data['schemaFile'];
    const origins: Record<string, 'ai' | 'user'> | undefined = data['_origins'];
    await this.loadMetadata(metadata, schemaFile, origins);

    // Set preview image URL if present in imported data (screenshot base64 or URL)
    const previewImageUrl = data['preview_image_url'] || metadata['preview_image_url'];
    if (previewImageUrl) {
      this.updateState({ previewImageUrl });
      this.logger.info('📸 Preview image loaded from imported JSON');
    }
  }

  // ===== Helper Methods =====

  /**
   * Apply a value to a field, expanding complex objects into subfields when shape is defined
   */
  private applyValueToField(field: CanvasFieldState, value: any, isAiGenerated = true): CanvasFieldState {
    const schemaFieldDef = this.schema.getFieldById(field.fieldId);
    const hasVariants = schemaFieldDef?.system?.items?.variants;
    const hasShape = field.shape || schemaFieldDef?.system?.items?.shape;
    const isComplexObject = (hasShape || hasVariants) && 
      (typeof value === 'object' && !Array.isArray(value) || 
       (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'));

    if (isComplexObject) {
      const subFields = this.shapeExpander.expandFieldWithShape(field, value, schemaFieldDef);
      // Inherit isAiGenerated on all subfields
      const taggedSubFields = subFields.map(sf => ({ ...sf, isAiGenerated }));
      return {
        ...field,
        value: value,
        status: FieldStatus.FILLED,
        confidence: 0.9,
        isAiGenerated,
        isParent: taggedSubFields.length > 0,
        subFields: taggedSubFields.length > 0 ? taggedSubFields : undefined
      };
    }

    return {
      ...field,
      value: value,
      status: this.isValueFilled(value) ? FieldStatus.FILLED : FieldStatus.EMPTY,
      confidence: 0.9,
      isAiGenerated
    };
  }

  /**
   * Get countable fields: all top-level fields that represent user-visible metadata.
   * Each parent with subfields counts as 1 field (not expanded).
   * Excludes internal fields like ccm:oeh_extendedType (content type selector).
   */
  private getCountableFields(fields: CanvasFieldState[]): CanvasFieldState[] {
    return fields.filter(f => f.fieldId !== 'ccm:oeh_extendedType');
  }

  private isValueFilled(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  private groupFields(fields: CanvasFieldState[]): FieldGroup[] {
    const groupsMap = new Map<string, FieldGroup>();

    for (const field of fields) {
      const key = `${field.schemaName}-${field.group}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          id: key,
          label: field.groupLabel,
          icon: field.groupIcon || '',
          schemaName: field.schemaName,
          fields: [],
          isCore: field.schemaName === 'Core'
        });
      }
      groupsMap.get(key)!.fields.push(field);
    }

    return Array.from(groupsMap.values())
      .sort((a, b) => {
        if (a.isCore && !b.isCore) return -1;
        if (!a.isCore && b.isCore) return 1;
        const orderA = a.fields[0]?.groupOrder ?? 999;
        const orderB = b.fields[0]?.groupOrder ?? 999;
        return orderA - orderB;
      });
  }

  // ===== Content Type Concepts =====

  getContentTypeConcepts(): any[] {
    return this.schema.getContentTypeConcepts();
  }
}

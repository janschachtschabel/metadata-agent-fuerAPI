import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { I18nService } from './i18n.service';
import { ApiService } from './api.service';
import { 
  FieldDefinition, 
  ContentType, 
  I18nString,
  VocabularyConcept 
} from '../shared/models/canvas.models';
import { environment } from '../../environments/environment';

interface ContextInfo {
  key: string;       // Context key for export/import (e.g. "default")
  name: string;      // Display name (e.g. "WLO/OEH Standard")
  version: string;
  basePath: string;
}

interface ContextEntry {
  name: string;
  description?: string;
  defaultVersion: string;
  path: string;
  basedOn?: string;
}

interface ContextRegistry {
  contexts: Record<string, ContextEntry>;
  defaultContext: string;
}

interface SchemaManifest {
  name: string;
  version: string;
  description?: I18nString;
  schemas: string[];
}

interface CoreSchema {
  fields: FieldDefinition[];
  groups: any[];
}

/**
 * Schema Service - Unified Schema Loading & Localization
 * Now loads schemas from the Metadata Agent API instead of local files
 */
@Injectable({ providedIn: 'root' })
export class SchemaService {
  private currentContext: ContextInfo | null = null;
  private coreSchema: CoreSchema | null = null;
  private contentTypeSchemas = new Map<string, FieldDefinition[]>();
  
  private ready$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private i18n: I18nService,
    private api: ApiService
  ) {}

  // ===== Initialization =====

  async ensureReady(): Promise<void> {
    if (this.ready$.value) return;
    
    // No registry loading needed - API provides schema info
    this.ready$.next(true);
  }

  // ===== Context Management =====

  async setContext(name: string, version?: string): Promise<void> {
    await this.ensureReady();

    // Use provided values or defaults from environment
    const contextName = name || (environment as any).defaultContext || 'default';
    const contextVersion = version || (environment as any).defaultVersion || 'latest';

    this.currentContext = {
      key: contextName,
      name: contextName,
      version: contextVersion,
      basePath: contextName
    };

    // Clear cached schemas
    this.coreSchema = null;
    this.contentTypeSchemas.clear();

    this.config.info(`Context set: ${contextName} v${contextVersion}`);
  }

  getContextName(): string {
    return this.currentContext?.key || 'default';
  }

  getSchemaVersion(): string {
    return this.currentContext?.version ? `v${this.currentContext.version}` : 'v1.8.0';
  }

  // ===== Schema Loading (via API) =====

  async loadCoreSchema(): Promise<CoreSchema> {
    if (this.coreSchema) return this.coreSchema;
    
    await this.ensureReady();
    
    if (!this.currentContext) {
      await this.setContext('default');
    }

    try {
      const context = this.currentContext!.key;
      const version = this.currentContext!.version;
      
      const response = await this.api.getSchema(context, version, 'core.json');
      this.coreSchema = { fields: response.fields as FieldDefinition[], groups: (response as any).groups || [] };
      this.config.debug(`Core schema loaded from API: ${this.coreSchema.fields.length} fields`);
      return this.coreSchema;
    } catch (error) {
      this.config.error('Failed to load core schema from API', error);
      throw error;
    }
  }

  async loadContentTypeSchema(schemaFile: string): Promise<FieldDefinition[]> {
    if (this.contentTypeSchemas.has(schemaFile)) {
      return this.contentTypeSchemas.get(schemaFile)!;
    }

    try {
      const context = this.currentContext?.key || 'default';
      const version = this.currentContext?.version || 'latest';
      
      const response = await this.api.getSchema(context, version, schemaFile);
      const fields = response.fields as FieldDefinition[];
      this.contentTypeSchemas.set(schemaFile, fields);
      this.config.debug(`Content type schema loaded from API: ${schemaFile}`);
      return fields;
    } catch (error) {
      this.config.error(`Failed to load schema from API: ${schemaFile}`, error);
      return [];
    }
  }

  // ===== Content Types =====

  async getContentTypes(): Promise<ContentType[]> {
    const core = await this.loadCoreSchema();
    const field = core.fields.find(f => f.id === 'ccm:oeh_extendedType');
    
    if (!field?.system?.vocabulary?.concepts) {
      return [];
    }

    const lang = this.i18n.currentLang;
    
    return field.system.vocabulary.concepts.map(concept => ({
      label: this.localize(concept.label, lang),
      schemaFile: concept.schema_file || '',
      uri: concept.uri || undefined,
      icon: concept.icon || 'category'
    }));
  }

  async getContentTypeBySchemaFile(schemaFile: string): Promise<ContentType | undefined> {
    // Ensure core schema is loaded
    await this.loadCoreSchema();
    
    if (!this.coreSchema) return undefined;
    
    const field = this.coreSchema.fields.find(f => f.id === 'ccm:oeh_extendedType');
    const concept = field?.system?.vocabulary?.concepts?.find(c => c.schema_file === schemaFile);
    
    if (!concept) return undefined;
    
    return {
      label: this.localize(concept.label, this.i18n.currentLang),
      schemaFile: concept.schema_file || '',
      uri: concept.uri || undefined,
      icon: concept.icon || 'category'
    };
  }

  async getContentTypeByUri(uri: string): Promise<ContentType | undefined> {
    await this.loadCoreSchema();
    
    if (!this.coreSchema) return undefined;
    
    const field = this.coreSchema.fields.find(f => f.id === 'ccm:oeh_extendedType');
    const concept = field?.system?.vocabulary?.concepts?.find(c => c.uri === uri);
    
    if (!concept) return undefined;
    
    return {
      label: this.localize(concept.label, this.i18n.currentLang),
      schemaFile: concept.schema_file || '',
      uri: concept.uri || undefined,
      icon: concept.icon || 'category'
    };
  }

  /**
   * Resolve a vocab URI or schema filename to a schema filename.
   * Accepts both 'event.json' and 'http://w3id.org/openeduhub/vocabs/contentTypes/event'.
   */
  resolveSchemaFileOrUri(schemaFileOrUri: string): string {
    if (!schemaFileOrUri.startsWith('http://') && !schemaFileOrUri.startsWith('https://')) {
      return schemaFileOrUri;
    }
    // Resolve URI to schema_file
    if (!this.coreSchema) return schemaFileOrUri;
    const field = this.coreSchema.fields.find(f => f.id === 'ccm:oeh_extendedType');
    const concept = field?.system?.vocabulary?.concepts?.find(c => c.uri === schemaFileOrUri);
    return concept?.schema_file || schemaFileOrUri;
  }

  // ===== Localization =====

  localize(text: I18nString | string | undefined, lang?: string): string {
    if (!text) return '';
    if (typeof text === 'string') return text;
    
    const language = lang || this.i18n.currentLang;
    return text[language] || text['de'] || text['en'] || Object.values(text)[0] || '';
  }

  localizeField(field: FieldDefinition, lang?: string): {
    label: string;
    description: string;
    examples: string[];
  } {
    const language = lang || this.i18n.currentLang;
    
    return {
      label: this.localize(field.label, language),
      description: this.localize(field.description, language),
      examples: this.localizeArray(field.examples, language)
    };
  }

  localizeVocabulary(vocabulary: any, lang?: string): VocabularyConcept[] {
    if (!vocabulary?.concepts) return [];
    
    const language = lang || this.i18n.currentLang;
    
    return vocabulary.concepts.map((concept: any) => ({
      ...concept,
      label: this.localize(concept.label, language),
      description: concept.description 
        ? this.localize(concept.description, language)
        : undefined
    }));
  }

  private localizeArray(arr: any, lang: string): string[] {
    if (!arr) return [];
    if (!Array.isArray(arr)) return [];
    return arr.map(item => this.localize(item, lang));
  }

  // ===== Field Helpers =====

  getFieldById(fieldId: string): FieldDefinition | undefined {
    // First check core schema
    const coreField = this.coreSchema?.fields.find(f => f.id === fieldId);
    if (coreField) return coreField;
    
    // Then check all loaded content type schemas
    for (const fields of this.contentTypeSchemas.values()) {
      const field = fields.find(f => f.id === fieldId);
      if (field) return field;
    }
    
    return undefined;
  }

  getCoreFields(): FieldDefinition[] {
    return this.coreSchema?.fields || [];
  }

  // ===== Extended Methods for CanvasService =====

  async getFields(schemaFile: string): Promise<any[] | null> {
    if (schemaFile === 'core.json') {
      const core = await this.loadCoreSchema();
      return core?.fields || null;
    }
    return this.loadContentTypeSchema(schemaFile);
  }

  async getGroups(schemaFile: string): Promise<any[]> {
    // Use cached core schema groups if available
    if (schemaFile === 'core.json' && this.coreSchema) {
      return this.coreSchema.groups;
    }
    try {
      const context = this.currentContext?.key || 'default';
      const version = this.currentContext?.version || 'latest';
      const response = await this.api.getSchema(context, version, schemaFile);
      return (response as any).groups || [];
    } catch {
      return [];
    }
  }

  async getOutputTemplate(schemaFile: string): Promise<Record<string, any> | null> {
    try {
      const context = this.currentContext?.key || 'default';
      const version = this.currentContext?.version || 'latest';
      const response = await this.api.getSchema(context, version, schemaFile);
      return (response as any).output_template || {};
    } catch {
      return {};
    }
  }

  getActiveLanguage(): 'de' | 'en' {
    return (this.i18n.currentLang === 'en' ? 'en' : 'de') as 'de' | 'en';
  }

  localizeString(value: any, lang?: string): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    const language = lang || this.i18n.currentLang;
    return value[language] || value['de'] || value['en'] || Object.values(value)[0] || '';
  }

  getFallbackGroupLabel(lang?: string): string {
    const language = lang || this.i18n.currentLang;
    return language === 'en' ? 'Other' : 'Sonstige';
  }

  getContentTypeConcepts(): any[] {
    if (!this.coreSchema) return [];
    const field = this.coreSchema.fields.find(f => f.id === 'ccm:oeh_extendedType');
    if (!field?.system?.vocabulary?.concepts) return [];
    
    const lang = this.i18n.currentLang;
    return field.system.vocabulary.concepts.map(concept => ({
      ...concept,
      label: this.localizeString(concept.label, lang),
      description: concept.description ? this.localizeString(concept.description, lang) : ''
    }));
  }

  // Extended localizeField for CanvasService (with vocabulary and prompt)
  localizeFieldFull(field: any, lang?: string): any {
    const language = lang || this.i18n.currentLang;
    
    return {
      label: this.localizeString(field.label, language),
      description: this.localizeString(field.description, language),
      examples: this.localizeArray(field.examples, language),
      vocabulary: field.system?.vocabulary ? this.localizeVocabularyFull(field.system.vocabulary, language) : undefined,
      prompt: this.localizeString(field.prompt, language)
    };
  }

  private localizeVocabularyFull(vocabulary: any, lang: string): any {
    if (!vocabulary?.concepts) return undefined;
    
    return {
      type: vocabulary.type || 'open',
      hierarchical: vocabulary.hierarchical || false,
      concepts: vocabulary.concepts.map((concept: any) => ({
        ...concept,
        label: this.localizeString(concept.label, lang),
        description: concept.description ? this.localizeString(concept.description, lang) : undefined,
        altLabels: concept.altLabels || [],
        broader: concept.broader || undefined
      }))
    };
  }
}

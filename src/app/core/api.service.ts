import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { environment } from '../../environments/environment';

export interface SchemaInfo {
  contextName: string;
  schemaVersion: string;
  schemas: string[];
}

export interface SchemaField {
  id: string;
  group?: string;
  group_label?: { de: string; en: string };
  label: { de: string; en: string };
  description?: { de: string; en: string };
  system: {
    path: string;
    datatype: string;
    multiple: boolean;
    required: boolean;
    ai_fillable?: boolean;
    vocabulary?: any;
    validation?: any;
  };
}

export interface GenerateRequest {
  input_source?: 'text' | 'url' | 'node_id' | 'node_url';
  text?: string;
  source_url?: string;
  extraction_method?: 'simple' | 'browser';
  node_id?: string;
  repository?: 'staging' | 'prod';
  context?: string;
  version?: string;
  schema_file?: string;
  existing_metadata?: Record<string, any>;
  language?: string;
  max_workers?: number;
  include_core?: boolean;
  enable_geocoding?: boolean;
  normalize?: boolean;
  regenerate_fields?: string[];
  regenerate_empty?: boolean;
  llm_provider?: string;
  llm_model?: string;
  preview_url?: string;
  screenshot_method?: 'pageshot' | 'playwright';
}

// Raw API response has fields at root level
export interface GenerateResponseRaw {
  contextName: string;
  schemaVersion: string;
  metadataset: string;
  metadataset_uri?: string;
  language: string;
  exportedAt: string;
  processing: {
    success: boolean;
    fields_extracted: number;
    fields_total: number;
    processing_time_ms: number;
    llm_provider: string;
    llm_model: string;
    errors: string[];
    warnings: string[];
  };
  [key: string]: any; // Metadata fields at root level
}

// Normalized response with metadata nested
export interface GenerateResponse {
  contextName: string;
  schemaVersion: string;
  metadataset: string;
  metadataset_uri?: string;
  language: string;
  exportedAt: string;
  metadata: Record<string, any>;
  preview_image_url?: string;
  processing: {
    success: boolean;
    fields_extracted: number;
    fields_total: number;
    processing_time_ms: number;
    llm_provider: string;
    llm_model: string;
    errors: string[];
    warnings: string[];
  };
}

export interface ValidateRequest {
  metadata: Record<string, any>;
  context?: string;
  version?: string;
  schema_file?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    type: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface ExtractFieldRequest {
  text?: string;
  source_url?: string;
  input_source?: 'text' | 'url';
  context?: string;
  version?: string;
  schema_file: string;
  field_id: string;
  existing_metadata?: Record<string, any>;
  language?: string;
  normalize?: boolean;
  llm_provider?: string;
  llm_model?: string;
}

export interface ExtractFieldResponse {
  field_id: string;
  field_label: string;
  value: any;
  raw_value?: any;
  previous_value?: any;
  changed: boolean;
  normalized: boolean;
  context: string;
  version: string;
  schema_file: string;
  processing_time_ms: number;
}

export interface ContentTypeInfo {
  label: string;
  schemaFile: string;
  icon?: string;
  description?: string;
}

export interface ScreenshotRequest {
  url: string;
  method?: 'pageshot' | 'playwright';
  width?: number;
  height?: number;
  format?: string;
}

export interface ScreenshotResponse {
  success: boolean;
  method: string;
  url: string;
  format: string;
  mimetype: string;
  width: number;
  height: number;
  size_bytes: number;
  capture_time_ms: number;
  image_base64?: string;
}

export interface UploadRequest {
  metadata: Record<string, any>;
  repository?: 'staging' | 'prod';
  check_duplicates?: boolean;
  start_workflow?: boolean;
  write_extended_data?: boolean;
  extended_text?: string;
}

export interface UploadNodeInfo {
  nodeId: string;
  title?: string;
  description?: string;
  wwwurl?: string;
  repositoryUrl?: string;
}

export interface UploadResponse {
  success: boolean;
  duplicate?: boolean;
  repository?: string;
  node?: UploadNodeInfo;
  error?: string;
  step?: string;
}

/**
 * API Service - Communication with Metadata Agent API
 * Handles all backend interactions for schema loading and metadata operations
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl: string = '';

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {
    this.apiUrl = (environment as any).apiUrl || '';
  }

  setApiUrl(url: string): void {
    this.apiUrl = url.replace(/\/$/, ''); // Remove trailing slash
    this.logger.info(`API URL set to: ${this.apiUrl}`);
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // ===== Schema Endpoints =====

  /**
   * Get list of available schemas for a context
   */
  async getSchemaList(context: string = 'default', version: string = 'latest'): Promise<SchemaInfo> {
    const url = `${this.apiUrl}/info/schemas/${context}/${version}`;
    this.logger.debug(`Fetching schema list: ${url}`);
    
    try {
      const response = await firstValueFrom(
        this.http.get<SchemaInfo>(url, { headers: this.getHeaders() })
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to fetch schema list', error);
      throw error;
    }
  }

  /**
   * Get a specific schema file
   */
  async getSchema(context: string, version: string, schemaFile: string): Promise<{ fields: SchemaField[] }> {
    const url = `${this.apiUrl}/info/schema/${context}/${version}/${schemaFile}`;
    this.logger.debug(`Fetching schema: ${url}`);
    
    try {
      const response = await firstValueFrom(
        this.http.get<{ fields: SchemaField[] }>(url, { headers: this.getHeaders() })
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch schema ${schemaFile}`, error);
      throw error;
    }
  }

  /**
   * Get all available content types for a context
   */
  async getContentTypes(context: string = 'default', version: string = 'latest'): Promise<ContentTypeInfo[]> {
    const schemaInfo = await this.getSchemaList(context, version);
    
    // Filter out core.json and map to ContentTypeInfo
    return schemaInfo.schemas
      .filter(s => s !== 'core.json')
      .map(schemaFile => ({
        label: schemaFile.replace('.json', ''),
        schemaFile: schemaFile
      }));
  }

  // ===== Metadata Endpoints =====

  /**
   * Generate metadata from text or URL
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.apiUrl}/generate`;
    this.logger.debug('Generating metadata', request);
    
    try {
      const rawResponse = await firstValueFrom(
        this.http.post<GenerateResponseRaw>(url, request, { headers: this.getHeaders() })
      );
      
      // Extract metadata fields from root level (API returns them flat)
      const metadata: Record<string, any> = {};
      const systemKeys = ['contextName', 'schemaVersion', 'metadataset', 'metadataset_uri', 'language', 'exportedAt', 'processing', 'preview_image_url'];
      
      for (const [key, value] of Object.entries(rawResponse)) {
        if (!systemKeys.includes(key)) {
          metadata[key] = value;
        }
      }
      
      const response: GenerateResponse = {
        contextName: rawResponse.contextName,
        schemaVersion: rawResponse.schemaVersion,
        metadataset: rawResponse.metadataset,
        metadataset_uri: rawResponse.metadataset_uri,
        language: rawResponse.language,
        exportedAt: rawResponse.exportedAt,
        processing: rawResponse.processing,
        metadata: metadata,
        preview_image_url: (rawResponse as any).preview_image_url || undefined
      };
      
      this.logger.info(`Metadata generated: ${response.processing.fields_extracted}/${response.processing.fields_total} fields`);
      return response;
    } catch (error) {
      this.logger.error('Failed to generate metadata', error);
      throw error;
    }
  }

  /**
   * Validate metadata against schema
   */
  async validate(request: ValidateRequest): Promise<ValidationResult> {
    const url = `${this.apiUrl}/validate`;
    this.logger.debug('Validating metadata', request);
    
    try {
      const response = await firstValueFrom(
        this.http.post<ValidationResult>(url, request, { headers: this.getHeaders() })
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to validate metadata', error);
      throw error;
    }
  }

  /**
   * Export metadata as Markdown
   */
  async exportMarkdown(metadata: Record<string, any>, context: string = 'default', version: string = 'latest'): Promise<string> {
    const url = `${this.apiUrl}/export/markdown`;
    
    try {
      const response = await firstValueFrom(
        this.http.post<{ markdown: string }>(url, {
          metadata,
          context,
          version
        }, { headers: this.getHeaders() })
      );
      return response.markdown;
    } catch (error) {
      this.logger.error('Failed to export markdown', error);
      throw error;
    }
  }

  // ===== Single Field Extraction =====

  /**
   * Extract/normalize a single field via LLM
   */
  async extractField(request: ExtractFieldRequest): Promise<ExtractFieldResponse> {
    const url = `${this.apiUrl}/extract-field`;
    this.logger.debug('Extracting single field', request);
    
    try {
      const response = await firstValueFrom(
        this.http.post<ExtractFieldResponse>(url, request, { headers: this.getHeaders() })
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to extract field ${request.field_id}`, error);
      throw error;
    }
  }

  // ===== Repository Upload =====

  /**
   * Upload metadata to WLO repository via FastAPI backend.
   * Credentials are handled server-side — no guest user needed in frontend.
   */
  async upload(request: UploadRequest): Promise<UploadResponse> {
    const url = `${this.apiUrl}/upload`;
    this.logger.debug('Uploading metadata to repository', { repository: request.repository });
    
    try {
      const response = await firstValueFrom(
        this.http.post<UploadResponse>(url, request, { headers: this.getHeaders() })
      );
      if (response.success) {
        this.logger.info(`Upload successful: ${response.node?.nodeId}`);
      } else {
        this.logger.warn(`Upload failed: ${response.error}`);
      }
      return response;
    } catch (error) {
      this.logger.error('Failed to upload metadata', error);
      throw error;
    }
  }

  // ===== Screenshot =====

  /**
   * Capture a screenshot of a URL and return as base64 data URL
   */
  async captureScreenshot(url: string, method: 'pageshot' | 'playwright' = 'pageshot'): Promise<string | null> {
    const endpoint = `${this.apiUrl}/screenshot`;
    this.logger.debug(`📸 Capturing screenshot: ${url} (${method})`);
    
    try {
      const response = await firstValueFrom(
        this.http.post<ScreenshotResponse>(endpoint, {
          url,
          method,
          width: 1280,
          height: 900,
          format: 'png'
        }, { headers: this.getHeaders() })
      );
      
      if (response.success && response.image_base64) {
        const dataUrl = `data:${response.mimetype};base64,${response.image_base64}`;
        this.logger.info(`📸 Screenshot captured: ${response.size_bytes} bytes (${response.capture_time_ms}ms)`);
        return dataUrl;
      }
      this.logger.warn('Screenshot response without image data');
      return null;
    } catch (error) {
      this.logger.error('Screenshot capture failed', error);
      return null;
    }
  }

  // ===== Health Check =====

  async healthCheck(): Promise<{ status: string; version: string }> {
    const url = `${this.apiUrl}/health`;
    
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; version: string }>(url)
      );
      return response;
    } catch (error) {
      this.logger.error('API health check failed', error);
      throw error;
    }
  }
}

/**
 * Shape Expander Service
 * Expands fields with complex shapes into editable sub-fields
 * Handles nested objects like Place with address, geo coordinates, etc.
 * Ported from metadata-agent-canvas-optimized
 */

import { Injectable } from '@angular/core';
import { CanvasFieldState, FieldStatus } from '../shared/models/canvas.models';
import { SchemaService } from './schema.service';

@Injectable({
  providedIn: 'root'
})
export class ShapeExpanderService {

  constructor(private schema: SchemaService) {}

  expandFieldWithShape(parentField: CanvasFieldState, extractedValue: any, schemaFieldDef?: any): CanvasFieldState[] {
    if (!parentField.shape && !schemaFieldDef?.system?.items?.variants) {
      return [];
    }

    const subFields: CanvasFieldState[] = [];
    const language = this.schema.getActiveLanguage();

    if (Array.isArray(extractedValue)) {
      extractedValue.forEach((item, index) => {
        const itemSubFields = this.createSubFieldsFromObject(
          parentField, item, index,
          parentField.shape || schemaFieldDef,
          schemaFieldDef, language
        );
        subFields.push(...itemSubFields);
      });
    } else if (typeof extractedValue === 'object' && extractedValue !== null) {
      const itemSubFields = this.createSubFieldsFromObject(
        parentField, extractedValue, 0,
        parentField.shape || schemaFieldDef,
        schemaFieldDef, language
      );
      subFields.push(...itemSubFields);
    }

    return subFields;
  }

  private createSubFieldsFromObject(
    parentField: CanvasFieldState,
    objectValue: any,
    arrayIndex: number,
    shapeDefinition: any,
    schemaFieldDef: any,
    language: 'de' | 'en'
  ): CanvasFieldState[] {
    const subFields: CanvasFieldState[] = [];

    if (schemaFieldDef?.system?.items?.variants) {
      const variants = schemaFieldDef.system.items.variants;
      const matchedVariant = this.findMatchingVariant(objectValue, variants) || variants[0];
      
      if (matchedVariant?.fields) {
        matchedVariant.fields.forEach((fieldDef: any) => {
          const fieldValue = objectValue[fieldDef.id];
          this.expandFieldRecursively(
            parentField, fieldDef, fieldValue, '', arrayIndex, language, subFields
          );
        });
      }
    } else {
      let activeShape = shapeDefinition;
      if (shapeDefinition.oneOf && Array.isArray(shapeDefinition.oneOf)) {
        const matchedShape = this.findMatchingShape(objectValue, shapeDefinition.oneOf);
        activeShape = matchedShape || shapeDefinition.oneOf[0];
      }

      Object.keys(activeShape).forEach(key => {
        if (key === 'oneOf' || key === '@type') return;

        const propertyDef = activeShape[key];
        const propertyValue = objectValue[key];

        if (typeof propertyDef === 'object' && !Array.isArray(propertyDef)) {
          const nestedKeys = Object.keys(propertyDef);
          if (nestedKeys.length > 0 && nestedKeys[0] !== 'type') {
            Object.keys(propertyDef).forEach(nestedKey => {
              const nestedValue = propertyValue && typeof propertyValue === 'object' 
                ? propertyValue[nestedKey] : null;
              const subField = this.createSubField(
                parentField, `${key}.${nestedKey}`, this.formatLabel(nestedKey),
                propertyDef[nestedKey], nestedValue, arrayIndex
              );
              subFields.push(subField);
            });
            return;
          }
        }

        const subField = this.createSubField(
          parentField, key, this.formatLabel(key),
          propertyDef, propertyValue, arrayIndex
        );
        subFields.push(subField);
      });
    }

    return subFields;
  }

  private expandFieldRecursively(
    parentField: CanvasFieldState,
    fieldDef: any,
    fieldValue: any,
    pathPrefix: string,
    arrayIndex: number,
    language: 'de' | 'en',
    subFields: CanvasFieldState[]
  ): void {
    const fullPath = pathPrefix ? `${pathPrefix}.${fieldDef.id}` : fieldDef.id;
    
    const subField = this.createSubFieldFromSchema(
      parentField, fullPath, fieldDef, fieldValue, arrayIndex, language
    );
    subFields.push(subField);

    if (fieldDef.fields && Array.isArray(fieldDef.fields) && fieldDef.fields.length > 0) {
      fieldDef.fields.forEach((nestedFieldDef: any) => {
        const nestedValue = fieldValue && typeof fieldValue === 'object'
          ? fieldValue[nestedFieldDef.id] : null;
        
        this.expandFieldRecursively(
          parentField, nestedFieldDef, nestedValue, fullPath, arrayIndex, language, subFields
        );
      });
    }
  }

  private findMatchingVariant(objectValue: any, variants: any[]): any {
    if (objectValue['@type']) {
      const match = variants.find(v => v['@type'] === objectValue['@type']);
      if (match) return match;
    }
    return variants[0];
  }

  private findMatchingShape(objectValue: any, oneOfShapes: any[]): any {
    if (objectValue['@type']) {
      const match = oneOfShapes.find(shape => shape['@type'] === objectValue['@type']);
      if (match) return match;
    }

    let bestMatch = oneOfShapes[0];
    let maxMatches = 0;

    oneOfShapes.forEach(shape => {
      const shapeKeys = Object.keys(shape).filter(k => k !== '@type' && k !== 'oneOf');
      const objectKeys = Object.keys(objectValue);
      const matches = shapeKeys.filter(k => objectKeys.includes(k)).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = shape;
      }
    });

    return bestMatch;
  }

  private createSubFieldFromSchema(
    parentField: CanvasFieldState,
    propertyPath: string,
    fieldDef: any,
    value: any,
    arrayIndex: number,
    language: 'de' | 'en'
  ): CanvasFieldState {
    const fullPath = arrayIndex > 0 
      ? `${parentField.fieldId}[${arrayIndex}].${propertyPath}`
      : `${parentField.fieldId}.${propertyPath}`;

    const label = this.schema.localizeString(fieldDef.label, language) || this.formatLabel(fieldDef.id);
    const description = this.schema.localizeString(fieldDef.description, language) || '';
    const datatype = fieldDef.system?.datatype || 'string';
    const hasNestedFields = fieldDef.fields && Array.isArray(fieldDef.fields) && fieldDef.fields.length > 0;

    return {
      fieldId: fullPath,
      uri: fieldDef.system?.uri || `${parentField.uri}#${propertyPath}`,
      label: label,
      description: description,
      group: parentField.group,
      groupLabel: parentField.groupLabel,
      groupOrder: parentField.groupOrder,
      schemaName: parentField.schemaName,
      aiFillable: fieldDef.system?.ai_fillable !== false,
      repoField: parentField.repoField,
      status: value !== null && value !== undefined ? FieldStatus.FILLED : FieldStatus.EMPTY,
      value: value,
      confidence: value !== null && value !== undefined ? 1.0 : 0,
      isRequired: fieldDef.system?.required || false,
      datatype: datatype,
      multiple: fieldDef.system?.multiple || false,
      parentFieldId: parentField.fieldId,
      parentFieldLabel: parentField.label,
      path: propertyPath,
      arrayIndex: arrayIndex,
      isParent: hasNestedFields,
      validation: fieldDef.system?.validation,
      normalization: fieldDef.system?.normalization,
      vocabulary: fieldDef.system?.vocabulary ? {
        type: fieldDef.system.vocabulary.type || 'open',
        concepts: this.schema.localizeVocabulary(fieldDef.system.vocabulary, language)
      } : undefined
    };
  }

  private createSubField(
    parentField: CanvasFieldState,
    propertyPath: string,
    label: string,
    typeDef: any,
    value: any,
    arrayIndex: number
  ): CanvasFieldState {
    const datatype = this.inferDatatype(typeDef);
    const fullPath = arrayIndex > 0 
      ? `${parentField.fieldId}[${arrayIndex}].${propertyPath}`
      : `${parentField.fieldId}.${propertyPath}`;

    return {
      fieldId: fullPath,
      uri: `${parentField.uri}#${propertyPath}`,
      label: label,
      description: `Sub-field of ${parentField.label}`,
      repoField: parentField.repoField,
      group: parentField.group,
      groupLabel: parentField.groupLabel,
      groupOrder: parentField.groupOrder,
      schemaName: parentField.schemaName,
      aiFillable: false,
      status: value !== null && value !== undefined ? FieldStatus.FILLED : FieldStatus.EMPTY,
      value: value,
      confidence: value !== null && value !== undefined ? 1.0 : 0,
      isRequired: false,
      datatype: datatype,
      multiple: false,
      parentFieldId: parentField.fieldId,
      parentFieldLabel: parentField.label,
      path: propertyPath,
      arrayIndex: arrayIndex
    };
  }

  private inferDatatype(typeDef: any): string {
    if (typeof typeDef === 'string') {
      switch (typeDef) {
        case 'number': return 'number';
        case 'integer': return 'integer';
        case 'boolean': return 'boolean';
        case 'uri': case 'url': return 'uri';
        case 'date': return 'date';
        default: return 'string';
      }
    }
    return 'string';
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  reconstructObjectFromSubFields(parentField: CanvasFieldState, allFields: CanvasFieldState[]): any {
    let subFields: CanvasFieldState[] = [];
    
    if (parentField.subFields && parentField.subFields.length > 0) {
      subFields = parentField.subFields;
    } else {
      subFields = allFields.filter(f => f.parentFieldId === parentField.fieldId);
    }

    if (subFields.length === 0) {
      return parentField.value;
    }

    const groupedByIndex = new Map<number, CanvasFieldState[]>();
    subFields.forEach(field => {
      const index = field.arrayIndex || 0;
      if (!groupedByIndex.has(index)) {
        groupedByIndex.set(index, []);
      }
      groupedByIndex.get(index)!.push(field);
    });

    const reconstructedObjects: any[] = [];
    groupedByIndex.forEach((fields) => {
      const obj = this.buildObjectFromFields(fields);
      reconstructedObjects.push(obj);
    });

    return parentField.multiple ? reconstructedObjects : reconstructedObjects[0];
  }

  private buildObjectFromFields(fields: CanvasFieldState[]): any {
    const result: any = {};
    const containerPaths = new Set<string>();

    fields.forEach(field => {
      if (field.path && field.path.includes('.')) {
        const pathParts = field.path.split('.');
        for (let i = 1; i < pathParts.length; i++) {
          const containerPath = pathParts.slice(0, i).join('.');
          containerPaths.add(containerPath);
        }
      }
    });

    fields.forEach(field => {
      if (!field.path) return;

      const pathParts = field.path.split('.');
      let current = result;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = pathParts[pathParts.length - 1];
      
      if (field.isParent) {
        if (field.value === null || field.value === undefined) {
          current[lastPart] = {};
        } else if (typeof field.value === 'object' && !Array.isArray(field.value)) {
          current[lastPart] = field.value;
        } else {
          current[lastPart] = field.value;
        }
      } else if (field.value !== null && field.value !== undefined) {
        current[lastPart] = field.value;
      }
    });

    containerPaths.forEach(containerPath => {
      const pathParts = containerPath.split('.');
      let current = result;
      for (const part of pathParts) {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });

    return result;
  }
}

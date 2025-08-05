
/**
 * @file types.ts
 * @description This file defines the core type system for the iLog application, including:
 * - Base type definitions for instruments and components
 * - Schema structures for different entity types
 * - Type definitions and vocabularies for the iLog system
 * - Utility functions for managing and merging property types
 * 
 * The iLog system uses a flexible type system where different entities (instruments, components,
 * logbook entries) have defined schemas with property groups. These definitions control
 * how entities are created, validated, and displayed in the application.
 * 
 * @module iLog/shared/types
 * 
 * @exports iLogBaseTypes - Available base types in the system ("INSTRUMENT", "COMPONENT")
 * @exports iLogBaseSchema - Common property schema shared by base types
 * @exports COMPONENT_TYPE_DEFINITION - Complete type definition for components
 * @exports INSTRUMENT_TYPE_DEFINITION - Complete type definition for instruments
 * @exports LOGBOOK_ENTRY_TYPE_DEFINITION - Base type definition for logbook entries
 * @exports LOGBOOK_ENTRY_TYPES - Dynamically generated logbook entry type definitions
 * @exports getDefaultPropertyTypes - Function to get property types based on base type
 * @exports getDefaultPropertyTypeDefintion - Function to get complete type definition by base type
 * @exports mergePropertyTypes - Utility to merge multiple property type schemas
 * 
 * @see logbookEntryTypes.json - Configuration for logbook entry types
 */


import { PropertyTypesSchema, ObjectTypeDefinition } from "../type/commonType";
import { Vocabulary } from "../vocabulary/commonVocabulary";
import { PropertyType } from "../propertyType/commonPropertyType";
import { iLogID, iLogLogbookID } from "./environment";
import logbookEntryTypesConfig from "./logbookEntryTypes.json";


// Base type settings
export const iLogBaseTypesPropertyCode = "ILOG_TYPE_BASE";
export const iLogBaseTypes = ["INSTRUMENT", "COMPONENT"] as const;
export const iLogBaseTypesVocabularyID = "ILOG_BASE_TYPES";
export const iLogGeneralInfoGroup = "General Info";
export const iLogLocationGroup = "Location";
export const iLogManufacturerGroup = "Manufacturer";

// Schema definitions for iLog base types
export const iLogBaseSchema: PropertyTypesSchema = {
  [iLogGeneralInfoGroup]: [
    { code: "$NAME", type: "reference" },
    { code: iLogID, type: "reference" },
    { code: iLogBaseTypesPropertyCode, type: "reference" },
    {
      code: "VALID_FROM",
      type: "local",
      multivalued: false,
      dataType: "VARCHAR",
      label: "ValidFrom",
      description: "ValidFrom",
      metadata: null,
    },
    {
      code: "DESCRIPTION",
      type: "local",
      multivalued: false,
      dataType: "VARCHAR",
      label: "Description",
      description: "Description",
      metadata: null,
    },
    {
      code: "RESPONSIBLE",
      type: "local",
      multivalued: true,
      dataType: "VARCHAR",
      label: "Responsible",
      description: "Responsible",
      metadata: null,
    },
    {
      code: "SERIALNUMBER",
      label: "Serial number",
      description: "Serial number",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
      metadata: null,
    },
    {
      code: "EMPAID",
      dataType: "VARCHAR",
      label: "Empa ID",
      description: "Empa ID",
      type: "local",
      multivalued: false,
      metadata: null,
    },
  ],
  [iLogLocationGroup]: [
    {
      code: "LOCATION",
      dataType: "VARCHAR",
      label: "Location",
      description: "Location",
      type: "local",
      multivalued: false,
      metadata: null,
    },
  ],
  [iLogManufacturerGroup]: [
    {
      code: "MANUFACTURER",
      label: "Manufacturer",
      description: "Manufacturer",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
      metadata: null,
    },
    {
      code: "MANUFACTURERID",
      label: "Manufacturer ID",
      description: "Manufacturer ID",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
      metadata: null,
    },
  ],
};

// Empty schema and type definition
export const EMPTY_SCHEMA: PropertyTypesSchema = {};
export const EMPTY_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "",
  generatedCodePrefix: "",
  description: "",
  propertyTypes: EMPTY_SCHEMA,
};

// Component schema and type definition
export const COMPONENT_SCHEMA: PropertyTypesSchema = iLogBaseSchema;
export const COMPONENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "COMPONENT",
  generatedCodePrefix: "COMPONENT",
  description: "Component",
  propertyTypes: COMPONENT_SCHEMA,
  baseType: "ILOG"
};

// Instrument schema and type definition
export const INSTRUMENT_SCHEMA: PropertyTypesSchema = {
  ...iLogBaseSchema,
  ["Components"]: [ ],
};
export const INSTRUMENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "INSTRUMENT",
  generatedCodePrefix: "INSTRUMENT",
  description: "Instrument",
  propertyTypes: INSTRUMENT_SCHEMA,
  baseType: "ILOG"
};

//Define base properties for logbook entires
export const logbookBaseSchema: PropertyTypesSchema = {
  [iLogGeneralInfoGroup]: [
    { code: "$NAME", type: "reference" },
    { code: iLogLogbookID, type: "reference" },
    {
      code: "VALID_FROM",
      type: "local",
      multivalued: false,
      dataType: "VARCHAR",
      label: "ValidFrom",
      description: "ValidFrom",
      metadata: null,
    },
    {
      code: "DESCRIPTION",
      type: "local",
      multivalued: false,
      dataType: "VARCHAR",
      label: "Description",
      description: "Description",
      metadata: null,
    },
    {
      code: "RESPONSIBLE",
      type: "local",
      multivalued: true,
      dataType: "VARCHAR",
      label: "Responsible",
      description: "Responsible",
      metadata: null,
    },
    {
      code: "INVOLVEDEQUIPMENT",
      type: "local",
      multivalued: true,
      dataType: "VARCHAR",
      label: "Involved Equipment",
      description: "Involved Equipment",
      metadata: null,
    },
    {
      code: "COMPONENT",
      type: "local",
      multivalued: true,
      dataType: "VARCHAR",
      label: "Component",
      description: "Component (most directly involved)",
      metadata: null,
    },
  ]
};

export const LOGBOOK_ENTRY_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "LOGBOOK_ENTRY",
  generatedCodePrefix: "ENTRY",
  description: "Ilog Logbook Entry",
  propertyTypes: logbookBaseSchema,
};

// Import the dynamically generated logbook entry types
const generateLogbookEntryTypes = (): Record<string, ObjectTypeDefinition> => {
  const logbookEntryTypes: Record<string, ObjectTypeDefinition> = {};
  
  logbookEntryTypesConfig.logbookEntryTypes.forEach(({ key, code, generatedCodePrefix, description, color = "rgba(211, 211, 211, 0.5)" }) => {
    logbookEntryTypes[key] = {
      code,
      generatedCodePrefix,
      description,
      propertyTypes: logbookBaseSchema,
      color,
    };
  });
  
  return logbookEntryTypes;
};

export const LOGBOOK_ENTRY_TYPES: Record<string, ObjectTypeDefinition> = generateLogbookEntryTypes();


// Type definitions for iLog base types
export type iLogBaseTypesType = (typeof iLogBaseTypes)[number];
export type iLogBaseAllTypes = iLogBaseTypesType | "EMPTY";

// Vocabulary for iLog base types
export const ILOG_BASE_TYPES_VOCABULARY: Vocabulary = {
  code: iLogBaseTypesVocabularyID,
  terms: [
    { code: iLogBaseTypes[0], description: "Instrument", label: "Instrument" },
    { code: iLogBaseTypes[1], description: "Component", label: "Component" },
  ],
};

// Property type for iLog base types
export const ILOG_BASE_TYPES_PROPERTY: PropertyType = {
  code: iLogBaseTypesPropertyCode,
  description: "iLog base type property",
  label: "iLog base type property",
  type: "local",
  dataType: "CONTROLLEDVOCABULARY",
  vocabulary: iLogBaseTypesVocabularyID,
  multivalued: false,
  metadata: null,
};

// Default iLog types
export const getDefaultPropertyTypes = (
  baseType: iLogBaseTypesType
) => {
  switch (baseType) {
    case "INSTRUMENT":
      return INSTRUMENT_TYPE_DEFINITION.propertyTypes;
    case "COMPONENT":
      return COMPONENT_TYPE_DEFINITION.propertyTypes;
  }
};

export const getDefaultPropertyTypeDefintion = (
  baseType: iLogBaseAllTypes
) => {
  switch (baseType) {
    case "INSTRUMENT":
      return INSTRUMENT_TYPE_DEFINITION;
    case "COMPONENT":
      return COMPONENT_TYPE_DEFINITION;
    case "EMPTY":
      return EMPTY_TYPE_DEFINITION;
  }
};

export const mergePropertyTypes = (
  schemas: PropertyTypesSchema[]
): PropertyTypesSchema => {
  const mergedSchema: PropertyTypesSchema = {};
  schemas.forEach((schema) => {
    Object.keys(schema).forEach((group) => {
      if (!mergedSchema[group]) mergedSchema[group] = [];
      mergedSchema[group] = [
        ...mergedSchema[group],
        ...schema[group].filter(
          (item) => !mergedSchema[group].some((existing) => existing.code === item.code)
        ),
      ]; });
  });
  return mergedSchema;
}

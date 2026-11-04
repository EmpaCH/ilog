
import { PropertyTypesSchema, ObjectTypeDefinition } from "../type/commonType";
import { Vocabulary } from "../vocabulary/commonVocabulary";
import { PropertyType } from "../propertyType/commonPropertyType";
import { iLogID } from "./environment";
import {
  categoryMetadataKey,
  componentCategory,
  instrumentCategory,
  logbookEntryCategory,
} from "./category";

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
    { code: "NAME", type: "reference" },
    {
      code: "DESCRIPTION",
      type: "local",
      multivalued: false,
      dataType: "VARCHAR",
      label: "Description",
      description: "Description",
      metadata: null,
    }
  ],
};

// Empty schema and type definition
export const EMPTY_SCHEMA: PropertyTypesSchema = {};
export const EMPTY_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "",
  generatedCodePrefix: "",
  description: "",
  propertyTypes: EMPTY_SCHEMA,
  category: "",
};

// Component schema and type definition
export const COMPONENT_SCHEMA: PropertyTypesSchema = {
  ...iLogBaseSchema,
  [iLogGeneralInfoGroup]: [
    ...iLogBaseSchema[iLogGeneralInfoGroup],
    {
      code: "LOCATION",
      type: "local",
      multivalued: false,
      dataType: "OBJECT",
      objectType: "",
      label: "Location",
      description: "Location",
      metadata: null,
    },
  ],
};

export const COMPONENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "COMPONENT",
  generatedCodePrefix: "COMPONENT",
  description: "Component",
  propertyTypes: COMPONENT_SCHEMA,
  baseType: "ILOG",
  category: componentCategory,
};

// Instrument schema and type definition
export const INSTRUMENT_SCHEMA: PropertyTypesSchema = {
  ...iLogBaseSchema,
  ["Components"]: [],
};
export const INSTRUMENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "INSTRUMENT",
  generatedCodePrefix: "INSTRUMENT",
  description: "Instrument",
  propertyTypes: INSTRUMENT_SCHEMA,
  baseType: "ILOG",
  category: instrumentCategory,
};
// Logbook entry schema and type definition.
// Logbook entry types are recognized by their category, entries by being stored in the logbook collection.
// VALID_FROM is always written by the logbook entry creator.
export const LOGBOOK_ENTRY_SCHEMA: PropertyTypesSchema = {
  [iLogGeneralInfoGroup]: [
    { code: "NAME", type: "reference" },
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
  ],
};

export const LOGBOOK_ENTRY_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "LOGBOOK_ENTRY",
  generatedCodePrefix: "LOGENTRY",
  description: "Ilog Logbook Entry",
  category: logbookEntryCategory,
  propertyTypes: LOGBOOK_ENTRY_SCHEMA,
};

// Base schema of each iLog category, i.e. the properties every type of that category has
export const getCategorySchema = (category: string): PropertyTypesSchema => {
  switch (category) {
    case instrumentCategory:
      return INSTRUMENT_SCHEMA;
    case componentCategory:
      return COMPONENT_SCHEMA;
    case logbookEntryCategory:
      return LOGBOOK_ENTRY_SCHEMA;
    default:
      return EMPTY_SCHEMA;
  }
};

// Logbook entry types definitions, kept here for documentation and backup purposes
export const LOGBOOK_ENTRY_TYPES : Record<string, ObjectTypeDefinition> = {
  bakeout: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "BAKEOUT_LOGENTRY",
    generatedCodePrefix: "BAKEOUTLOG",
    description: "🔥 Bakeout",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#e67800",
      icon: "🔥",
      type: "BAKEOUT_LOGENTRY",
    },
  },
  calibrationOptimization: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "CALIBRATION_OPTIMIZATION_LOGENTRY",
    generatedCodePrefix: "CALIBRATIONOPTIMIZATIONLOG",
    description: "⚙️ Calibration & Optimization",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#40cd54",
      icon: "⚙️",
      type: "CALIBRATION_OPTIMIZATION_LOGENTRY",
    },
  },
  cleaning: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "CLEANING_LOGENTRY",
    generatedCodePrefix: "CLEANINGLOG",
    description: "🧼 Cleaning",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#dcbe28",
      icon: "🧼",
      type: "CLEANING_LOGENTRY",
    },
  },
  comment: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "COMMENT_LOGENTRY",
    generatedCodePrefix: "COMMENTLOG",
    description: "💬 Comment",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#aa78c8",
      icon: "💬",
      type: "COMMENT_LOGENTRY",
    },
  },
  cryogenFilling: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "CRYOGEN_FILLING_LOGENTRY",
    generatedCodePrefix: "CRYOGENFILLINGLOG",
    description: "❄️ Cryogen Filling",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#005aaa",
      icon: "❄️",
      type: "CRYOGEN_FILLING_LOGENTRY",
    },
  },
  degasing: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "DEGASING_LOGENTRY",
    generatedCodePrefix: "DEGASINGLOG",
    description: "💨 Degasing",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#009678",
      icon: "💨",
      type: "DEGASING_LOGENTRY",
    },
  },
  errorsAndProblems: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "ERRORS_AND_PROBLEMS_LOGENTRY",
    generatedCodePrefix: "ERRORSANDPROBLEMSLOG",
    description: "⚠️ Errors & Problems`",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#b8131d",
      icon: "⚠️",
      type: "ERRORS_AND_PROBLEMS_LOGENTRY",
    },
  },
  maintenance: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "MAINTENANCE_LOGENTRY",
    generatedCodePrefix: "MAINTENANCELOG",
    description: "🔧 Maintenance",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#966e3c",
      icon: "🔧",
      type: "MAINTENANCE_LOGENTRY",
    },
  },
  other: {
    ...LOGBOOK_ENTRY_TYPE_DEFINITION,
    code: "OTHER_LOGENTRY",
    generatedCodePrefix: "OTHERLOG",
    description: "📝 Other",
    metadata: {
      [categoryMetadataKey]: logbookEntryCategory,
      color: "#788c96",
      icon: "📝",
      type: "OTHER_LOGENTRY",
    },
  },
}

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
    default:
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

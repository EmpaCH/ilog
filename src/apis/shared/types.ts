
import { PropertyTypesSchema, ObjectTypeDefinition } from "../type/commonType";
import { Vocabulary } from "../vocabulary/commonVocabulary";
import { PropertyType } from "../propertyType/commonPropertyType";
import { iLogID, iLogLogbookID } from "./environment";

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
export const LOGBOOK_ENTRY_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "LOGBOOK_ENTRY",
  generatedCodePrefix: "ENTRY",
  description: "Ilog Logbook Entry",
  propertyTypes: {
    ["GeneralInfo"]: [
      { code: "$NAME", type: "reference" },
      { code: iLogLogbookID, type: "reference" },    
      {
        code: "VALID_FROM",
        type: "local",
        multivalued: false,
        dataType: "VARCHAR",
        label: "ValidFrom",
        description: "ValidFrom",
      },    
      {
        code: "DESCRIPTION",
        type: "local",
        multivalued: false,
        dataType: "VARCHAR",
        label: "Description",
        description: "Description",
      },
      {
        code: "RESPONSIBLE",
        type: "local",
        multivalued: true,
        dataType: "VARCHAR",
        label: "Responsible",
        description: "Responsible",
      },      
      {
        code: "INVOLVEDEQUIPMENT",
        type: "local",
        multivalued: true,
        dataType: "VARCHAR",
        label: "Involved Equipment",
        description: "Involved Equipment",
      },
      {
        code: "COMPONENT",
        type: "local",
        multivalued: true,
        dataType: "VARCHAR",
        label: "Component",
        description: "Component (most directly involved)",
      },
    ]
  } as PropertyTypesSchema,
};

// Define different logbook entry types: Maintenance, Errors and Problems, Calibration/Optimization, Cryogen Filling, Degasing, Cleaning, Bakeout, Comment, Other
export const LOGBOOK_ENTRY_TYPES : Record<string, ObjectTypeDefinition> = {
  maintenance: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "MAINTENANCE_LOGENTRY", generatedCodePrefix: "MAINTENANCELOG", description: "Maintenance Logbook Entry" },
  errorsAndProblems: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "ERRORS_AND_PROBLEMS_LOGENTRY", generatedCodePrefix: "ERRORSANDPROBLEMSLOG", description: "Errors and Problems Logbook Entry" },
  calibrationOptimization: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "CALIBRATION_OPTIMIZATION_LOGENTRY", generatedCodePrefix: "CALIBRATIONOPTIMIZATIONLOG", description: "Calibration and Optimization Logbook Entry" },
  cryogenFilling: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "CRYOGEN_FILLING_LOGENTRY", generatedCodePrefix: "CRYOGENFILLINGLOG", description: "Cryogen Filling Logbook Entry" },
  degasing: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "DEGASING_LOGENTRY", generatedCodePrefix: "DEGASINGLOG", description: "Degasing Logbook Entry" },
  cleaning: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "CLEANING_LOGENTRY", generatedCodePrefix: "CLEANINGLOG", description: "Cleaning Logbook Entry" },
  bakeout: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "BAKEOUT_LOGENTRY", generatedCodePrefix: "BAKEOUTLOG", description: "Bakeout Logbook Entry" },
  comment: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "COMMENT_LOGENTRY", generatedCodePrefix: "COMMENTLOG", description: "Comment Logbook Entry" },
  other: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "OTHER_LOGENTRY", generatedCodePrefix: "OTHERLOG", description: "Other Logbook Entry" },
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

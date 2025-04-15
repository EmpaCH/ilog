
import { PropertyTypesSchema, ObjectTypeDefinition } from "../type/commonType";
import { Vocabulary } from "../vocabulary/commonVocabulary";
import { PropertyType } from "../propertyType/commonPropertyType";
import { iLogID } from "./environment";

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

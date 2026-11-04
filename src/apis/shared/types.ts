
import { PropertyTypesSchema, ObjectTypeDefinition } from "../type/commonType";
import {
  componentCategory,
  instrumentCategory,
  logbookEntryCategory,
} from "./category";

export const iLogGeneralInfoGroup = "General Info";

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

// Component schema
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

// Instrument schema
export const INSTRUMENT_SCHEMA: PropertyTypesSchema = {
  ...iLogBaseSchema,
  ["Components"]: [],
};

// Logbook entry schema.
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

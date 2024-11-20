import openbis from "@openbis/openbis.esm";
import { getRouteApi } from "@tanstack/react-router";
import { iLogID, instrumentTypeID } from "../shared/common";
import { detailedDiff } from "deep-object-diff";

const PRIMITIVE_DATA_TYPES = [
  "VARCHAR",
  "MULTILINE_VARCHAR",
  "DATE",
  "REAL",
  "BOOLEAN",
  "XML",
  "INTEGER",
  "TIMESTAMP",
  "HYPERLINK",
  "JSON",
] as const;

const REFERENCE_DATA_TYPES = ["OBJECT" , "CONTROLLEDVOCABULARY"] as const

const ARRAY_DATA_TYPES = [ "REAL[]" , "TIMESTAMP[]" , "INTEGER[]" , "STRING[]"] as const; 

export const ALL_DATA_TYPES = [...PRIMITIVE_DATA_TYPES, ...REFERENCE_DATA_TYPES, ...ARRAY_DATA_TYPES] as const

type ReferenceDataType =  typeof REFERENCE_DATA_TYPES[number];

type ArrayDataType =  typeof ARRAY_DATA_TYPES[number];

type PrimitiveDataType = typeof PRIMITIVE_DATA_TYPES[number];

export type DataType = ReferenceDataType | PrimitiveDataType | ArrayDataType;



interface PropertyTypeCommon {
  code: string;
  description: string;
  label: string;
  type: string;
}

export interface LocalPropertyType extends PropertyTypeCommon {
  dataType: DataType;
  type: "local";
  multivalued: boolean;
}

export interface LocalPrimitivePropertyType extends LocalPropertyType {
  code: string;
  dataType: PrimitiveDataType;
}

export interface LocalObjectPropertyType extends LocalPropertyType {
  code: string;
  dataType: "OBJECT";
  objectType: string;
}

export interface LocalControlledVocabularyPropertyType
  extends LocalPropertyType {
  code: string;
  vocabulary: string;
  dataType: "CONTROLLEDVOCABULARY";
}

export interface ReferencePropertyType {
  code: string;
  type: "reference";
}

export type LocalPropertyTypeVariants =
  | LocalPrimitivePropertyType
  | LocalObjectPropertyType
  | LocalControlledVocabularyPropertyType;

export type PropertyType = ReferencePropertyType | LocalPropertyTypeVariants;

export interface ObjectSchema {
  [group: string]: PropertyType[];
}

export interface ObjectTypeDefinition {
  code: string;
  prefix: string | null;
  propertyAssignments: ObjectSchema;
}

const testSchema: ObjectSchema = {
  general: [
    {
      code: "type",
      description: "type",
      label: "@",
      dataType: "CONTROLLEDVOCABULARY",
      vocabulary: "sampleType",
      type: "local",
      multivalued: false,
    },
  ],
};

export const INSTRUMENT_SCHEMA: ObjectSchema = {
  "General Info": [
    { code: "$NAME", type: "reference" },
    { code: iLogID, type: "reference" },
    {
      code: "Serialnumber",
      label: "Serial number",
      description: "Serial number",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    },
    {
      code: "EmpaID",
      dataType: "VARCHAR",
      label: "Empa ID",
      description: "Empa ID",
      type: "local",
      multivalued: false,
    },
  ],
  Location: [{ code: "$LOCATION", type: "reference" }],
};

export const INSTRUMENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: instrumentTypeID,
  propertyAssignments: INSTRUMENT_SCHEMA,
  prefix: "INSTRUMENT",
};

function convertDataTypeToOpenBISDataType(
  dataType: DataType
): openbis.DataType {
  let returnDataType;
  switch (dataType) {
    case "OBJECT": {
      returnDataType = openbis.DataType.SAMPLE;
      break;
    }

    case "BOOLEAN": {
      returnDataType = openbis.DataType.BOOLEAN;
      break;
    }
    case "MULTILINE_VARCHAR": {
      returnDataType = openbis.DataType.MULTILINE_VARCHAR;
      break;
    }
    case "CONTROLLEDVOCABULARY": {
      returnDataType = openbis.DataType.CONTROLLEDVOCABULARY;
      break;
    }
    case "REAL": {
      returnDataType = openbis.DataType.REAL;
      break;
    }
    case "INTEGER": {
      returnDataType = openbis.DataType.INTEGER;
      break;
    }
    case "TIMESTAMP": {
      returnDataType = openbis.DataType.TIMESTAMP;
      break;
    }
    case "JSON": {
      returnDataType = openbis.DataType.JSON;
      break;
    }
    case "HYPERLINK": {
      returnDataType = openbis.DataType.HYPERLINK;
      break;
    }
    case "XML": {
      returnDataType = openbis.DataType.XML;
      break;
    }
    case "REAL[]": {
      returnDataType = openbis.DataType.ARRAY_REAL;
      break;
    }
    case "INTEGER[]": {
      returnDataType = openbis.DataType.ARRAY_INTEGER;
      break;
    }
    case "TIMESTAMP[]": {
      returnDataType = openbis.DataType.ARRAY_TIMESTAMP;
      break;
    }
    case "STRING[]": {
      returnDataType = openbis.DataType.ARRAY_STRING;
      break;
    }
    case "DATE": {
      returnDataType = openbis.DataType.DATE;
      break;
    }
    default: {
      throw Error("Missing");
    }
  }
  return returnDataType;
}

function convertOpenBISDataTypeToDataType(
  dataType: openbis.DataType
): DataType {
  let returnDataType;
  switch (dataType) {
    case openbis.DataType.SAMPLE: {
      returnDataType = "OBJECT";
      break;
    }

    case openbis.DataType.BOOLEAN: {
      returnDataType = "BOOLEAN";
      break;
    }
    case openbis.DataType.MULTILINE_VARCHAR: {
      returnDataType = "MULTILINE_VARCHAR";
      break;
    }
    case openbis.DataType.CONTROLLEDVOCABULARY: {
      returnDataType = "CONTROLLEDVOCABULARY";
      break;
    }
    case openbis.DataType.REAL: {
      returnDataType = "REAL";
      break;
    }
    case openbis.DataType.INTEGER: {
      returnDataType = "INTEGER";
      break;
    }
    case openbis.DataType.TIMESTAMP: {
      returnDataType = "TIMESTAMP";
      break;
    }
    case openbis.DataType.JSON: {
      returnDataType = "JSON";
      break;
    }
    case openbis.DataType.HYPERLINK: {
      returnDataType = "HYPERLINK";
      break;
    }
    case openbis.DataType.XML: {
      returnDataType = "XML";
      break;
    }
    case openbis.DataType.ARRAY_REAL: {
      returnDataType = "REAL[]";
      break;
    }
    case openbis.DataType.ARRAY_INTEGER: {
      returnDataType = "INTEGER[]";
      break;
    }
    case openbis.DataType.ARRAY_TIMESTAMP: {
      returnDataType = "TIMESTAMP[]";
      break;
    }
    case openbis.DataType.ARRAY_STRING: {
      returnDataType = "STRING[]";
      break;
    }
    case openbis.DataType.DATE: {
      returnDataType = "DATE";
      break;
    }
    default: {
      throw Error("Missing");
    }
  }
  return returnDataType as DataType;
}

function initializeCreation(
  propertyType: LocalPropertyType
): openbis.PropertyTypeCreation {
  const creation = new openbis.PropertyTypeCreation();
  creation.setCode(propertyType.code);
  creation.setDataType(convertDataTypeToOpenBISDataType(propertyType.dataType));
  creation.setMultiValue(propertyType.multivalued);
  return creation;
}

function getPropertyTypeId(
  propertyType: PropertyType
): openbis.IPropertyTypeId {
  if (propertyType.type == "reference") {
    return new openbis.PropertyTypePermId(propertyType.propertyTypeCode);
  } else {
    return new openbis.PropertyTypePermId(propertyType.code);
  }
}

function convertPropertyType(
  propertyType: PropertyType
): openbis.PropertyTypeCreation | null {
  switch (propertyType.type) {
    case "reference": {
      return null;
    }

    case "local": {
      const creation = initializeCreation(propertyType);
      switch (propertyType.dataType) {
        case "OBJECT": {
          creation.setSampleTypeId(
            new openbis.EntityTypePermId(propertyType.objectType)
          );
          return creation;
        }
        case "CONTROLLEDVOCABULARY": {
          creation.setVocabularyId(
            new openbis.VocabularyPermId(propertyType.vocabulary)
          );
          return creation;
        }
        default: {
          return creation;
        }
      }
    }
  }
}

function convertObjectSchemaToPropertyCreations(
  schema: ObjectSchema
): openbis.PropertyTypeCreation[] {
  const creations = Object.entries(schema)
    .flatMap(([group, properties]) => {
      return properties.map((prop) => convertPropertyType(prop));
    })
    .filter((el) => el !== null);

  return creations;
}
function convertObjectSchemaToAssignmentCreations(
  schema: ObjectSchema
): openbis.PropertyAssignmentCreation[] {
  const creations = Object.entries(schema)
    .flatMap(([section, properties]) => {
      return properties.map((prop) => {
        const creation = new openbis.PropertyAssignmentCreation();
        creation.setSection(section);
        creation.setPropertyTypeId(getPropertyTypeId(prop));
        return creation;
      });
    })
    .filter((el) => el !== null);
  return creations;
}

export function convertOpenBISPropertyType(
  propertyType: openbis.PropertyType
): LocalPropertyTypeVariants {
  const dataType = propertyType.getDataType();
  const common = {
    code: propertyType.getCode(),
    label: propertyType.getLabel(),
    description: propertyType.getDescription(),
    dataType: convertOpenBISDataTypeToDataType(propertyType.getDataType()),
    multivalued: propertyType.isMultiValue(),
  };
  if (dataType == "CONTROLLEDVOCABULARY") {
    return {
      ...common,
      type: "local",
      vocabulary: propertyType.getVocabulary().getCode(),
    } as LocalControlledVocabularyPropertyType;
  } else if (dataType == "SAMPLE") {
    return {
      ...common,
      type: "local",
      objectType: propertyType.getSampleType().getCode(),
    } as LocalObjectPropertyType;
  } else {
    return {
      ...common,
      type: "local",
    } as LocalPrimitivePropertyType;
  }
}

function convertOpenBISPropertyAssignment(
  propertyAssignment: openbis.PropertyAssignment
): LocalPropertyTypeVariants {
  return convertOpenBISPropertyType(propertyAssignment.getPropertyType());
}

export function convertChanges(
  newDefinition: ObjectTypeDefinition,
  oldDefinition: ObjectTypeDefinition
): openbis.IOperation[] {
  const differences = detailedDiff(newDefinition, oldDefinition);
  differences;
}

export function convertObjectTypeDefinitionToOperations(
  objectDefinition: ObjectTypeDefinition
): openbis.IOperation[] {
  // Create property creations
  const propertyTypeCreations = convertObjectSchemaToPropertyCreations(
    objectDefinition.propertyAssignments
  );
  // For each creation, create the assignments
  const assignmentCreations = convertObjectSchemaToAssignmentCreations(
    objectDefinition.propertyAssignments
  );
  const sampleTypeCreation = new openbis.SampleTypeCreation();
  sampleTypeCreation.setCode(objectDefinition.code);
  sampleTypeCreation.setPropertyAssignments(assignmentCreations);
  const all = [
    new openbis.CreatePropertyTypesOperation(propertyTypeCreations),
    new openbis.CreateSampleTypesOperation([sampleTypeCreation]),
  ];
  return all;
}

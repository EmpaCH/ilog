import openbis from "@openbis/openbis.esm";
import { getRouteApi } from "@tanstack/react-router";
import { iLogID, instrumentTypeID } from "../shared/common";
import { detailedDiff } from "deep-object-diff";
import { code } from "@nextui-org/react";
import {
  PropertyType,
  LocalPropertyTypeVariants,
  LocalControlledVocabularyPropertyType,
  LocalObjectPropertyType,
  LocalPrimitivePropertyType,
} from "../propertyType/commonPropertyType";
import { convertPropertyTypeToCreation } from "../propertyType/commonPropertyType";
import { getPropertyTypeId } from "../propertyType/commonPropertyType";

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

const REFERENCE_DATA_TYPES = ["OBJECT", "CONTROLLEDVOCABULARY"] as const;

const ARRAY_DATA_TYPES = [
  "REAL[]",
  "TIMESTAMP[]",
  "INTEGER[]",
  "STRING[]",
] as const;

export const ALL_DATA_TYPES = [
  ...PRIMITIVE_DATA_TYPES,
  ...REFERENCE_DATA_TYPES,
  ...ARRAY_DATA_TYPES,
] as const;

type ReferenceDataType = (typeof REFERENCE_DATA_TYPES)[number];

type ArrayDataType = (typeof ARRAY_DATA_TYPES)[number];

export type PrimitiveDataType = (typeof PRIMITIVE_DATA_TYPES)[number];

export type DataType = ReferenceDataType | PrimitiveDataType | ArrayDataType;

export interface ObjectSchema {
  [group: string]: PropertyType[];
}

export interface ObjectTypeDefinition {
  code: string;
  prefix: string | null;
  propertyAssignments: ObjectSchema;
  description: string | null;
}

export function convertDataTypeToOpenBISDataType(
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
    case "VARCHAR": {
      returnDataType = openbis.DataType.VARCHAR;
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
  switch (dataType) {
    case openbis.DataType.SAMPLE: {
      return "OBJECT";
    }
    case openbis.DataType.VARCHAR: {
      return "VARCHAR";
    }

    case openbis.DataType.BOOLEAN: {
      return "BOOLEAN";
    }
    case openbis.DataType.MULTILINE_VARCHAR: {
      return "MULTILINE_VARCHAR";
    }
    case openbis.DataType.CONTROLLEDVOCABULARY: {
      return "CONTROLLEDVOCABULARY";
    }
    case openbis.DataType.REAL: {
      return "REAL";
    }
    case openbis.DataType.INTEGER: {
      return "INTEGER";
    }
    case openbis.DataType.TIMESTAMP: {
      return "TIMESTAMP";
    }
    case openbis.DataType.JSON: {
      return "JSON";
    }
    case openbis.DataType.HYPERLINK: {
      return "HYPERLINK";
    }
    case openbis.DataType.XML: {
      return "XML";
    }
    case openbis.DataType.ARRAY_REAL: {
      return "REAL[]";
    }
    case openbis.DataType.ARRAY_INTEGER: {
      return "INTEGER[]";
    }
    case openbis.DataType.ARRAY_TIMESTAMP: {
      return "TIMESTAMP[]";
    }
    case openbis.DataType.ARRAY_STRING: {
      return "STRING[]";
    }
    case openbis.DataType.DATE: {
      return "DATE";
    }
  }
  return "VARCHAR";
}

function convertObjectSchemaToPropertyCreations(
  schema: ObjectSchema
): openbis.PropertyTypeCreation[] {
  const creations = Object.entries(schema)
    .flatMap(([group, properties]) => {
      return properties.map((prop) =>
        prop ? convertPropertyTypeToCreation(prop) : null
      );
    })
    .filter((el) => el !== null);

  return creations ?? [];
}
function convertObjectSchemaToAssignmentCreations(
  schema: ObjectSchema
): openbis.PropertyAssignmentCreation[] {
  const creations = Object.entries(schema)
    .flatMap(([section, properties]) => {
      return properties.map((prop, index) => {
        const creation = new openbis.PropertyAssignmentCreation();
        creation.setSection(section);
        creation.setPropertyTypeId(getPropertyTypeId(prop));
        creation.setOrdinal(index + 1);
        return creation;
      });
    })
    .filter((el) => el.getPropertyTypeId() !== null);
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

interface StructuredCreations {
  propertyTypeCreations: openbis.PropertyTypeCreation[];
  objectTypeCreations: openbis.SampleTypeCreation[];
}



export function convertObjectTypeDefinitionToOperations(
  objectDefinition: ObjectTypeDefinition
): StructuredCreations {
  // Create property creations
  const propertyTypeCreations = convertObjectSchemaToPropertyCreations(
    objectDefinition.propertyAssignments
  );
  // For each creation, create the assignments
  const assignmentCreations = convertObjectSchemaToAssignmentCreations(
    objectDefinition.propertyAssignments
  );
  // Create the object type
  const sampleTypeCreation = new openbis.SampleTypeCreation();
  sampleTypeCreation.setCode(objectDefinition.code.toUpperCase());
  sampleTypeCreation.setAutoGeneratedCode(true);
  sampleTypeCreation.setGeneratedCodePrefix(objectDefinition.prefix ?? objectDefinition.code.substring(0, 3));
  sampleTypeCreation.setPropertyAssignments(assignmentCreations);
  sampleTypeCreation.setDescription(objectDefinition.description ?? "");
  sampleTypeCreation.setListable(true);
  const all = {
    propertyTypeCreations: propertyTypeCreations,
    objectTypeCreations: [sampleTypeCreation],
  };
  return all;
}

export function convertCreationsToOperations(
  creations: StructuredCreations
): openbis.IOperation[] {
  return [
    new openbis.CreatePropertyTypesOperation(creations.propertyTypeCreations),
    new openbis.CreateSampleTypesOperation(creations.objectTypeCreations),
  ];
}

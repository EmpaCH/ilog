import openbis from "@openbis/openbis.esm";
import { getRouteApi } from "@tanstack/react-router";
import { iLogID, instrumentTypeID } from "../shared/common";

type PrimitiveDataType =
  | "VARCHAR"
  | "MULTILINE_VARCHAR"
  | "DATE"
  | "REAL"
  | "BOOLEAN"
  | "XML"
  | "INTEGER"
  | "TIMESTAMP"
  | "HYPERLINK"
  | "JSON";

type ReferenceDataType = "OBJECT" | "CONTROLLEDVOCABULARY";

type ArrayDataType = "REAL[]" | "TIMESTAMP[]" | "INTEGER[]" | "STRING[]";

type DataType = ReferenceDataType | PrimitiveDataType | ArrayDataType;

interface PropertyTypeCommon {
  description: string;
  label: string;
  type: string;
  multivalued: boolean;
}

interface LocalPropertyType extends PropertyTypeCommon {
  code: string;
  dataType: DataType;
  type: "local";
}

interface LocalPrimitivePropertyType extends LocalPropertyType {
  code: string;
  dataType: PrimitiveDataType;
}

interface LocalObjectPropertyType extends LocalPropertyType {
  code: string;
  dataType: "OBJECT";
  objectType: string;
}

interface LocalControlledVocabularyPropertyType extends LocalPropertyType {
  code: string;
  vocabulary: string;
  dataType: "CONTROLLEDVOCABULARY";
}

interface ReferencePropertyType {
  propertyTypeCode: string;
  type: "reference";
}

type PropertyType =
  | ReferencePropertyType
  | (
      | LocalPrimitivePropertyType
      | LocalObjectPropertyType
      | LocalControlledVocabularyPropertyType
    );

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
    { propertyTypeCode: "$NAME", type: "reference" },
    { propertyTypeCode: iLogID, type: "reference" },
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
  Location: [{ propertyTypeCode: "$LOCATION", type: "reference" }],
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

export function convertOpenBISObjectTypeToDefinition(type: openbis.SampleType){
  
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

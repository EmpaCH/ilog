import openbis from "@openbis/openbis.esm";
import {
  PropertyType,
  LocalPropertyTypeVariants,
  LocalControlledVocabularyPropertyType,
  LocalObjectPropertyType,
  LocalPrimitivePropertyType,
  LocalPropertyType,
} from "../propertyType/commonPropertyType";

// Define primitive data types
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

// Define reference data types
const REFERENCE_DATA_TYPES = ["OBJECT", "CONTROLLEDVOCABULARY"] as const;

// Define array data types
const ARRAY_DATA_TYPES = [
  "REAL[]",
  "TIMESTAMP[]",
  "INTEGER[]",
  "STRING[]",
] as const;

// Combine all data types
export const ALL_DATA_TYPES = [
  ...PRIMITIVE_DATA_TYPES,
  ...REFERENCE_DATA_TYPES,
  ...ARRAY_DATA_TYPES,
] as const;

// Define type aliases for different data types
type ReferenceDataType = (typeof REFERENCE_DATA_TYPES)[number];

type ArrayDataType = (typeof ARRAY_DATA_TYPES)[number];

export type PrimitiveDataType = (typeof PRIMITIVE_DATA_TYPES)[number];

export type DataType = ReferenceDataType | PrimitiveDataType | ArrayDataType;

// Interface for propertytypes schema
export interface PropertyTypesSchema {
  [group: string]: PropertyType[];
}

// Interface for object type definition
export interface ObjectTypeDefinition {
  code: string;
  generatedCodePrefix: string;
  description: string;
  propertyTypes: PropertyTypesSchema | ResolvedPropertyTypeSchema;
  baseType?: string;
}

export interface ResolvedPropertyTypeSchema {
  [group: string]: LocalPropertyType[];
}

export interface ResolvedObjectTypeDefinition extends ObjectTypeDefinition {
  propertyTypes: ResolvedPropertyTypeSchema;
}

// Interface for structured creations
export interface StructuredCreations {
  propertyTypeCreations?: openbis.PropertyTypeCreation[];
  propertyTypeUpdates?: openbis.PropertyTypeUpdate[];
  objectTypeCreations?: openbis.SampleTypeCreation[];
  objectTypeUpdates?: openbis.SampleTypeUpdate[];
}

/**
 * Converts a custom data type to an openBIS data type.
 * @param dataType - The custom data type to convert.
 * @returns The corresponding openBIS data type.
 */
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

/**
 * Converts an openBIS data type to a custom data type.
 * @param dataType - The openBIS data type to convert.
 * @returns The corresponding custom data type.
 */
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

/**
 * Converts an openBIS property type to a local property type variant.
 * @param propertyType - The openBIS property type to convert.
 * @returns The corresponding local property type variant.
 */
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
    metadata: propertyType.getMetaData(),
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

/**
 * Creates a new type schema based on a base type.
 * Currently, we only allow single inheritance
 * @param baseType
 * @param newType
 */
export function deriveType(
  baseType: ObjectTypeDefinition,
  newTypeCode: string
): ObjectTypeDefinition {
  return {
    ...baseType,
    code: newTypeCode,
    baseType: baseType.code,
  };
}
/**
 * Extract the list of all fields on an object as a set of
 * tuples (code, type)
 * @param type E
 * @returns
 */
function extractFields(type: ResolvedObjectTypeDefinition) {
  return new Set(
    Object.entries(type.propertyTypes).map(([propertyGroup, properties]) => {
      return properties.map((prop) => {
        return [prop.code, prop.dataType];
      });
    })
  );
}

/**
 * Check if the derived type is structurally compatible with the base type
 * TODO: recursively check all object types that are declared as properties
 * @param baseType C
 * @param derivedType
 */
export function checkValidSubType(
  baseType: ResolvedObjectTypeDefinition,
  derivedType: ResolvedObjectTypeDefinition
) {
  const baseFieldSet = extractFields(baseType);
  const derivedFieldSet = extractFields(derivedType);
  return derivedFieldSet.isSupersetOf(baseFieldSet); //* ts-ignore
}

/**
 * Find the inheritance tree of a type
 * @param type
 * @param allTypes
 */
export function findAncestors(
  type: ResolvedObjectTypeDefinition,
  allTypes: ResolvedObjectTypeDefinition[]
) {
  console.log(type)
  function inner(
    type: ResolvedObjectTypeDefinition,
    allTypes: ResolvedObjectTypeDefinition[],
    ancestors: string[] = []
  ): string[] {
    console.log(type.code, type.baseType)
    // IF the type has a base type, we continue searching for its ancestors
    if (type.baseType !== undefined || type.baseType !== null) {
      // Find the base type in allTypes
      const baseType = allTypes.find((t) => t.code === type.baseType);
      if (baseType !== undefined) {
        const newAncestors = [baseType.code,...ancestors];
        return inner(baseType, allTypes, newAncestors);
      }
      // If the base type is not found, return the current ancestors
      return [baseType, ...ancestors];
    }else{
      return ancestors;
    }
  }
  return inner(type, allTypes);
}

// /**
//  * Adds property types to an openBIS object type.
//  * @param objectType - The openBIS object type to add property types to.
//  */
// export function addPropertyTypesToObjectTypeDefinition(
//   objectType: openbis.SampleType,
// ): void {

//   try {
//     const groupedPropertyTypes: PropertyTypesSchema = {};

//     const sections = objectType.propertyAssignments.map((assignment) => {
//       return assignment.section;
//     }).filter((section, index, self) => {
//       return self.indexOf(section) === index;
//     });

//     sections.forEach((section) => {
//       const propertyTypes = objectType.propertyAssignments.filter((assignment) => {
//         return assignment.section === section;
//       }).map((assignment) => {
//         return assignment.propertyType;
//       });

//       groupedPropertyTypes[section] = propertyTypes;
//     });

//     objectType.propertyTypes = groupedPropertyTypes;
//   } catch (error) {
//     console.error(error);
//     if (!objectType.propertyTypes) {
//       objectType.propertyTypes = {};
//     }
//   }

// }

/**
 * Adds property types to an openBIS object type.
 * @param objectType - The openBIS object type to add property types to.
 */
export function convertPropertyAssignmentsToPropertyTypesSchema(
  propertyAssignments: openbis.PropertyAssignment[]
): PropertyTypesSchema {
  const propertyTypes: PropertyTypesSchema = {};

  const sections = propertyAssignments
    .map((assignment) => {
      return assignment.getSection();
    })
    .filter((section, index, self) => {
      return self.indexOf(section) === index;
    });

  sections.forEach((section) => {
    const propertyTypesBySection = propertyAssignments
      .filter((assignment) => {
        return assignment.getSection() === section;
      })
      .map((assignment) => {
        return assignment.getPropertyType();
      });

    propertyTypes[section] = propertyTypesBySection.map(
      convertOpenBISPropertyType
    );
  });

  return propertyTypes;
}

/**
 * Converts an openBIS SampleType to a local ObjectTypeDefinition.
 * @param sampleType - The openBIS SampleType to convert.
 * @returns The corresponding local ObjectTypeDefinition.
 */
export function convertOpenBISSampleTypeToObjectTypeDefinition(
  sampleType: openbis.SampleType
): ObjectTypeDefinition {
  console.log("metadata", sampleType.getMetaData())
  return {
    code: sampleType.getCode(),
    generatedCodePrefix: sampleType.getGeneratedCodePrefix(),
    description: sampleType.getDescription(),
    propertyTypes: convertPropertyAssignmentsToPropertyTypesSchema(
      sampleType.getPropertyAssignments()
    ),
    baseType: sampleType.getMetaData()["baseType"],
  };
}

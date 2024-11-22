import openbis from "@openbis/openbis.esm";
import { DataType, PrimitiveDataType } from "../type/commonType";
import { convertDataTypeToOpenBISDataType } from "../type/commonType";

export interface PropertyTypeCommon {
  code: string;
  description: string;
  label: string;
  type: string;
}export interface LocalPropertyType extends PropertyTypeCommon {
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

export type LocalPropertyTypeVariants = LocalPrimitivePropertyType |
  LocalObjectPropertyType |
  LocalControlledVocabularyPropertyType;

export type PropertyType = ReferencePropertyType | LocalPropertyTypeVariants;
export function convertPropertyTypeToCreation(
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
export function initializeCreation(
  propertyType: LocalPropertyType
): openbis.PropertyTypeCreation {
  const creation = new openbis.PropertyTypeCreation();
  creation.setCode(propertyType.code);
  creation.setDataType(convertDataTypeToOpenBISDataType(propertyType.dataType));
  creation.setMultiValue(propertyType.multivalued);
  return creation;
}
export function getPropertyTypeId(
  propertyType: PropertyType
): openbis.IPropertyTypeId {
  if (propertyType.type == "reference") {
    return new openbis.PropertyTypePermId(propertyType.propertyTypeCode);
  } else {
    return new openbis.PropertyTypePermId(propertyType.code);
  }
}




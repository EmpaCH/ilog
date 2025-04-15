import openbis from "@openbis/openbis.esm";
import { DataType, PrimitiveDataType } from "../type/commonType";
import { convertDataTypeToOpenBISDataType } from "../type/commonType";

export const propertyTypeKinds = ["local", "reference"] as const;

export const CUSTOM_WIDGET_KEY = "custom-widget";

export const CUSTOM_WIDGETS = ["IMAGE"] as const;

export interface PropertyTypeCommon {
  code: string;
  description: string;
  label: string;
  type: (typeof propertyTypeKinds)[number];
}

export interface MetadataWithWidget extends Record<string, string | undefined> {
  [CUSTOM_WIDGET_KEY]?: string | undefined;
}

export interface LocalPropertyType extends PropertyTypeCommon {
  dataType: DataType;
  type: "local";
  multivalued: boolean;
  metadata: Record<string, string> | null;
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
  description?: string;
  type: "reference";
}

export type LocalPropertyTypeVariants =
  | LocalPrimitivePropertyType
  | LocalObjectPropertyType
  | LocalControlledVocabularyPropertyType;

export type PropertyType = ReferencePropertyType | LocalPropertyTypeVariants;

export function convertPropertyTypeToCreation(
  propertyType: PropertyType
): openbis.PropertyTypeCreation | null {
  console.log("PropertyType init", propertyType);
  switch (propertyType.type) {
    case "reference": {
      return null;
    }
    case "local": {
      const creation = initializePropertyTypeCreation(propertyType);
      console.log("PropertyTypeCreation", creation);
      switch (propertyType.dataType) {
        case "OBJECT": {
          if (propertyType?.objectType !== null || propertyType?.objectType !== undefined) {   
            console.log("ObjectType", propertyType.objectType);
            creation.setSampleTypeId(
              new openbis.EntityTypePermId(
                propertyType.objectType.toUpperCase(),
                "SAMPLE"
              )
            );
          }
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

export function convertPropertyTypeToUpdate(
  propertyType: PropertyType
): openbis.PropertyTypeUpdate {
  const update = new openbis.PropertyTypeUpdate();
  update.setTypeId(propertyType.code.toUpperCase());
  switch (propertyType.type) {
    case "reference": {
      return update;
    }
    case "local": {
      update.setTypeId(propertyType.code.toUpperCase());
      update.convertToDataType(
        convertDataTypeToOpenBISDataType(propertyType.dataType)
      );
      update.setLabel(propertyType.label);
      update.setDescription(propertyType.description);
      return update;
    }
  }
}

export function initializePropertyTypeCreation(
  propertyType: LocalPropertyType
): openbis.PropertyTypeCreation {
  const creation = new openbis.PropertyTypeCreation();
  creation.setCode(propertyType.code.toUpperCase());
  creation.setDataType(convertDataTypeToOpenBISDataType(propertyType.dataType));
  creation.setMultiValue(propertyType.multivalued);
  creation.setLabel(propertyType.label);
  creation.setDescription(propertyType.description);
  if (propertyType.metadata) {
    creation.setMetaData(propertyType.metadata);
  }
  console.log("PropertyTypeCreation", creation);
  return creation;
}

export function getPropertyTypeId(
  propertyType: PropertyType
): openbis.IPropertyTypeId {
  if (propertyType.type == "reference") {
    return new openbis.PropertyTypePermId(propertyType.code.toUpperCase());
  } else {
    return new openbis.PropertyTypePermId(propertyType.code.toUpperCase());
  }
}

export interface PropertyAssignment {
  propertyTypeCode: string;
  objectTypeCode: string;
  mandatory: boolean;
}

export function convertPropertyAssignment(
  assigment: openbis.PropertyAssignment
): PropertyAssignment {
  return {
    propertyTypeCode: assigment.getPropertyType().getCode(),
    objectTypeCode: assigment?.getEntityType().getCode(),
    mandatory: assigment.isMandatory(),
  };
}

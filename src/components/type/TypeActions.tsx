import { PropertyType } from "../../apis/propertyType/commonPropertyType";
import {
  getDefaultPropertyTypeDefintion,
  iLogBaseAllTypes,
  mergePropertyTypes,
} from "../../apis/shared/common";
import { PropertyTypesSchema, ObjectTypeDefinition } from "../../apis/type/commonType";
import { produce } from "immer";

export type TypeCreatorActions =
  | { type: "SET_PREFIX"; payload: string }
  | { type: "SET_CODE"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_BASE_TYPE"; payload: { newBaseType: iLogBaseAllTypes } }
  | {
      type: "SET_NEW_PROPERTY";
      payload: { property: PropertyType; group: string };
    }
  | {
      type: "CHANGE_GROUP";
      payload: { property: PropertyType; newGroup: string };
    }
  | { type: "SET_OBJECT_TYPE_TEMPLATE"; payload: { objecttypetemplate: ObjectTypeDefinition }; }
  | { type: "SET_ALL_PROPERTYTYPES"; payload: { schema: PropertyTypesSchema }; }
  | {
      type: "REMOVE_PROPERTY_ASSIGNMENT";
      payload: { property: PropertyType; group: string };
    }
  | { type: "ADD_GROUP"; payload: string }
  | { type: "RENAME_GROUP"; payload: { oldGroup: string; newGroup: string } }
  | { type: "REMOVE_GROUP"; payload: { group: string } }
  | { type: "REORDER_GROUPS"; payload: { fromIndex: number; toIndex: number } }
  | {
      type: "CHANGE_PROPERTY";
      payload: { property: PropertyType; group: string };
    }
  | {
      type: "CHANGE_PROPERTY_CODE";
      payload: { oldCode: string; newCode: string, group: string };
    }
  | {
      type: "CLEAR";
      payload: { };
    };

export type TypeCreatorState = {
  schema: ObjectTypeDefinition;
};

export const typeCreatorReducer =  (state: TypeCreatorState, action: TypeCreatorActions): TypeCreatorState => { return produce(
  (state), (draft:TypeCreatorState) => {
    switch (action.type) {
      case "CLEAR":
        break;
      case "SET_PREFIX":
        draft.schema.generatedCodePrefix = action.payload;
        break;
      case "SET_CODE":
        draft.schema.code = action.payload;
        break;
      case "SET_DESCRIPTION":
        draft.schema.description = action.payload;
        break;
      case "SET_BASE_TYPE":
        draft.schema.baseType = action.payload.newBaseType;
        const base_types = getDefaultPropertyTypeDefintion(action.payload.newBaseType).propertyTypes;
        // extend current propertyTypes with base types
        draft.schema.propertyTypes = mergePropertyTypes(
          [draft.schema.propertyTypes, base_types]
        );
        break;
      case "SET_OBJECT_TYPE_TEMPLATE":
        draft.schema = action.payload.objecttypetemplate;
        break;
      case "SET_ALL_PROPERTYTYPES":
        draft.schema.propertyTypes = action.payload.schema;
        break;
      case "ADD_GROUP":
        let groupNumber = 1;
        const existingGroups = Object.keys(draft.schema.propertyTypes).map(key => key.toUpperCase());
        while (existingGroups.includes(`GROUP${groupNumber}`)) {
          groupNumber++;
        }
        draft.schema.propertyTypes[`GROUP${groupNumber}`] = [];
        break;
      case "REMOVE_GROUP":
        const removeSchema = { ...draft.schema.propertyTypes };
        const removeGroup = action.payload.group;
        delete removeSchema[removeGroup];
        draft.schema.propertyTypes = removeSchema;
        break;
      case "RENAME_GROUP":
        const newGroup = action.payload.newGroup;
        const newSchema = { ...draft.schema.propertyTypes };
        if (newSchema[newGroup]) {
          console.error("Error: name already exists as group or stayed the same.");
          break;
        }
        const oldGroup = action.payload.oldGroup;
        const groupOrder = Object.keys(draft.schema.propertyTypes);
        newSchema[newGroup] = newSchema[oldGroup];
        delete newSchema[oldGroup];
        draft.schema.propertyTypes = groupOrder.reduce((accumulator: PropertyTypesSchema, key: string) => {
          if (key === oldGroup) {
            accumulator[newGroup] = newSchema[newGroup];
          } else if (key !== newGroup) {
            accumulator[key] = newSchema[key];
          }
          return accumulator;
        }, {});
        break;        
      case "REORDER_GROUPS":
        const { fromIndex, toIndex } = action.payload;
        const groupKeysReordered = Object.keys(draft.schema.propertyTypes);
        const [movedGroup] = groupKeysReordered.splice(fromIndex, 1);
        groupKeysReordered.splice(toIndex, 0, movedGroup);
        draft.schema.propertyTypes = groupKeysReordered.reduce((accumulator: PropertyTypesSchema, key: string) => {
          accumulator[key] = draft.schema.propertyTypes[key];
          return accumulator;
        }, {});
        break;
      case "SET_NEW_PROPERTY":

        if (
          !draft.schema.propertyTypes[action.payload.group].includes(
            action.payload.property
          )
        ) {
          draft.schema.propertyTypes[action.payload.group].push(
            action.payload.property
          );
        }

        break;
      case "REMOVE_PROPERTY_ASSIGNMENT":
        draft.schema.propertyTypes[action.payload.group] =
          draft.schema.propertyTypes[action.payload.group].filter(
            (property) => property.code !== action.payload.property.code
          );
        break;
      case "CHANGE_PROPERTY_CODE":
        const foundIndex = draft.schema.propertyTypes[
          action.payload.group
        ].findIndex(
          (value, index) => value.code == action.payload.oldCode
        );
        if (foundIndex !== -1) {
          draft.schema.propertyTypes[action.payload.group][
            foundIndex
          ].code = action.payload.newCode;
        }
        break;
      case "CHANGE_PROPERTY":
        const propertyIndex = draft.schema.propertyTypes[
          action.payload.group
        ].findIndex(
          (value, index) => value.code == action.payload.property.code
        );
        if (propertyIndex !== -1) {
          draft.schema.propertyTypes[action.payload.group][
            propertyIndex
          ] = action.payload.property;
        }
        break;
      case "CHANGE_GROUP":
        draft.schema.propertyTypes[action.payload.newGroup].push(
          action.payload.property
        );
        draft.schema.propertyTypes[action.payload.property.type] =
          draft.schema.propertyTypes[action.payload.property.type].filter(
            (property) => property.code !== action.payload.property.code
          );
        break;
    }
  }
)};

import { PropertyType } from "../../apis/propertyType/commonPropertyType";
import { PropertyTypesSchema, ObjectTypeDefinition } from "../../apis/type/commonType";
import { produce } from "immer";
import { EMPTY_TYPE_DEFINITION } from "../../apis/shared/common";

export type TypeCreatorActions =
  | { type: "SET_PREFIX"; payload: string }
  | { type: "SET_CODE"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_COLLECTION_TYPE"; payload: string }
  | { type: "SET_BASE_TYPE"; payload: { newBaseType: ObjectTypeDefinition } }
  | {
      type: "SET_NEW_PROPERTY";
      payload: { property: PropertyType; group: string };
    }
  | {
      type: "CHANGE_GROUP";
      payload: { property: PropertyType; newGroup: string };
    }
  | { type: "SET_OBJECT_TYPE_TEMPLATE"; payload: { objecttypetemplate: ObjectTypeDefinition }; }
  | { type: "SET_ALL_PROPERTYTYPES"; payload: { schema: PropertyTypesSchema; groupOrder?: string[] }; }
  | {
      type: "REMOVE_PROPERTY_ASSIGNMENT";
      payload: { property: PropertyType; group: string };
    }
  | { type: "ADD_GROUP"; payload: string }
  | { type: "RENAME_GROUP"; payload: { oldGroup: string; newGroup: string } }
  | { type: "REMOVE_GROUP"; payload: { group: string } }
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
        draft.schema = { ...EMPTY_TYPE_DEFINITION };
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
      case "SET_COLLECTION_TYPE":
        draft.schema.collectionType = action.payload;
        break;
      case "SET_BASE_TYPE":
        draft.schema.baseType = action.payload.newBaseType.code;
        // extend current propertyTypes with base types
        draft.schema.propertyTypes = action.payload.newBaseType.propertyTypes;
        break;
      case "SET_OBJECT_TYPE_TEMPLATE":
        draft.schema = action.payload.objecttypetemplate;
        break;
      case "SET_ALL_PROPERTYTYPES":
        // Deduplicate properties by code in each group
        draft.schema.propertyTypes = Object.fromEntries(
          Object.entries(action.payload.schema).map(([group, props]) => [
            group,
            props.filter(
              (prop, idx, arr) =>
                arr.findIndex((p) => p.code === prop.code) === idx
            ),
          ])
        );
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
        {
          const oldGroup = action.payload.oldGroup;
          const newGroup = action.payload.newGroup;
          if (oldGroup === newGroup) {
            // No-op if the group name is unchanged
            break;
          }
          const propertyTypes = draft.schema.propertyTypes;
          // If the new group already exists, merge properties and deduplicate by code
          if (propertyTypes[newGroup]) {
            const merged = [
              ...propertyTypes[newGroup],
              ...propertyTypes[oldGroup]
            ];
            // Deduplicate by property code
            const seen = new Set<string>();
            propertyTypes[newGroup] = merged.filter((p) => {
              if (seen.has(p.code)) return false;
              seen.add(p.code);
              return true;
            });
          } else {
            propertyTypes[newGroup] = propertyTypes[oldGroup];
          }
          delete propertyTypes[oldGroup];
          // Rebuild propertyTypes to preserve order, replacing oldGroup with newGroup in the same position
          const groupOrder = Object.keys(propertyTypes);
          draft.schema.propertyTypes = groupOrder.reduce((acc: PropertyTypesSchema, key: string) => {
            acc[key] = propertyTypes[key];
            return acc;
          }, {});
        }
        break;        
      case "SET_NEW_PROPERTY":
        {
          const group = action.payload.group;
          const property = action.payload.property;
          // Remove this property from all groups
          for (const props of Object.values(draft.schema.propertyTypes)) {
            for (let i = props.length - 1; i >= 0; i--) {
              if (props[i].code === property.code) {
                props.splice(i, 1);
              }
            }
          }
          // Ensure group exists
          if (!draft.schema.propertyTypes[group]) {
            draft.schema.propertyTypes[group] = [];
          }
          // Add property to the correct group
          draft.schema.propertyTypes[group].push(property);
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
        // Clean the property before storing it
        const cleanProperty = { ...action.payload.property };
        if (typeof (cleanProperty as any).typeId !== "number") {
          delete (cleanProperty as any).typeId;
        }
        
        const propertyIndex = draft.schema.propertyTypes[
          action.payload.group
        ].findIndex(
          (value, index) => value.code == action.payload.property.code
        );
        if (propertyIndex !== -1) {
          draft.schema.propertyTypes[action.payload.group][
            propertyIndex
          ] = cleanProperty;
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

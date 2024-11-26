import { PropertyType } from "../../apis/propertyType/commonPropertyType";
import {
  COMPONENT_SCHEMA,
  COMPONENT_TYPE_DEFINITION,
  getDefaultPropertyAssignments,
  getDefaultPropertyTypeDefintion,
  iLogBaseTypes,
} from "../../apis/shared/common";
import { ObjectSchema, ObjectTypeDefinition } from "../../apis/type/commonType";

export type TypeCreatorActions =
  | { type: "SET_PREFIX"; payload: string }
  | { type: "SET_CODE"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | {
      type: "SET_PROPERTY_ASSIGNMENT";
      payload: { property: PropertyType; group: string };
    }
  | {
      type: "CHANGE_GROUP";
      payload: { property: PropertyType; newGroup: string };
    }
  | { type: "SET_ALL_PROPERTY_ASSIGNMENTS"; payload: { schema: ObjectSchema } }
  | {
      type: "REMOVE_PROPERTY_ASSIGNMENT";
      payload: { property: PropertyType; group: string };
    }
  | { type: "CLEAR"; payload: { baseType: (typeof iLogBaseTypes)[number] } };

export type TypeCreatorState = {
  schema: ObjectTypeDefinition;
  propertyCount: number;
};

export const typeCreatorReducer = (
  state: TypeCreatorState,
  action: TypeCreatorActions
): TypeCreatorState => {
  switch (action.type) {
    case "CLEAR":
      return {
        schema: getDefaultPropertyTypeDefintion(action.payload.baseType),
        propertyCount: 0,
      };
    case "SET_PREFIX":
      return { ...state, schema: { ...state.schema, prefix: action.payload } };
    case "SET_CODE":
      return { ...state, schema: { ...state.schema, code: action.payload } };
    case "SET_DESCRIPTION":
      return {
        ...state,
        schema: { ...state.schema, description: action.payload },
      };
    case "SET_ALL_PROPERTY_ASSIGNMENTS":
      return {
        ...state,
        schema: { ...state.schema, propertyAssignments: action.payload.schema },
      };
    case "SET_PROPERTY_ASSIGNMENT":
      return {
        ...state,
        schema: {
          ...state.schema,
          propertyAssignments: {
            ...state.schema.propertyAssignments,
            [action.payload.group]: [
              ...state.schema.propertyAssignments[action.payload.group],
              action.payload.property,
            ],
          },
        },
      };
    case "REMOVE_PROPERTY_ASSIGNMENT":
      return {
        ...state,
        schema: {
          ...state.schema,
          propertyAssignments: {
            ...state.schema.propertyAssignments,
            [action.payload.group]: state.schema.propertyAssignments[
              action.payload.group
            ].filter(
              (property) => property.code !== action.payload.property.code
            ),
          },
        },
      };
    case "CHANGE_GROUP":
      return {
        ...state,
        schema: {
          ...state.schema,
          propertyAssignments: {
            ...state.schema.propertyAssignments,
            [action.payload.newGroup]: [
              ...state.schema.propertyAssignments[action.payload.newGroup],
              action.payload.property,
            ],
            [action.payload.property.type]: state.schema.propertyAssignments[
              action.payload.property.type
            ].filter(
              (property) => property.code !== action.payload.property.code
            ),
          },
        },
      };
    default:
      return state;
  }
};

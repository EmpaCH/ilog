import { PropertyType } from "../../apis/propertyType/commonPropertyType";
import {
  COMPONENT_SCHEMA,
  COMPONENT_TYPE_DEFINITION,
  getDefaultPropertyAssignments,
  getDefaultPropertyTypeDefintion,
  iLogBaseTypes,
} from "../../apis/shared/common";
import { ObjectSchema, ObjectTypeDefinition } from "../../apis/type/commonType";

import { produce, current, original } from "immer";

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
  | { type: "ADD_GROUP"; payload: string }
  | { type: "RENAME_GROUP"; payload: { oldGroup: string; newGroup: string } }
  | {
      type: "CHANGE_PROPERTY";
      payload: { property: PropertyType; group: string };
    }
  | {
      type: "CHANGE_PROPERTY_CODE";
      payload: { oldCode: string; newCode: string, group: string };
    }
  | { type: "CLEAR"; payload: { baseType: (typeof iLogBaseTypes)[number] } };

export type TypeCreatorState = {
  schema: ObjectTypeDefinition;
  propertyCount: number;
};



export const typeCreatorReducer = produce(
  (draft: TypeCreatorState, action: TypeCreatorActions) => {
    switch (action.type) {
      case "CLEAR":
        draft.schema = getDefaultPropertyTypeDefintion(action.payload.baseType);
        draft.propertyCount = 0;
        break;
      case "SET_PREFIX":
        draft.schema.prefix = action.payload;
        break;
      case "SET_CODE":
        draft.schema.code = action.payload;
        break;
      case "SET_DESCRIPTION":
        draft.schema.description = action.payload;
        break;
      case "SET_ALL_PROPERTY_ASSIGNMENTS":
        draft.schema.propertyAssignments = action.payload.schema;
        break;
      case "ADD_GROUP":
        if (!draft.schema.propertyAssignments[action.payload]) {
          draft.schema.propertyAssignments[action.payload] = [];
        }
        break;
      case "RENAME_GROUP":
        const newSchema = { ...draft.schema.propertyAssignments };
        const oldGroup = action.payload.oldGroup;
        const newGroup = action.payload.newGroup;
        newSchema[newGroup] = newSchema[oldGroup];
        delete newSchema[oldGroup];
        draft.schema.propertyAssignments = newSchema;
        break;
      case "SET_PROPERTY_ASSIGNMENT":
        if (
          !draft.schema.propertyAssignments[action.payload.group].includes(
            action.payload.property
          )
        ) {
          draft.schema.propertyAssignments[action.payload.group].push(
            action.payload.property
          );
        }

        break;
      case "REMOVE_PROPERTY_ASSIGNMENT":
        draft.schema.propertyAssignments[action.payload.group] =
          draft.schema.propertyAssignments[action.payload.group].filter(
            (property) => property.code !== action.payload.property.code
          );
        break;
      case "CHANGE_PROPERTY_CODE":
        const foundIndex = draft.schema.propertyAssignments[
          action.payload.group
        ].findIndex(
          (value, index) => value.code == action.payload.oldCode
        );
        if (foundIndex !== -1) {
          draft.schema.propertyAssignments[action.payload.group][
            foundIndex
          ].code = action.payload.newCode;
        }
        break;
      case "CHANGE_PROPERTY":
        const propertyIndex = draft.schema.propertyAssignments[
          action.payload.group
        ].findIndex(
          (value, index) => value.code == action.payload.property.code
        );
        if (propertyIndex !== -1) {
          draft.schema.propertyAssignments[action.payload.group][
            propertyIndex
          ] = action.payload.property;
        }

        console.log({
          current: current(draft.schema.propertyAssignments),
          payload: action.payload.property,
        });
        break;
      case "CHANGE_GROUP":
        draft.schema.propertyAssignments[action.payload.newGroup].push(
          action.payload.property
        );
        draft.schema.propertyAssignments[action.payload.property.type] =
          draft.schema.propertyAssignments[action.payload.property.type].filter(
            (property) => property.code !== action.payload.property.code
          );
        break;
    }
  }
);

// export const typeCreatorReducer = (
//   state: TypeCreatorState,
//   action: TypeCreatorActions
// ): TypeCreatorState => {
//   switch (action.type) {
//     case "CLEAR":
//       return {
//         schema: getDefaultPropertyTypeDefintion(action.payload.baseType),
//         propertyCount: 0,
//       };
//     case "SET_PREFIX":
//       return { ...state, schema: { ...state.schema, prefix: action.payload } };
//     case "SET_CODE":
//       return { ...state, schema: { ...state.schema, code: action.payload } };
//     case "SET_DESCRIPTION":
//       return produce((draft) => {
//         draft.schema.description = action.payload;
//       });
//     case "SET_ALL_PROPERTY_ASSIGNMENTS":
//       return {
//         ...state,
//         schema: { ...state.schema, propertyAssignments: action.payload.schema },
//       };
//     case "ADD_GROUP":
//       return {
//         ...state,
//         schema: {
//           ...state.schema,
//           propertyAssignments: {
//             ...state.schema.propertyAssignments,
//             [action.payload]: [],
//           },
//         },
//       };
//     case "RENAME_GROUP":
//       const newSchema = { ...state.schema.propertyAssignments };
//       const oldGroup = action.payload.oldGroup;
//       const newGroup = action.payload.newGroup;
//       newSchema[newGroup] = newSchema[oldGroup];
//       delete newSchema[oldGroup];
//       return {
//         ...state,
//         schema: {
//           ...state.schema,
//           propertyAssignments: newSchema,
//         },
//       };
//     case "SET_PROPERTY_ASSIGNMENT":
//       debugger;
//       const newState = {
//         ...state,
//         schema: {
//           ...state.schema,
//           propertyAssignments: {
//             ...state.schema.propertyAssignments,
//             [action.payload.group]: [
//               ...state.schema.propertyAssignments[action.payload.group],
//               action.payload.property,
//             ],
//           },
//         },
//       };
//       console.log(newState);
//       return newState;
//     case "REMOVE_PROPERTY_ASSIGNMENT":
//       return {
//         ...state,
//         schema: {
//           ...state.schema,
//           propertyAssignments: {
//             ...state.schema.propertyAssignments,
//             [action.payload.group]: state.schema.propertyAssignments[
//               action.payload.group
//             ].filter(
//               (property) => property.code !== action.payload.property.code
//             ),
//           },
//         },
//       };
//     case "CHANGE_GROUP":
//       return {
//         ...state,
//         schema: {
//           ...state.schema,
//           propertyAssignments: {
//             ...state.schema.propertyAssignments,
//             [action.payload.newGroup]: [
//               ...state.schema.propertyAssignments[action.payload.newGroup],
//               action.payload.property,
//             ],
//             [action.payload.property.type]: state.schema.propertyAssignments[
//               action.payload.property.type
//             ].filter(
//               (property) => property.code !== action.payload.property.code
//             ),
//           },
//         },
//       };
//     default:
//       return state;
//   }
// };

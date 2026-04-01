import { produce } from "immer";
import { createEmptyObjectDefinition } from "../../apis/object/helpersObjectAPI";
import { ObjectDefinition } from "../../apis/object/commonObject";
import { PropertyTypesSchema } from "../../apis/type/commonType";

export type ObjectCreatorActions =
  | { type: "CLEAR" }
  | { type: "RESET"; payload: ObjectDefinition }
  | { type: "SET_COLLECTION"; payload: string }
  | { type: "SET_TYPE"; payload: string }
  | { type: "SET_PROPERTIES_SCHEMA"; payload: PropertyTypesSchema }
  | { type: "SET_PROPERTY_VALUES"; payload: any };

export type ObjectCreatorState = ObjectDefinition;

export const objectCreatorReducer = produce(
  (state: ObjectCreatorState, action: ObjectCreatorActions) => {
    switch (action.type) {
      case "CLEAR":
        return createEmptyObjectDefinition();
      case "RESET":
        return action.payload;
      case "SET_TYPE":
        return { ...state, type: action.payload };
      case "SET_COLLECTION":
        return { ...state, collection: action.payload };
      case "SET_PROPERTIES_SCHEMA":
        return { ...state, propertiesSchema: action.payload };
      case "SET_PROPERTY_VALUES":
        return {
          ...state,
          propertyValues: {
            ...state.propertyValues,
            ...action.payload,
          }
        };
      default:
        return state;
    }
  }
);

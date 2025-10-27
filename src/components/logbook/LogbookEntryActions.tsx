import { produce } from "immer";
import { ZonedDateTime } from "@internationalized/date";
import { createEmptyLogbookEntryDefinition } from "../../apis/logbook/helpersLogbookEntryAPI";
import { LogbookEntryDefinition } from "../../apis/logbook/commonLogbookEntry";
import { PropertyTypesSchema } from "../../apis/type/commonType";

export type LogbookEntryActions =
  | { type: "CLEAR" }
  | { type: "RESET"; payload: LogbookEntryDefinition }
  | { type: "SET_TYPE"; payload: string }
  | { type: "SET_VALID_FROM"; payload: ZonedDateTime }
  | { type: "SET_PROPERTIES_SCHEMA"; payload: PropertyTypesSchema }
  | { type: "SET_PROPERTY_VALUES"; payload: any };

export type LogbookEntryState = LogbookEntryDefinition;

export const logbookEntryReducer = produce(
  (state: LogbookEntryState, action: LogbookEntryActions) => {
    switch (action.type) {
      case "CLEAR":
        return createEmptyLogbookEntryDefinition();
      case "RESET":
        return action.payload;
      case "SET_TYPE":
        return { ...state, type: action.payload };
      case "SET_VALID_FROM":
        return { ...state, validFrom: action.payload };
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

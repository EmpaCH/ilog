import { produce } from "immer";

// Handle the local state of the object creator
export interface ObjectCreatorLocalDefinition {
  searchTerm: string;
  loading: boolean;
  message: string;
  showMessage: boolean;
  messageColor: string;
}

export const EMPTY_OBJECT_CREATOR_LOCAL_DEFINITION: ObjectCreatorLocalDefinition = {
  searchTerm: "",
  loading: false,
  message: "",
  showMessage: false,
  messageColor: "success-message",
};

export type ObjectCreatorLocalActions =
  | { type: "CLEAR" }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "SET_SHOW_MESSAGE"; payload: boolean }
  | { type: "SET_MESSAGE_COLOR"; payload: string };

export type ObjectCreatorLocalState = ObjectCreatorLocalDefinition

export const objectCreatorLocalReducer = produce(
  (state: ObjectCreatorLocalState, action: ObjectCreatorLocalActions) => {
    switch (action.type) {
      case "CLEAR":
        return EMPTY_OBJECT_CREATOR_LOCAL_DEFINITION;
      case "SET_SEARCH_TERM":
        return { ...state, searchTerm: action.payload };
      case "SET_LOADING":
        return { ...state, loading: action.payload };
      case "SET_MESSAGE":
        return { ...state, message: action.payload };
      case "SET_SHOW_MESSAGE":
        return { ...state, showMessage: action.payload };
      case "SET_MESSAGE_COLOR":
        return { ...state, messageColor: action.payload };
    }
  }
);

// Handle the local state of the object list
export interface ObjectListLocalDefinition {
  deletionMessage: string;
  showMessage: boolean;
  isSuccess: boolean;
}

export const EMPTY_OBJECT_LIST_DEFINITION: ObjectListLocalDefinition = {
  deletionMessage: "",
  showMessage: false,
  isSuccess: false,
};

export type ObjectListLocalActions =
  | { type: "CLEAR" }
  | { type: "SET_DELETION_MESSAGE"; payload: string }
  | { type: "SET_SHOW_MESSAGE"; payload: boolean }
  | { type: "SET_IS_SUCCESS"; payload: boolean };

export type ObjectListLocalState = ObjectListLocalDefinition;

export const objectListLocalReducer = produce(
  (state: ObjectListLocalState, action: ObjectListLocalActions) => {
    switch (action.type) {
      case "CLEAR":
        return EMPTY_OBJECT_LIST_DEFINITION;
      case "SET_DELETION_MESSAGE":
        return { ...state, deletionMessage: action.payload };
      case "SET_SHOW_MESSAGE":
        return { ...state, showMessage: action.payload };
      case "SET_IS_SUCCESS":
        return { ...state, isSuccess: action.payload };
      default:
        return state;
    }
  }
);

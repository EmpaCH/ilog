import { produce } from "immer";

// Handle the local state of the logbook entry creator
export interface LogbookEntryCreatorLocalDefinition {
  searchTerm: string;
  loading: boolean;
  message: string;
  showMessage: boolean;
  messageColor: string;
}

export const EMPTY_LOGBOOK_ENTRY_CREATOR_LOCAL_DEFINITION: LogbookEntryCreatorLocalDefinition = {
  searchTerm: "",
  loading: false,
  message: "",
  showMessage: false,
  messageColor: "success-message",
};

export type LogbookEntryCreatorLocalActions =
  | { type: "CLEAR" }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "SET_SHOW_MESSAGE"; payload: boolean }
  | { type: "SET_MESSAGE_COLOR"; payload: string };

export type LogbookEntryCreatorLocalState = LogbookEntryCreatorLocalDefinition;

export const logbookEntryCreatorLocalReducer = produce(
  (state: LogbookEntryCreatorLocalState, action: LogbookEntryCreatorLocalActions) => {
    switch (action.type) {
      case "CLEAR":
        return EMPTY_LOGBOOK_ENTRY_CREATOR_LOCAL_DEFINITION;
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

// Handle the local state of the logbook entry list
export interface LogbookEntryListLocalDefinition {
  deletionMessage: string;
  showMessage: boolean;
  isSuccess: boolean;
}

export const EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION: LogbookEntryListLocalDefinition = {
  deletionMessage: "",
  showMessage: false,
  isSuccess: false,
};

export type LogbookEntryListLocalActions =
  | { type: "CLEAR" }
  | { type: "SET_DELETION_MESSAGE"; payload: string }
  | { type: "SET_SHOW_MESSAGE"; payload: boolean }
  | { type: "SET_IS_SUCCESS"; payload: boolean };

export type LogbookEntryListLocalState = LogbookEntryListLocalDefinition;

export const logbookEntryListLocalReducer = produce(
  (state: LogbookEntryListLocalState, action: LogbookEntryListLocalActions) => {
    switch (action.type) {
      case "CLEAR":
        return EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION;
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

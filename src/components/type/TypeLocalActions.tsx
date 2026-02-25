import { produce } from "immer";

// Handle the local state of the type creator
export interface TypeCreatorLocalDefinition {
  loading: boolean;
  message: string;
  showMessage: boolean;
  isSuccess: boolean;
}

export const EMPTY_TYPE_CREATOR_LOCAL_DEFINITION: TypeCreatorLocalDefinition = {
  loading: false,
  message: "",
  showMessage: false,
  isSuccess: false,
};

export type TypeCreatorLocalActions =
  | { type: "CLEAR" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "SET_SHOW_MESSAGE"; payload: boolean }
  | { type: "SET_IS_SUCCESS"; payload: boolean };

export type TypeCreatorLocalState = TypeCreatorLocalDefinition;

export const typeCreatorLocalReducer = produce(
  (state: TypeCreatorLocalState, action: TypeCreatorLocalActions) => {
    switch (action.type) {
      case "CLEAR":
        return EMPTY_TYPE_CREATOR_LOCAL_DEFINITION;
      case "SET_LOADING":
        return { ...state, loading: action.payload };
      case "SET_MESSAGE":
        return { ...state, message: action.payload };
      case "SET_SHOW_MESSAGE":
        return { ...state, showMessage: action.payload };
      case "SET_IS_SUCCESS":
        return { ...state, isSuccess: action.payload };
    }
  }
);

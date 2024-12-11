import { LocalPropertyTypeVariants } from "../../apis/propertyType/commonPropertyType";
import { DataType } from "../../apis/type/commonType";

export type PropertyTypeEditorActions =
  | { type: "SET_CODE"; payload: string }
  | { type: "SET_DATA_TYPE"; payload: DataType }
  | { type: "SET_OBJECT_TYPE"; payload: string }
  | { type: "SET_VOCABULARY"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_MULTIVALUED";};

export type PropertyTypeEditorState = LocalPropertyTypeVariants;

export const propertyTypeEditorReducer = (
  state: PropertyTypeEditorState,
  action: PropertyTypeEditorActions
): PropertyTypeEditorState => {
  switch (action.type) {
    case "SET_CODE":
      return { ...state, code: action.payload };
    case "SET_DATA_TYPE":
      return { ...state, dataType: action.payload };
    case "SET_OBJECT_TYPE":
      return { ...state, objectType: action.payload, dataType: "OBJECT" };
    case "SET_VOCABULARY":
      return {
        ...state,
        vocabulary: action.payload,
        dataType: "CONTROLLEDVOCABULARY",
      };
    case "SET_DESCRIPTION":
      return { ...state, description: action.payload };
    case "SET_MULTIVALUED":
      return { ...state, multivalued: !state.multivalued };
    default:
      return state;
  }
};

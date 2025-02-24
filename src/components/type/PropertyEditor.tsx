import React, { useEffect, useReducer, useState } from "react";
import { DataType, ALL_DATA_TYPES } from "../../apis/type/commonType";
import {
  LocalPropertyTypeVariants,
  PropertyType,
} from "../../apis/propertyType/commonPropertyType";
import {  
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";

import {
  PropertyTypeEditorActions,
  propertyTypeEditorReducer,
} from "./PropertyTypeActions";

type PropertyEditorProps = {
  propertyTypeDefinitions: LocalPropertyTypeVariants;
  locked: boolean;
  onEdit: (definition: PropertyType) => void;
};

type DataTypeSelectProps = {
  disabled?: boolean;
  defaultValue: DataType;
  onSelectionChange: (val: DataType) => void;
};

const DataTypeSelect = ({
  disabled=false,
  defaultValue,
  onSelectionChange,
}: DataTypeSelectProps) => {
  return (
    <Select
      disabled={disabled}
      label="Select a data type"
      defaultSelectedKeys={[defaultValue]}
      selectionMode="single"
      onSelectionChange={(selection) => {
        if(!disabled) {
          onSelectionChange(selection.currentKey as DataType)
        }
      }}
    >
      {ALL_DATA_TYPES.map((type) => {
        return <SelectItem key={type}>{type}</SelectItem>;
      })}
    </Select>
  );
};

type ObjectTypeAutoCompleteProps = {
  objectTypes: string[];
  onSelectionChange: (val: string) => void;
};

const ObjectTypeAutoComplete: React.FC<ObjectTypeAutoCompleteProps> = ({
  objectTypes,
  onSelectionChange,
}) => {
  return (
    <Autocomplete label="Select object type">
      {objectTypes.map((objectType) => {
        return (
          <AutocompleteItem key={objectType} value={objectType}>
            {objectType}
          </AutocompleteItem>
        );
      })}
    </Autocomplete>
  );
};

export const PropertyEditor = ({
  propertyTypeDefinitions,
  locked,
  onEdit,
}: PropertyEditorProps) => {
  const [state, dispatch] = useReducer(
    propertyTypeEditorReducer,
    propertyTypeDefinitions
  );

  // This double effect
  // and `stateToPass` are
  // needed to only call onEdit after the local
  // actions of this component are dispatched.
  // TODO: find better solution

  const [stateToPass, setStateToPass] = useState<PropertyType>(
    state as PropertyType
  );
  useEffect(() => {
    setStateToPass(state);
  }, [state]);
  useEffect(() => {
    onEdit(stateToPass as PropertyType);
  }, [stateToPass]);

  // const wrappedDispatch = (action: PropertyTypeEditorActions) => {
  //   dispatch(action);
  //   //onEdit(state as PropertyType);
  // };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const form = (event.target as HTMLInputElement).form;
      const index = Array.prototype.indexOf.call(form, event.target);
      (form?.elements[index + 1] as HTMLElement)?.focus();
      event.preventDefault();
    }
  }
  

  return (
    <Card isDisabled={locked} style={{ pointerEvents: locked ? "none" : "auto" }}>
      <CardHeader className="flex gap-3">
      {`Property: ${state.code}`}
      </CardHeader>

      <CardBody>
        <div>
          <Input
            label="Code"
            defaultValue={state.code}
            onChange={(value) =>
              dispatch({
                type: "SET_CODE",
                payload: value.target.value,
              })
            }
            onKeyDown={handleInputKeyDown}
          />

          <Input
            label="Description"
            defaultValue={state.description}
            onChange={(value) =>
              dispatch({
                type: "SET_DESCRIPTION",
                payload: value.target.value,
              })
            }
            onKeyDown={handleInputKeyDown}
          />
          <Input
            label="Label"
            defaultValue={state.label}
            onChange={(value) =>
              dispatch({
                type: "SET_DESCRIPTION",
                payload: value.target.value,
              })
            }
            onKeyDown={handleInputKeyDown}
          />
          <DataTypeSelect  
            defaultValue={propertyTypeDefinitions.dataType}
            onSelectionChange={(value) =>
              dispatch({ type: "SET_DATA_TYPE", payload: value })
            }
          />

          {state.dataType === "CONTROLLEDVOCABULARY" ? (
            <Input disabled={locked} label="Vocabulary ID" />
          ) : null}
          {state.dataType === "OBJECT" ? (
            <ObjectTypeAutoComplete
              objectTypes={["A", "B"]}
              onSelectionChange={(str) => str}
            />
          ) : null}
            <Checkbox
            defaultChecked={state.multivalued}
            checked={state.multivalued}
            onChange={(value) => 
              dispatch({ type: "SET_MULTIVALUED", payload: value.target.checked })
            }
            >
            Multivalued
            </Checkbox>
        </div>
      </CardBody>
    </Card>
  );
};

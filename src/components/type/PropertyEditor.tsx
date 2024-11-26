import React, { useReducer, useState } from "react";
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
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Autocomplete,
  AutocompleteItem,
} from "@nextui-org/react";

import DeleteIcon from "@mui/icons-material/Delete";
import {
  PropertyTypeEditorActions,
  propertyTypeEditorReducer,
} from "./PropertyTypeActions";

type PropertyEditorProps = {
  propertyTypeDefinitions: LocalPropertyTypeVariants;
  locked: boolean;
  onDelete: (code: string) => void;
  onEdit: (definition: PropertyType) => void;
};

type DataTypeSelectProps = {
  defaultValue: DataType;
  onSelectionChange: (val: DataType) => void;
};

const DataTypeSelect = ({
  defaultValue,
  onSelectionChange,
}: DataTypeSelectProps) => {
  return (
    <Select
      label="Select a data type"
      defaultSelectedKeys={[defaultValue]}
      selectionMode="single"
      onSelectionChange={(selection) =>
        onSelectionChange(selection.currentKey as DataType)
      }
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
        return <AutocompleteItem key={objectType} value={objectType}>{objectType}</AutocompleteItem>;
      })}
    </Autocomplete>
  );
};

export const PropertyEditor = ({
  propertyTypeDefinitions,
  locked,
  onDelete,
  onEdit,
}: PropertyEditorProps) => {
  const [state, dispatch] = useReducer(
    propertyTypeEditorReducer,
    propertyTypeDefinitions
  );

  const wrappedDispatch = (action: PropertyTypeEditorActions) => {
    dispatch(action);
    onEdit(state as PropertyType);
  };

  return (
    <div
      className={`p-4 border rounded ${
        locked ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Card>
        <CardHeader className="flex gap-3">
          {`Property: ${state.code}`}
          <Button isIconOnly onClick={() => onDelete(state.code)}>
            <DeleteIcon />
          </Button>
        </CardHeader>

        <CardBody>
          <form>
            <Input
              label="Code"
              defaultValue={state.code}
              onChange={(value) =>
                wrappedDispatch({
                  type: "SET_CODE",
                  payload: value.target.value,
                })
              }
            />

            <Input
              label="Description"
              defaultValue={state.description}
              onChange={(value) =>
                wrappedDispatch({
                  type: "SET_DESCRIPTION",
                  payload: value.target.value,
                })
              }
            />
            <Input
              label="Label"
              defaultValue={state.label}
              onChange={(value) =>
                wrappedDispatch({
                  type: "SET_DESCRIPTION",
                  payload: value.target.value,
                })
              }
            />
            <DataTypeSelect
              defaultValue={propertyTypeDefinitions.dataType}
              onSelectionChange={(value) =>
                wrappedDispatch({ type: "SET_DATA_TYPE", payload: value })
              }
            />

            {state.dataType === "CONTROLLEDVOCABULARY" ? (
              <Input label="Vocabulary ID" />
            ) : null}
            {state.dataType === "OBJECT" ? (
              <ObjectTypeAutoComplete
                objectTypes={["A", "B"]}
                onSelectionChange={(str) => str}
              />
            ) : null}
            <Checkbox
              defaultChecked={state.multivalued}
              onChange={(value) => wrappedDispatch({ type: "SET_MULTIVALUED" })}
            >
              Multivalued
            </Checkbox>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

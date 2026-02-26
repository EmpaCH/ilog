import React, { useEffect, useReducer, useState } from "react";
import { DataType, ALL_DATA_TYPES } from "../../apis/type/commonType";
import {
  CUSTOM_WIDGETS,
  CUSTOM_WIDGET_KEY,
  LocalPropertyTypeVariants,
  PropertyType,
} from "../../apis/propertyType/commonPropertyType";
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { propertyTypeEditorReducer } from "./PropertyTypeActions";
import { useGetVocabularies } from "../../apis/vocabulary/useGetVocabularies";
import { useGetAllObjectTypes } from "../../apis/type/useGetAllObjectTypes";

type PropertyEditorProps = {
  propertyTypeDefinitions: LocalPropertyTypeVariants;
  locked: boolean;
  lockedCode?: boolean;
  onEdit: (definition: PropertyType) => void;
};

type DataTypeSelectProps = {
  disabled?: boolean;
  defaultValue: DataType;
  onSelectionChange: (val: DataType) => void;
};

const DataTypeSelect = ({
  disabled = false,
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
        if (!disabled) {
          onSelectionChange(selection.currentKey as DataType);
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
  selectedKey?: string;
  onSelectionChange: (val: string) => void;
};

const ObjectTypeAutoComplete: React.FC<ObjectTypeAutoCompleteProps> = ({
  objectTypes,
  selectedKey,
  onSelectionChange,
}) => {
  return (
    <Autocomplete
      label="Select object type"
      placeholder="Choose an object type..."
      selectedKey={selectedKey || null}
      onSelectionChange={(val)=> onSelectionChange(val as string)}
      allowsEmptyCollection={true}
    >
      {objectTypes.map((objectType) => {
        return (
          <AutocompleteItem
            key={objectType}
            value={objectType}
          >
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
  lockedCode = false,
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

  const [stateToPass, setStateToPass] = useState<LocalPropertyTypeVariants>(
    state as LocalPropertyTypeVariants
  );
  useEffect(() => {
    setStateToPass(state);
  }, [state]);
  useEffect(() => {
    onEdit(stateToPass as LocalPropertyTypeVariants);
  }, [stateToPass]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const form = (event.target as HTMLInputElement).form;
      const index = Array.prototype.indexOf.call(form, event.target);
      (form?.elements[index + 1] as HTMLElement)?.focus();
      event.preventDefault();
    }
  };

  const allVocabularies = useGetVocabularies();
  const allObjectTypes = useGetAllObjectTypes();

  return (
    <Card
      isDisabled={locked}
      style={{ pointerEvents: locked ? "none" : "auto" }}
    >
      <CardBody>
        <div>
          <Input
            label="Code"
            isDisabled={locked || lockedCode}
            defaultValue={state.code}
            onChange={(value) =>
              dispatch({
                type: "SET_CODE",
                payload: value.target.value,
              })
            }
            onKeyDown={handleInputKeyDown}
            className="form-field"
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
            className="form-field"
          />
          <Input
            label="Label"
            defaultValue={state.label}
            onChange={(value) =>
              dispatch({
                type: "SET_LABEL",
                payload: value.target.value,
              })
            }
            onKeyDown={handleInputKeyDown}
            className="form-field"
          />
          <div className="form-field">
            <DataTypeSelect
              defaultValue={propertyTypeDefinitions.dataType}
              onSelectionChange={(value) =>
                dispatch({ type: "SET_DATA_TYPE", payload: value })
              }
            />
          </div>
          {state.dataType === "CONTROLLEDVOCABULARY" ? (
            <Autocomplete
              disabled={locked}
              label="Vocabulary ID"
              selectedKey={(state as any).vocabulary}
              onSelectionChange={(value) =>
                dispatch({
                  type: "SET_VOCABULARY",
                  payload: value as string,
                })
              }
              className="form-field"
            >
              {allVocabularies?.data?.map((vocabulary) => {
                return (
                  <AutocompleteItem
                    key={vocabulary.getCode()}
                    value={vocabulary.getCode()}
                  >
                    {vocabulary.getCode()}
                  </AutocompleteItem>
                );
              }) ?? <></>}
            </Autocomplete>
          ) : null}
          {state.dataType === "OBJECT" ? (
            <div className="form-field">
              <ObjectTypeAutoComplete
                objectTypes={
                  allObjectTypes.data?.map((type) => type.getCode()) ?? []
                }
                selectedKey={(state as any).objectType || (state as any).sampleType}
                onSelectionChange={(value) =>
                  dispatch({ type: "SET_OBJECT_TYPE", payload: value })
                }
              />
            </div>
          ) : null}
          <Checkbox
            isSelected={state.multivalued}
            onValueChange={(value) => {
              dispatch({
                type: "SET_MULTIVALUED",
                payload: value,
              })
            }}
            style={{ marginBottom: "5px" }}
          >
            Multivalued
          </Checkbox>
          <Select
            label="Widget"
            onChange={(value) =>
              dispatch({
                type: "SET_WIDGET",
                payload: { widget: value.target.value },
              })
            }
            selectedKeys={[state.metadata?.[CUSTOM_WIDGET_KEY] || ""]}
          >
            {CUSTOM_WIDGETS.map((widget) => (
              <SelectItem key={widget}>{widget}</SelectItem>
            ))}
          </Select>
        </div>
      </CardBody>
    </Card>
  );
};

import React, { ChangeEvent, useReducer, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Button,
  Input,
  Textarea,
  Divider,
  Select,
  SelectItem,
  Spinner,
  Autocomplete,
  Chip,
} from "@heroui/react";
import {
  iLogBaseTypes,
  iLogBaseAllTypes,
  iLogBaseTypesType,
  EMPTY_TYPE_DEFINITION,
  getDefaultPropertyTypeDefintion,
} from "../../apis/shared/common";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
  findAncestors,
  checkValidSubType,
} from "../../apis/type/commonType";
import { LocalPrimitivePropertyType } from "../../apis/propertyType/commonPropertyType";
import { useGetPropertyTypes } from "../../apis/propertyType/useGetPropertyTypes";
import { typeCreatorReducer } from "./TypeActions";
import { GroupedPropertyEditors } from "./GroupedPropertyEditors";
import { GroupedPropertyEditorsEvents } from "./GroupedPropertyEditors";
import { useCreateObjectType } from "../../apis/type/useCreateObjectType";
import { useGetAllObjectTypes } from "../../apis/type/useGetAllObjectTypes";
import openbis from "@openbis/openbis.esm";
import "../../index.css";
import { TypeInheritanceChain } from "./TypeInheritanceChain";

// define whether this will be a Type Creator or Editor component
const creatorModes = ["create", "edit"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface TypeCreatorProps {
  mode: CreatorMode;
  objectTypeCode: string;
}

export const ObjectTypeCreator: React.FC<TypeCreatorProps> = ({
  mode,
  objectTypeCode,
}) => {
  // Initialize the useCreateObjectType hook and fetch object and property types
  const typeCreation = useCreateObjectType();
  const allPropertyTypesResult = useGetPropertyTypes();
  // const objectTypeResult = useGetObjectType(objectTypeCode);
  const allObjectTypesResult = useGetAllObjectTypes();
  const navigate = useNavigate();

  // Dispatch is used to update the state of the component
  const [state, dispatch] = useReducer(typeCreatorReducer, {
    schema: EMPTY_TYPE_DEFINITION,
  });

  // Initialize the loading state and message state (initial represents whether the object and property types have been fetched)
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState("success-message");
  const [objectBaseType, setObjectBaseType] = useState(EMPTY_TYPE_DEFINITION);

  // Some basic property types are given based on the ilogbasetype we lock these properties
  const lockedPropertyCodes = Object.entries(
    objectBaseType.propertyTypes
  ).flatMap(([_, assignment]) => assignment.map((el) => el.code));

  const lockedGroups = Object.keys(objectBaseType.propertyTypes);

  // If the object and property types have been fetched, set the object type template and property types
  if (
    allPropertyTypesResult.status == "success" &&
    allObjectTypesResult.status == "success" &&
    initial
  ) {
    // Set the object type template
    const openbisSampleType = allObjectTypesResult.data?.find((it) => {
      return it.getCode().toUpperCase() === objectTypeCode.toUpperCase();
    }) as openbis.SampleType;
    const objectTypeTemplate: ObjectTypeDefinition = openbisSampleType
      ? convertOpenBISSampleTypeToObjectTypeDefinition(openbisSampleType)
      : EMPTY_TYPE_DEFINITION;

    dispatch({
      type: "SET_OBJECT_TYPE_TEMPLATE",
      payload: { objecttypetemplate: objectTypeTemplate },
    });

    // Set the property types
    const resolvedTypes = Object.entries(objectTypeTemplate.propertyTypes).map(
      // const resolvedTypes = Object.entries(state.schema.propertyTypes).map(
      ([group, propertyTypesGroup]) => {
        return [
          group,
          propertyTypesGroup.flatMap((propertyType) => {
            return allPropertyTypesResult.data.filter(
              (it) => it.code === propertyType.code
            );
          }),
        ];
      }
    );

    dispatch({
      type: "SET_ALL_PROPERTYTYPES",
      payload: {
        schema: Object.fromEntries(resolvedTypes) as PropertyTypesSchema,
      },
    });

    // Set the initial state to false
    setInitial(false);
  }

  const objectTypes = allObjectTypesResult.isSuccess
    ? allObjectTypesResult.data.map((type) =>
        convertOpenBISSampleTypeToObjectTypeDefinition(type)
      )
    : [];

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);

    const ancestors = findAncestors(state.schema, resolvedTypes);
    const ancestorType = resolvedTypes.find(
      (type) => type.code === ancestors[0]
    )?.code as iLogBaseAllTypes;
    const isValidSubtype = checkValidSubType(state.schema, ancestorType);
    const baseType = ancestors[0];
    if (!isValidSubtype) {
      setMessage(
        `The base type ${baseType} is not a valid subtype of ${ancestorType}.`
      );
      setMessageColor("error-message");
      setShowMessage(true);
      setLoading(false);
      return;
    }
    if (
      baseType === "INSTRUMENT" &&
      state.schema.propertyTypes.Components.length === 0
    ) {
      setMessage("An instrument must have at least one component.");
      setMessageColor("error-message");
      setShowMessage(true);
      setLoading(false);
      return;
    }

    if (mode === "edit") {
      console.log("Updating type with schema:", state.schema);
      typeCreation.mutate(
        {
          definition: state.schema,
        },
        {
          onError: (err) => {
            setMessage(err.message.split(" (Context:")[0]);
            setMessageColor("error-message");
            setShowMessage(true);
            setLoading(false);
          },
          onSuccess: () => {
            setMessage("Type updated successfully!");
            setMessageColor("success-message");
            setShowMessage(true);
            handleClear(2000);
          },
        }
      );
    } else {
      typeCreation.mutate(
        {
          definition: state.schema,
        },
        {
          onError: (err) => {
            setMessage(err.message.split(" (Context:")[0]);
            setMessageColor("error-message");
            setShowMessage(true);
            setLoading(false);
          },
          onSuccess: () => {
            setMessage("Type created successfully!");
            setMessageColor("success-message");
            setShowMessage(true);
            handleClear(2000);
          },
        }
      );
    }
  };

  const onBack = () => {
    navigate({ to: "/types" });
  };

  const handleAddProperty = (propertyGroup: string, propertyCode: string) => {
    const newProp = {
      code: propertyCode,
      label: "New Property",
      description: "New description",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    } as LocalPrimitivePropertyType;
    dispatch({
      type: "SET_NEW_PROPERTY",
      payload: { group: propertyGroup, property: newProp },
    });
  };

  const handleClear = (ms: number) => {
    if (mode === "edit") {
      window.location.reload();
    } else {
      dispatch({ type: "CLEAR", payload: {} });
      setObjectBaseType(EMPTY_TYPE_DEFINITION);
      setLoading(false);
      setTimeout(() => {
        setMessage("");
        setShowMessage(false);
      }, ms);
    }
  };

  const handleSelectBaseType = (value: ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = objectTypes.find((el) => el.code == value.target.value);

    console.log("newTemplate", newTemplate);
    if (newTemplate !== undefined) {
      setObjectBaseType(newTemplate);
      console.log("newTemplate", newTemplate);
      dispatch({
        type: "SET_BASE_TYPE",
        payload: {
          newBaseType: newTemplate,
        },
      });
    }
  };

  const handlePropertyEditorEvents = (event: GroupedPropertyEditorsEvents) => {
    switch (event.type) {
      case "ADD_PROPERTY":
        handleAddProperty(event.payload.group, event.payload.code);
        break;
      case "EDIT_PROPERTY":
        dispatch({
          type: "CHANGE_PROPERTY",
          payload: {
            group: event.payload.group,
            property: event.payload.property,
          },
        });
        break;
      case "CHANGE_PROPERTY_CODE":
        dispatch({
          type: "CHANGE_PROPERTY_CODE",
          payload: {
            oldCode: event.payload.oldCode,
            newCode: event.payload.newCode,
            group: event.payload.group,
          },
        });
        break;
      case "REMOVE_PROPERTY":
        dispatch({
          type: "REMOVE_PROPERTY_ASSIGNMENT",
          payload: {
            property: event.payload.property,
            group: event.payload.group,
          },
        });
        break;
      case "RENAME_GROUP":
        dispatch({
          type: "RENAME_GROUP",
          payload: {
            oldGroup: event.payload.oldGroup,
            newGroup: event.payload.newGroup,
          },
        });
        break;
      case "ADD_GROUP":
        dispatch({ type: "ADD_GROUP", payload: "newgroup" });
        break;
      case "REMOVE_GROUP":
        dispatch({
          type: "REMOVE_GROUP",
          payload: { group: event.payload.group },
        });
        break;
      case "REORDER_GROUPS":
        dispatch({
          type: "REORDER_GROUPS",
          payload: {
            fromIndex: event.payload.fromIndex,
            toIndex: event.payload.toIndex,
          },
        });
        break;
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const form = (event.target as HTMLInputElement).form;
      const index = Array.prototype.indexOf.call(form, event.target);
      (form?.elements[index + 1] as HTMLElement)?.focus();
      event.preventDefault();
    }
  };

  // If trying to edit an object, then show a spinner until the object is fetched
  if (initial && mode === "edit") {
    return <Spinner />;
  }

  return (
    <div className="md-size-div">
      <h2>{mode === "edit" ? "Edit Type" : "Create Type"}</h2>
      <form onSubmit={handleSubmit}>
        <Select
          isRequired
          label="What is the base type of this type?"
          // §TODO: baseType is not actually a field, once we agree on an inheritance model, this will be adjusted
          selectedKeys={[state.schema.baseType]}
          onChange={handleSelectBaseType}
        >
          {objectTypes.map((type) => (
            <SelectItem key={type.code} value={type.code}>
              {type.code}
            </SelectItem>
          ))}
        </Select>
        <Input
          isRequired
          id="code"
          label="Code"
          type="text"
          className="form-field"
          value={state.schema.code ?? ""}
          onValueChange={(value) => {
            dispatch({ type: "SET_CODE", payload: value });
          }}
          onBlur={(event) => {
            if (objectTypeCode !== (event.target as HTMLInputElement).value) {
              const existingType = allObjectTypesResult.data?.find(
                (type) =>
                  type.getCode() === (event.target as HTMLInputElement).value
              );
              if (existingType) {
                const confirmSwitch = window.confirm(
                  "This type already exists. Do you want to switch to edit mode? Note: changes will remain, to get original use reset."
                );
                if (confirmSwitch) {
                  navigate({
                    to: `/types/creator?mode=edit&objecttypecode=${(event.target as HTMLInputElement).value}`,
                  });
                }
              } else if (mode === "edit") {
                const confirmSwitch = window.confirm(
                  "You cannot change the code of an Objecttype. Do you want to switch to create mode?"
                );
                if (confirmSwitch) {
                  navigate({
                    to: `/types/creator?mode=create&objecttypecode=${(event.target as HTMLInputElement).value}`,
                  });
                } else {
                  dispatch({ type: "SET_CODE", payload: objectTypeCode });
                }
              }
            }
          }}
          autoComplete="off"
          list="type-suggestions"
          onKeyDown={handleInputKeyDown}
        />
        <datalist id="type-suggestions">
          {allObjectTypesResult.data?.map((type) => (
            <option key={type.getCode()} value={type.getCode()} />
          ))}
        </datalist>
        <Input
          id="prefix"
          label="Prefix"
          placeholder="If left empty then the code's first 10 characters will be used as a prefix"
          type="text"
          className="form-field"
          value={state.schema.generatedCodePrefix ?? ""}
          onValueChange={(value) =>
            dispatch({ type: "SET_PREFIX", payload: value })
          }
          onKeyDown={handleInputKeyDown}
        />
        <Textarea
          id="description"
          label="Description"
          className="form-field"
          value={state.schema.description ?? ""}
          onValueChange={(value) =>
            dispatch({ type: "SET_DESCRIPTION", payload: value })
          }
        />
        <Divider className="my-4" />
        <TypeInheritanceChain type={state.schema} allTypes={objectTypes} />
        <Divider className="my-4" />
        <GroupedPropertyEditors
          schema={state.schema.propertyTypes}
          lockedPropertyCodes={lockedPropertyCodes}
          onEvent={handlePropertyEditorEvents}
          lockedGroups={lockedGroups}
        />

        <Divider className="my-4" />
        {showMessage && (
          <div style={{ marginBottom: "15px", color: messageColor }}>
            {message}
          </div>
        )}
        <div className="items-center">
          <Button
            type="button"
            color="default"
            className="mx-2"
            onPress={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            color="danger"
            className="mx-2"
            onPress={() => {
              if (mode === "edit") {
                window.location.reload();
              } else {
                handleClear(0);
              }
            }}
          >
            {mode === "edit" ? "Reset" : "Clear"}
          </Button>
          <Button
            type="submit"
            color="primary"
            className="mx-2"
            isDisabled={typeCreation.isPending}
            isLoading={loading}
          >
            {mode === "edit" ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
};

import React, { ChangeEvent, useReducer, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Input,
  Textarea,
  Divider,
  Card,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  Select,
  SelectItem,
} from "@nextui-org/react";
import { useCreateType } from "../../apis/type/useCreate";

import {
  INSTRUMENT_TYPE_DEFINITION,
  iLogBaseTypes,
} from "../../apis/shared/common";
import {
  ObjectSchema,
  ObjectTypeDefinition,
  convertObjectTypeDefinitionToOperations,
} from "../../apis/type/commonType";
import {
  LocalPrimitivePropertyType,
  LocalPropertyTypeVariants,
} from "../../apis/propertyType/commonPropertyType";
import { useGetAllTypes } from "../../apis/type/useGetAllTypes";
import { green } from "@mui/material/colors";
import SelectInput from "@mui/material/Select/SelectInput";
import { typeCreatorReducer } from "./TypeActions";
import { getDefaultPropertyAssignments } from "../../apis/shared/common";
import { GroupedPropertyEditors } from "./GroupedPropertyEditors";
import { GroupedPropertyEditorsEvents } from "./GroupedPropertyEditors";
import { useCreateObjectType } from "../../apis/type/useCreateObjectType";

const creatorOptions = ["create", "edit"] as const;
type CreatorOption = (typeof creatorOptions)[number];

interface TypeCreatorProps {
  type: CreatorOption;
  objectTypeDefinition: ObjectTypeDefinition;
}

export const TypeCreator: React.FC<TypeCreatorProps> = ({
  type,
  objectTypeDefinition,
}) => {
  const typeCreation = useCreateObjectType();
  const allTypesResult = useGetAllTypes();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(typeCreatorReducer, {
    schema: objectTypeDefinition,
    propertyCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState("rgb(23, 201, 100)");
  const [objectBaseType, setObjectBaseType] = useState(
    "INSTRUMENT" as (typeof iLogBaseTypes)[number]
  );

  const [newPropertyCount, setNewPropertyCount] = useState(0);

  const lockedPropertyCodes = Object.entries(
    INSTRUMENT_TYPE_DEFINITION.propertyAssignments
  ).flatMap(([group, assignment]) => assignment.map((el) => el.code));

  const lockedGroups = Object.keys(
    INSTRUMENT_TYPE_DEFINITION.propertyAssignments
  );

  if (allTypesResult.status == "success" && initial) {
    const resolvedTypes = Object.entries(state.schema.propertyAssignments).map(
      ([group, assignments]) => {
        return [
          group,
          assignments.flatMap((assigmnent) => {
            return allTypesResult.data.filter(
              (it) => it.code === assigmnent.code
            );
          }),
        ];
      }
    );
    dispatch({
      type: "SET_ALL_PROPERTY_ASSIGNMENTS",
      payload: { schema: Object.fromEntries(resolvedTypes) as ObjectSchema },
    });
    setInitial(false);
  }

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);
    const creations = convertObjectTypeDefinitionToOperations(state.schema);
    console.log(creations);
    const creation = typeCreation.mutateAsync({
      definition: state.schema,
    });

    console.log(state.schema);
    typeCreation.mutate(
      {
        definition: state.schema,
      },
      {
        onError: (err) => {
          setMessage(err.message);
          setMessageColor("rgb(243, 18, 96)");
          setShowMessage(true);
          setLoading(false);
        },
        onSuccess: () => {
          setMessage("Type created successfully!");
          setMessageColor("rgb(23, 201, 100)");
          setShowMessage(true);
          handleClear(2000);
        },
      }
    );
  };

  const onBack = () => {
    navigate({ to: "/types" });
  };

  const handleAddProperty = (propertyGroup: string) => {
    setNewPropertyCount((prev) => prev + 1);
    const newProp = {
      code: `NEW_PROPERTY${newPropertyCount}`,
      label: "New Property",
      description: "",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    } as LocalPrimitivePropertyType;
    dispatch({
      type: "SET_PROPERTY_ASSIGNMENT",
      payload: { group: propertyGroup, property: newProp },
    });
  };

  const handleClear = (ms: number) => {
    dispatch({ type: "CLEAR", payload: { baseType: objectBaseType } });
    setLoading(false);
    setTimeout(() => {
      setMessage("");
      setShowMessage(false);
    }, ms);
  };

  const handleSelectBaseType = (value: ChangeEvent<HTMLSelectElement>) => {
    setObjectBaseType(value.target.value as (typeof iLogBaseTypes)[number]);
    dispatch({
      type: "CLEAR",
      payload: {
        baseType: value.target.value as (typeof iLogBaseTypes)[number],
      },
    });
  };

  const handlePropertyEditorEvents = (event: GroupedPropertyEditorsEvents) => {
    switch (event.type) {
      case "ADD_PROPERTY":
        handleAddProperty(event.payload.group);
        break;
      case "EDIT_PROPERTY":
        console.log(event.payload.property);
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
        debugger;
        dispatch({
          type: "RENAME_GROUP",
          payload: {
            oldGroup: event.payload.oldGroup,
            newGroup: event.payload.newGroup,
          },
        });
        break;
      case "ADD_GROUP":
        dispatch({ type: "ADD_GROUP", payload: event.payload.group });
        break;
    }
  };

  return (
    <div className="md-size-div">
      <form onSubmit={handleSubmit}>
        <Select
          label="Is this type an instrument or a component"
          onChange={handleSelectBaseType}
        >
          {iLogBaseTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </Select>
        <Input
          isRequired
          id="code"
          label="Code"
          type="text"
          className="form-field"
          value={state.schema.code}
          onValueChange={(value) =>
            dispatch({ type: "SET_CODE", payload: value })
          }
        />
        <Input
          id="prefix"
          label="Prefix"
          placeholder="Enter type prefix: If left empty then the code itself will be used as a prefix"
          type="text"
          className="form-field"
          value={state.schema.prefix ?? ""}
          onValueChange={(value) =>
            dispatch({ type: "SET_PREFIX", payload: value })
          }
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
        <GroupedPropertyEditors
          schema={state.schema.propertyAssignments}
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
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            color="danger"
            className="mx-2"
            onClick={() => handleClear(0)}
          >
            Clear
          </Button>
          <Button
            type="submit"
            color="primary"
            className="mx-2"
            isDisabled={typeCreation.isLoading}
            isLoading={loading}
          >
            Create
          </Button>
        </div>
      </form>
    </div>
  );
};

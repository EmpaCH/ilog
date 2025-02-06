import React, { ChangeEvent, useReducer, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Input,
  Textarea,
  Divider,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  INSTRUMENT_TYPE_DEFINITION,
  iLogBaseTypes,
  iLogBaseAllTypes,
  EMPTY_TYPE_DEFINITION
} from "../../apis/shared/common";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "../../apis/type/commonType";
import { LocalPrimitivePropertyType } from "../../apis/propertyType/commonPropertyType";
import { useGetPropertyTypes } from "../../apis/propertyType/useGetPropertyTypes";
import { typeCreatorReducer } from "./TypeActions";
import { GroupedPropertyEditors } from "./GroupedPropertyEditors";
import { GroupedPropertyEditorsEvents } from "./GroupedPropertyEditors";
import { useCreateObjectType, useUpdateObjectType } from "../../apis/type/useCreateObjectType";
import { getObjectTypes } from "../../apis/type/typeAPI";
import { useGetAllTypes } from "../../apis/type/useGetAllTypes";
import openbis from "@openbis/openbis.esm";

// define whether this will be a Type Creator or Editor component
const creatorModes = ["create", "edit"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface TypeCreatorProps {
  mode: CreatorMode;
  objectTypeCode: string;
}

export const TypeCreator: React.FC<TypeCreatorProps> = ({
  mode,
  objectTypeCode,
}) => {
  
  const typeCreation = useCreateObjectType();
  const typeUpdate = useUpdateObjectType();
  const allPropertyTypesResult = useGetPropertyTypes();
  const allObjectTypesResult = useGetAllTypes();
  const navigate = useNavigate();
  let objectTypeTemplate: ObjectTypeDefinition;

  if (allObjectTypesResult.status == "success" && objectTypeCode !== "") {
    console.log("allObjectTypesResult", allObjectTypesResult.data);
    const openbisSampleType = allObjectTypesResult.data?.find(
      (it) => {
        return it.getCode().toUpperCase() === objectTypeCode.toUpperCase()
      }
    ) as openbis.SampleType;
    objectTypeTemplate = openbisSampleType ? convertOpenBISSampleTypeToObjectTypeDefinition(openbisSampleType) : EMPTY_TYPE_DEFINITION;
  } else {
    objectTypeTemplate = EMPTY_TYPE_DEFINITION;
  }

  const [state, dispatch] = useReducer(typeCreatorReducer, {
    schema: objectTypeTemplate,
    propertyCount: 0,
  });

  // useEffect(() => {
  //   const savedState = localStorage.getItem("typeCreatorState");
  //   if (savedState) {
  //     dispatch({
  //       type: "LOAD_SAVED_STATE",
  //       payload: JSON.parse(savedState),
  //     });
  //   }
  // }, []);

  // useEffect(() => {
  //   localStorage.setItem("typeCreatorState", JSON.stringify(state));
  // }, [state]);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(true);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState("rgb(23, 201, 100)");
  const [objectBaseType, setObjectBaseType] = useState("");
  const [newPropertyCount, setNewPropertyCount] = useState(0);

  const lockedPropertyCodes = Object.entries(
    INSTRUMENT_TYPE_DEFINITION.propertyTypes
  ).flatMap(([group, assignment]) => assignment.map((el) => el.code));

  const lockedGroups = Object.keys(
    INSTRUMENT_TYPE_DEFINITION.propertyTypes
  );

  if (allPropertyTypesResult.status == "success" && initial) {
    const resolvedTypes = Object.entries(state.schema.propertyTypes).map(
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
      payload: { schema: Object.fromEntries(resolvedTypes) as PropertyTypesSchema },
    });
    setInitial(false);
  }     


  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);

    if (mode === "edit") {
      console.log("Updating type with schema:", state.schema);
      // setMessage("Type update not implemented yet!");
      // setMessageColor("rgb(255, 165, 0)");
      // setShowMessage(true);
      // setLoading(false);
      typeUpdate.mutate({
        definition: state.schema,
      }, {
        onError: (err) => {
          setMessage(err.message.split(" (Context:")[0]);
          setMessageColor("rgb(243, 18, 96)");
          setShowMessage(true);
          setLoading(false);
        },
        onSuccess: () => {
          setMessage("Type updated successfully!");
          setMessageColor("rgb(23, 201, 100)");
          setShowMessage(true);
          handleClear(2000);
        },
      });
    } else {
      typeCreation.mutate({
        definition: state.schema,
      }, {
        onError: (err) => {
          setMessage(err.message.split(" (Context:")[0]);
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
      });
    }
  };

  const onBack = () => {
    navigate({ to: "/types" });
  };

  const handleAddProperty = (propertyGroup: string) => {
    setNewPropertyCount((prev) => prev + 1);
    const newProp = {
      code: `NEW_PROPERTY${newPropertyCount}`,
      label: "New Property",
      description: "New description",
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
    if (mode === "edit") {
      window.location.reload();
    } else {
      dispatch({ type: "CLEAR", payload: { baseType: "EMPTY" } });
      setObjectBaseType("");
      setLoading(false);
      setTimeout(() => {
        setMessage("");
        setShowMessage(false);
      }, ms);
    }
  };

  const handleSelectBaseType = (value: ChangeEvent<HTMLSelectElement>) => {
    setObjectBaseType(value.target.value);
    const newValue = value.target.value != "" ? value.target.value : "EMPTY";
    dispatch({
      type: "CLEAR",
      payload: {
        baseType: newValue as iLogBaseAllTypes,
      },
    });
  };

  const handlePropertyEditorEvents = (event: GroupedPropertyEditorsEvents) => {
    switch (event.type) {
      case "ADD_PROPERTY":
        handleAddProperty(event.payload.group);
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
        dispatch({ type: "REMOVE_GROUP", payload: { group: event.payload.group } });
        break;
      case "REORDER_GROUPS":
        dispatch({ type: "REORDER_GROUPS", payload: { fromIndex: event.payload.fromIndex, toIndex: event.payload.toIndex } });
        break;
    }
  };

  return (
    <div className="md-size-div">
      <h2>{mode === "edit" ? "Edit Type" : "Create Type"}</h2>
      <form onSubmit={handleSubmit}>
        <Select
          isRequired
          label="Is this type an instrument or a component?"
          // §TODO: baseType is not actually a field, once we agree on an inheritance model, this will be adjusted
          selectedKeys={[state.schema.baseType ?? "INSTRUMENT"]}
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
          value={state.schema.code ?? null}
          onValueChange={(value) =>
            dispatch({ type: "SET_CODE", payload: value })
          }
        />
        <Input
          id="prefix"
          label="Prefix"
          placeholder="If left empty then the code's first 5 characters will be used as a prefix"
          type="text"
          className="form-field"
          value={state.schema.generatedCodePrefix ?? ""}
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

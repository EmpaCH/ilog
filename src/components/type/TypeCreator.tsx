import React, { ChangeEvent, useReducer, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Input,
  Textarea,
  Divider,
  Card,
  CardHeader,
  Accordion,
  AccordionItem,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  Select,
  SelectItem,
} from "@nextui-org/react";
import { useCreateType } from "../../apis/type/useCreate";

import { PropertyEditor } from "./PropertyEditor";

import {
  INSTRUMENT_TYPE_DEFINITION,
  iLogBaseTypes,
} from "../../apis/shared/common";
import { ObjectSchema, ObjectTypeDefinition } from "../../apis/type/commonType";
import {
  LocalPrimitivePropertyType,
  LocalPropertyTypeVariants,
  PropertyType,
} from "../../apis/propertyType/commonPropertyType";
import { useGetAllTypes } from "../../apis/type/useGetAllTypes";
import { green } from "@mui/material/colors";
import SelectInput from "@mui/material/Select/SelectInput";
import { Icon } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { typeCreatorReducer } from "./TypeActions";
import { getDefaultPropertyAssignments } from "../../apis/shared/common";

interface GroupAccordionItemProps {
  schema: ObjectSchema;
  lockedPropertyCodes: string[];
  onAddProperty: (group: string) => void;
}

const GroupAccordionItem: React.FC<GroupAccordionItemProps> = ({
  schema,
  lockedPropertyCodes,
  onAddProperty,
}) => {
  return (
    <Accordion>
      {Object.entries(schema).flatMap(([propertyGroup, properties]) => {
        return (
          <AccordionItem key={propertyGroup} title={propertyGroup}>
            <Accordion>
              {properties.map((property) => (
                <AccordionItem key={property.code} title={property.code}>
                  <PropertyEditor
                    onEdit={(definition) => onAddProperty(propertyGroup)}
                    propertyTypeDefinitions={property}
                    locked={lockedPropertyCodes.includes(property.code)}
                  />
                </AccordionItem>
              ))}
            </Accordion>
            <Button
              isIconOnly
              onClick={(event) => onAddProperty(propertyGroup)}
            >
              <Icon>
                <AddIcon />
              </Icon>
            </Button>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

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
  const typeCreation = useCreateType();
  const allTypesResult = useGetAllTypes();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(typeCreatorReducer, {
    schema: objectTypeDefinition,
    propertyCount: 0,
  });

  const [loading, setLoading] = useState(false);
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

  if (allTypesResult.status == "success") {
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
  }

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);
    typeCreation.mutate(
      {
        code: state.schema.code,
        prefix: state.schema.prefix ?? state.schema.code,
        description: state.schema.description ?? "",
      },
      {
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
          onClear(2000);
        },
      }
    );
  };

  const onBack = () => {
    navigate({ to: "/types" });
  };

  const onAddProperty = (propertyGroup: string) => {
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

  const onClear = (ms: number) => {
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
        <GroupAccordionItem
          schema={state.schema.propertyAssignments}
          lockedPropertyCodes={lockedPropertyCodes}
          onAddProperty={onAddProperty}
        />
        <Button>Add Property Group</Button>
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
            onClick={() => onClear(0)}
          >
            Clear
          </Button>
          <Button
            type="submit"
            color="primary"
            className="mx-2"
            isLoading={loading}
          >
            Create
          </Button>
        </div>
      </form>
    </div>
  );
};

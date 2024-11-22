import React, { useState } from "react";
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
} from "@nextui-org/react";
import { useCreateType } from "../../apis/type/useCreate";
import { AccordionSummary, FormGroup, Grid } from "@mui/material";
import { PropertyEditor } from "./PropertyEditor";

import { INSTRUMENT_TYPE_DEFINITION, iLogBaseTypes } from "../../apis/shared/common";
import {
  ObjectSchema,
} from "../../apis/type/commonType";
import { LocalPropertyTypeVariants, PropertyType } from "../../apis/propertyType/commonPropertyType";
import { useGetAllTypes } from "../../apis/type/useGetAllTypes";
import { green } from "@mui/material/colors";

interface GroupAccordionItemProps {
  schema: ObjectSchema;
  lockedPropertyCodes: string[];
}

const GroupAccordionItem: React.FC<GroupAccordionItemProps> = ({
  schema,
  lockedPropertyCodes,
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
                    propertyTypeDefinitions={property}
                    locked={lockedPropertyCodes.includes(property.code)}
                  />
                </AccordionItem>
              ))}
            </Accordion>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export const TypeCreator = () => {
  const typeCreation = useCreateType();
  const allTypesResult = useGetAllTypes();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [prefix, setPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [messageColor, setMessageColor] = useState("rgb(23, 201, 100)");

  const [propertyAssignments, setPropertyAssignments] = useState(
    INSTRUMENT_TYPE_DEFINITION.propertyAssignments
  );

  const lockedPropertyCodes = Object.entries(
    INSTRUMENT_TYPE_DEFINITION.propertyAssignments
  ).flatMap(([group, assignment]) => assignment.map((el) => el.code));

  if (allTypesResult.status == "success") {
    const resolvedTypes = Object.entries(propertyAssignments).map(
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
    setPropertyAssignments(Object.fromEntries(resolvedTypes) as ObjectSchema);
  }

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowMessage(false);
    setLoading(true);
    typeCreation.mutate(
      {
        code: code,
        prefix: prefix.length > 0 ? prefix : code,
        description: description,
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

  const onClear = (ms: number) => {
    setCode("");
    setPrefix("");
    setDescription("");
    setLoading(false);
    setTimeout(() => {
      setMessage("");
      setShowMessage(false);
    }, ms);
  };

  return (
    <div className="md-size-div">
      <form onSubmit={handleSubmit}>
        <Dropdown>
          <DropdownItem>Sample</DropdownItem>
          <DropdownItem>Experiment</DropdownItem>
          <DropdownItem>Material</DropdownItem>
        </Dropdown>
        <Input
          isRequired
          id="code"
          label="Code"
          type="text"
          className="form-field"
          value={code}
          onValueChange={(value) => setCode(value)}
        />
        <Input
          id="prefix"
          label="Prefix"
          placeholder="Enter type prefix: If left empty then the code itself will be used as a prefix"
          type="text"
          className="form-field"
          value={prefix}
          onValueChange={(value) => setPrefix(value)}
        />
        <Textarea
          id="description"
          label="Description"
          className="form-field"
          value={description}
          onValueChange={(value) => setDescription(value)}
        />
        <Divider className="my-4" />
        <GroupAccordionItem
          schema={propertyAssignments}
          lockedPropertyCodes={lockedPropertyCodes}
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

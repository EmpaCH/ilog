import React, { useState } from "react";
import { Button, Accordion, AccordionItem, Input } from "@nextui-org/react";
import { PropertyEditor } from "./PropertyEditor";
import { Icon } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { PropertyType } from "../../apis/propertyType/commonPropertyType";
import { ObjectSchema } from "../../apis/type/commonType";

export type GroupedPropertyEditorsEvents =
  | { type: "ADD_PROPERTY"; payload: { group: string } }
  | {
      type: "EDIT_PROPERTY";
      payload: { group: string; property: PropertyType };
    }
  | {
      type: "CHANGE_PROPERTY_CODE";
      payload: { oldCode: string; newCode: string, group: string };
    }
  | {
      type: "REMOVE_PROPERTY";
      payload: { group: string; property: PropertyType };
    }
  | { type: "ADD_GROUP"; payload: { group: string } }
  | { type: "RENAME_GROUP"; payload: { oldGroup: string; newGroup: string } }
  | { type: "REMOVE_GROUP"; payload: { group: string } };

export interface GroupedPropertyEditorsProps {
  schema: ObjectSchema;
  lockedPropertyCodes: string[];
  lockedGroups: string[];
  onEvent: (event: GroupedPropertyEditorsEvents) => void;
}

export interface EditableAccordionTitleProps {
  initialTitle: string;
  onChange: (newTitle: string) => void;
  locked: Boolean;
}

const EditableAccordionTitle: React.FC<EditableAccordionTitleProps> = ({
  initialTitle,
  onChange,
  locked,
}) => {
  const [title, setTitle] = useState(initialTitle);
  return (
    <form>
      <Input
        isDisabled={locked}
        onChange={(event) => {
          event.preventDefault();
          setTitle(event.target.value);
        }}
        placeholder={title}
      />
      <Button isIconOnly> </Button>
    </form>
  );
};

export const GroupedPropertyEditors: React.FC<GroupedPropertyEditorsProps> = ({
  schema,
  lockedPropertyCodes,
  lockedGroups,
  onEvent,
}) => {
  const handlePropertyChanges = (
    group: string,
    oldProperty: PropertyType,
    newProperty: PropertyType
  ) => {
    if (oldProperty.code == newProperty.code) {
      onEvent({
        type: "EDIT_PROPERTY",
        payload: { group: group, property: newProperty },
      });
    } else {
      onEvent({
        type: "CHANGE_PROPERTY_CODE",
        payload: { newCode: newProperty.code, oldCode: oldProperty.code, group: group },
      });
    }
  };

  const [groupCount, setGroupCount] = React.useState(0);
  return (
    <>
      <Accordion>
        {Object.entries(schema).flatMap(([propertyGroup, properties]) => {
          return (
            <AccordionItem
              key={propertyGroup}
              textValue={propertyGroup}
              title={
                <EditableAccordionTitle
                  initialTitle={propertyGroup}
                  locked={lockedGroups.includes(propertyGroup)}
                  onChange={(newTitle) =>
                    onEvent({
                      type: "RENAME_GROUP",
                      payload: { newGroup: newTitle, oldGroup: propertyGroup },
                    })
                  }
                />
              }
              startContent={
                <Button
                  isDisabled={lockedGroups.includes(propertyGroup)}
                  isIconOnly
                  onClick={() =>
                    onEvent({
                      type: "REMOVE_GROUP",
                      payload: {
                        group: propertyGroup,
                      },
                    })
                  }
                  color="danger"
                >
                  <DeleteIcon />
                </Button>
              }
            >
              <Accordion disabledKeys={lockedPropertyCodes}>
                {properties.map((property) => (
                  <AccordionItem
                    key={property.code}
                    title={property.code}
                    startContent={
                      <Button
                        isIconOnly
                        onClick={() =>
                          onEvent({
                            type: "REMOVE_PROPERTY",
                            payload: {
                              group: propertyGroup,
                              property: property,
                            },
                          })
                        }
                        color="danger"
                      >
                        <DeleteIcon />
                      </Button>
                    }
                  >
                    <PropertyEditor
                      onEdit={(newProperty) =>
                        handlePropertyChanges(
                          propertyGroup,
                          property,
                          newProperty
                        )
                      }
                      propertyTypeDefinitions={property}
                    />
                  </AccordionItem>
                ))}
              </Accordion>
              <Button
                isIconOnly
                onClick={() =>
                  onEvent({
                    type: "ADD_PROPERTY",
                    payload: { group: propertyGroup },
                  })
                }
                color="primary"
              >
                <Icon>
                  <AddIcon />
                </Icon>
              </Button>
            </AccordionItem>
          );
        })}
      </Accordion>
      <Button
        onClick={() => {
          setGroupCount(groupCount + 1);
          onEvent({
            type: "ADD_GROUP",
            payload: { group: `group${groupCount}` },
          });
        }}
      >
        Add Property Group
      </Button>
    </>
  );
};

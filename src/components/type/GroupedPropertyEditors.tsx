import React, { useState, useEffect } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Accordion, AccordionItem } from "@heroui/react";
import { PropertyEditor } from "./PropertyEditor";
import { Icon, Tabs, Tab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import { PropertyType, LocalPropertyTypeVariants } from "../../apis/propertyType/commonPropertyType";
import { PropertyTypesSchema } from "../../apis/type/commonType";
import { useGetPropertyTypes } from "../../apis/propertyType/useGetPropertyTypes";
import { produce, enableMapSet } from "immer";

enableMapSet();


// These are the events that the GroupedPropertyEditor emits
// They must be handled by the parent component
export type GroupedPropertyEditorsEvents =
  | { type: "ADD_PROPERTY"; payload: { group: string; code: string } }
  | {
      type: "EDIT_PROPERTY";
      payload: { group: string; property: PropertyType };
    }
  | {
      type: "CHANGE_PROPERTY_CODE";
      payload: { oldCode: string; newCode: string; group: string };
    }
  | {
      type: "REMOVE_PROPERTY";
      payload: { group: string; property: PropertyType };
    }
  | { type: "ADD_GROUP"; payload: {} }
  | { type: "RENAME_GROUP"; payload: { oldGroup: string; newGroup: string } }
  | { type: "REMOVE_GROUP"; payload: { group: string } };

// The props that are received by the component
export interface GroupedPropertyEditorsProps {
  schema: PropertyTypesSchema;
  lockedPropertyCodes: string[];
  lockedGroups: string[];
  onEvent: (event: GroupedPropertyEditorsEvents) => void;
  mode?: "create" | "edit" | "view";
  isViewOnly?: boolean;
  isEditMode?: boolean;
}

//The state of the component
interface GroupedPropertyEditorsState {
  groupCount: number;
  accordionItemKeyMapping: { [key: string]: string };
}

//The actions that the reducer must dispatch to change the component state
type GroupedPropertyEditorsStateAction =
  | { type: "ADD_GROUP" }
  | { type: "REMOVE_GROUP"; payload: { group: string } }
  | { type: "REORDER_GROUPS"; payload: { fromIndex: number; toIndex: number } }
  | { type: "CHANGE_PROPERTY_CODE"; payload: { oldCode: string; newCode: string } }
  | { type: "ADD_PROPERTY"; payload: { group: string; code: string } };

// Reducer to handle component state changes
// The most important is renaming the property, because
// we want to have stable keys for the accordion items even
// if we rename the property.
const groupedPropertyEditorsReducer = produce(
  (
    draft: GroupedPropertyEditorsState,
    action: GroupedPropertyEditorsStateAction
  ) => {
    switch (action.type) {
      case "ADD_GROUP": {
        draft.groupCount += 1;
        break;
      }
      case "REMOVE_GROUP": {
        delete draft.accordionItemKeyMapping[action.payload.group];
        break;
      }
      case "CHANGE_PROPERTY_CODE": {
        draft.accordionItemKeyMapping[action.payload.newCode] =
          draft.accordionItemKeyMapping[action.payload.oldCode];
        delete draft.accordionItemKeyMapping[action.payload.oldCode];
        break;
      }
      case "ADD_PROPERTY": {
        draft.accordionItemKeyMapping[action.payload.code] = createPropertyKey();
        break;
      }
      case "REORDER_GROUPS": {
        break;
      }
    }
  }
);

// Generating random keys for list items
export const createPropertyKey = () => {
  return `${Math.random().toString(36).substring(7)}`;
};

export const GroupedPropertyEditors: React.FC<GroupedPropertyEditorsProps> = ({
  schema,
  lockedPropertyCodes,
  lockedGroups,
  onEvent,
  mode,
  isViewOnly,
  isEditMode: isEditModeProp,
}) => {
  const keys = Object.fromEntries(
    Object.entries(schema).flatMap(([propertyGroup, properties]) => {
      return properties.map((property) => [
        String(property.code),
        createPropertyKey(),
      ]);
    })
  );
  const [state, dispatch] = React.useReducer(groupedPropertyEditorsReducer, {
    groupCount: 0,
    accordionItemKeyMapping: keys,
  });

  // Fetch existing property types
  const existingPropertyTypesResult = useGetPropertyTypes();
  const existingPropertyTypes = existingPropertyTypesResult.data || [];

  // State for add property modal
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [selectedPropertyGroup, setSelectedPropertyGroup] = useState<string>("");
  const [propertySearchInput, setPropertySearchInput] = useState<string>("");
  const [addPropertyError, setAddPropertyError] = useState<string>("");

  // Get properties not already in the schema
  const availableProperties = existingPropertyTypes.filter(
    (prop) => !Object.values(schema).flat().some((p) => p.code === prop.code)
  );

  const handleOpenAddPropertyModal = (group: string) => {
    setSelectedPropertyGroup(group);
    setPropertySearchInput("");
    setAddPropertyError("");
    setShowAddPropertyModal(true);
  };

  const handleConfirmAddProperty = () => {
    // Use propertySearchInput which now contains either typed or selected value
    const propertyCode = propertySearchInput.trim();

    if (!propertyCode) {
      setAddPropertyError("Please select an existing property or type a new property name");
      return;
    }

    onEvent({
      type: "ADD_PROPERTY",
      payload: { group: selectedPropertyGroup, code: propertyCode },
    });
    dispatch({ type: "ADD_PROPERTY", payload: { code: propertyCode, group: selectedPropertyGroup } });

    setShowAddPropertyModal(false);
    setSelectedPropertyGroup("");
    setPropertySearchInput("");
    setAddPropertyError("");
  };

  // This function handles the events from
  // the PropertyEditor component
  // in some cases it dispatches a new action to the reducer
  // to handle the changes that affect the state of the current component
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
      dispatch({
        type: "CHANGE_PROPERTY_CODE",
        payload: { oldCode: oldProperty.code, newCode: newProperty.code },
      });
      onEvent({
        type: "CHANGE_PROPERTY_CODE",
        payload: {
          newCode: newProperty.code,
          oldCode: oldProperty.code,
          group: group,
        },
      });
    }
  };
  
  const [selectedTab, setSelectedTab] = React.useState(0);

  // Reset selectedTab to 0 if the number of groups changes or selectedTab is out of bounds
  useEffect(() => {
    const groupCount = Object.keys(schema).length;
    if (selectedTab >= groupCount) {
      setSelectedTab(0);
    }
  }, [Object.keys(schema).length, selectedTab]);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setSelectedTab(newValue);
  };

  
  return (
    <>
      <Tabs value={selectedTab} onChange={handleTabChange}>
        {Object.keys(schema).map((propertyGroup, index) => {
          const isDuplicate = Object.keys(schema).filter(
        (group) => group === propertyGroup
          ).length > 1;
          return (
        <Tab
          key={`tab-${propertyGroup}-${index}`}
          label={
            <div
              contentEditable={!lockedGroups.includes(propertyGroup) && !isViewOnly}
              suppressContentEditableWarning={true}
              onBlur={(e) => {
                if (isViewOnly) return;
                const newTitle = e.currentTarget.textContent || propertyGroup;
                if (newTitle !== propertyGroup) {
                  onEvent({
                    type: "RENAME_GROUP",
                    payload: { newGroup: newTitle, oldGroup: propertyGroup },
                  });
                }
              }}
              style={{
                padding: "0 10px",
                borderBottom: lockedGroups.includes(propertyGroup)
                  ? "none"
                  : "1px dashed #ccc",
                cursor: lockedGroups.includes(propertyGroup) || isViewOnly
                  ? "default"
                  : "text",
                color: isDuplicate ? "red" : "inherit",
              }}
            >
              {propertyGroup}
            </div>
          }
          draggable={false}
          onDragStart={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
          }}
          onDragOver={(e) => e.preventDefault()}
        />
          );
        })}
        {!isViewOnly && (
          <Tab
            key="add-group-tab"
            label="+ Add Group"
            onClick={() => {
              const newGroup = `group${state.groupCount + 1}`;
              onEvent({
                type: "ADD_GROUP",
                payload: { group: newGroup },
              });
              dispatch({ type: "ADD_GROUP" });
              setSelectedTab(Object.keys(schema).length); // Switch to the new tab
            }}
            style={{ backgroundColor: "#f0f0f0", cursor: "pointer" }}
          />
        )}
      </Tabs>
      {Object.entries(schema).map(([propertyGroup, properties], index) => (
        <div
          role="tabpanel"
          hidden={selectedTab !== index}
          key={`tabpanel-${propertyGroup}-${index}`}
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
        >
          {selectedTab === index && (
            <>
              <Accordion selectionMode="multiple">
                {properties.map((property, propertyIndex) => (
                  <AccordionItem
                    key={state.accordionItemKeyMapping[property.code] || `${propertyGroup}-${property.code}-${propertyIndex}`}
                    title={property.code}
                    startContent={
                      isViewOnly ? null : (
                        lockedPropertyCodes.includes(property.code) ? (
                          <Icon
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: "grey",
                              borderRadius: "8px",
                              width: "30px",
                              height: "30px",
                            }}
                          >
                            <LockIcon style={{ color: "white" }} />
                          </Icon>
                        ) : (
                          <div
                            onClick={() => {
                              onEvent({
                                type: "REMOVE_PROPERTY",
                                payload: {
                                  group: propertyGroup,
                                  property: property,
                                },
                              });
                            }}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: "red",
                              borderRadius: "8px",
                              width: "30px",
                              height: "30px",
                              cursor: "pointer",
                            }}
                          >
                            <DeleteIcon style={{ color: "white" }} />
                          </div>
                        )
                      )
                    }
                  >
                    <PropertyEditor
                      onEdit={(newProperty) => {
                        if (isViewOnly) return;
                        handlePropertyChanges(
                          propertyGroup,
                          property,
                          newProperty
                        )
                      }}
                      locked={isViewOnly || lockedPropertyCodes.includes(property.code)}
                      lockedCode={lockedPropertyCodes.includes(property.code)}
                      propertyTypeDefinitions={property as LocalPropertyTypeVariants}
                    />
                  </AccordionItem>
                ))}
              </Accordion>

              {!isViewOnly && (
                <>
                  <Button
                    isIconOnly
                    onPress={() => {
                      handleOpenAddPropertyModal(propertyGroup);
                    }}
                    color="primary"
                  >
                    <Icon
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <AddIcon />
                    </Icon>
                  </Button>
                  {lockedGroups.includes(propertyGroup) || properties.some((property) =>
                    lockedPropertyCodes.includes(property.code)
                  ) ? (
                    <Button
                      color="warning"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "not-allowed",
                        opacity: 0.5,
                      }}
                      disabled
                    >
                      <LockIcon /> Locked Group
                    </Button>
                  ) : (
                    <Button
                      onPress={() => {
                        onEvent({
                          type: "REMOVE_GROUP",
                          payload: { group: propertyGroup },
                        });
                        setSelectedTab(0);
                      }}
                      color="danger"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <DeleteIcon /> Delete Group
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      ))}
      <Modal size="2xl" isOpen={showAddPropertyModal} onOpenChange={setShowAddPropertyModal}>
        <ModalContent>
          <ModalHeader>Add Property to {selectedPropertyGroup}</ModalHeader>
          <ModalBody>
            <p style={{  color: "rgb(243, 18, 96)" }}>
              Type a property name: if it matches an existing property it will be reused, otherwise a new one will be created.
            </p>
              <Input
                placeholder="Type property code..."
                value={propertySearchInput}
                onValueChange={(value) => {
                  setPropertySearchInput(value);
                  setAddPropertyError("");
                }}
                list="available-properties-list"
                autoComplete="off"
              />
              <datalist id="available-properties-list">
                {availableProperties.map((prop) => (
                  <option key={prop.code} value={prop.code}>
                    {prop.dataType}{prop.multivalued ? "[]" : ""}
                  </option>
                ))}
              </datalist>
            {addPropertyError && (
              <p style={{ color: "rgb(243, 18, 96)", fontSize: "0.875rem" }}>
                {addPropertyError}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="default" onPress={() => {
              setShowAddPropertyModal(false);
              setPropertySearchInput("");
              setAddPropertyError("");
            }}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleConfirmAddProperty}>
              Add Property
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

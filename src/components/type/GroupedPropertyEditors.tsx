import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionItem,
  Autocomplete,
  AutocompleteItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
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
  | { type: "ADD_PROPERTY"; payload: { group: string; code: string; key?: string } };

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
        draft.accordionItemKeyMapping[action.payload.code] =
          action.payload.key || createPropertyKey();
        break;
      }
      case "REORDER_GROUPS": {
        break;
      }
    }
  }
);

// Generating random keys for list items
const createPropertyKey = () => {
  return `${Math.random().toString(36).substring(7)}`;
};

export const GroupedPropertyEditors: React.FC<GroupedPropertyEditorsProps> = ({
  schema,
  lockedPropertyCodes,
  lockedGroups,
  onEvent,
  isViewOnly,
  isEditMode,
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

  // Track properties added in this editing session so they can be detachable/editable
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set());

  // Get properties not already in the schema
  const availableProperties = existingPropertyTypes.filter(
    (prop) => !Object.values(schema).flat().some((p) => p.code === prop.code)
  );
  const isExistingSelected = availableProperties.some((p) => p.code === propertySearchInput);

  const handleOpenAddPropertyModal = (group: string) => {
    setSelectedPropertyGroup(group);
    setPropertySearchInput("");
    setAddPropertyError("");
    setShowAddPropertyModal(true);
  };

  // Track opened accordion item keys so we can open newly created items
  const [openedKeys, setOpenedKeys] = useState<Set<string>>(new Set());

  const handleConfirmAddProperty = () => {
    // Use propertySearchInput which now contains either typed or selected value
    const propertyCode = propertySearchInput.trim();

    const isExisting = availableProperties.some((p) => p.code === propertyCode);
    // If creating a new property, generate a key so we can open it immediately
    const newKey = isExisting ? undefined : createPropertyKey();

    onEvent({
      type: "ADD_PROPERTY",
      payload: { group: selectedPropertyGroup, code: propertyCode },
    });
    dispatch({ type: "ADD_PROPERTY", payload: { code: propertyCode, group: selectedPropertyGroup, key: newKey } });

    // remember newly added code so we can treat it differently from originally attached
    setNewlyAdded((prev) => new Set(Array.from(prev).concat(propertyCode)));
    if (!isExisting && newKey) {
      setOpenedKeys((prev) => new Set(Array.from(prev).concat(newKey)));
    }

    setShowAddPropertyModal(false);
    setSelectedPropertyGroup("");
    setPropertySearchInput("");
    setAddPropertyError("");
  };

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
        // If the property was added during this editing session, update the newlyAdded set
        setNewlyAdded((prev) => {
          const n = new Set(prev);
          if (n.has(oldProperty.code)) {
            n.delete(oldProperty.code);
            n.add(newProperty.code);
          }
          return n;
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
        {isEditMode && (
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
      {Object.entries(schema).map(([propertyGroup, properties], index) => {
        const groupHasLockedProperty = properties.some((property) => lockedPropertyCodes.includes(property.code));
        const canDeleteGroup = !lockedGroups.includes(propertyGroup) && properties.length === 0 && !groupHasLockedProperty;
        return (
          <div
            role="tabpanel"
            hidden={selectedTab !== index}
            key={`tabpanel-${propertyGroup}-${index}`}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
          >
            {selectedTab === index && (
              <>
                <Accordion selectionMode="multiple" selectedKeys={openedKeys} onSelectionChange={(s) => setOpenedKeys(s as Set<string>)}>
                  {properties.map((property, propertyIndex) => {
                    const itemKey = state.accordionItemKeyMapping[property.code] || `${propertyGroup}-${property.code}-${propertyIndex}`;
                    const isExistingProperty = existingPropertyTypes.some((p) => p.code === property.code);
                    const isNewlyAdded = newlyAdded.has(property.code);

                    return (
                      <AccordionItem
                        key={itemKey}
                        title={property.code}
                        startContent={
                          !isEditMode ? null : (
                            !isNewlyAdded ? (
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
                              // show delete button unless it's an originally attached property while editing
                              <div
                                onClick={() => {
                                  // remove from newlyAdded set if present
                                  setNewlyAdded((prev) => {
                                    const n = new Set(prev);
                                    n.delete(property.code);
                                    return n;
                                  });
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
                            if (isExistingProperty) return;
                            handlePropertyChanges(propertyGroup, property, newProperty);
                          }}
                          locked={isExistingProperty}
                          propertyTypeDefinitions={property as LocalPropertyTypeVariants}
                        />
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {isEditMode && (
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
                    {!canDeleteGroup ? (
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
        );
      })}
      <Modal size="2xl" isOpen={showAddPropertyModal} onOpenChange={setShowAddPropertyModal}>
        <ModalContent>
          <ModalHeader>Add Property to {selectedPropertyGroup}</ModalHeader>
          <ModalBody>
            <p style={{ color: "rgb(243, 18, 96)" }} className="mb-4">
              You can either select one of the already existing property types or create a new one.
            </p>
            <Autocomplete
              placeholder="Search by property type code..."
              className="form-field"
              aria-label="Property search input"
              selectedKey={availableProperties.some(p => p.code === propertySearchInput) ? propertySearchInput : null}
              defaultItems={availableProperties}
              onSelectionChange={(value) => {
                setPropertySearchInput(value ? String(value) : "");
                setAddPropertyError("");
              }}
            >
              {availableProperties.map((prop) => (
                <AutocompleteItem
                  key={prop.code}
                  value={prop.code}
                  aria-label={prop.code}
                  endContent={
                    <span style={{ color: "grey" }}>{prop.dataType}{prop.multivalued ? "[]" : ""}</span>
                  }
                >
                  {prop.code}
                </AutocompleteItem>
              ))}
            </Autocomplete>
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
              {isExistingSelected ? "Add Existing" : "Create New"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

import React, { useEffect } from "react";
import { Button, Accordion, AccordionItem } from "@nextui-org/react";
import { PropertyEditor } from "./PropertyEditor";
import { Icon, Tabs, Tab} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { PropertyType } from "../../apis/propertyType/commonPropertyType";
import { PropertyTypesSchema } from "../../apis/type/commonType";
import { produce, current, original, enableMapSet } from "immer";
import { EditableAccordionTitle } from "./EditableAccordionTitle";

enableMapSet();


// These are the events that the GroupedPropertyEditor emits
// They must be handled by the parent component
export type GroupedPropertyEditorsEvents =
  | { type: "ADD_PROPERTY"; payload: { group: string } }
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
  | { type: "REMOVE_GROUP"; payload: { group: string } }
  | { type: "REORDER_GROUPS"; payload: { fromIndex: number; toIndex: number } };

// The props that are received by the component
export interface GroupedPropertyEditorsProps {
  schema: PropertyTypesSchema;
  lockedPropertyCodes: string[];
  lockedGroups: string[];
  onEvent: (event: GroupedPropertyEditorsEvents) => void;
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
  | { type: "ADD_PROPERTY"; payload: { code: string } };

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
      case "REORDER_GROUPS": {
        break;
      }
    }
  }
);

export const createPropertyKey = (property: PropertyType) => {
  return `${Math.random().toString(36).substring(7)}`;
};

export const GroupedPropertyEditors: React.FC<GroupedPropertyEditorsProps> = ({
  schema,
  lockedPropertyCodes,
  lockedGroups,
  onEvent,
}) => {
  const keys = Object.fromEntries(
    Object.entries(schema).flatMap(([propertyGroup, properties]) => {
      return properties.map((property) => [
        String(property.code),
        createPropertyKey(property),
      ]);
    })
  );
  const [state, dispatch] = React.useReducer(groupedPropertyEditorsReducer, {
    groupCount: 0,
    accordionItemKeyMapping: keys,
  });

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

  // return (
  //   <>
  //     <Accordion>
  //       {Object.entries(schema).flatMap(([propertyGroup, properties]) => {
  //         return (
  //           <AccordionItem
  //             key={propertyGroup}
  //             textValue={propertyGroup}
  //             title={
  //               <EditableAccordionTitle
  //                 initialTitle={propertyGroup}
  //                 locked={lockedGroups.includes(propertyGroup)}
  //                 onChange={(newTitle) =>
  //                   onEvent({
  //                     type: "RENAME_GROUP",
  //                     payload: { newGroup: newTitle, oldGroup: propertyGroup },
  //                   })
  //                 }
  //               />
  //             }
  //             startContent={
  //               <Button
  //                 isDisabled={lockedGroups.includes(propertyGroup)}
  //                 isIconOnly
  //                 onClick={() =>
  //                   onEvent({
  //                     type: "REMOVE_GROUP",
  //                     payload: {
  //                       group: propertyGroup,
  //                     },
  //                   })
  //                 }
  //                 color="danger"
  //               >
  //                 <DeleteIcon />
  //               </Button>
  //             }
  //           >
  //             <Accordion>
  //               {properties.map((property) => (
  //                 <AccordionItem
  //                   isDisabled={lockedPropertyCodes.includes(property.code)}
  //                   key={state.accordionItemKeyMapping[property.code]}
  //                   title={property.code}
  //                   startContent={
  //                     <Button
  //                       isIconOnly
  //                       onClick={() =>
  //                         onEvent({
  //                           type: "REMOVE_PROPERTY",
  //                           payload: {
  //                             group: propertyGroup,
  //                             property: property,
  //                           },
  //                         })
  //                       }
  //                       color="danger"
  //                     >
  //                       <DeleteIcon />
  //                     </Button>
  //                   }
  //                 >
  //                   <PropertyEditor
  //                     onEdit={(newProperty) =>
  //                       handlePropertyChanges(
  //                         propertyGroup,
  //                         property,
  //                         newProperty
  //                       )
  //                     }
  //                     propertyTypeDefinitions={property}
  //                   />
  //                 </AccordionItem>
  //               ))}
  //             </Accordion>
  //             <Button
  //               isIconOnly
  //               onClick={() =>
  //                 onEvent({
  //                   type: "ADD_PROPERTY",
  //                   payload: { group: propertyGroup },
  //                 })
  //               }
  //               color="primary"
  //             >
  //               <Icon>
  //                 <AddIcon />
  //               </Icon>
  //             </Button>
  //           </AccordionItem>
  //         );
  //       })}
  //     </Accordion>
  //     <Button
  //       onClick={() => {
  //         onEvent({
  //           type: "ADD_GROUP",
  //           payload: { group: `group${state.groupCount + 1}` },
  //         });
  //         dispatch({ type: "ADD_GROUP" });
  //       }}
  //     >
  //       Add Property Group
  //     </Button>
  //   </>
  // );

  
  const [selectedTab, setSelectedTab] = React.useState(0);

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
          key={propertyGroup}
          label={
            <div
          contentEditable={!lockedGroups.includes(propertyGroup)}
          suppressContentEditableWarning={true}
          onBlur={(e) => {
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
            cursor: lockedGroups.includes(propertyGroup)
              ? "default"
              : "text",
            color: isDuplicate ? "red" : "inherit",
          }}
            >
          {propertyGroup}
            </div>
          }
          draggable={!lockedGroups.includes(propertyGroup)}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", index.toString());
          }}
          onDrop={(e) => {
            const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
            const toIndex = index;
            if (fromIndex !== toIndex) {
              onEvent({
                type: "REORDER_GROUPS",
                payload: { fromIndex: fromIndex, toIndex: toIndex },
              });
            }
            e.preventDefault();
          }}
          onDragOver={(e) => e.preventDefault()}
        />
          );
        })}
        <Tab
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
          style={{ backgroundColor: "#f0f0f0" }} // Add grey background
        />
      </Tabs>
      {Object.entries(schema).map(([propertyGroup, properties], index) => (
        <div
          role="tabpanel"
          hidden={selectedTab !== index}
          key={propertyGroup}
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
        >
          {selectedTab === index && (
            <>
              <Accordion>
                {properties.map((property) => (
                  <AccordionItem
                    isDisabled={lockedPropertyCodes.includes(property.code)}
                    key={state.accordionItemKeyMapping[property.code]}
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
              <Button
                onClick={() => {
                  onEvent({
                    type: "REMOVE_GROUP",
                    payload: { group: propertyGroup },
                  });
                  // dispatch({ type: "REMOVE_GROUP", payload: { group: propertyGroup } });
                  setSelectedTab(0);
                }}
                color="danger"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <DeleteIcon /> Delete Group
              </Button>
            </>
          )}
        </div>
      ))}
    </>
  );
};

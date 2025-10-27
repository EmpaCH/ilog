import React from "react";
import { Accordion, AccordionItem, Input } from "@heroui/react";
import { Tabs, Tab } from "@mui/material";
import { LogbookEntryState, LogbookEntryActions } from "./LogbookEntryActions";
import { ComponentListPropertyEditor } from "../object/ComponentListPropertyEditor";

// The props that are received by the component
// define whether this will be a Logbook Entry Creator or Editor component
const creatorModes = ["edit", "view"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface LogbookEntryPropertyEditorsProps {
  mode: CreatorMode;
  state: LogbookEntryState;
  dispatch: React.Dispatch<LogbookEntryActions>;
  hiddenPropertyCodes?: string[];
}

// Generating random keys for list items
const createPropertyKey = () => {
  return `${Math.random().toString(36).substring(7)}`;
};

export const LogbookEntryPropertyEditor: React.FC<LogbookEntryPropertyEditorsProps> = ({
  mode,
  state,
  dispatch,
  hiddenPropertyCodes,
}) => {
  const keys = Object.fromEntries(
    Object.entries(state.propertiesSchema).flatMap(([propertyGroup, properties]) => {
      return properties.map((property) => [
        String(property.code),
        createPropertyKey(),
      ]);
    })
  );

  const [selectedTab, setSelectedTab] = React.useState(0);
  const [accordionKeys, setAccordionKeys] = React.useState(keys);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <>
      <Tabs value={selectedTab} onChange={handleTabChange}>
        {Object.keys(state.propertiesSchema).map((propertyGroup, index) => (
          <Tab
            key={index}
            label={propertyGroup}
          />
        ))}
      </Tabs>
      {Object.entries(state.propertiesSchema).map(([propertyGroup, properties], index) => (
        <div
          role="tabpanel"
          hidden={selectedTab !== index}
          key={propertyGroup}
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
        >
          {selectedTab === index && (
            <Accordion selectionMode="multiple">
              {properties.map((property) => {
                return !hiddenPropertyCodes?.includes(property.code) ? (
                  <AccordionItem
                    key={accordionKeys[property.code]}
                    title={property.code}
                    aria-label={property.code}
                  >
                    {property.code === "COMPONENT" ?
                      <ComponentListPropertyEditor
                        dispatch={dispatch}
                      /> :
                      <Input
                        disabled={mode === "view"}
                        id={property.code}
                        placeholder={property.description}
                        value={state.propertyValues[property.code]}
                        onValueChange={(value) =>
                          dispatch
                          // {dispatch &&
                          //   dispatch({ type: "SET_PROPERTY_VALUES", payload: {
                          //     [property.code]: value
                          //   }})
                          // }
                        }
                      />
                    }
                  </AccordionItem>
                ) : null;
              })}
            </Accordion>
          )}
        </div>
      ))}
    </>
  );
};

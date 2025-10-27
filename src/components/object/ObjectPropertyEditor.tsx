import React from "react";
import {
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { Tabs, Tab } from "@mui/material";
import { ObjectCreatorState, ObjectCreatorActions } from "./ObjectActions";
import { SpecificPropertyEditor } from "./SpecificPropertyEditor";
import { LocalPropertyTypeVariants } from "../../apis/propertyType/commonPropertyType";

// The props that are received by the component
// define whether this will be an Object Creator or Editor component
const creatorModes = ["edit", "view"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface ObjectPropertyEditorsProps {
  mode: CreatorMode;
  state: ObjectCreatorState;
  dispatch?: React.Dispatch<ObjectCreatorActions>;
  hiddenPropertyCodes?: string[];
}

// Generating random keys for list items
const createPropertyKey = () => {
  return `${Math.random().toString(36).substring(7)}`;
};

export const ObjectPropertyEditor: React.FC<ObjectPropertyEditorsProps> = ({
  mode,
  state,
  dispatch,
  hiddenPropertyCodes,
}) => {
  const keys = Object.fromEntries(
    Object.entries(state.propertiesSchema).flatMap(
      ([propertyGroup, properties]) => {
        return properties.map((property) => [
          String(property.code),
          createPropertyKey(),
        ]);
      }
    )
  );

  const [selectedTab, setSelectedTab] = React.useState(0);
  const [accordionKeys, setAccordionKeys] = React.useState(keys);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleValueChange = React.useCallback((propertyCode: string, value: any) => {
    dispatch?.({
      type: "SET_PROPERTY_VALUES",
      payload: {
        [propertyCode]: value,
      },
    });
  }, [dispatch]);

  return (
    <>
      <Tabs value={selectedTab} onChange={handleTabChange}>
        {Object.keys(state.propertiesSchema).map((propertyGroup, index) => (
          <Tab key={index} label={propertyGroup} />
        ))}
      </Tabs>
      {Object.entries(state.propertiesSchema).map(
        ([propertyGroup, properties], index) => (
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
                      <SpecificPropertyEditor
                        propertyValue={state.propertyValues[property.code]}
                        propertyDefinition={property as LocalPropertyTypeVariants}
                        mode={mode}
                        onValueChange={(value) => handleValueChange(property.code, value)}
                      />
                    </AccordionItem>
                  ) : null;
                })}
              </Accordion>
            )}
          </div>
        )
      )}
    </>
  );
};

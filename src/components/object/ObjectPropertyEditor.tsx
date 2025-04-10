import React from "react";
import {
  Accordion,
  AccordionItem,
  DatePicker,
  DateValue,
  Input,
} from "@heroui/react";
import { parseDate, getLocalTimeZone } from "@internationalized/date";
import { Tabs, Tab, Checkbox } from "@mui/material";
import { ObjectCreatorState, ObjectCreatorActions } from "./ObjectActions";
import {
  CUSTOM_WIDGET_KEY,
  LocalPropertyType,
} from "../../apis/propertyType/commonPropertyType";
import { ImagePropertyEditor } from "../widgets/ImagePropertyEditor";
import { useGetVocabulary } from "../../apis/vocabulary/useGetVocabulary";

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

interface SpecificPropertyEditorProps {
  propertyDefinition: LocalPropertyType;
  propertyValue: string;
  mode: CreatorMode;
  onValueChange: (input: string | boolean | Date) => void;
}

const SpecificPropertyEditor: React.FC<SpecificPropertyEditorProps> = ({
  propertyValue,
  propertyDefinition,
  mode,
  onValueChange,
}) => {

  const vocabularyRes = useGetVocabulary(propertyDefinition.vocabulary ?? "");

  if (
    propertyDefinition.dataType == "VARCHAR" &&
    propertyDefinition.metadata?.[CUSTOM_WIDGET_KEY] === "IMAGE"
  ) {
    return (
      <ImagePropertyEditor
        image={propertyValue}
        onImageChange={(image) => {
          console.log("Image changed", image);
          onValueChange(image);
        }}
      />
    );
  } else if (propertyDefinition.dataType == "VARCHAR") {
    return (
      <Input
        disabled={mode === "view"}
        id={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="text"
        onValueChange={onValueChange}
      />
    );
  } else if (propertyDefinition.dataType == "BOOLEAN") {
    return (
      <Checkbox
        disabled={mode === "view"}
        id={propertyDefinition.code}
        value={propertyValue}
        onChange={(event, checked) => onValueChange(checked)}
      />
    );
  } else if (
    propertyDefinition.dataType == "INTEGER" ||
    propertyDefinition.dataType == "REAL"
  ) {
    return (
      <Input
        disabled={mode === "view"}
        id={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="number"
        onValueChange={(value) => onValueChange(value)}
      />
    );
  } else if (
    propertyDefinition.dataType == "DATE" ||
    propertyDefinition.dataType == "TIMESTAMP"
  ) {
    return (
      <DatePicker
        isDisabled={mode === "view"}
        id={propertyDefinition.code}
        value={parseDate(propertyValue ?? "2000-01-01")}
        onChange={(value) => onValueChange(value?.toString())}
      />
    );
  } else if (propertyDefinition.dataType == "CONTROLLEDVOCABULARY") {
    return (
      <>{vocabularyRes?.data}</>
);
  } else {
    return (
      <Input
        disabled={mode === "view"}
        id={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="text"
        onValueChange={onValueChange}
      />
    );
  }
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
                      {/* <Input
                        disabled={mode === "view"}
                        id={property.code}
                        placeholder={property.description}
                        value={state.propertyValues[property.code]}
                        onValueChange={(value) => {
                          dispatch &&
                            dispatch({
                              type: "SET_PROPERTY_VALUES",
                              payload: {
                                [property.code]: value,
                              },
                            });
                        }}
                      /> */}
                      <SpecificPropertyEditor
                        propertyValue={state.propertyValues[property.code]}
                        propertyDefinition={property}
                        mode={mode}
                        onValueChange={(value) => {
                          dispatch({
                            type: "SET_PROPERTY_VALUES",
                            payload: {
                              [property.code]: value,
                            },
                          });
                        }}
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

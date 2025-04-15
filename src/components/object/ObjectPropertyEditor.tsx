import React from "react";
import { useMemo } from "react";
import {
  Accordion,
  AccordionItem,
  AutocompleteItem,
  Autocomplete,
  DatePicker,
  DateValue,
  Input,
  Checkbox,
  Textarea,
} from "@heroui/react";
import {
  parseDate,
  getLocalTimeZone,
  now,
  parseDateTime,
  parseZonedDateTime,
  parseAbsolute,
  ZonedDateTime,
  DateFormatter,
  fromAbsolute,
  fromDate,
} from "@internationalized/date";
import { Tabs, Tab } from "@mui/material";
import { ObjectCreatorState, ObjectCreatorActions } from "./ObjectActions";
import {
  CUSTOM_WIDGET_KEY,
  LocalPropertyType,
  LocalPropertyTypeVariants,
} from "../../apis/propertyType/commonPropertyType";
import { ImagePropertyEditor } from "../widgets/ImagePropertyEditor";
import { useGetVocabulary } from "../../apis/vocabulary/useGetVocabulary";
import { Editor } from "@monaco-editor/react";

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

const toOpenBISDate = (value: ZonedDateTime): string => {
  return value.toDate().toISOString().split(".")[0] + "Z";
};

const fromOpenBISDate = (value: string): ZonedDateTime => {
  console.log("Parsing date", value);
  return fromDate(new Date(value), getLocalTimeZone());
};

interface SpecificPropertyEditorProps {
  propertyDefinition: LocalPropertyTypeVariants;
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
  const defaultDate = useMemo(() => now(getLocalTimeZone()), []); // Memoize the default date

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
        aria-label={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="text"
        onValueChange={onValueChange}
      />
    );
  } else if (propertyDefinition.dataType == "MULTILINE_VARCHAR") {
    return (
      <Textarea
        disabled={mode === "view"}
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="text"
        onValueChange={onValueChange}
      />
    );
  } else if (propertyDefinition.dataType == "OBJECT") {
    return <p>Not implemented yet</p>;
  } else if (propertyDefinition.dataType == "BOOLEAN") {
    return (
      <Checkbox
        disabled={mode === "view"}
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        value={propertyValue}
        onValueChange={(isSelected) => onValueChange(isSelected)}
      />
    );
  } else if (propertyDefinition.dataType == "HYPERLINK") {
    return (
      <Input
        disabled={mode === "view"}
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="url"
        onValueChange={onValueChange}
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
        aria-label={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="number"
        onValueChange={(value) => onValueChange(value)}
      />
    );
  } else if (propertyDefinition.dataType == "DATE") {
    return (
      <DatePicker
        isDisabled={mode === "view"}
        showMonthAndYearPickers
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        value={parseDate(propertyValue ?? "2022-01-01")} // Use memoized value
        onChange={(value) => value !== null ? onValueChange(value?.toString()) : null}
      />
    );
  } else if (propertyDefinition.dataType == "TIMESTAMP") {
    return (
      <DatePicker
        hideTimeZone
        showMonthAndYearPickers
        isDisabled={mode === "view"}
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        value={fromOpenBISDate(propertyValue ?? new Date().toISOString())}
        onChange={(value) =>
          value !== null ? onValueChange(toOpenBISDate(value)) : null
        }
      />
    );
  } else if (propertyDefinition.dataType == "CONTROLLEDVOCABULARY") {
    const vocabularyRes = useGetVocabulary(propertyDefinition.vocabulary ?? "");
    if (vocabularyRes?.isLoading) {
      return <>Loading...</>;
    }
    if (vocabularyRes?.isError) {
      return <>Error loading vocabulary</>;
    }
    if (vocabularyRes?.data) {
      return (
        <Autocomplete>
          {vocabularyRes.data.terms.map((term) => {
            return (
              <AutocompleteItem key={term.code} value={term.code}>
                {term.label}
              </AutocompleteItem>
            );
          }) ?? <></>}
        </Autocomplete>
      );
    }
  } else if (
    propertyDefinition.dataType == "JSON" ||
    propertyDefinition.dataType == "XML"
  ) {
    return (
      <Editor
        defaultLanguage={propertyDefinition.dataType}
        height="10vh"
        defaultValue={propertyValue}
        onChange={(value) => {
          onValueChange(value ?? "");
        }}
      />
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

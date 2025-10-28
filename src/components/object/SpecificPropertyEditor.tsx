import React from "react";
import {
  AutocompleteItem,
  Autocomplete,
  DatePicker,
  Input,
  Checkbox,
  Textarea,
} from "@heroui/react";
import {
  parseDate,
  getLocalTimeZone,
  ZonedDateTime,
  fromDate,
} from "@internationalized/date";
import {
  CUSTOM_WIDGET_KEY,
  LocalPropertyTypeVariants,
} from "../../apis/propertyType/commonPropertyType";
import { ImagePropertyEditor } from "../widgets/ImagePropertyEditor";
import { useGetVocabulary } from "../../apis/vocabulary/useGetVocabulary";
import { Editor } from "@monaco-editor/react";
import { ComponentListPropertyEditor } from "./ComponentListPropertyEditor";

// The props that are received by the component
// define whether this will be an Object Creator or Editor component
const creatorModes = ["edit", "view"] as const;
type CreatorMode = (typeof creatorModes)[number];

interface SpecificPropertyEditorProps {
  propertyDefinition: LocalPropertyTypeVariants;
  propertyValue: string;
  mode: CreatorMode;
  onValueChange: (input: string | boolean | Date | string[]) => void;
  currentObjectCode?: string;
}

const toOpenBISDate = (value: ZonedDateTime): string => {
  return value.toDate().toISOString().split(".")[0] + "Z";
};

const fromOpenBISDate = (value: string): ZonedDateTime => {
  return fromDate(new Date(value), getLocalTimeZone());
};

export const SpecificPropertyEditor: React.FC<SpecificPropertyEditorProps> = ({
  propertyValue,
  propertyDefinition,
  mode,
  onValueChange,
  currentObjectCode,
}) => {
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
        return (
          <ComponentListPropertyEditor
            dispatch={onValueChange}
            objectType={propertyDefinition.objectType}
            multivalued={propertyDefinition.multivalued}
            value={propertyValue}
            currentObjectCode={currentObjectCode}
          />
        );
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
        value={parseDate(propertyValue ?? new Date().toISOString())}
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

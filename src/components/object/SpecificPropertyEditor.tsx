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
import { useGetObjectByPermId } from "../../apis/object/useGetObjectByPermId";
import { Editor } from "@monaco-editor/react";
import { ComponentListPropertyEditor } from "./ComponentListPropertyEditor";

interface SpecificPropertyEditorProps {
  propertyDefinition: LocalPropertyTypeVariants;
  propertyValue: string;
  onValueChange: (input: string | boolean | Date | string[]) => void;
  currentObjectCode?: string;
  propertyCode?: string;
  onSelectedComponentsChange?: (permIds: string[]) => void;
  currentInstrumentPermId?: string;
  currentSamplePermId?: string;
  isComponent?: boolean;
  isReadOnly?: boolean;
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
  onValueChange,
  currentObjectCode,
  propertyCode,
  onSelectedComponentsChange,
  currentInstrumentPermId,
  currentSamplePermId,
  isComponent,
  isReadOnly,
}) => {
  // For LOCATION property - always show disabled field
  if (propertyCode === "LOCATION") {
    if (isComponent) {
      // For components: show the attached instrument name/code
      let instrumentPermId: string | undefined;
      
      if (typeof propertyValue === "string" && propertyValue.trim() !== "") {
        instrumentPermId = propertyValue;
      } else if (Array.isArray(propertyValue) && (propertyValue as any[]).length > 0 && typeof (propertyValue as any[])[0] === "string") {
        instrumentPermId = (propertyValue as any[])[0];
      }

      const instrumentQuery = useGetObjectByPermId(instrumentPermId);
      
      let displayValue = "";
      if (instrumentQuery.isLoading) {
        displayValue = "Loading...";
      } else if (instrumentQuery.data) {
        displayValue = instrumentQuery.data.getProperty("NAME") || instrumentQuery.data.getCode() || "";
      }

      return (
        <Input
          isDisabled
          id={propertyDefinition.code}
          aria-label={propertyDefinition.code}
          placeholder="Not attached to any instrument"
          value={displayValue}
          type="text"
        />
      );
    } else {
      // For instruments: show that it's managed automatically
      return (
        <Input
          isDisabled
          id={propertyDefinition.code}
          aria-label={propertyDefinition.code}
          placeholder="Managed automatically through component attachment"
          value=""
          type="text"
        />
      );
    }
  }

  if (
    propertyDefinition.dataType == "VARCHAR" &&
    propertyDefinition.metadata?.[CUSTOM_WIDGET_KEY] === "IMAGE"
  ) {
    return (
      <ImagePropertyEditor
        samplePermId={currentSamplePermId}
        onImageChange={(datasetPermId) => {
          console.log("Image dataset created with ID:", datasetPermId);
          // Store dataset reference in property instead of base64
          onValueChange(datasetPermId);
        }}
        isReadOnly={isReadOnly}
      />
    );
  } else if (propertyDefinition.dataType == "VARCHAR") {
    return (
      <Input
        isReadOnly={isReadOnly}
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
        isReadOnly={isReadOnly}
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
        onSelectedComponentsChange={onSelectedComponentsChange}
        currentInstrumentPermId={currentInstrumentPermId}
        isReadOnly={isReadOnly}
      />
    );
  } else if (propertyDefinition.dataType == "BOOLEAN") {
    return (
      <Checkbox
        isDisabled={isReadOnly}
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        value={propertyValue}
        onValueChange={(isSelected) => onValueChange(isSelected)}
      />
    );
  } else if (propertyDefinition.dataType == "HYPERLINK") {
    return (
      <Input
        isReadOnly={isReadOnly}
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
        isReadOnly={isReadOnly}
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
        isDisabled={isReadOnly}
        showMonthAndYearPickers
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        value={propertyValue ? parseDate(propertyValue) : undefined}
        onChange={(value) => value !== null ? onValueChange(value?.toString()) : null}
      />
    );
  } else if (propertyDefinition.dataType == "TIMESTAMP") {
    return (
      <DatePicker
        hideTimeZone
        showMonthAndYearPickers
        isDisabled={isReadOnly}
        id={propertyDefinition.code}
        aria-label={propertyDefinition.code}
        value={propertyValue ? fromOpenBISDate(propertyValue) : undefined}
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
        <Autocomplete
          isDisabled={isReadOnly}
          defaultSelectedKey={propertyValue}
          onSelectionChange={(value) => onValueChange(value?.toString() ?? "")}
        >
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
        options={{readOnly: isReadOnly}}
      />
    );
  } else {
    return (
      <Input
        disabled={isReadOnly}
        id={propertyDefinition.code}
        placeholder={propertyDefinition.description}
        value={propertyValue}
        type="text"
        onValueChange={onValueChange}
      />
    );
  }
};

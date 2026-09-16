import React from "react";
import { Link } from "@tanstack/react-router";
import {
  AutocompleteItem,
  Autocomplete,
  DatePicker,
  Input,
  Checkbox,
} from "@heroui/react";
import {
  parseDate,
  getLocalTimeZone,
  ZonedDateTime,
  fromDate,
} from "@internationalized/date";
import {
  CUSTOM_WIDGET_KEY,
  OBJECT_SUBTYPES_KEY,
  LocalPropertyTypeVariants,
} from "../../apis/propertyType/commonPropertyType";
import { ImagePropertyEditor } from "../widgets/ImagePropertyEditor";
import { useGetVocabulary } from "../../apis/vocabulary/useGetVocabulary";
import { useGetObjectByPermId } from "../../apis/object/useGetObjectByPermId";
import { useGetObject } from "../../apis/object/useGetObject";
import { useGetAllObjects } from "../../apis/object/useGetAllObjects";
import { roomObjectTypeCode } from "../../apis/shared/environment";
import { Editor } from "@monaco-editor/react";
import { ComponentListPropertyEditor } from "./ComponentListPropertyEditor";
import { RichTextEditor } from "../shared/RichTextEditor";

// Lets the user pick a single Room object (openBIS type ROOM) as a LOCATION value.
// Rooms aren't part of iLog's Instrument/Component collections, so they're found
// the same way ComponentListPropertyEditor finds every object: an instance-wide search.
const RoomLocationPicker: React.FC<{
  propertyCode: string;
  selectedPermId?: string;
  onSelectionChange: (permId: string) => void;
  isReadOnly?: boolean;
}> = ({ propertyCode, selectedPermId, onSelectionChange, isReadOnly }) => {
  const allObjectsResult = useGetAllObjects();
  const rooms = (allObjectsResult.data ?? []).filter(
    (o) => o.getType().getCode() === roomObjectTypeCode
  );

  return (
    <Autocomplete
      aria-label={propertyCode}
      placeholder="Select a room..."
      isDisabled={isReadOnly}
      isLoading={allObjectsResult.isLoading}
      selectedKey={selectedPermId || null}
      defaultItems={rooms}
      onSelectionChange={(key) => onSelectionChange(key ? String(key) : "")}
    >
      {(room) => (
        <AutocompleteItem key={room.getPermId().getPermId()}>
          {room.getProperty("NAME") || room.getCode()}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

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
  if (propertyCode === "LOCATION") {
    if (isComponent) {
      let linkedPermId: string | undefined;

      if (typeof propertyValue === "string" && propertyValue.trim() !== "") {
        linkedPermId = propertyValue;
      } else if (Array.isArray(propertyValue) && (propertyValue as any[]).length > 0 && typeof (propertyValue as any[])[0] === "string") {
        linkedPermId = (propertyValue as any[])[0];
      }

      // LOCATION should always hold a perm ID, but some existing components were
      // written with the instrument's CODE instead (a since-fixed bug in the
      // instrument save flow) - fall back to a code lookup so those still
      // resolve correctly here without requiring the instrument to be re-saved.
      const permIdPattern = /^\d+-\d+$/;
      const looksLikePermId = !!linkedPermId && permIdPattern.test(linkedPermId);

      const linkedByPermIdQuery = useGetObjectByPermId(looksLikePermId ? linkedPermId : undefined);
      const linkedByCodeQuery = useGetObject(!looksLikePermId && linkedPermId ? linkedPermId : "");

      const linkedData = looksLikePermId ? linkedByPermIdQuery.data ?? undefined : linkedByCodeQuery.data?.[0];
      const linkedIsLoading = looksLikePermId ? linkedByPermIdQuery.isLoading : linkedByCodeQuery.isLoading;
      const isRoom = linkedData?.getType().getCode() === roomObjectTypeCode;

      // Still resolving what the current value points to - avoid flashing the
      // wrong branch (instrument link vs. room picker) while that's unknown.
      if (linkedPermId && linkedIsLoading) {
        return (
          <Input isDisabled id={propertyDefinition.code} aria-label={propertyDefinition.code} value="Loading..." type="text" />
        );
      }

      if (linkedPermId && !isRoom) {
        // Attached to an instrument (via the instrument's own component-selection
        // UI) - shown read-only here; detach it from that side, not this field.
        const displayValue = linkedData?.getProperty("NAME") || linkedData?.getCode() || "";
        return (
          <div className="flex items-center gap-2">
            <Input
              isDisabled
              id={propertyDefinition.code}
              aria-label={propertyDefinition.code}
              placeholder="Not attached to any instrument"
              value={displayValue}
              type="text"
            />
            {linkedData && (
              <Link
                to="/objects/creator"
                search={{ mode: "view", objectcode: linkedData.getCode() } as any}
                className="text-sm text-blue-600 hover:underline whitespace-nowrap"
              >
                Open
              </Link>
            )}
          </div>
        );
      }

      // Not attached to any instrument - the component's own location can be set
      // directly to a room (never to an instrument, which only happens via the
      // instrument's own component-selection UI).
      return (
        <RoomLocationPicker
          propertyCode={propertyDefinition.code}
          selectedPermId={isRoom ? linkedPermId : undefined}
          onSelectionChange={onValueChange}
          isReadOnly={isReadOnly}
        />
      );
    }

    // Instruments: location is always a room.
    return (
      <RoomLocationPicker
        propertyCode={propertyDefinition.code}
        selectedPermId={typeof propertyValue === "string" && propertyValue.trim() !== "" ? propertyValue : undefined}
        onSelectionChange={onValueChange}
        isReadOnly={isReadOnly}
      />
    );
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
      <RichTextEditor
        initialData={propertyValue}
        onChange={onValueChange}
        isReadOnly={isReadOnly}
      />
    );
  } else if (propertyDefinition.dataType == "OBJECT") {
    return (
      <ComponentListPropertyEditor
        dispatch={onValueChange}
        objectType={propertyDefinition.objectType}
        objectSubtypes={propertyDefinition.metadata?.[OBJECT_SUBTYPES_KEY]}
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
          aria-label="Select vocabulary term"
          defaultSelectedKey={propertyValue}
          onSelectionChange={(value) => onValueChange(value?.toString() ?? "")}>
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

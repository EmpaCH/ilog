import React, { useEffect, useReducer, useRef, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Divider,
  DatePicker,
  TimeInput,
} from "@heroui/react";
import { LogbookEntryPropertyEditor } from "./LogbookEntryPropertyEditor";
import { ComponentListPropertyEditor } from "../object/ComponentListPropertyEditor";
import { useCreateLogbookEntry } from "../../apis/logbook/useCreateLogbookEntry";
import { useGetAllLogbookEntries } from "../../apis/logbook/useGetAllLogbookEntries";
import { useUpdateLogbookEntry } from "../../apis/logbook/useUpdateLogbookEntry";
import { useGetLogbookEntry } from "../../apis/logbook/useGetLogbookEntry";
import { useGetLogbookEntryTypes } from "../../apis/logbook/useGetLogbookEntryTypes";
import { logbookEntryReducer } from "./LogbookEntryActions";
import {
  logbookEntryCreatorLocalReducer,
  EMPTY_LOGBOOK_ENTRY_CREATOR_LOCAL_DEFINITION,
} from "./LogbookEntryLocalActions";
import {
  createEmptyLogbookEntryDefinition,
  // convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition,
  // reconstructHistory,
  convertOpenBISEntryListToLogbookEntryDefinition,
} from "../../apis/logbook/helpersLogbookEntryAPI";
import {
  // ReconstructedHistory,
  LogbookEntryDefinition,
} from "../../apis/logbook/commonLogbookEntry";
import { iLogID, iLogLogbookID, logbookCollectionID } from "../../apis/shared/environment";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "../../apis/type/commonType";
import {
  now,
  getLocalTimeZone,
  ZonedDateTime,
} from "@internationalized/date";
import openbis from "@openbis/openbis.esm";
import "../../index.css";
import { MessageModal } from "../shared/messageModal";

// define whether this will be a Logbook Entry Creator or Editor component
const creatorModes = ["create", "edit",  "view"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface LogbookEntryCreatorProps {
  mode: CreatorMode;
  logbookEntryCode: string;
}

export const LogbookEntryCreator: React.FC<LogbookEntryCreatorProps> = ({
  mode,
  logbookEntryCode,
}) => {
  const logbookEntryResult = useGetLogbookEntry(logbookEntryCode);
  const logbookEntryCreation = useCreateLogbookEntry();
  const logbookEntryUpdate = useUpdateLogbookEntry();
  const allLogbookEntriesQuery = useGetAllLogbookEntries();
  const navigate = useNavigate();

  let [isEditMode, setIsEditMode] = useState(mode === "edit" || mode === "create");
  // let [openbisSample, setOpenbisSample] = useState<openbis.Sample | undefined>(undefined);
  // let [reconstructedHistory, setReconstructedHistory] = useState<ReconstructedHistory>({});
  let [logbookEntryTemplate, setLogbookEntryTemplate] = useState<LogbookEntryDefinition>(createEmptyLogbookEntryDefinition());
  let [isValidFromSelected, setIsValidFromSelected] = useState(false);
  let [parentObjectPermId, setParentObjectPermId] = useState<string>("");
  let [parentLogbookEntryPermId, setParentLogbookEntryPermId] = useState<string>("");
  let [originalParentObjectPermId, setOriginalParentObjectPermId] = useState<string>("");
  let [originalParentLogbookEntryPermId, setOriginalParentLogbookEntryPermId] = useState<string>("");
  let [availableParentObjectLogbookEntries, setAvailableParentObjectLogbookEntries] = useState<any[]>([]);

  const [state, dispatch] = useReducer(logbookEntryReducer, logbookEntryTemplate);
  const [localState, localDispatch] = useReducer(logbookEntryCreatorLocalReducer,
    EMPTY_LOGBOOK_ENTRY_CREATOR_LOCAL_DEFINITION,
  );
  const logbookEntryTypes = useGetLogbookEntryTypes(localState.searchTerm);
  // Tracks the last type for which the schema was computed. Prevents re-running
  // on background refetches that produce a new logbookEntryTypes.data reference
  // without actually changing the type or its schema.
  const schemaComputedForRef = useRef<string>("");

  // Update isEditMode when mode prop changes
  useEffect(() => {
    setIsEditMode(mode === "edit" || mode === "create");
  }, [mode]);

  useEffect(() => {
    // Filter logbook entries for selected parent object
    const logEntries = parentObjectPermId && allLogbookEntriesQuery.data
      ? allLogbookEntriesQuery.data.filter(entry => {
          // Only consider explicit parent relationships: check parents' permIds
          const parents = entry.getParents && entry.getParents();
          return parents && parents.length > 0 && parents.some((p: any) => p.getPermId().getPermId() === parentObjectPermId);
        })
      : [];
    setAvailableParentObjectLogbookEntries(logEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentObjectPermId, allLogbookEntriesQuery.data]);

  useEffect(() => {
    if (!isValidFromSelected) {
      const interval = setInterval(() => {
        dispatch({ type: "SET_VALID_FROM", payload: now(getLocalTimeZone()) })
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isValidFromSelected]);

  // Apply schema whenever state.type or logbookEntryTypes.data changes.
  // Using logbookEntryTypes.data (not .status) avoids re-running on background
  // refetch status cycles. The ref guard prevents re-running when data gets a
  // new reference but the type and its schema haven't actually changed.
  useEffect(() => {
    if (!state.type) {
      schemaComputedForRef.current = "";
      return;
    }
    if (state.type === schemaComputedForRef.current) return;
    const found = logbookEntryTypes.data?.find((it) => it.code === state.type);
    if (!found) return; // data not yet loaded; effect re-runs when data arrives
    schemaComputedForRef.current = state.type;
    createLogbookEntrySchemaBasedOnType(state.type, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type, logbookEntryTypes.data, mode]);

  const createLogbookEntrySchemaBasedOnType = (
    type: string,
    mode?: CreatorMode,
  ) => {
    // Get the selected type from logbookEntryTypes
    const selectedType = logbookEntryTypes.data?.find(
      (it) => it.code === type
    );

    // Convert OpenBIS type to our ObjectTypeDefinition to extract properties
    if (selectedType) {
      const logbookEntryTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(selectedType.sampleType);
      const propertyTypes = logbookEntryTypeTemplate.propertyTypes;
      
      // Dispatch the schema
      dispatch({ type: "SET_TYPE", payload: type });
      dispatch({
        type: "SET_PROPERTIES_SCHEMA",
        payload: propertyTypes as PropertyTypesSchema,
      });

      // Initialize property values for create mode
      if (mode === "create") {
        const propertyValues: { [key: string]: any } = {};
        Object.values(propertyTypes).flat().forEach((property) => {
          propertyValues[property.code] = undefined;
        });
        dispatch({
          type: "SET_PROPERTY_VALUES",
          payload: propertyValues,
        });
      } else {
        // Merge schema into logbookEntryTemplate so cancel can reset to full original state
        setLogbookEntryTemplate((prev) => ({ ...prev, propertiesSchema: propertyTypes as PropertyTypesSchema }));
      }
    }
  };

  useMemo(() => {
    if (logbookEntryResult.status === "success") {
      const newOpenbisSample = logbookEntryResult.data[0];
      // setOpenbisSample(newOpenbisSample);

      if (newOpenbisSample) {
        // Determine parent roles from parents list. Prefer explicit parent relationship.
        // Parent that is in the LOGBOOK collection is considered a logbook-entry parent.
        let foundParentObjectPermId = "";
        let foundParentLogbookEntryPermId = "";
        const parents = newOpenbisSample.getParents();
        if (parents && parents.length > 0) {
          for (const p of parents) {
            try {
              const perm = p.getPermId().getPermId();
              const isLogbook = p.getExperiment().getCode() === logbookCollectionID;
              if (isLogbook && !foundParentLogbookEntryPermId) {
                foundParentLogbookEntryPermId = perm;
                setParentLogbookEntryPermId(foundParentLogbookEntryPermId);
              } else if (!isLogbook && !foundParentObjectPermId) {
                foundParentObjectPermId = perm;
                setParentObjectPermId(foundParentObjectPermId);
              }
            } catch (e) {
              // ignore malformed parent entries
              setParentObjectPermId("");
              setParentLogbookEntryPermId("");
            }
          }
        }

        const logbookEntryTemplate = convertOpenBISEntryListToLogbookEntryDefinition(newOpenbisSample);
        setLogbookEntryTemplate(logbookEntryTemplate);
        setOriginalParentObjectPermId(foundParentObjectPermId);
        setOriginalParentLogbookEntryPermId(foundParentLogbookEntryPermId);
        setIsValidFromSelected(true); // pin the loaded date — stop the auto-tick
        schemaComputedForRef.current = ""; // reset so the schema effect re-runs for the loaded type
        dispatch({ type: "RESET", payload: logbookEntryTemplate });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logbookEntryCode, logbookEntryResult.status, logbookEntryResult.data]);

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent form submission in view mode
    if (mode === "view" && !isEditMode) {
      return;
    }

    // Validate required field
    if (mode === "create" && !parentObjectPermId) {
      onError("Parent Object is required.");
      return;
    }
    localDispatch({ type: "CLEAR" });

    if (mode === "edit" || (mode === "view" && isEditMode)) {
      const parentPermIds: string[] = [];
      if (parentLogbookEntryPermId) parentPermIds.push(parentLogbookEntryPermId);
      if (parentObjectPermId) parentPermIds.push(parentObjectPermId);

      logbookEntryUpdate.mutate({
        sampleId: state.id as openbis.ISampleId,
        properties: {
          ...state.propertyValues,
          VALID_FROM: state.validFrom.toString(),
        },
        parentPermIds,
      }, {
        onError: (err) => {
          onError(err.message);
        },
        onSuccess: () => {
          onSuccess("Logbook entry updated successfully!");
          setTimeout(() => {
            onBack();
          }, 2000);
        },
      });
    } else {
      // Build parentPermIds to include both parent logbook entry and parent object (component)
      const parentPermIds: string[] = [];
      if (parentLogbookEntryPermId) parentPermIds.push(parentLogbookEntryPermId);
      if (parentObjectPermId) parentPermIds.push(parentObjectPermId);

      logbookEntryCreation.mutate({
        type: state.type,
        properties: {
          ...state.propertyValues,
          VALID_FROM: state.validFrom.toString(),
        },
        parentPermIds: parentPermIds,
      }, {
        onError: (err) => {
          onError(err.message);
        },
        onSuccess: () => {
          onSuccess("Logbook entry created successfully!");
          onClear(2000);
        },
      });
    }
  }

  const onError = (msg: string) => {
    localDispatch({ type: "SET_MESSAGE", payload: msg.split(" (Context:")[0] });
    localDispatch({ type: "SET_IS_SUCCESS", payload: false });
    localDispatch({ type: "SET_SHOW_MESSAGE", payload: true });
    localDispatch({ type: "SET_LOADING", payload: false });
  };

  const onSuccess = (msg: string) => {
    localDispatch({ type: "SET_MESSAGE", payload: msg });
    localDispatch({ type: "SET_IS_SUCCESS", payload: true });
    localDispatch({ type: "SET_SHOW_MESSAGE", payload: true });
  };

  const onClear = (ms: number) => {
    if (mode === "edit") {
      dispatch({ type: "RESET", payload: logbookEntryTemplate });
    } else {
      dispatch({ type: "CLEAR" });
      localDispatch({ type: "SET_LOADING", payload: false });
      setParentObjectPermId(""); // Clear parent selection
      schemaComputedForRef.current = ""; // reset so re-selecting the same type re-initialises the schema
      setTimeout(() => {
        localDispatch({ type: "CLEAR" });
      }, ms);
    }
  };

  const onBack = () => {
    navigate({ to: "/logbook" });
  };

  return (
    <div className="md-size-div">
      <h2>{mode === "create" ? "Create Logbook Entry" : (mode === "edit" || (mode === "view" && isEditMode)) ? "Edit Logbook Entry" : "View Logbook Entry"}</h2>
      <form onSubmit={onSubmit}>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Checkbox
            isDisabled={!isEditMode}
            isReadOnly={mode === "edit" || mode === "view"}
            isSelected={isValidFromSelected}
            onValueChange={setIsValidFromSelected}
          />
          <DatePicker
            isRequired
            isDisabled={!isValidFromSelected}
            isReadOnly={!isEditMode}
            id="validFrom"
            label="Valid From"
            className="form-field max-w-[280px]"
            labelPlacement="outside-left"
            showMonthAndYearPickers
            granularity="day"
            value={state.validFrom}
            onChange={(value) => {
              dispatch({ type: "SET_VALID_FROM", payload: value as ZonedDateTime });
              // onLoadValidFrom(value as ZonedDateTime);
            }}
          />
          <TimeInput
            isRequired
            isDisabled={!isValidFromSelected}
            isReadOnly={!isEditMode}
            aria-label="Time"
            className="form-field max-w-[200px]"
            granularity="second"
            hourCycle={24}
            value={state.validFrom}
            onChange={(value) => {
              dispatch({ type: "SET_VALID_FROM", payload: value as ZonedDateTime });
              // onLoadValidFrom(value as ZonedDateTime);
            }}
          />
          <Button
            isDisabled={!isValidFromSelected || !isEditMode}
            radius="full"
            size="sm"
            color="primary"
            variant="faded"
            onPress={() =>
              dispatch({ type: "SET_VALID_FROM", payload: now(getLocalTimeZone()) })
            }
          >
            Now
          </Button> 
        </div>
        <Divider className="my-4" />
        <div className="mb-4">
          <h4>Parent Object</h4>
          <ComponentListPropertyEditor
            onlyIlog={true}
            onlyLogbook={true}
            dispatch={(permIds: string[]) => {
              setParentObjectPermId(permIds.length > 0 ? permIds[0] : "");
              if (permIds.length > 0) localDispatch({ type: "CLEAR" });
            }}
            multivalued={false}
            value={parentObjectPermId ? [parentObjectPermId] : undefined}
            isReadOnly={mode === "view" && !isEditMode}
            currentObjectCode={logbookEntryCode}
          />
        </div>
        <div className="mb-4">
          <h4>Parent Logbook Entry</h4>
          <ComponentListPropertyEditor
            logentries={availableParentObjectLogbookEntries}
            dispatch={(permIds: string[]) => {
              setParentLogbookEntryPermId(permIds.length > 0 ? permIds[0] : "")
            }}
            multivalued={false}
            value={parentLogbookEntryPermId ? [parentLogbookEntryPermId] : []}
            isReadOnly={mode === "view" && !isEditMode}
            currentObjectCode={logbookEntryCode}
          />
        </div>
        <Divider className="my-4" />
        <p style={{ fontWeight: "bold", textAlign: "left" }}>TYPE</p>
        <Autocomplete
          isRequired
          isReadOnly={mode === "edit" || mode === "view"}
          id="type"
          label="Type"
          placeholder="Type to search..."
          className="form-field"
          defaultItems={logbookEntryTypes.data || []}
          items={logbookEntryTypes.data}
          onInputChange={(value) => {
            if (!state.type) {
              localDispatch({ type: "SET_SEARCH_TERM", payload: value });
            }
          }}
          selectedKey={state.type}
          onSelectionChange={(value) => {
            if (value) {
              createLogbookEntrySchemaBasedOnType(value.toString(), "create");
            }
          }}
        >
          {(type) => <AutocompleteItem key={type.key}>{type.description}</AutocompleteItem>}
        </Autocomplete>
        {state.type !== "" ? (
          <LogbookEntryPropertyEditor
            isReadOnly={mode === "view" && !isEditMode}
            state={state}
            dispatch={dispatch}
            hiddenPropertyCodes={[
              iLogID,
              iLogLogbookID,
              "VALID_FROM",
            ]}
          />) : (
          <p className="text-gray-500">
            Please select a type.
          </p>
        )}
        <Divider className="my-4" />
        <div className="flex items-center justify-center" style={{ minHeight: "4rem" }}>
          <Button
            type="button"
            color="default"
            className="mx-2"
            onPress={onBack}
          >
            Back
          </Button>
          {mode === "view" && !isEditMode && (
            <Button
              type="button"
              color="primary"
              className="mx-2"
              onPress={() => setIsEditMode(true)}
            >
              Edit
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                type="button"
                color="danger"
                className="mx-2"
                isDisabled={localState.loading || logbookEntryCreation.isPending || logbookEntryUpdate.isPending}
                onPress={() => {
                  if (mode === "view") {
                    setIsEditMode(false);
                    dispatch({ type: "RESET", payload: logbookEntryTemplate });
                    setParentObjectPermId(originalParentObjectPermId);
                    setParentLogbookEntryPermId(originalParentLogbookEntryPermId);
                  } else if (mode === "edit") {
                    window.location.reload();
                  } else {
                    onClear(0);
                  }
                }}
              >
                {mode === "view" ? "Cancel" : mode === "edit" ? "Reset" : "Clear"}
              </Button>
              <Button
                type="submit"
                color="primary"
                className="mx-2"
                isLoading={localState.loading || logbookEntryCreation.isPending || logbookEntryUpdate.isPending}
              >
                {mode === "create" ? "Create" : "Update"}
              </Button>
            </>
          )}
        </div>
      </form>
      <MessageModal
        message={localState.message}
        isOpen={localState.showMessage}
        isSuccess={localState.isSuccess}
      />
    </div>
  );
}

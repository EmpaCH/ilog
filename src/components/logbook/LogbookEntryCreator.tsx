import React, { useContext, useEffect, useReducer, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Divider,
  DatePicker,
  TimeInput,
} from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { LogbookEntryPropertyEditor } from "./LogbookEntryPropertyEditor";
import { useCreateLogbookEntry } from "../../apis/logbook/useCreateLogbookEntry";
import { useUpdateLogbookEntry } from "../../apis/logbook/useUpdateLogbookEntry";
import { useGetLogbookEntry } from "../../apis/logbook/useGetLogbookEntry";
import { getLogbookEntryTypes } from "../../apis/type/typeAPI";
import { logbookEntryReducer } from "./LogbookEntryActions";
import {
  logbookEntryCreatorLocalReducer,
  EMPTY_LOGBOOK_ENTRY_CREATOR_LOCAL_DEFINITION,
} from "./LogbookEntryLocalActions";
import {
  createEmptyLogbookEntryDefinition,
  convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition,
  reconstructHistory,
} from "../../apis/logbook/helpersLogbookEntryAPI";
import {
  ReconstructedHistory,
  LogbookEntryDefinition,
} from "../../apis/logbook/commonLogbookEntry";
import { iLogID, iLogLogbookID } from "../../apis/shared/environment";
import { iLogBaseTypesPropertyCode } from "../../apis/shared/types";
import { useGetPropertyTypes } from "../../apis/propertyType/useGetPropertyTypes";
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

// define whether this will be a Logbook Entry Creator or Editor component
const creatorModes = ["create", "edit"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface LogbookEntryCreatorProps {
  mode: CreatorMode;
  logbookEntryCode: string;
}

export const LogbookEntryCreator: React.FC<LogbookEntryCreatorProps> = ({
  mode,
  logbookEntryCode,
}) => {
  const { apiFacade } = useContext(AuthContext);
  const logbookEntryResult = useGetLogbookEntry(logbookEntryCode);
  const logbookEntryCreation = useCreateLogbookEntry();
  const logbookEntryUpdate = useUpdateLogbookEntry();
  const allPropertyTypesResult = useGetPropertyTypes();
  const navigate = useNavigate();

  let [openbisSample, setOpenbisSample] = useState<openbis.Sample | undefined>(undefined);
  let [reconstructedHistory, setReconstructedHistory] = useState<ReconstructedHistory>({});
  let [logbookEntryTemplate, setLogbookEntryTemplate] = useState<LogbookEntryDefinition>(createEmptyLogbookEntryDefinition());
  let [isValidFromSelected, setIsValidFromSelected] = useState(false);

  const [state, dispatch] = useReducer(logbookEntryReducer, logbookEntryTemplate);
  const [localState, localDispatch] = useReducer(logbookEntryCreatorLocalReducer,
    EMPTY_LOGBOOK_ENTRY_CREATOR_LOCAL_DEFINITION,
  );

  const logbookEntryTypes = useQuery({
    queryKey: ["getSampleTypes"],
    queryFn: async () => {
      const types = await getLogbookEntryTypes(apiFacade, localState.searchTerm);
      return types.map(type => ({
        key: type.getCode(),
        code: type.getCode(),
        sampleType: type,
      }));
    },
  });

  useEffect(() => {
    logbookEntryTypes.refetch();
  }, [localState.searchTerm]);

  useEffect(() => {
    if (!isValidFromSelected) {
      const interval = setInterval(() => {
        dispatch({ type: "SET_VALID_FROM", payload: now(getLocalTimeZone()) })
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isValidFromSelected]);

  const createLogbookEntrySchemaBasedOnType = (
    type: string,
    mode?: CreatorMode,
  ) => {
    const selectedType = logbookEntryTypes.data?.find(
      (it) => it.code === type
    );

    if (allPropertyTypesResult.status == "success" && selectedType) {
      const logbookEntryTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(selectedType.sampleType);
      const resolvedTypes = Object.entries(logbookEntryTypeTemplate.propertyTypes).map(
        ([group, propertyTypesGroup]) => {
          return [ group, propertyTypesGroup ];
        }
      );
      dispatch({
        type: "SET_PROPERTIES_SCHEMA",
        payload: Object.fromEntries(resolvedTypes) as PropertyTypesSchema,
      });

      if (mode === "create") {
        const propertyValues = Object.entries(logbookEntryTypeTemplate.propertyTypes).reduce(
          (acc, [group, propertyTypesGroup]) => {
            propertyTypesGroup.forEach((property: { code: string | number; }) => {
              acc[property.code] = undefined;
            });
            return acc;
          }, {} as { [key: string]: any }
        );
        dispatch({
          type: "SET_PROPERTY_VALUES",
          payload: propertyValues,
        });
      }
    }
  };

  useMemo(() => {
    if (logbookEntryResult.status == "success") {
      const openbisSample = logbookEntryResult.data[0];
      setOpenbisSample(openbisSample);

      if (openbisSample) {
        const logbookEntryHistory = openbisSample.getPropertiesHistory() as openbis.PropertyHistoryEntry[];
        const reconstructedHistory = reconstructHistory(logbookEntryHistory);
        setReconstructedHistory(reconstructedHistory);
        const latestKey = Object.keys(reconstructedHistory).pop();
        const latestSampleState = latestKey ? reconstructedHistory[latestKey] : [];
        const logbookEntryTemplate = convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition(openbisSample, latestSampleState)
        setLogbookEntryTemplate(logbookEntryTemplate);
        dispatch({ type: "RESET", payload: logbookEntryTemplate });
        createLogbookEntrySchemaBasedOnType(logbookEntryTemplate.type);
      }
    }
  }, [logbookEntryCode, logbookEntryResult.status, logbookEntryResult.data]);

  const onLoadValidFrom = (newValidFrom: ZonedDateTime | null) => {
    const keys = Object.keys(reconstructedHistory);

    if (mode === "edit" && keys.length > 1 && newValidFrom !== null && openbisSample) {
      let previousKey = keys[0];
      for (let i = 1; i < keys.length; i++) {
        if (keys[i] >= newValidFrom.toString()) {
          break;
        }
        previousKey = keys[i];
      }

      const previousState = reconstructedHistory[previousKey];
      const logbookEntryState = convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition(openbisSample, previousState, newValidFrom);
      dispatch({ type: "RESET", payload: logbookEntryState });
      createLogbookEntrySchemaBasedOnType(logbookEntryTemplate.type);
    }
  };

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    localDispatch({ type: "CLEAR" });

    if (mode === "edit") {
      logbookEntryUpdate.mutate({
        sampleId: state.id as openbis.ISampleId,
        properties: {
          ...state.propertyValues,
          VALID_FROM: state.validFrom.toString(),
        },
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
      logbookEntryCreation.mutate({
        type: state.type,
        properties: {
          ...state.propertyValues,
          VALID_FROM: state.validFrom.toString(),
        },
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
    localDispatch({ type: "SET_MESSAGE_COLOR", payload: "error-message" });
    localDispatch({ type: "SET_SHOW_MESSAGE", payload: true });
    localDispatch({ type: "SET_LOADING", payload: false });
  };

  const onSuccess = (msg: string) => {
    localDispatch({ type: "SET_MESSAGE", payload: msg });
    localDispatch({ type: "SET_MESSAGE_COLOR", payload: "success-message" });
    localDispatch({ type: "SET_SHOW_MESSAGE", payload: true });
  };

  const onClear = (ms: number) => {
    if (mode === "edit") {
      dispatch({ type: "RESET", payload: logbookEntryTemplate });
    } else {
      dispatch({ type: "CLEAR" });
      localDispatch({ type: "SET_LOADING", payload: false });
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
      <h2>{mode === "edit" ? "Edit Logbook Entry" : "Create Logbook Entry"}</h2>
      <form onSubmit={onSubmit}>
        <Divider className="my-4" />
        <div className="flex flex-col md:flex-row items-center gap-4">
          <Checkbox
            isSelected={isValidFromSelected}
            onValueChange={setIsValidFromSelected}
          />
          <DatePicker
            isRequired
            isDisabled={!isValidFromSelected}
            id="validFrom"
            label="Valid From"
            className="form-field max-w-[280px]"
            labelPlacement="outside-left"
            showMonthAndYearPickers
            granularity="day"
            value={state.validFrom}
            onChange={(value) => {
              dispatch({ type: "SET_VALID_FROM", payload: value as ZonedDateTime });
              onLoadValidFrom(value as ZonedDateTime);
            }}
          />
          <TimeInput
            isRequired
            isDisabled={!isValidFromSelected}
            aria-label="Time"
            className="form-field max-w-[200px]"
            granularity="second"
            hourCycle={24}
            value={state.validFrom}
            onChange={(value) => {
              dispatch({ type: "SET_VALID_FROM", payload: value as ZonedDateTime });
              onLoadValidFrom(value as ZonedDateTime);
            }}
          />
          <Button
            isDisabled={!isValidFromSelected}
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
        <Autocomplete
          isRequired
          isDisabled={mode === "edit"}
          id="type"
          label="Type"
          placeholder="Type to search..."
          className="form-field"
          defaultItems={[]}
          items={logbookEntryTypes.data}
          onInputChange={(value) => {
            localDispatch({ type: "SET_SEARCH_TERM", payload: value });
          }}
          selectedKey={state.type}
          onSelectionChange={(value) => {
            const newType = value?.toString() ?? "";
            dispatch({ type: "SET_TYPE", payload: newType });
            createLogbookEntrySchemaBasedOnType(newType, "create");
          }}
        >
          {(type) => <AutocompleteItem key={type.key}>{type.code}</AutocompleteItem>}
        </Autocomplete>
        <Divider className="my-4" />
        {state.type !== "" ? (
          <LogbookEntryPropertyEditor
            mode="edit"
            state={state}
            dispatch={dispatch}
            hiddenPropertyCodes={[
              iLogID,
              iLogLogbookID,
              // iLogBaseTypesPropertyCode,
              "VALID_FROM",
            ]}
          />) : (
          <p className="text-gray-500">
            Please select a type.
          </p>
        )}
        <Divider className="my-4" />
        {localState.showMessage && (
          <div style={{ marginBottom: "15px" }} className={localState.messageColor}>
            {localState.message}
          </div>
        )}
        <div className="items-center">
          <Button
            type="button"
            color="default"
            className="mx-2 mb-2"
            onPress={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            color="danger"
            className="mx-2 mb-2"
            onPress={() => onClear(0)}
          >
            {mode === "edit" ? "Reset" : "Clear"}
          </Button>
          <Button
            type="submit"
            color="primary"
            className="mx-2 mb-2"
            isLoading={localState.loading}
          >
            {mode === "edit" ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}

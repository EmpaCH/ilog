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
  Radio,
  RadioGroup,
} from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { ObjectPropertyEditor } from "./ObjectPropertyEditor";
import { useCreateObject } from "../../apis/object/useCreateObject";
import { useUpdateObject } from "../../apis/object/useUpdateObject";
import { useUpdateObjectWithComponentLocations } from "../../apis/object/useUpdateObjectWithComponentLocations";
import { useGetObject } from "../../apis/object/useGetObject";
import { getObjectTypes } from "../../apis/type/typeAPI";
import { objectCreatorReducer } from "./ObjectActions";
import {
  objectCreatorLocalReducer,
  EMPTY_OBJECT_CREATOR_LOCAL_DEFINITION,
} from "./ObjectLocalActions";
import {
  createEmptyObjectDefinition,
  convertOpenBISPropertyHistoryEntryListToObjectDefinition,
  reconstructHistory,
} from "../../apis/object/helpersObjectAPI";
import {
  ReconstructedHistory,
  ObjectDefinition,
} from "../../apis/object/commonObject";
import {
  iLogID,
  componentCollectionID,
  instrumentCollectionID,
} from "../../apis/shared/environment";
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
  parseZonedDateTime,
  ZonedDateTime,
} from "@internationalized/date";
import openbis from "@openbis/openbis.esm";
import "../../index.css";

// define whether this will be an Object Creator or Editor component
const creatorModes = ["create", "edit"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface ObjectCreatorProps {
  mode: CreatorMode;
  objectCode: string;
}

export const ObjectCreator: React.FC<ObjectCreatorProps> = ({
  mode,
  objectCode,
}) => {
  const { apiFacade } = useContext(AuthContext);
  const objectResult = useGetObject(objectCode);
  const objectCreation = useCreateObject();
  const objectUpdate = useUpdateObject();
  const objectUpdateWithComponents = useUpdateObjectWithComponentLocations();
  const allPropertyTypesResult = useGetPropertyTypes();
  const navigate = useNavigate();

  let [openbisSample, setOpenbisSample] = useState<openbis.Sample | undefined>(undefined);
  let [reconstructedHistory, setReconstructedHistory] = useState<ReconstructedHistory>({});
  let [objectTemplate, setObjectTemplate] = useState<ObjectDefinition>(createEmptyObjectDefinition());
  let [originalPropertyValues, setOriginalPropertyValues] = useState<{ [key: string]: any }>({});

  let [isValidFromSelected, setIsValidFromSelected] = useState(false);
  let [minValidFrom, setMinValidFrom] = useState<ZonedDateTime | undefined>(undefined);
  let [maxValidFrom, setMaxValidFrom] = useState<ZonedDateTime | undefined>(now(getLocalTimeZone()));

  const [state, dispatch] = useReducer(objectCreatorReducer, objectTemplate);
  const [localState, localDispatch] = useReducer(objectCreatorLocalReducer,
    EMPTY_OBJECT_CREATOR_LOCAL_DEFINITION,
  );

  const objectTypes = useQuery({
    queryKey: ["getSampleTypes", localState.searchTerm, state.collection],
    queryFn: async () => {
      const types = await getObjectTypes(apiFacade, localState.searchTerm);
      return types.map(type => ({
        key: type.getCode(),
        code: type.getCode(),
        sampleType: type,
      }));
    },
    staleTime: 5000,
  });

  const objectTypesFilteredByCollection = useMemo(() => {
    if (!objectTypes.data || !state.collection) return [];
    
    return objectTypes.data.filter((oj) => {
      const metadata = oj.sampleType.getMetaData();
      const collectionType = metadata["collectionType"];

      if (state.collection === instrumentCollectionID) {
        return collectionType === "INSTRUMENT_COLLECTION";
      } else if (state.collection === componentCollectionID) {
        return collectionType === "COMPONENT_COLLECTION";
      }

      return false;
    });
  }, [objectTypes.data, state.collection]);

  useEffect(() => {
    if (!isValidFromSelected) {
      const interval = setInterval(() => {
        setMaxValidFrom(now(getLocalTimeZone()));
        dispatch({ type: "SET_VALID_FROM", payload: now(getLocalTimeZone()) })
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isValidFromSelected]);

  const createObjectSchemaBasedOnType = (
    type: string,
    mode?: CreatorMode,
  ) => {
    const selectedType = objectTypes.data?.find(
      (it) => it.code === type
    );

    if (allPropertyTypesResult.status == "success" && selectedType) {
      const objectTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(selectedType.sampleType);
      const resolvedTypes = Object.entries(objectTypeTemplate.propertyTypes).map(
        ([group, propertyTypesGroup]) => {
          return [ group, propertyTypesGroup ];
        }
      );
      dispatch({
        type: "SET_PROPERTIES_SCHEMA",
        payload: Object.fromEntries(resolvedTypes) as PropertyTypesSchema,
      });

      if (mode === "create") {
        const propertyValues = Object.entries(objectTypeTemplate.propertyTypes).reduce(
          (acc, [group, propertyTypesGroup]) => {
            propertyTypesGroup.forEach((property) => {
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

  useEffect(() => {
    if (objectResult.status == "success") {
      const openbisSample = objectResult.data[0];
      setOpenbisSample(openbisSample);

      if (openbisSample) {
        const objectHistory = openbisSample.getPropertiesHistory() as openbis.PropertyHistoryEntry[];
        const reconstructedHistory = reconstructHistory(objectHistory);
        setReconstructedHistory(reconstructedHistory);
        const latestKey = Object.keys(reconstructedHistory).pop();
        const latestSampleState = latestKey ? reconstructedHistory[latestKey] : [];
        const objectTemplate = convertOpenBISPropertyHistoryEntryListToObjectDefinition(openbisSample, latestSampleState)
        setObjectTemplate(objectTemplate);
        setOriginalPropertyValues({ ...objectTemplate.propertyValues });
        setMinValidFrom(parseZonedDateTime(Object.keys(reconstructedHistory)[0]));
        dispatch({ type: "RESET", payload: objectTemplate });
        createObjectSchemaBasedOnType(objectTemplate.type);
      }
    }
  }, [objectCode, objectResult.status, objectResult.data]);

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
      const objectState = convertOpenBISPropertyHistoryEntryListToObjectDefinition(openbisSample, previousState, newValidFrom);
      dispatch({ type: "RESET", payload: objectState });
      createObjectSchemaBasedOnType(objectTemplate.type);
    }
  };

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    localDispatch({ type: "CLEAR" });

    if (mode === "edit") {

      const isInstrument = state.collection === instrumentCollectionID;
      if (isInstrument) {
        // Use the enhanced update for instruments to handle component locations
        objectUpdateWithComponents.mutate({
          sampleId: state.id as openbis.ISampleId,
          objectCode: objectCode,
          properties: {
            ...state.propertyValues,
            VALID_FROM: state.validFrom.toString(),
          },
          previousProperties: originalPropertyValues,
        }, {
          onError: (err) => {
            onError(err.message);
          },
          onSuccess: () => {
            onSuccess("Instrument updated successfully! Component locations have been updated.");
            setTimeout(() => {
              onBack();
            }, 2000);
          },
        });
      } else {
        // Use regular update for components
        objectUpdate.mutate({
          sampleId: state.id as openbis.ISampleId,
          objectCode: objectCode,
          properties: {
            ...state.propertyValues,
            VALID_FROM: state.validFrom.toString(),
          },
        }, {
          onError: (err) => {
            onError(err.message);
          },
          onSuccess: () => {
            onSuccess("Object updated successfully!");
            setTimeout(() => {
              onBack();
            }, 2000);
          },
        });
      }
    } else {
      objectCreation.mutate({
        collection: state.collection,
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
          onSuccess("Object created successfully!");
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
      dispatch({ type: "RESET", payload: objectTemplate });
    } else {
      dispatch({ type: "CLEAR" });
      localDispatch({ type: "SET_LOADING", payload: false });
      setTimeout(() => {
        localDispatch({ type: "CLEAR" });
      }, ms);
    }
  };

  const onBack = () => {
    navigate({ to: "/objects" });
  };

  return (
    <div className="md-size-div">
      <h2>{mode === "edit" ? "Edit Object" : "Create Object"}</h2>
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
            // minValue={minValidFrom}
            // maxValue={maxValidFrom}
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
            // minValue={minValidFrom}
            // maxValue={new Time(23, 59, 59)}
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
        <RadioGroup
          isRequired
          isDisabled={mode === "edit"}
          label="What is the base type of this object?"
          orientation="horizontal"
          style={{ textAlign: "left", justifyContent: "flex-start", marginBottom: "15px" }}
          value={state.collection}
          onValueChange={(value) => {
            dispatch({ type: "SET_COLLECTION", payload: value })
          }}
        >
          <Radio value={instrumentCollectionID}>Instrument</Radio>
          <Radio value={componentCollectionID}>Component</Radio>
        </RadioGroup>
        <Autocomplete
          isRequired
          isDisabled={mode === "edit"}
          id="type"
          label="Type"
          placeholder="Type to search..."
          className="form-field"
          defaultItems={[]}
          items={objectTypesFilteredByCollection}
          onInputChange={(value) => {
            localDispatch({ type: "SET_SEARCH_TERM", payload: value });
          }}
          selectedKey={state.type}
          onSelectionChange={(value) => {
            const newType = value?.toString() ?? "";
            dispatch({ type: "SET_TYPE", payload: newType });
            createObjectSchemaBasedOnType(newType, "create");
          }}
        >
          {(type) => <AutocompleteItem key={type.key}>{type.code}</AutocompleteItem>}
        </Autocomplete>
        <Divider className="my-4" />
        {state.type !== "" ? (
          <ObjectPropertyEditor
            mode="edit"
            state={state}
            dispatch={dispatch}
            hiddenPropertyCodes={[
              iLogID,
              iLogBaseTypesPropertyCode,
              "VALID_FROM",
            ]}
            currentObjectCode={objectCode}
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

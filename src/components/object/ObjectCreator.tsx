import React, { useContext, useEffect, useReducer, useState, useMemo, useRef } from "react";
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
  Input,
} from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { ObjectPropertyEditor } from "./ObjectPropertyEditor";
import { uploadFileAsDataset, getSampleDatasets, deleteDataset, getDatasetImageFilenameFromObject } from "../../apis/dataset/datasetAPI";
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
import { stripVocabularyName } from "../../apis/shared/common";
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
import { MessageModal } from "../shared/messageModal";

// define whether this will be an Object Creator or Editor component
const creatorModes = ["create", "edit", "view"] as const;
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
  let [selectedComponentsByProperty, setSelectedComponentsByProperty] = useState<{ [propertyCode: string]: string[] }>({});
  let [isEditMode, setIsEditMode] = useState(mode === "edit" || mode === "create");
  let [newlyCreatedObject, setNewlyCreatedObject] = useState<openbis.Sample | null>(null);
  let [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  let [existingImageDataset, setExistingImageDataset] = useState<{url: string, filename: string, datasetId: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(objectCreatorReducer, objectTemplate);
  const [localState, localDispatch] = useReducer(objectCreatorLocalReducer,
    EMPTY_OBJECT_CREATOR_LOCAL_DEFINITION,
  );

  // Update isEditMode when mode prop changes
  useEffect(() => {
    setIsEditMode(mode === "edit" || mode === "create");
  }, [mode]);

  // Load existing image dataset when editing/viewing
  useEffect(() => {
    const loadExistingImage = async () => {
      if ((mode === "edit" || mode === "view") && openbisSample && apiFacade) {
        try {
          const datasets = await getSampleDatasets(apiFacade, openbisSample.getPermId().getPermId());
          const elnPreviewDataset = datasets.find(ds => ds.getType()?.getCode() === "ELN_PREVIEW");

          if (elnPreviewDataset) {
            const datasetPermId = elnPreviewDataset.getPermId().getPermId();
            const sessionToken = (apiFacade as any)?._private?.sessionToken;
            if (sessionToken) {
              // Get the actual image filename - tries DSS API first, then storage, then metadata
              const filename = await getDatasetImageFilenameFromObject(elnPreviewDataset, apiFacade);

              if (filename) {
                // Construct URL with actual filename, matching openBIS format:
                // /datastore_server/{datasetPermId}/original/{filename}?sessionID={sessionToken}
                const encodedFilename = encodeURIComponent(filename);
                const url = `/datastore_server/${datasetPermId}/original/${encodedFilename}?sessionID=${encodeURIComponent(sessionToken)}`;

                setExistingImageDataset({
                  url: url,
                  filename: filename,
                  datasetId: datasetPermId
                });
              } else {
                const directoryUrl = `/datastore_server/${datasetPermId}/original/?sessionID=${encodeURIComponent(sessionToken)}`;

                setExistingImageDataset({
                  url: directoryUrl,
                  filename: "Preview Image",
                  datasetId: datasetPermId
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to load existing image:", error);
        }
      }
    };

    loadExistingImage();
  }, [mode, openbisSample, apiFacade]);

  // Function to upload image to object
  const uploadImageToObject = async (samplePermId: string, file: File) => {
    if (!apiFacade) throw new Error("API facade not available");

    try {
      // Upload file as ELN_PREVIEW dataset
      const datasetPermId = await uploadFileAsDataset(
        apiFacade,
        samplePermId,
        file,
        "ELN_PREVIEW"
      );
      return datasetPermId;
    } catch (error) {
      throw error;
    }
  };

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
        return collectionType === instrumentCollectionID;
      } else if (state.collection === componentCollectionID) {
        return collectionType === componentCollectionID;
      }

      return false;
    });
  }, [objectTypes.data, state.collection]);

  useEffect(() => {
    if (!isValidFromSelected) {
      const interval = setInterval(() => {
        dispatch({ type: "SET_VALID_FROM", payload: now(getLocalTimeZone()) })
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isValidFromSelected]);

  // Load historical state when a past date is selected
  useEffect(() => {
    if (isValidFromSelected && mode === "edit" && state.validFrom) {
      onLoadValidFrom(state.validFrom);
    }
  }, [isValidFromSelected, state.validFrom, mode]);

  const createObjectSchemaBasedOnType = (
    type: string,
    mode?: CreatorMode,
  ) => {
    if (!objectTypes.data || objectTypes.status !== "success") {
      return;
    }

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
          (acc, [_group, propertyTypesGroup]) => {
            propertyTypesGroup.forEach((property: any) => {
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
        const registrationDate = openbisSample.getRegistrationDate();
        const reconstructedHistory = reconstructHistory(objectHistory, registrationDate);
        setReconstructedHistory(reconstructedHistory);
        const latestKey = Object.keys(reconstructedHistory).pop();
        const latestSampleState = latestKey ? reconstructedHistory[latestKey] : [];
        const objectTemplate = convertOpenBISPropertyHistoryEntryListToObjectDefinition(openbisSample, latestSampleState, latestKey ? Number(latestKey) : undefined)
        
        // Ensure LOCATION property is set from current sample properties if not in history
        if (!objectTemplate.propertyValues["LOCATION"] && openbisSample.getProperty("LOCATION")) {
          objectTemplate.propertyValues["LOCATION"] = stripVocabularyName(openbisSample.getProperty("LOCATION"));
        }
        
        setObjectTemplate(objectTemplate);
        setOriginalPropertyValues({ ...objectTemplate.propertyValues });
        dispatch({ type: "RESET", payload: objectTemplate });
      }
    }
  }, [objectCode, objectResult.status, objectResult.data]);

  // Load schema after objectTypes query is ready
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && state.type && objectTypes.status === "success" && allPropertyTypesResult.status === "success") {
      createObjectSchemaBasedOnType(state.type, mode);
    }
  }, [state.type, objectTypes.status, objectTypes.data, allPropertyTypesResult.status, mode]);

  // Ensure objectTypesFilteredByCollection is updated when objectTypes loads
  useEffect(() => {
    if (mode === "edit" && state.type && objectTypes.status === "success") {
      // Force a re-render by triggering objectTypesFilteredByCollection calculation
      // The useMemo will automatically recalculate
    }
  }, [objectTypes.status, objectTypes.data]);

  const onLoadValidFrom = (newValidFrom: ZonedDateTime | null) => {
    const keys = Object.keys(reconstructedHistory)
      .map(Number)
      .sort((a, b) => a - b)
      .map(k => k.toString());

    if (mode === "edit" && newValidFrom !== null && openbisSample) {
      const newValidFromMs = newValidFrom.toDate().getTime();
      
      // Find the latest history entry that is before or equal to the selected VALID_FROM
      let previousKey = keys[0];
      for (let i = 0; i < keys.length; i++) {
        const keyMs = Number(keys[i]);
        if (keyMs <= newValidFromMs) {
          previousKey = keys[i];
        } else {
          break;
        }
      }

      const previousState = reconstructedHistory[previousKey];
      const objectState = convertOpenBISPropertyHistoryEntryListToObjectDefinition(openbisSample, previousState, Number(previousKey));
      dispatch({ type: "RESET", payload: objectState });
      createObjectSchemaBasedOnType(objectTemplate.type);
    }
  };

  const updateComponentLocations = async (instrumentPermId: string) => {
    if (!Object.keys(selectedComponentsByProperty).length || !apiFacade) {
      return;
    }

    try {
      for (const permIds of Object.values(selectedComponentsByProperty)) {
        for (const permId of permIds) {
          const sampleId = new openbis.SamplePermId(permId);
          const updateObj = new openbis.SampleUpdate();
          updateObj.setSampleId(sampleId);
          updateObj.setProperty("LOCATION", instrumentPermId);
          await apiFacade.updateSamples([updateObj]);
        }
      }
    } catch (err: any) {
      console.error("Error updating component locations:", err);
      throw err;
    }
  };

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent form submission in view mode
    if (mode === "view" && !isEditMode) {
      return;
    }
    localDispatch({ type: "SET_LOADING", payload: true });

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
            handleMessage(err.message, false, true);
            localDispatch({ type: "SET_LOADING", payload: false });
          },
          onSuccess: async () => {
            // If we have selected components, update their locations
            if (Object.keys(selectedComponentsByProperty).length > 0) {
              try {
                const instrumentPermId = openbisSample?.getPermId().getPermId();
                if (instrumentPermId) {
                  await updateComponentLocations(instrumentPermId);
                }
                handleMessage("Instrument updated successfully! Component locations have been updated.", true, true);
              } catch (err: any) {
                handleMessage("Instrument updated but failed to update component locations: " + err.message, false, true);
              }
            } else {
              handleMessage("Instrument updated successfully!", true, true);
            }
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
            handleMessage(err.message, false, true);
            localDispatch({ type: "SET_LOADING", payload: false });
          },
          onSuccess: () => {
            handleMessage("Object updated successfully!", true, true);
            setTimeout(() => {
              onBack();
            }, 2000);
          },
        });
      }
    } else {
      // Don't include VALID_FROM when creating new objects - only add it when editing
      objectCreation.mutate({
        collection: state.collection,
        type: state.type,
        properties: {
          ...state.propertyValues,
          // VALID_FROM is not set during creation, only during edits
        },
      }, {
        onError: (err) => {
          handleMessage(err.message, false, true);
          localDispatch({ type: "SET_LOADING", payload: false });
        },
        onSuccess: async () => {
          try {
            // Longer delay to ensure object is properly indexed
            await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
            // If this is an instrument and we have selected components, update their locations
            if (state.collection === instrumentCollectionID && Object.keys(selectedComponentsByProperty).length > 0) {
              // Find the most recently created object of this type
              const sc = new openbis.SampleSearchCriteria();
              sc.withExperiment().withCode().thatEquals(state.collection);
              sc.withType().withCode().thatEquals(state.type);
              const fo = new openbis.SampleFetchOptions();
              fo.withType();
              fo.withProperties();

              const result = await apiFacade?.searchSamples(sc, fo);
              const objects = result?.getObjects() || [];

              if (objects.length > 0) {
                // Sort objects by PermId timestamp to get the truly most recent one
                const sortedObjects = objects.sort((a, b) => {
                  const timestampA = a.getPermId().getPermId().split('-')[0];
                  const timestampB = b.getPermId().getPermId().split('-')[0];
                  return timestampB.localeCompare(timestampA); // Descending order (newest first)
                });

                const newObject = sortedObjects[0]; // Get the first object (most recently created)
                const instrumentPermId = newObject.getPermId().getPermId();
                await updateComponentLocations(instrumentPermId);

                // Upload image if one is selected
                if (selectedImageFile && apiFacade) {
                  await uploadImageToObject(newObject.getPermId().getPermId(), selectedImageFile);
                  handleMessage("Object created successfully with component locations updated and image uploaded!", true, true);
                  onClear(2000);
                } else {
                  handleMessage("Object created successfully with component locations updated!", true, true);
                  onClear(2000);
                }
              } else {
                handleMessage("Object created but could not be located for image upload", false, true);
              }
            } else {
              // Find the most recently created object of this type
              const sc = new openbis.SampleSearchCriteria();
              sc.withExperiment().withCode().thatEquals(state.collection);
              sc.withType().withCode().thatEquals(state.type);
              const fo = new openbis.SampleFetchOptions();
              fo.withType();
              fo.withProperties();

              const result = await apiFacade?.searchSamples(sc, fo);
              const objects = result?.getObjects() || [];

              if (objects.length > 0) {
                // Sort objects by PermId timestamp to get the truly most recent one
                const sortedObjects = objects.sort((a, b) => {
                  const timestampA = a.getPermId().getPermId().split('-')[0];
                  const timestampB = b.getPermId().getPermId().split('-')[0];
                  return timestampB.localeCompare(timestampA); // Descending order (newest first)
                });

                const newObject = sortedObjects[0]; // Get the first object (most recently created)
                if (newObject && selectedImageFile && apiFacade) {
                  try {
                    const datasetId = await uploadImageToObject(newObject.getPermId().getPermId(), selectedImageFile);
                    handleMessage("Object created successfully and image uploaded with dataset ID: " + datasetId, true, true);
                    onClear(2000);
                  } catch (uploadError) {
                    handleMessage("Object created but image upload failed: " + uploadError, false, true);
                  }
                } else if (newObject) {
                  handleMessage("Object created successfully!", true, true);
                  onClear(2000);
                } else {
                  handleMessage("Object created but could not be located", false, true);
                }
              } else {
                handleMessage("Object created but could not be located", false, true);
              }
            }
          } catch (err: any) {
            handleMessage("Object created but failed to complete additional operations: " + err.message, false, true);
          } finally {
            localDispatch({ type: "SET_LOADING", payload: false });
          }
        },
      });
    }
  }

  const onClear = (ms: number) => {
    if (mode === "edit") {
      dispatch({ type: "RESET", payload: objectTemplate });
    } else {
      dispatch({ type: "CLEAR" });
      setTimeout(() => {
        localDispatch({ type: "CLEAR" });
      }, ms);
    }
    // Clear the selected image as well
    setSelectedImageFile(null);
  };

  const onBack = () => {
    navigate({ to: "/objects" });
  };

  const handleMessage = (
    msg: string,
    isSuccess: boolean,
    showMsg: boolean,
  ) => {
    localDispatch({ type: "SET_MESSAGE", payload: msg });
    localDispatch({ type: "SET_IS_SUCCESS", payload: isSuccess });
    localDispatch({ type: "SET_SHOW_MESSAGE", payload: showMsg });

    setTimeout(() => {
      localDispatch({ type: "CLEAR" });
    }, 3000);
  };

  return (
    <>
      <div>
        <h2>{mode === "create" ? "Create Object" : mode === "edit" ? "Edit Object" : "View Object"}</h2>
        <form onSubmit={onSubmit}>
          <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex-1 min-w-[260px] max-w-[25rem]">
              <div className="mb-4">
                <div className="flex gap-3" style={{ alignItems: "baseline"}}>
                  <p className="text-lg font-semibold text-left">Preview</p>
                  {selectedImageFile ? (
                    <span className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" style={{lineHeight: '1.75rem', display: 'inline-block'}}>
                      {selectedImageFile.name}
                    </span>
                  ) : existingImageDataset ? (
                    <span className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" style={{lineHeight: '1.75rem', display: 'inline-block'}}>
                      {existingImageDataset.filename}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">No image selected</span>
                  )}
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg text-center" style={{ padding: "1rem" }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  key={selectedImageFile ? 'with-file' : 'no-file'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedImageFile(file || null);
                  }}
                  className="hidden"
                  id="image-upload"
                  disabled={!isEditMode}
                />
                <label htmlFor="image-upload" className={isEditMode ? "cursor-pointer" : "cursor-default"}>
                  {selectedImageFile ? (
                    <div className="space-y-2">
                      <img
                        src={URL.createObjectURL(selectedImageFile)}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                      />
                      {isEditMode && (
                        <div className="flex gap-2 justify-center">
                          <p className="text-xs text-blue-600 hover:text-blue-800">
                            Click to change image
                          </p>
                          <span className="text-xs text-gray-400">•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedImageFile(null);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Remove image
                          </button>
                        </div>
                      )}
                    </div>
                  ) : existingImageDataset ? (
                    <div className="space-y-2">
                      <img
                        src={existingImageDataset.url}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                      />
                      {isEditMode && (
                        <div className="flex gap-2 justify-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.currentTarget.files?.[0];
                              if (file && openbisSample && apiFacade && existingImageDataset) {
                                try {
                                  // Delete the old image
                                  await deleteDataset(apiFacade, existingImageDataset.datasetId);
                                  // Upload the new image
                                  await uploadImageToObject(openbisSample.getPermId().getPermId(), file);
                                  // Reload the new image preview
                                  const datasets = await getSampleDatasets(apiFacade, openbisSample.getPermId().getPermId());
                                  const elnPreviewDataset = datasets.find(ds => ds.getType()?.getCode() === "ELN_PREVIEW");
                                  if (elnPreviewDataset) {
                                    const datasetPermId = elnPreviewDataset.getPermId().getPermId();
                                    const sessionToken = (apiFacade as any)?._private?.sessionToken;
                                    if (sessionToken) {
                                      const filename = await getDatasetImageFilenameFromObject(elnPreviewDataset, apiFacade);
                                      if (filename) {
                                        const encodedFilename = encodeURIComponent(filename);
                                        const url = `/datastore_server/${datasetPermId}/original/${encodedFilename}?sessionID=${encodeURIComponent(sessionToken)}`;
                                        setExistingImageDataset({
                                          url: url,
                                          filename: filename,
                                          datasetId: datasetPermId
                                        });
                                      }
                                    }
                                  }
                                  // Reset file input
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                } catch (error) {
                                  console.error("Failed to replace image:", error);
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Replace image
                          </button>
                          <span className="text-xs text-gray-400">•</span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (apiFacade && existingImageDataset) {
                                try {
                                  await deleteDataset(apiFacade, existingImageDataset.datasetId);
                                  setExistingImageDataset(null);
                                } catch (error) {
                                  console.error("Failed to delete dataset:", error);
                                }
                              }
                            }}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Remove image
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        {isEditMode ? "Click to select a preview image" : "No preview image"}
                      </p>
                      {isEditMode && (
                        <p className="text-xs text-gray-500">
                          Single image only - Optional
                        </p>
                      )}
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="flex-1 min-w-[260px] max-w-xl flex flex-col gap-4 justify-start">
              <div className="flex flex-col gap-4">
                <div className="flex flex-row items-center gap-4">
                  <Checkbox
                    isSelected={isValidFromSelected}
                    onValueChange={setIsValidFromSelected}
                    isDisabled={mode === "view" && !isEditMode}
                  />
                  <DatePicker
                    isRequired
                    isDisabled={!isValidFromSelected || (mode === "view" && !isEditMode)}
                    id="validFrom"
                    label="Valid From"
                    className="form-field max-w-[180px]"
                    labelPlacement="outside-left"
                    showMonthAndYearPickers
                    granularity="day"
                    value={state.validFrom}
                    onChange={(value) => {
                      dispatch({ type: "SET_VALID_FROM", payload: value as ZonedDateTime });
                    }}
                  />
                  <TimeInput
                    isRequired
                    isDisabled={!isValidFromSelected || (mode === "view" && !isEditMode)}
                    aria-label="Time"
                    className="form-field"
                    granularity="second"
                    hourCycle={24}
                    value={state.validFrom}
                    onChange={(value) => {
                      dispatch({ type: "SET_VALID_FROM", payload: value as ZonedDateTime });
                    }}
                  />
                  <Button
                    isDisabled={!isValidFromSelected || (mode === "view" && !isEditMode)}
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
                <Divider className="my-2" />
                <RadioGroup
                  isRequired
                  isDisabled={mode === "edit" || (mode === "view" && !isEditMode)}
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
                {mode === "edit" ? (
                  <Input
                    isReadOnly
                    id="type"
                    label="Type"
                    value={state.type}
                    className="form-field"
                  />
                ) : (
                  <Autocomplete
                    isRequired
                    isReadOnly={mode === "view" && !isEditMode}
                    id="type"
                    label="Type"
                    placeholder="Type to search..."
                    className="form-field"
                    defaultItems={objectTypesFilteredByCollection}
                    items={objectTypesFilteredByCollection}
                    onInputChange={(value) => {
                      localDispatch({ type: "SET_SEARCH_TERM", payload: value });
                    }}
                    selectedKey={state.type || ""}
                    onSelectionChange={(value) => {
                      const newType = value?.toString() ?? "";
                      dispatch({ type: "SET_TYPE", payload: newType });
                      createObjectSchemaBasedOnType(newType, "create");
                    }}
                  >
                    {(type) => <AutocompleteItem key={type.key}>{type.code}</AutocompleteItem>}
                  </Autocomplete>
                )}
              </div>
            </div>
          </div>
          <div className="md-size-div">
            {state.type !== "" ? (
              <ObjectPropertyEditor
                state={state}
                dispatch={dispatch}
                hiddenPropertyCodes={[
                  iLogID,
                  // iLogBaseTypesPropertyCode,
                  "VALID_FROM",
                ]}
                currentObjectCode={objectCode}
                onSelectedComponentsChange={(propertyCode, permIds) => {
                  setSelectedComponentsByProperty((prev) => ({
                    ...prev,
                    [propertyCode]: permIds,
                  }));
                }}
                currentInstrumentPermId={(openbisSample || newlyCreatedObject)?.getPermId().getPermId()}
                currentSamplePermId={(openbisSample || newlyCreatedObject)?.getPermId().getPermId()}
                isComponent={state.collection === componentCollectionID}
                isReadOnly={mode === "view" && !isEditMode}
              />) : (
              <p className="text-gray-500">
                Please select a type.
              </p>
            )}
          </div>
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
                  isDisabled={localState.loading || objectCreation.isPending || objectUpdate.isPending || objectUpdateWithComponents.isPending}
                  onPress={() => {
                    if (mode === "view") {
                      setIsEditMode(false);
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
                  isLoading={localState.loading || objectCreation.isPending || objectUpdate.isPending || objectUpdateWithComponents.isPending}
                >
                  {mode === "create" ? "Create" : "Update"}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
      <MessageModal
        message={localState.message}
        isOpen={localState.showMessage}
        isSuccess={localState.isSuccess}
      />
    </>
  );
}

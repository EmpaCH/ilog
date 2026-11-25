import React, { useContext, useEffect, useReducer, useState, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Divider,
  Radio,
  RadioGroup,
  Input,
} from "@heroui/react";
import { AuthContext } from "../../context/auth/authContext";
import { ObjectPropertyEditor } from "./ObjectPropertyEditor";
import { uploadFileAsDataset, deleteDataset, getPreviewImageInfo } from "../../apis/dataset/datasetAPI";
import { DATASET_QUERY_PREFIX } from "../../apis/dataset/useDatasets";
import { uploadAfsDataSet, listAfsEntries, deleteAfsFile } from "../../apis/dataset/afsDatasetAPI";
import { useCreateObject } from "../../apis/object/useCreateObject";
import { useUpdateObject } from "../../apis/object/useUpdateObject";
import { useUpdateObjectWithComponentLocations } from "../../apis/object/useUpdateObjectWithComponentLocations";
import { useGetObject } from "../../apis/object/useGetObject";
import { useGetIlogObjectTypes } from "../../apis/type/useGetIlogObjectTypes";
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
import { ObjectDefinition } from "../../apis/object/commonObject";
import {
  legacyIlogPropertyCodes,
  defaultCollectionMetadataKey,
} from "../../apis/shared/environment";
import {
  componentCategory,
  getTypeCategory,
  instrumentCategory,
} from "../../apis/shared/category";
import { stripVocabularyName } from "../../apis/shared/common";
import { useGetPropertyTypes } from "../../apis/propertyType/useGetPropertyTypes";
import { OBJECT_SUBTYPES_KEY } from "../../apis/propertyType/commonPropertyType";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "../../apis/type/commonType";
import openbis from "@openbis/openbis.esm";
import "../../index.css";
import { MessageModal } from "../shared/messageModal";
import { AfsFileTree } from "../shared/AfsFileTree";
import { DroppedFile, getDroppedFiles } from "../shared/droppedFiles";
import { CollectionSelect } from "../shared/CollectionSelect";

// define whether this will be an Object Creator or Editor component
const creatorModes = ["create", "edit", "view"] as const;
type CreatorMode = (typeof creatorModes)[number];
interface ObjectCreatorProps {
  mode: CreatorMode;
  objectPermId: string;
}

export const ObjectCreator: React.FC<ObjectCreatorProps> = ({
  mode,
  objectPermId,
}) => {
  const { apiFacade } = useContext(AuthContext);
  const objectResult = useGetObject(objectPermId);
  const objectCreation = useCreateObject();
  const objectUpdate = useUpdateObject();
  const objectUpdateWithComponents = useUpdateObjectWithComponentLocations();
  const allPropertyTypesResult = useGetPropertyTypes();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  let [openbisSample, setOpenbisSample] = useState<openbis.Sample | undefined>(undefined);
  let [objectTemplate, setObjectTemplate] = useState<ObjectDefinition>(createEmptyObjectDefinition());
  let [originalPropertyValues, setOriginalPropertyValues] = useState<{ [key: string]: any }>({});

  let [selectedComponentsByProperty, setSelectedComponentsByProperty] = useState<{ [propertyCode: string]: string[] }>({});
  let [isEditMode, setIsEditMode] = useState(mode === "edit" || mode === "create");
  let [newlyCreatedObject, setNewlyCreatedObject] = useState<openbis.Sample | null>(null);
  let [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  let [existingImageDataset, setExistingImageDataset] = useState<{url: string, filename: string, datasetId: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Whether a file is dragged over the preview image area
  let [isDraggingImage, setIsDraggingImage] = useState(false);
  let [selectedAfsFiles, setSelectedAfsFiles] = useState<{ file: File; targetPath: string }[]>([]);
  const afsFileInputRef = useRef<HTMLInputElement>(null);
  let [existingAfsEntries, setExistingAfsEntries] = useState<{ path: string; name: string; directory: boolean; size?: number }[]>([]);
  let [pendingAfsDeletes, setPendingAfsDeletes] = useState<string[]>([]);
  // Folder new AFS uploads are added into, as typed (e.g. "reports/2024/"). "" = root.
  let [afsTargetDir, setAfsTargetDir] = useState<string>("");
  // The same folder as a clean relative path, without empty segments or leading/trailing slashes
  const afsTargetFolder = afsTargetDir.split("/").map((segment) => segment.trim()).filter(Boolean).join("/");
  // Whether files are dragged over the AFS upload area
  let [isDraggingAfs, setIsDraggingAfs] = useState(false);

  // Queue files for upload into the chosen AFS folder, keeping their relative paths
  const queueAfsFiles = (files: DroppedFile[]) => {
    if (files.length === 0) return;
    setSelectedAfsFiles((prev) => [
      ...prev,
      ...files.map(({ file, relativePath }) => ({
        file,
        targetPath: afsTargetFolder ? `${afsTargetFolder}/${relativePath}` : relativePath,
      })),
    ]);
  };

  const [state, dispatch] = useReducer(objectCreatorReducer, objectTemplate);
  const [localState, localDispatch] = useReducer(objectCreatorLocalReducer,
    EMPTY_OBJECT_CREATOR_LOCAL_DEFINITION,
  );

  // Update isEditMode when mode prop changes
  useEffect(() => {
    setIsEditMode(mode === "edit" || mode === "create");
  }, [mode]);

  const loadExistingImage = async () => {
    if ((mode === "edit" || mode === "view") && openbisSample && apiFacade) {
      try {
        const sessionToken = (apiFacade as any)?._private?.sessionToken;
        if (!sessionToken) return;

        const info = await getPreviewImageInfo(apiFacade, openbisSample.getPermId().getPermId());
        if (info) {
          const encodedPath = info.filePath.split('/').map(encodeURIComponent).join('/');
          const url = `/datastore_server/${info.datasetPermId}/${encodedPath}?sessionID=${encodeURIComponent(sessionToken)}`;
          setExistingImageDataset({
            url,
            filename: info.filePath.split('/').pop() ?? info.filePath,
            datasetId: info.datasetPermId,
          });
        }
      } catch (error) {
        console.error("Failed to load existing image:", error);
      }
    }
  };

  // Load existing image dataset when editing/viewing
  useEffect(() => {
    loadExistingImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, openbisSample, apiFacade]);

  const loadExistingAfs = async () => {
    if ((mode === "edit" || mode === "view") && openbisSample && apiFacade) {
      try {
        const permId = openbisSample.getPermId().getPermId();
        const entries = await listAfsEntries(apiFacade, { owner: permId, source: '/', recursively: true });
        setExistingAfsEntries(entries.filter((e) => !e.directory));
      } catch (error) {
        console.error("Failed to load existing AFS files:", error);
      }
    }
  };

  // Load existing AFS files when editing/viewing
  useEffect(() => {
    loadExistingAfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, openbisSample, apiFacade]);

  // The object list caches the preview images: drop the cached one after changing it
  const forgetCachedPreview = (samplePermId: string) =>
    queryClient.invalidateQueries({ queryKey: [DATASET_QUERY_PREFIX, "preview", samplePermId] });

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
      forgetCachedPreview(samplePermId);
      return datasetPermId;
    } catch (error) {
      throw error;
    }
  };

  // Replace the stored preview image of the object right away
  const replaceExistingImage = async (file: File) => {
    if (!openbisSample || !apiFacade || !existingImageDataset) return;
    try {
      await deleteDataset(apiFacade, existingImageDataset.datasetId);
      await uploadImageToObject(openbisSample.getPermId().getPermId(), file);
      await loadExistingImage();
    } catch (error) {
      console.error("Failed to replace image:", error);
    }
  };

  // Use a chosen or dropped image: replace a stored image right away, otherwise keep it until saving
  const handleImageFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (existingImageDataset && !selectedImageFile) {
      replaceExistingImage(file);
    } else {
      setSelectedImageFile(file);
    }
  };

  const objectTypes = useGetIlogObjectTypes();

  const objectTypesFilteredByCollection = useMemo(() => {
    if (!objectTypes.data || !state.category) return [];
    
    return objectTypes.data
      .filter((oj) => getTypeCategory(oj) === state.category)
      .filter((oj) => {
        if (!localState.searchTerm) return true;
        return oj.getCode().toLowerCase().includes(localState.searchTerm.toLowerCase());
      })
      // Alphabetical, as shown in the dropdown
      .sort((a, b) => a.getCode().localeCompare(b.getCode()));
  }, [objectTypes.data, state.category, localState.searchTerm]);

  const createObjectSchemaBasedOnType = (
    type: string,
    mode?: CreatorMode,
  ) => {
    if (!objectTypes.data || objectTypes.status !== "success") {
      return;
    }

    const selectedType = objectTypes.data?.find(
      (it) => it.getCode() === type
    );

    if (allPropertyTypesResult.status == "success" && selectedType) {
      const objectTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(selectedType);
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
      } else {
        // Merge schema into objectTemplate so cancel can reset to full original state
        setObjectTemplate((prev) => ({ ...prev, propertiesSchema: Object.fromEntries(resolvedTypes) as PropertyTypesSchema }));
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
        const latestKey = Object.keys(reconstructedHistory).pop();
        const latestSampleState = latestKey ? reconstructedHistory[latestKey] : [];
        const objectTemplate = convertOpenBISPropertyHistoryEntryListToObjectDefinition(openbisSample, latestSampleState);

        // Always use the current sample's getProperties() to populate propertyValues.
        // The history-based reconstruction loses multi-value properties because openBIS
        // creates one history entry per value (all at the same timestamp), and
        // accumulated.set() overwrites the first with the second — leaving only one item.
        // getProperties() returns the true current state, including proper arrays for
        // multi-value OBJECT properties.
        const currentProperties = openbisSample.getProperties() as Record<string, any> | null;
        if (currentProperties) {
          Object.entries(currentProperties).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              if (Array.isArray(val)) {
                objectTemplate.propertyValues[key] = val;
              } else {
                objectTemplate.propertyValues[key] = stripVocabularyName(String(val));
              }
            }
          });
        }

        setObjectTemplate(objectTemplate);
        setOriginalPropertyValues({ ...objectTemplate.propertyValues });
        dispatch({ type: "RESET", payload: objectTemplate });
      }
    }
  }, [objectPermId, objectResult.status, objectResult.data]);

  // Load schema after objectTypes query is ready, and again after the object is reloaded (e.g. after
  // an update), as loading the object resets the state including the schema
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && state.type && objectTypes.status === "success" && allPropertyTypesResult.status === "success") {
      createObjectSchemaBasedOnType(state.type, mode);
    }
  }, [state.type, objectTypes.status, objectTypes.data, allPropertyTypesResult.status, mode, objectResult.data]);

  // Ensure objectTypesFilteredByCollection is updated when objectTypes loads
  useEffect(() => {
    if (mode === "edit" && state.type && objectTypes.status === "success") {
      // Force a re-render by triggering objectTypesFilteredByCollection calculation
      // The useMemo will automatically recalculate
    }
  }, [objectTypes.status, objectTypes.data]);

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

  // Sort files by path depth ascending so that AFS auto-creates parent directories
  // before we attempt to write into nested subdirectories.
  const sortedByDepth = (files: { file: File; targetPath: string }[]) =>
    [...files].sort((a, b) => {
      const depthA = a.targetPath.split('/').length;
      const depthB = b.targetPath.split('/').length;
      return depthA - depthB;
    });

  // After a successful update: store the AFS changes, show the saved object and switch back to view mode
  const finishUpdate = async () => {
    if (apiFacade && openbisSample) {
      const permId = openbisSample.getPermId().getPermId();
      // An image chosen for an object without one is only stored when saving
      if (selectedImageFile) {
        try {
          await uploadImageToObject(permId, selectedImageFile);
          setSelectedImageFile(null);
          await loadExistingImage();
        } catch (err: any) {
          console.error("Image upload failed:", err);
        }
      }
      if (selectedAfsFiles.length > 0) {
        try {
          for (const { file, targetPath } of sortedByDepth(selectedAfsFiles)) {
            await uploadAfsDataSet(apiFacade, { samplePermId: permId, experimentIdentifier: '', sampleIdentifier: '', afsOwnerText: '', file, targetPath });
          }
          setSelectedAfsFiles([]);
        } catch (err: any) {
          console.error("AFS upload failed:", err);
        }
      }
      if (pendingAfsDeletes.length > 0) {
        for (const path of pendingAfsDeletes) {
          try { await deleteAfsFile(apiFacade, permId, path); } catch (err) { console.error('AFS delete failed:', err); }
        }
        setPendingAfsDeletes([]);
      }
      setAfsTargetDir("");
      await loadExistingAfs();
    }
    // Reload the object so the page shows the saved values
    await objectResult.refetch();
    localDispatch({ type: "SET_LOADING", payload: false });
    if (mode === "edit") {
      navigate({ to: "/objects/creator", search: { mode: "view", permid: objectPermId }, replace: true });
    } else {
      setIsEditMode(false);
    }
    setTimeout(() => localDispatch({ type: "SET_SHOW_MESSAGE", payload: false }), 2000);
  };

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent form submission in view mode
    if (mode === "view" && !isEditMode) {
      return;
    }
    localDispatch({ type: "SET_LOADING", payload: true });

    if (mode === "edit" || (mode === "view" && isEditMode)) {
      const isInstrument = state.category === instrumentCategory;
      if (isInstrument) {
        // Use the enhanced update for instruments to handle component locations
        objectUpdateWithComponents.mutate({
          sampleId: state.id as openbis.ISampleId,
          objectPermId: objectPermId,
          properties: {
            ...state.propertyValues,
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
            await finishUpdate();
          },
        });
      } else {
        // Use regular update for components
        objectUpdate.mutate({
          sampleId: state.id as openbis.ISampleId,
          objectPermId: objectPermId,
          properties: {
            ...state.propertyValues,
          },
        }, {
          onError: (err) => {
            handleMessage(err.message, false, true);
            localDispatch({ type: "SET_LOADING", payload: false });
          },
          onSuccess: async () => {
            handleMessage("Object updated successfully!", true, true);
            await finishUpdate();
          },
        });
      }
    } else {
      objectCreation.mutate({
        collectionIdentifier: state.collectionIdentifier,
        type: state.type,
        properties: {
          ...state.propertyValues,
        },
      }, {
        onError: (err) => {
          handleMessage(err.message, false, true);
          localDispatch({ type: "SET_LOADING", payload: false });
        },
        onSuccess: async (samplePermId) => {
          try {
            const newPermId = samplePermId.getPermId();
            // If this is an instrument and we have selected components, update their locations
            const updatesComponents = state.category === instrumentCategory && Object.keys(selectedComponentsByProperty).length > 0;
            if (updatesComponents) {
              await updateComponentLocations(newPermId);
            }
            try {
              if (selectedImageFile && apiFacade) {
                await uploadImageToObject(newPermId, selectedImageFile);
              }
              if (selectedAfsFiles.length > 0 && apiFacade) {
                for (const { file, targetPath } of sortedByDepth(selectedAfsFiles)) {
                  await uploadAfsDataSet(apiFacade, { samplePermId: newPermId, experimentIdentifier: '', sampleIdentifier: '', afsOwnerText: '', file, targetPath });
                }
              }
              handleMessage(
                updatesComponents
                  ? "Object created successfully with component locations updated!"
                  : "Object created successfully!",
                true,
                true,
              );
              onClear(2000);
              // Show the message briefly, then go back to the object list
              setTimeout(onBack, 2000);
            } catch (uploadError) {
              handleMessage("Object created but file upload failed: " + uploadError, false, true);
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
    // Clear the selected image and AFS file as well
    setSelectedImageFile(null);
    setSelectedAfsFiles([]);
    setPendingAfsDeletes([]);
    setAfsTargetDir("");
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
        <h2>{mode === "create" ? "Create Object" : (mode === "edit" || (mode === "view" && isEditMode)) ? "Edit Object" : "View Object"}</h2>
        <form onSubmit={onSubmit}>
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-8">
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
                <div
                  className={`border-2 border-dashed rounded-lg text-center ${isDraggingImage ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
                  style={{ padding: "1rem" }}
                  onDragOver={(e) => {
                    if (!isEditMode) return;
                    e.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={(e) => {
                    // Ignore moving between elements inside the area
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDraggingImage(false);
                  }}
                  onDrop={(e) => {
                    if (!isEditMode) return;
                    e.preventDefault();
                    setIsDraggingImage(false);
                    handleImageFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    key={selectedImageFile ? 'with-file' : 'no-file'}
                    onChange={(e) => handleImageFile(e.target.files?.[0])}
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
                              Click or drop to change image
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
                                if (file) {
                                  await replaceExistingImage(file);
                                }
                                // Reset file input
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
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
                                    if (openbisSample) forgetCachedPreview(openbisSample.getPermId().getPermId());
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
                          {isEditMode ? "Click or drop a preview image here" : "No preview image"}
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
                  <RadioGroup
                    isRequired
                    isDisabled={mode === "edit" || (mode === "view" && !isEditMode)}
                    label="What is the base type of this object?"
                    orientation="horizontal"
                    style={{ textAlign: "left", justifyContent: "flex-start", marginBottom: "15px" }}
                    value={state.category}
                    onValueChange={(value) => {
                      dispatch({ type: "SET_CATEGORY", payload: value })
                    }}
                  >
                    <Radio value={instrumentCategory}>Instrument</Radio>
                    <Radio value={componentCategory}>Component</Radio>
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
                        // Preselect the type's default collection; otherwise keep the current choice
                        const defaultCollection = objectTypes.data
                          ?.find((t) => t.getCode() === newType)
                          ?.getMetaData()?.[defaultCollectionMetadataKey];
                        if (defaultCollection) {
                          dispatch({ type: "SET_COLLECTION_IDENTIFIER", payload: defaultCollection });
                        }
                      }}
                    >
                      {(type) => <AutocompleteItem key={type.getPermId().getPermId()}>{type.getCode()}</AutocompleteItem>}
                    </Autocomplete>
                  )}
                  {mode === "create" ? (
                    <CollectionSelect
                      isRequired
                      label="Collection"
                      description="Where the new object is stored in openBIS."
                      value={state.collectionIdentifier}
                      onChange={(value) =>
                        dispatch({ type: "SET_COLLECTION_IDENTIFIER", payload: value })
                      }
                    />
                  ) : (
                    <Input
                      isReadOnly
                      id="collection"
                      label="Collection"
                      value={state.collectionIdentifier}
                      className="form-field"
                    />
                  )}
                </div>
              </div>
            </div>
              <div className="w-full">
              <div className="mb-2">
                <p className="text-lg font-semibold text-left">AFS Files</p>
              </div>

              {/* Existing uploaded files as tree */}
              {existingAfsEntries.length > 0 && (
                <div className="mb-3">
                  {isEditMode &&
                    <p className="text-xs text-gray-500 text-left mb-1">
                      Click "Add here" on a folder to choose where new files go
                    </p>
                  }
                  <AfsFileTree
                    entries={existingAfsEntries}
                    pendingDeletes={pendingAfsDeletes}
                    isEditMode={isEditMode}
                    onDelete={(path) => setPendingAfsDeletes((prev) => [...prev, path])}
                    onUndoDelete={(path) => setPendingAfsDeletes((prev) => prev.filter((p) => p !== path))}
                    selectedTargetDir={isEditMode ? afsTargetFolder : undefined}
                    onSelectTargetDir={isEditMode ? setAfsTargetDir : undefined}
                  />
                </div>
              )}

              {/* Queued new files */}
              {selectedAfsFiles.length > 0 && (
                <div className="mb-3 space-y-1">
                  <p className="text-xs text-gray-500 text-left mb-1">Queued for upload</p>
                  {selectedAfsFiles.map(({ file, targetPath }, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1 text-sm">
                      <span className="break-all text-gray-700">{targetPath}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAfsFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone / add button */}
              {isEditMode && (
                <>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <span className="text-gray-500">Adding to:</span>
                    <span className="font-medium text-gray-700">/{afsTargetFolder}</span>
                    {afsTargetDir !== "" && (
                      <button
                        type="button"
                        onClick={() => setAfsTargetDir("")}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Reset to root
                      </button>
                    )}
                    <Input
                      aria-label="Target folder path"
                      placeholder="e.g. reports/2024 (leave empty for root)"
                      size="sm"
                      className="max-w-xs"
                      value={afsTargetDir}
                      onValueChange={setAfsTargetDir}
                    />
                  </div>
                  <div
                    className={`flex gap-2 rounded-lg ${isDraggingAfs ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingAfs(true);
                    }}
                    onDragLeave={(e) => {
                      // Ignore moving between elements inside the area
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDraggingAfs(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingAfs(false);
                      getDroppedFiles(e.dataTransfer)
                        .then(queueAfsFiles)
                        .catch((err) => console.error("Could not read the dropped files:", err));
                    }}
                  >
                    <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg text-center" style={{ padding: "0.75rem" }}>
                      <input
                        key="afs-file-input"
                        type="file"
                        multiple={true}
                        ref={afsFileInputRef}
                        onChange={(e) => {
                          queueAfsFiles(Array.from(e.target.files ?? []).map((file) => ({ file, relativePath: file.name })));
                          if (afsFileInputRef.current) afsFileInputRef.current.value = '';
                        }}
                        className="hidden"
                        id="afs-file-upload"
                      />
                      <label htmlFor="afs-file-upload" className="cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">Add files</p>
                          <p className="text-xs text-gray-500">Any type, multiple allowed, or drop files here</p>
                        </div>
                      </label>
                    </div>
                    <div className="flex-1 border-2 border-dashed border-blue-200 rounded-lg text-center" style={{ padding: "0.75rem" }}>
                      <input
                        key="afs-folder-input"
                        type="file"
                        // @ts-ignore – webkitdirectory is not in the TS types but is supported in all modern browsers
                        webkitdirectory=""
                        multiple={true}
                        onChange={(e) => {
                          queueAfsFiles(
                            Array.from(e.target.files ?? []).map((file) => ({
                              file,
                              relativePath: file.webkitRelativePath || file.name,
                            }))
                          );
                          (e.target as HTMLInputElement).value = '';
                        }}
                        className="hidden"
                        id="afs-folder-upload"
                      />
                      <label htmlFor="afs-folder-upload" className="cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-blue-700">Add folder</p>
                          <p className="text-xs text-blue-400">Uploads with structure intact, or drop folders here</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* View-only empty state */}
              {!isEditMode && existingAfsEntries.length === 0 && (
                <p className="text-sm text-gray-400">No AFS files</p>
              )}
            </div>
          </div>
          <div className="md-size-div">
            {state.type !== "" ? (
              <ObjectPropertyEditor
                state={state}
                dispatch={dispatch}
                hiddenPropertyCodes={legacyIlogPropertyCodes}
                currentObjectPermId={objectPermId}
                onSelectedComponentsChange={(propertyCode, permIds) => {
                  // Only track permIds for properties whose objectType belongs to the
                  // component collection — this excludes person-type properties and
                  // prevents updateComponentLocations from trying to set LOCATION on persons.
                  const allProperties = Object.values(state.propertiesSchema).flat();
                  const propertyDef = allProperties.find((p) => p.code === propertyCode);
                  const objectTypeCode = (propertyDef as any)?.objectType;
                  const resolveIsComponentType = (typeCode: string) =>
                    getTypeCategory(objectTypes.data?.find((t) => t.getCode() === typeCode)) === componentCategory;

                  let isComponentType: boolean;
                  if (objectTypeCode && objectTypeCode !== "any") {
                    // A single specific object type is assigned - resolve it directly.
                    isComponentType = resolveIsComponentType(objectTypeCode);
                  } else {
                    // "All" object types are allowed - if the property is restricted to a
                    // specific set of subtypes (the object_subtypes workaround), treat it as
                    // a component property only when every allowed subtype is a component.
                    // With no restriction at all we can't tell what it points at (could be
                    // persons, logbook entries, etc.), so leave it untracked.
                    const subtypesStr = (propertyDef as any)?.metadata?.[OBJECT_SUBTYPES_KEY] as string | undefined;
                    const subtypeCodes = subtypesStr
                      ? subtypesStr.split(",").map((s: string) => s.trim()).filter(Boolean)
                      : [];
                    isComponentType = subtypeCodes.length > 0 && subtypeCodes.every(resolveIsComponentType);
                  }
                  if (!isComponentType) return;
                  setSelectedComponentsByProperty((prev) => ({
                    ...prev,
                    [propertyCode]: permIds,
                  }));
                }}
                currentInstrumentPermId={(openbisSample || newlyCreatedObject)?.getPermId().getPermId()}
                currentSamplePermId={(openbisSample || newlyCreatedObject)?.getPermId().getPermId()}
                isComponent={state.category === componentCategory}
                isReadOnly={mode === "view" && !isEditMode}
              />) : (
              <p className="text-gray-500">
                Please select a type.
              </p>
            )}
          <Divider className="my-4" />
          </div>          
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
                      dispatch({ type: "RESET", payload: objectTemplate });
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

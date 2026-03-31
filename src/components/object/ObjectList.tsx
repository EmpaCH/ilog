import { useMemo, useReducer, useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { useNavigate } from "@tanstack/react-router";
import { useGetObjects } from "../../apis/object/useGetObjects";
import { useDeleteObject } from "../../apis/object/useDeleteObject";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, ObjectRow } from "../shared/list.types";
import {
  objectListLocalReducer,
  EMPTY_OBJECT_LIST_DEFINITION,
} from "./ObjectLocalActions";
import {
  componentCollectionID,
  instrumentCollectionID,
  logbookCollectionID,
  componentCollectionName,
  instrumentCollectionName,
  logbookCollectionName,
} from "../../apis/shared/environment";
import openbis from "@openbis/openbis.esm";
import { getSampleDatasets, getDatasetImageFilenameFromObject } from "../../apis/dataset/datasetAPI";

export const ObjectList = () => {
  const { apiFacade } = useContext(AuthContext);
  const allObjectsResult = useGetObjects();
  const deleteObjectResult = useDeleteObject();
  const navigate = useNavigate();

  const [objects, setObjects] = useState<openbis.Sample[]>([]);
  const [previewImages, setPreviewImages] = useState<{ [permId: string]: string | null }>({});
  const [state, dispatch] = useReducer(objectListLocalReducer,
    EMPTY_OBJECT_LIST_DEFINITION,
  );

  useMemo(() => {
    if (allObjectsResult.status == "success") {
      setObjects(allObjectsResult.data);
    }
  }, [allObjectsResult.status, allObjectsResult.data]);

  // Load preview images for all objects
  useEffect(() => {
    const fetchImages = async () => {
      if (objects.length === 0) return;
      const newPreviewImages: { [permId: string]: string | null } = {};
      // Get session token from apiFacade (same as ObjectCreator)
      const sessionToken = (apiFacade as any)?._private?.sessionToken;
      for (const obj of objects) {
        try {
          // Use apiFacade instead of openbis for session context
          const datasets = await getSampleDatasets(apiFacade, obj.getPermId().getPermId());
          const elnPreviewDataset = datasets.find(ds => ds.getType()?.getCode() === "ELN_PREVIEW");
          if (elnPreviewDataset) {
            const datasetPermId = elnPreviewDataset.getPermId().getPermId();
            // Try to get the filename
            const filename = await getDatasetImageFilenameFromObject(elnPreviewDataset, apiFacade);
            if (filename && sessionToken) {
              // Construct URL as in ObjectCreator
              const encodedFilename = encodeURIComponent(filename);
              const url = `/datastore_server/${datasetPermId}/original/${encodedFilename}?sessionID=${encodeURIComponent(sessionToken)}`;
              newPreviewImages[obj.getPermId().getPermId()] = url;
            } else if (filename) {
              // fallback if no session token
              const encodedFilename = encodeURIComponent(filename);
              newPreviewImages[obj.getPermId().getPermId()] = `/datastore_server/${datasetPermId}/original/${encodedFilename}`;
            } else {
              // fallback to directory
              newPreviewImages[obj.getPermId().getPermId()] = `/datastore_server/${datasetPermId}/original/`;
            }
          } else {
            newPreviewImages[obj.getPermId().getPermId()] = null;
          }
        } catch (e) {
          newPreviewImages[obj.getPermId().getPermId()] = null;
        }
      }
      setPreviewImages(newPreviewImages);
    };
    fetchImages();
  }, [objects, apiFacade]);

  const onDelete = async (
    permId: any,
    code: string,
  ) => {
    // Check if this is a component with a LOCATION (attached to an instrument)
    const objectToDelete = objects.find((obj) => obj.getCode() === code);
    if (objectToDelete) {
      const location = objectToDelete.getProperty("LOCATION");
      if (location && location.trim() !== "") {
        // Find the instrument by matching LOCATION with existing objects
        const instrument = objects.find((obj) => obj.getPermId().getPermId() === location);
        const instrumentDisplay = instrument 
          ? `'${instrument.getProperty("NAME") || instrument.getCode()}'`
          : "an instrument";
        
        handleMessage(
          `Cannot delete '${code}' - it is attached to ${instrumentDisplay}. Please detach it first.`,
          false,
          true
        );
        return;
      }
    }

    await deleteObjectResult.mutateAsync(
      permId as openbis.SamplePermId,
    ).then(() => {
      handleMessage(`Object '${code}' deleted successfully.`, true, true);
    }).catch((e) => {
      handleMessage(e.message.replace(/\s*\([^)]*\)/g, ""), false, true);
    });
  };

  const onEdit = async (
    code: string,
  ) => {
    const object = objects.find((t) => t.getCode() === code);
    if (object) {
      navigate({
        to: `/objects/creator?mode=edit&objectcode=${object.getCode()}`,
      });
    } else {
      handleMessage(`Object with code '${code}' not found.`, false, true);
    }
  };

  const onView = async (
    code: string
  ) => {
    const object = objects.find((t) => t.getCode() === code);
    if (object) {
      navigate({
        to: `/objects/creator?mode=view&objectcode=${object.getCode()}`,
      });
    } else {
      handleMessage(`Object with code '${code}' not found.`, false, true);
    }
  };

  const onHistory = async (
    code: string,
  ) => {
    const object = objects.find((t) => t.getCode() === code);
    if (object) {
      navigate({
        to: `/objects/history?objectcode=${object.getCode()}`,
      });
    } else {
      handleMessage(`Object with code '${code}' not found.`, false, true);
    }
  };

  const handleMessage = (
    msg: string,
    isSuccess: boolean,
    showMsg: boolean,
  ) => {
    dispatch({ type: "SET_DELETION_MESSAGE", payload: msg });
    dispatch({ type: "SET_IS_SUCCESS", payload: isSuccess });
    dispatch({ type: "SET_SHOW_MESSAGE", payload: showMsg });

    setTimeout(() => {
      dispatch({ type: "CLEAR" });
    }, 3000);
  };

  const getCollectionName = (collectionType: string | undefined): string => {
    if (collectionType === instrumentCollectionID) {
      return instrumentCollectionName;
    } else if (collectionType === componentCollectionID) {
      return componentCollectionName;
    } else if (collectionType === logbookCollectionID) {
      return logbookCollectionName;
    }
    return "Unknown";
  };

  const columns: Column[] = [
    {
      key: "preview",
      name: "Preview",
      sorting: false,
      align: "start",
      filterable: false,
    },
    {
      key: "name",
      name: "Name",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "type",
      name: "Type",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "baseType",
      name: "Base Type",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
      filterable: false,
    },
  ];

  const rows: ObjectRow[] = objects.map(
    (obj: openbis.Sample) => {
      const metadata = obj.getType().getMetaData();
      const collectionType = metadata["collectionType"];
      const permId = obj.getPermId().getPermId();

      return {
        permId: obj.getPermId(),
        code: obj.getCode(),
        preview: previewImages[permId] || "",
        name: obj.getProperty("NAME") || obj.getCode(),
        type: obj.getType().getCode(),
        baseType: getCollectionName(collectionType),
      }
    }
  );
 
  return (
    <>
      <h2>Object List</h2>
      <List
        columns={columns}
        rows={rows}
        idColumn="name"
        hiddenCode={true}
        navigatePath="/objects/creator"
        enableHistory={true}
        enableLogbook={true}
        onDelete={onDelete}
        onEdit={onEdit}
        onHistory={onHistory}
        onView={onView}
      />
      <MessageModal
        message={state.deletionMessage}
        isOpen={state.showMessage}
        isSuccess={state.isSuccess}
      />
    </>
  );
}

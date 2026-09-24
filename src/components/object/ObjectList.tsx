import { useMemo, useReducer, useState, useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { useNavigate } from "@tanstack/react-router";
import { useGetIlogObjects } from "../../apis/object/useGetIlogObjects";
import { useGetAllObjects } from "../../apis/object/useGetAllObjects";
import { useDeleteObject } from "../../apis/object/useDeleteObject";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { DeleteReasonModal } from "../shared/deleteReasonModal";
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
import { usePreviewImages } from "../../apis/dataset/useDatasets";

export const ObjectList = () => {
  const { apiFacade } = useContext(AuthContext);
  const allObjectsResult = useGetIlogObjects();
  // LOCATION holds a permId pointing at either an instrument (component
  // attachment) or a room - rooms live outside the iLog collections, so an
  // instance-wide search is needed to resolve names for both.
  const allInstanceObjectsResult = useGetAllObjects();
  const deleteObjectResult = useDeleteObject();
  const navigate = useNavigate();

  const [objects, setObjects] = useState<openbis.Sample[]>([]);
  const [state, dispatch] = useReducer(objectListLocalReducer,
    EMPTY_OBJECT_LIST_DEFINITION,
  );
  const [deleteTarget, setDeleteTarget] = useState<{ permId: any; code: string } | null>(null);

  const sessionToken = (apiFacade as any)?._private?.sessionToken as string | undefined;
  const samplePermIds = objects.map(o => o.getPermId().getPermId());
  const { data: previewImages, isLoaded: imagesLoaded } = usePreviewImages(samplePermIds, sessionToken);

  useMemo(() => {
    if (allObjectsResult.status == "success") {
      setObjects(allObjectsResult.data);
    }
  }, [allObjectsResult.status, allObjectsResult.data]);

  const onDelete = async (
    permId: any,
    code: string,
  ) => {
    // Check if this is a component attached to an instrument (LOCATION can also
    // point at a room, which isn't an "attachment" and shouldn't block deletion).
    const objectToDelete = objects.find((obj) => obj.getCode() === code);
    if (objectToDelete) {
      const location = objectToDelete.getProperty("LOCATION");
      if (location && location.trim() !== "") {
        // `objects` only contains Instruments and Components (see useGetIlogObjects),
        // so a match here can only be an instrument - a room location won't match.
        const instrument = objects.find((obj) => obj.getPermId().getPermId() === location);
        if (instrument) {
          handleMessage(
            `Cannot delete '${code}' - it is attached to '${instrument.getProperty("NAME") || instrument.getCode()}'. Please detach it first.`,
            false,
            true
          );
          return;
        }
      }
    }

    setDeleteTarget({ permId, code });
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;
    const { permId, code } = deleteTarget;
    setDeleteTarget(null);
    await deleteObjectResult.mutateAsync(
      { sampleId: permId as openbis.SamplePermId, reason },
    ).then(() => {
      handleMessage(`Object '${code}' deleted successfully.`, true, true);
    }).catch((e) => {
      handleMessage(e.message.replace(/\s*\([^)]*\)/g, ""), false, true);
    });
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
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

  const locationNamesByPermId = useMemo(() => {
    const map = new Map<string, string>();
    (allInstanceObjectsResult.data ?? []).forEach((obj) => {
      map.set(obj.getPermId().getPermId(), obj.getProperty("NAME") || obj.getCode());
    });
    return map;
  }, [allInstanceObjectsResult.data]);

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
      name: "iLog Type",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "location",
      name: "Location",
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
      const location = obj.getProperty("LOCATION");
      const hasLocation = !!location && location.trim() !== "";

      return {
        permId: obj.getPermId(),
        code: obj.getCode(),
        preview: imagesLoaded ? (previewImages[permId] ?? null) : undefined,
        name: obj.getProperty("NAME") || obj.getCode(),
        type: obj.getType().getCode(),
        baseType: getCollectionName(collectionType),
        location: hasLocation ? (locationNamesByPermId.get(location) ?? location) : "Unknown",
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
      <DeleteReasonModal
        isOpen={deleteTarget !== null}
        itemName={deleteTarget?.code ?? ""}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}

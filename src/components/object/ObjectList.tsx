import { useMemo, useReducer, useState } from "react";
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

export const ObjectList = () => {
  const allObjectsResult = useGetObjects();
  const deleteObjectResult = useDeleteObject();
  const navigate = useNavigate();

  const [objects, setObjects] = useState<openbis.Sample[]>([]);
  const [state, dispatch] = useReducer(objectListLocalReducer,
    EMPTY_OBJECT_LIST_DEFINITION,
  );

  useMemo(() => {
    if (allObjectsResult.status == "success") {
      setObjects(allObjectsResult.data);
    }
  }, [allObjectsResult.status, allObjectsResult.data]);

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
      handleMessage(`'${code}' deleted successfully.`, true, true);
    }).catch((e) => {
      handleMessage(e.message.replace(/\s*\([^)]*\)/g, ""), false, true);
      handleMessage(e.message.replace(/\s*\([^)]*\)/g, ""), false, true);
    });
  };

  const onEdit = async (
    _permId: openbis.EntityTypePermId | openbis.SamplePermId,
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
      key: "name",
      name: "Name",
      sorting: true,
      align: "start",
    },
    {
      key: "code",
      name: "Code",
      sorting: true,
      align: "start",
    },
    {
      key: "type",
      name: "Type",
      sorting: false,
      align: "start",
    },
    {
      key: "collection",
      name: "Collection",
      sorting: false,
      align: "start",
    },
    {
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
    },
  ];

  const rows: ObjectRow[] = objects.map(
    (obj: openbis.Sample) => {
      const metadata = obj.getType().getMetaData();
      const collectionType = metadata["collectionType"];
      
      return {
        permId: obj.getPermId(),
        name: obj.getProperty("NAME") || obj.getCode(),
        code: obj.getCode(),
        type: obj.getType().getCode(),
        collection: getCollectionName(collectionType),
      }
    }
  );
 
  return (
    <>
      <h2>Object List</h2>
      <List
        columns={columns}
        rows={rows}
        defaultSortColumn="name"
        idColumn="code"
        navigatePath="/objects/creator"
        extraTopButtons={[
          {
            label: 'Add dataset',
            onPress: () => navigate({ to: '/objects/datasets/upload' as any }),
          },
        ]}
        enableHistory={true}
        onDelete={onDelete}
        onEdit={onEdit}
        onHistory={onHistory}
      />
      <MessageModal
        message={state.deletionMessage}
        isOpen={state.showMessage}
        isSuccess={state.isSuccess}
      />
    </>
  );
}

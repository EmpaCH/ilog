import { useContext, useMemo, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AuthContext } from "../../context/auth/authContext";
import { getObjects, deleteObject } from "../../apis/object/objectAPI";
import openbis from "@openbis/openbis.esm";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, ObjectRow } from "../shared/list.types";
import {
  objectListLocalReducer,
  EMPTY_OBJECT_LIST_DEFINITION,
} from "./ObjectLocalActions";

export const ObjectList = () => {
  const { apiFacade } = useContext(AuthContext);
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(objectListLocalReducer,
    EMPTY_OBJECT_LIST_DEFINITION,
  );

  const res = useQuery({
    queryKey: ["getObjects"],
    queryFn: async () => {
      return await getObjects(apiFacade);
    },
  });

  const objects = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  const onDelete = async (
    permId: any,
    code: string,
  ) => {
    await deleteObject(
      apiFacade,
      permId as openbis.SamplePermId,
    ).then(() => {
      res.refetch();
      handleMessage(`'${code}' deleted successfully.`, true, true);
    }).catch((e) => {
      handleMessage(e.message.replace(/\s*\([^)]*\)/g, ""), false, true);
    });
  };

  const onEdit = async (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
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

  const columns: Column[] = [
    {
      key: "name",
      name: "Name",
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
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
    },
  ];

  const rows: ObjectRow[] = objects.map(
    (obj: openbis.Sample) => {
      return {
        permId: obj.getPermId(),
        name: obj.getCode(),
        type: obj.getType().getCode(),
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
        navigatePath="/objects/creator"
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

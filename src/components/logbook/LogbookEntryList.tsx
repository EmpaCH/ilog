import {
  useMemo,
  useReducer,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { logbookCollectionID } from "../../apis/shared/environment";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import {
  Column,
  LogbookEntryRow,
} from "../shared/list.types";
import {
  logbookEntryListLocalReducer,
  EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION,
} from "./LogbookEntryLocalActions";
import { useGetAllLogbookEntries } from "../../apis/logbook/useGetAllLogbookEntries";
import { useDeleteLogbookEntry } from "../../apis/logbook/useDeleteLogbookEntry";
import { useGetObjectsByPermIds } from "../../apis/object/useGetObjectsByPermIds";
import openbis from "@openbis/openbis.esm";

export const LogbookEntryList = () => {
  const navigate = useNavigate();
  const deletion = useDeleteLogbookEntry();
  const res = useGetAllLogbookEntries();
  const logbookEntries = res.data ? [...res.data] : [];

  const [state, dispatch] = useReducer(
    logbookEntryListLocalReducer,
    EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION,
  );

  // Fetch component objects for display (map permId -> name)
  // Use explicit parents: pick the first parent that is NOT a logbook entry
  const componentPermIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of logbookEntries) {
      const parents = entry.getParents && entry.getParents();
      if (parents && parents.length > 0) {
        for (const p of parents) {
          try {
            const perm = p.getPermId().getPermId();
            const isLogbook = p.getProperty && p.getProperty(logbookCollectionID);
            if (!isLogbook) {
              ids.add(perm);
              break; // only need one per entry
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
    return Array.from(ids);
  }, [logbookEntries]);

  const componentsQuery = useGetObjectsByPermIds(componentPermIds);

  const onDelete = async (
    permId: openbis.SamplePermId,
    name: string,
  ) => {
    // Prevent deletion if this entry is parent of another logbook entry
    try {
      const permIdStr = permId.getPermId();
      const hasChildren = logbookEntries.some((entry) => {
        const parents = entry.getParents && entry.getParents();
        return parents && parents.some((p: any) => {
          try {
            return p.getPermId().getPermId() === permIdStr;
          } catch (e) {
            return false;
          }
        });
      });

      if (hasChildren) {
        handleMessage("Cannot delete parent log entry: it is referenced by other entries.", false, true);
        return;
      }

      await deletion.mutateAsync(permId);
      handleMessage(`'${name}' deleted successfully.`, true, true);
    } catch (err: any) {
      handleMessage(err.message.replace(/\s*\([^)]*\)/g, ""), false, true);
    }
  };

  const onEdit = (
    code: string,
  ) => {
    navigate({
      to: `/logbook/creator?mode=edit&logbookEntryCode=${code}`,
    });
  };

  const onView = async (
    code: string,
  ) => {
    navigate({
      to: `/logbook/creator?mode=view&logbookEntryCode=${code}`,
    });
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

  const btnsColumnName = "btns";
  const columns: Column[] = [
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
      key: "object",
      name: "Parent Object",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "parentEntry",
      name: "Parent Entry",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "validFrom",
      name: "Valid From",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "responsible",
      name: "Responsible",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: btnsColumnName,
      name: "",
      sorting: false,
      align: "end",
      filterable: false,
    },
  ];

  const logbookRows: LogbookEntryRow[] = logbookEntries.map(
    (entry: openbis.Sample) => {
      // Log entry name: use NAME property, fallback to DESCRIPTION or code
      const name = entry.getProperty("NAME") || entry.getProperty("DESCRIPTION") || entry.getCode();
      // Determine parents: object parent (first non-logbook parent) and parent logbook entry (first logbook parent)
      const parents = entry.getParents();
      let parentEntry = "";
      let compPermId = "";
      if (parents && parents.length > 0) {
        for (const p of parents) {
          try {
            const perm = p.getPermId().getPermId();
            const isLogbookEntry = p.getExperiment().getCode() === logbookCollectionID;
            if (isLogbookEntry && !parentEntry) {
              parentEntry = p.getProperty("NAME") || p.getCode() || "";
            } else if (!isLogbookEntry && !compPermId) {
              compPermId = perm;
            }
            if (parentEntry && compPermId) break;
          } catch (e) {
            // ignore
          }
        }
      }

      return {
        permId: entry.getPermId(),
        code: entry.getCode(),
        name,
        type: entry.getType().getDescription(),
        object: (componentsQuery.data && componentsQuery.data[compPermId]) ? componentsQuery.data[compPermId] : compPermId,
        parentEntry,
        validFrom: (entry.getProperty("VALID_FROM") && typeof entry.getProperty("VALID_FROM") === "string" && entry.getProperty("VALID_FROM").includes("T"))
          ? entry.getProperty("VALID_FROM").replace("T", " ").split(".")[0]
          : "",
        responsible: entry.getRegistrator().getPermId().getPermId() || "",
        color: entry.getType().getMetaData()["color"],
      }
    }
  );

  const rows: LogbookEntryRow[] = [...logbookRows];

  return (
    <>
      <h2>Logbook Entry List</h2>
      <List
        columns={columns}
        rows={rows}
        idColumn="name"
        hiddenCode={true}
        defaultSortColumn="validFrom"
        defaultSortDirection="descending"
        navigatePath="/logbook/creator"
        onDelete={onDelete}
        onEdit={onEdit}
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

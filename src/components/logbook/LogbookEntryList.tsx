import { useContext, useMemo, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AuthContext } from "../../context/auth/authContext";
import { getAllLogbookEntries, deleteLogbookEntry } from "../../apis/logbook/LogbookEntryAPI";
import { getObjectByPermId } from "../../apis/object/objectAPI";
import { getCurrentLabID } from "../../apis/shared/environment";
import openbis from "@openbis/openbis.esm";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, LogbookEntryRow } from "../shared/list.types";
import {
  logbookEntryListLocalReducer,
  EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION,
} from "./LogbookEntryLocalActions";
import { LOGBOOK_ENTRY_TYPES } from "../../apis/shared/types";

export const LogbookEntryList = () => {
  const { apiFacade } = useContext(AuthContext);
  const navigate = useNavigate();
  const labID = getCurrentLabID();

  const [state, dispatch] = useReducer(logbookEntryListLocalReducer,
    EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION,
  );

  const res = useQuery({
    queryKey: ["getLogbookEntries", labID],
    queryFn: async () => {
      return getAllLogbookEntries(apiFacade, labID);
    },
  });

  const logbookEntries = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  // Fetch component objects for display (map permId -> name)
  const componentPermIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of logbookEntries) {
      const pid = entry.getProperty("COMPONENT");
      if (pid) ids.add(pid);
    }
    return Array.from(ids);
  }, [logbookEntries]);

  const componentsQuery = useQuery({
    queryKey: ["getObjectsByPermIds", componentPermIds.join(",")],
    queryFn: async () => {
      if (!componentPermIds || componentPermIds.length === 0) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      await Promise.all(componentPermIds.map(async (permId) => {
        try {
          const obj = await getObjectByPermId(apiFacade, permId);
          if (obj) {
            map[permId] = obj.getProperty("NAME") || obj.getCode();
          }
        } catch (e) {
          // ignore
        }
      }));
      return map;
    },
    enabled: componentPermIds.length > 0 && !!apiFacade,
  });

  const onDelete = async (
    permId: any,
    code: string,
  ) => {
    await deleteLogbookEntry(
      apiFacade,
      permId as openbis.SamplePermId,
    ).then(() => {
      res.refetch();
      handleMessage(`'${code}' deleted successfully.`, true, true);
    }).catch((e) => {
      handleMessage(e.message.replace(/\s*\([^)]*\)/g, ""), false, true);
    });
  };

  const onEdit = (
    code: string,
  ) => {
    navigate({
      to: `/logbook/creator?mode=edit&logbookEntryCode=${code}`,
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
      name: "Object",
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

  const colorMapping: Record<string, string> = {
    "CHANGE_PROPERTIES": "rgba(173, 216, 230, 0.5)",                // light blue
    "MAINTENANCE_LOGENTRY": "rgba(144, 238, 144, 0.5)",             // light green
    "ERRORS_AND_PROBLEMS_LOGENTRY": "rgba(255, 182, 193, 0.5)",     // light red (pinkish)
    "CALIBRATION_OPTIMIZATION_LOGENTRY": "rgba(255, 165, 0, 0.5)",  // light orange
    "CRYOGEN_FILLING_LOGBENTRY": "rgba(216, 191, 216, 0.5)",        // light purple
    "DEGASING_LOGENTRY": "rgba(255, 192, 203, 0.5)",                // light pink
    "CLEANING_LOGENTRY": "rgba(255, 255, 224, 0.5)",                // light yellow
    "BAKEOUT_LOGENTRY": "rgba(222, 184, 135, 0.5)",                 // light brown
    "COMMENT_LOGENTRY": "rgba(211, 211, 211, 0.5)",                 // light gray
    "OTHER_LOGENTRY": "rgba(211, 211, 211, 0.5)",                   // light gray
  };

  const logbookRows: LogbookEntryRow[] = logbookEntries.map(
    (entry: openbis.Sample) => {
      // Log entry name: use NAME property, fallback to DESCRIPTION or code
      const name = entry.getProperty("NAME") || entry.getProperty("DESCRIPTION") || entry.getCode();
      // Parent object: get first parent's name
      const parentIds = entry.getParents();
      const parentEntry = parentIds && parentIds.length > 0 ? parentIds[0].getProperty("NAME") || "" : "";
      // Log entry type: map code to description
      const typeCode = entry.getType()?.getCode() || "";
      const type = Object.values(LOGBOOK_ENTRY_TYPES).find(t => t.code === typeCode)?.description || typeCode;
      const compPermId = entry.getProperty("COMPONENT") || "";

      return {
        permId: entry.getPermId(),
        code: entry.getCode(),
        name,
        type,
        object: (componentsQuery.data && componentsQuery.data[compPermId]) ? componentsQuery.data[compPermId] : compPermId,
        parentEntry,
        validFrom: (entry.getProperty("VALID_FROM") && typeof entry.getProperty("VALID_FROM") === "string" && entry.getProperty("VALID_FROM").includes("T"))
          ? entry.getProperty("VALID_FROM").replace("T", " ").split(".")[0]
          : "",
        responsible: entry.getRegistrator().getPermId().getPermId() || "",
        color: colorMapping[typeCode] || "rgba(211, 211, 211, 0.5)",
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
        idColumn="code"
        hiddenCode={true}
        defaultSortColumn="validFrom"
        defaultSortDirection="descending"
        navigatePath="/logbook/creator"
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <MessageModal
        message={state.deletionMessage}
        isOpen={state.showMessage}
        isSuccess={state.isSuccess}
      />
    </>
  );
}

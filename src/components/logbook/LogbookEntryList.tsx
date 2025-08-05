import { useContext, useMemo, useReducer, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AuthContext } from "../../context/auth/authContext";
import { getAllLogbookEntries, deleteLogbookEntry } from "../../apis/logbook/LogbookEntryAPI";
import openbis from "@openbis/openbis.esm";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, LogbookEntryRow } from "../shared/list.types";
import {
  logbookEntryListLocalReducer,
  EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION,
} from "./LogbookEntryLocalActions";
import { useGetObjects } from "../../apis/object/useGetObjects";
import { GroupedHistory, MultiObjectGroupedHistory, ObjectDefinition } from "../../apis/object/commonObject";
import { reconstructHistory } from "../../apis/object/helpersObjectAPI";
import { LOGBOOK_ENTRY_TYPES } from "../../apis/shared/types";
import { parseZonedDateTime } from "@internationalized/date";


export const LogbookEntryList = () => {
  const { apiFacade } = useContext(AuthContext);
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(logbookEntryListLocalReducer,
    EMPTY_LOGBOOK_ENTRY_LIST_DEFINITION,
  );

  // Fetch manual logbook entries (objects)
  const res = useQuery({
    queryKey: ["getLogbookEntries"],
    queryFn: async () => {
      return getAllLogbookEntries(apiFacade);
    },
  });

  const logbookEntries = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res.data]);

  // Get change events as from openbis changelog
  const allObjectsResult = useGetObjects();
  const [history, setHistory] = useState<MultiObjectGroupedHistory>({});

  useMemo(() => {
    if (allObjectsResult.status === "success" && allObjectsResult.data) {
      const allObjectsResultRes = allObjectsResult.data as openbis.Sample[];

      const allReconstructedHistory: MultiObjectGroupedHistory = {};
      allObjectsResultRes.forEach((entry) => {
        const reconstructedHistory: GroupedHistory = {};
        const objectHistory = entry.getPropertiesHistory() as openbis.PropertyHistoryEntry[];
        const historyEntries = reconstructHistory(objectHistory);

        for (const timestamp of Object.keys(historyEntries)) {
          // Create fake logbook object
          const logbookHistoryEntry = {
            id: entry.getIdentifier(),
            code: `CHANGE_${entry.getCode()}`,
            type: `Auto_LBEntry_${entry.getCode()}`,
            propertiesSchema: {},
            propertyValues: {
              ...entry.getProperties(),
              DESCRIPTION: ["Description of automatic change"],
              INVOLVEDEQUIPMENT: ["inst1, inst2"],
              RESPONSIBLE: ["Automatic"],
            } as any,
            validFrom: parseZonedDateTime(timestamp),
          } as ObjectDefinition;

        //   const objectDefinition = convertOpenBISPropertyHistoryEntryListToObjectDefinition(
        //     entry,
        //     historyEntries[timestamp],
        //   );

        //   const objectTypeTemplate: ObjectTypeDefinition = convertOpenBISSampleTypeToObjectTypeDefinition(
        //     entry.getType()
        //   );
        //   const resolvedTypes = Object.entries(objectTypeTemplate.propertyTypes).map(
        //     ([group, propertyTypesGroup]) => {
        //       return [group, propertyTypesGroup];
        //     }
        //   );
        //   objectDefinition.propertiesSchema = Object.fromEntries(resolvedTypes) as PropertyTypesSchema;
          reconstructedHistory[timestamp] = logbookHistoryEntry;
        }
        allReconstructedHistory[entry.getCode()] = reconstructedHistory;
      });
      setHistory(allReconstructedHistory);
    }
  }, [allObjectsResult.status, allObjectsResult.data]);

  // Show loading state while data is being fetched
  if (res.isLoading || allObjectsResult.isLoading) {
    return <div>Loading logbook entries...</div>;
  }

  // Show error state if either query fails
  if (res.isError) {
    return <div>Error loading logbook entries: {res.error?.message}</div>;
  }

  if (allObjectsResult.isError) {
    return <div>Error loading objects: {allObjectsResult.error?.message}</div>;
  }

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

  const onEdit = async (
    _permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
  ) => {
    const logbookEntry = logbookEntries.find((t) => t.getCode() === code);
    if (logbookEntry) {
      navigate({
        to: `/logbook/creator?mode=edit&logbookEntryCode=${encodeURIComponent(logbookEntry.getCode())}`,
      });
    } else {
      handleMessage(`Logbook entry with code '${code}' not found.`, false, true);
    }
  };

  const onHistory = async (
    code: string,
  ) => {
    navigate({
      to: `/objects/history?objectcode=${encodeURIComponent(code)}`,
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
      key: "responsible",
      name: "Responsible",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "description",
      name: "Description",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "involvedequipment",
      name: "Involved Equipment",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "componentCode",
      name: "Component Code",
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
      key: "validFrom",
      name: "Valid From",
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

  // Define color mapping for logbook entry types dependent on LOGBOOK_ENTRY_TYPES
  const colorMapping: Record<string, string> = Object.fromEntries(
    Object.entries(LOGBOOK_ENTRY_TYPES)
      .filter(([_, entryType]) => entryType.code !== undefined)
      .map(([_, entryType]) => [
        entryType.code,
        entryType.color || "rgba(211, 211, 211, 0.5)", // Default to light gray if no color is defined
      ])
  );

  const historyType = "CHANGE_PROPERTIES";
  colorMapping[historyType] = "rgba(150, 150, 150, 0.5)"; // Default color for history entries

  const logbookRows: LogbookEntryRow[] = logbookEntries.map(
    (entry: openbis.Sample) => {
      return {
        permId: entry.getPermId(),
        name: entry.getCode() || "",
        responsible: entry.getProperty("RESPONSIBLE") || "",
        description: entry.getProperty("DESCRIPTION") || "",
        involvedEquipment: entry.getProperty("INVOLVEDEQUIPMENT") || "",
        componentCode: entry.getProperty("COMPONENT") || "",
        type: entry.getType()?.getCode() || "",
        validFrom: (entry.getProperty("VALID_FROM") && typeof entry.getProperty("VALID_FROM") === "string" && entry.getProperty("VALID_FROM").includes("T")) ? entry.getProperty("VALID_FROM").replace("T", " ").split(".")[0]
        : "",
        color: colorMapping[entry.getType()?.getCode()] || "rgba(211, 211, 211, 0.5)", // light gray,
      }
    }
  );

  // Transform History to table rows
  const historyRows: LogbookEntryRow[] = Object.entries(history).flatMap(([objectCode, objectHistory]) => {
    return Object.entries(objectHistory).flatMap(([timestamp, entry]) => {
      // Create fake unique permId from code and timestamp
      const uniqueKey = `${objectCode}-${timestamp}`;
      // Create a new object with the desired properties
      // and the fake permId
      const permId = new openbis.SamplePermId(uniqueKey);
      return [{
        permId: permId,
        name: "-",
        responsible: entry.propertyValues["RESPONSIBLE"][0] || "",
        description: entry.propertyValues["DESCRIPTION"][0] || "",
        involvedEquipment: entry.propertyValues["INVOLVEDEQUIPMENT"][0] || "",
        componentCode: objectCode,       
        type: historyType,
        validFrom: (typeof timestamp === "string" && timestamp.includes("T") && timestamp.includes("."))
          ? timestamp.replace("T", " ").split(".")[0]
          : "N/A",
        color: colorMapping[historyType] || "rgba(211, 211, 211, 0.5)", // light gray,
        enableModification: false,
      }];
    });
  });

  // Merge logbook entries and history rows
  const rows: LogbookEntryRow[] = [...logbookRows, ...historyRows];


  return (
    <>
      <h2>Logbook Entry List</h2>
      <List
        columns={columns}
        rows={rows}
        defaultSortColumn="validFrom"
        defaultSortDirection="descending"
        navigatePath="/logbook/creator"
        // enableHistory={true}
        onDelete={onDelete}
        idColumn="name"
        onEdit={(permId, name) => onEdit(permId, name)}
        historyColumn="componentCode"
        enableHistory={true}
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

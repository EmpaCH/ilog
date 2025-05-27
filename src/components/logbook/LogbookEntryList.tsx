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
import { convertOpenBISPropertyHistoryEntryListToObjectDefinition, reconstructHistory } from "../../apis/object/helpersObjectAPI";
import { convertOpenBISSampleTypeToObjectTypeDefinition, ObjectTypeDefinition, PropertyTypesSchema } from "../../apis/type/commonType";
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
  }, [res]);

  // Get change events as from openbis changelog
  const allObjectsResult = useGetObjects();
  const [history, setHistory] = useState<MultiObjectGroupedHistory>({});

  useMemo(() => {
    if (allObjectsResult.status === "success") {
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
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
  ) => {
    const logbookEntry = logbookEntries.find((t) => t.getCode() === code);
    if (logbookEntry) {
      navigate({
        to: `/logbook/creator?mode=edit&entrycode=${logbookEntry.getCode()}`,
      });
    } else {
      handleMessage(`Logbook entry with code '${code}' not found.`, false, true);
    }
  };

  const onHistory = async (
    code: string,
  ) => {
    const logbookEntry = logbookEntries.find((t) => t.getCode() === code);
    if (logbookEntry) {
      navigate({
        to: `/logbook/history?entrycode=${logbookEntry.getCode()}`,
      });
    } else {
      handleMessage(`Logbook entry with code '${code}' not found.`, false, true);
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

    // permId: openbis.SamplePermId;
    // description: string;
    // involvedEquip: string[];
    // componentCode: string;
    // name: string;
    // type: string;
    // validFrom: string;
    // maintenance: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "MAINTENANCE_LOGENTRY", generatedCodePrefix: "MAINTENANCELOG", description: "Maintenance Logbook Entry" },
    // errorsAndProblems: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "ERRORS_AND_PROBLEMS_LOGENTRY", generatedCodePrefix: "ERRORSANDPROBLEMSLOG", description: "Errors and Problems Logbook Entry" },
    // calibrationOptimization: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "CALIBRATION_OPTIMIZATION_LOGENTRY", generatedCodePrefix: "CALIBRATIONOPTIMIZATIONLOG", description: "Calibration and Optimization Logbook Entry" },
    // cryogenFilling: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "CRYOGEN_FILLING_LOGENTRY", generatedCodePrefix: "CRYOGENFILLINGLOG", description: "Cryogen Filling Logbook Entry" },
    // degasing: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "DEGASING_LOGENTRY", generatedCodePrefix: "DEGASINGLOG", description: "Degasing Logbook Entry" },
    // cleaning: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "CLEANING_LOGENTRY", generatedCodePrefix: "CLEANINGLOG", description: "Cleaning Logbook Entry" },
    // bakeout: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "BAKEOUT_LOGENTRY", generatedCodePrefix: "BAKEOUTLOG", description: "Bakeout Logbook Entry" },
    // comment: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "COMMENT_LOGENTRY", generatedCodePrefix: "COMMENTLOG", description: "Comment Logbook Entry" },
    // other: { ...LOGBOOK_ENTRY_TYPE_DEFINITION, code: "OTHER_LOGENTRY", generatedCodePrefix: "OTHERLOG", description: "Other Logbook Entry" },

  const colorMapping: Record<string, string> = {
    "CHANGE_PROPERTIES": "rgba(173, 216, 230, 0.5)", // light blue
    "MAINTENANCE_LOGENTRY": "rgba(144, 238, 144, 0.5)", // light green
    "ERRORS_AND_PROBLEMS_LOGENTRY": "rgba(255, 182, 193, 0.5)", // light red (pinkish)
    "CALIBRATION_OPTIMIZATION_LOGENTRY": "rgba(255, 165, 0, 0.5)", // light orange
    "CRYOGEN_FILLING_LOGBENTRY": "rgba(216, 191, 216, 0.5)", // light purple
    "DEGASING_LOGENTRY": "rgba(255, 192, 203, 0.5)", // light pink
    "CLEANING_LOGENTRY": "rgba(255, 255, 224, 0.5)", // light yellow
    "BAKEOUT_LOGENTRY": "rgba(222, 184, 135, 0.5)", // light brown
    "COMMENT_LOGENTRY": "rgba(211, 211, 211, 0.5)", // light gray
    "OTHER_LOGENTRY": "rgba(211, 211, 211, 0.5)", // light gray
  };

  const historyType = "CHANGE_PROPERTIES";

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

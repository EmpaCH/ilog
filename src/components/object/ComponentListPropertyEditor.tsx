import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useGetObjectByPermId } from "../../apis/object/useGetObjectByPermId";
import { useGetAllObjects } from "../../apis/object/useGetAllObjects";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Input,
  Selection,
  SortDescriptor,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Textarea,
} from "@heroui/react";
import ChevronDownIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import openbis from "@openbis/openbis.esm";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { usePreviewImages } from "../../apis/dataset/useDatasets";
import { logbookCollectionID } from "../../apis/shared/environment";

interface ComponentListPropertyEditorProps {
  dispatch: React.Dispatch<any>;
  objectType?: string;
  multivalued?: boolean;
  value?: string | string[] | any;
  currentObjectCode?: string;
  onSelectedComponentsChange?: (permIds: string[]) => void;
  currentInstrumentPermId?: string;
  isReadOnly?: boolean;
  logentries?: any[]; // If provided, use as table data and omit preview column
  onlyIlog?: boolean; // If true, only show objects with "ilog:true" in their metadata
  onlyLogbook?: boolean; // If true, only show logbook entries
}

export const ComponentListPropertyEditor: React.FC<ComponentListPropertyEditorProps> = ({
  dispatch,
  objectType,
  multivalued,
  value,
  currentObjectCode,
  onSelectedComponentsChange,
  currentInstrumentPermId,
  isReadOnly,
  logentries,
  onlyIlog,
  onlyLogbook: _onlyLogbook,
}) => {
  const { apiFacade } = useContext(AuthContext);
  // Always use the single cached getAll query — getIlogObjects and getObjectsOfType
  // both perform the same full searchSamples request anyway and only filter client-side.
  // Calling a different hook conditionally violates Rules of Hooks and causes the
  // TanStack Query subscription to return undefined even when data is cached.
  const getObjectsResult = useGetAllObjects();
  const lastDispatchedRef = useRef<string>('');
  const hasInitializedRef = useRef<boolean>(false);
  const lastValueRef = useRef<any>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [allComponents, setAllComponents] = useState<openbis.Sample[]>([]);
  const [components, setComponents] = useState<openbis.Sample[]>([]);
  const [storedCurrentObjectCode, setStoredCurrentObjectCode] = useState<string | undefined>(currentObjectCode);

  const sessionToken = (apiFacade as any)?._private?.sessionToken as string | undefined;
  // Limit preview image fetches to the first 20 visible rows to avoid
  // launching hundreds of parallel requests when the table has many objects.
  const componentPermIds = useMemo(
    () => (logentries ? [] : components.slice(0, 20).map(c => c.getPermId().getPermId())),
    [components, logentries]
  );
  const { data: previewImages } = usePreviewImages(componentPermIds, sessionToken);
  
  // Remember the first non-empty currentObjectCode provided by the parent
  useEffect(() => {
    if (currentObjectCode && currentObjectCode !== storedCurrentObjectCode) {
      setStoredCurrentObjectCode(currentObjectCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentObjectCode]);

  // Track missing selected permIds (not in allComponents)
  const selectedPermIdsFromValue = useMemo(() => {
    if (!value) return [];
    // A multi-value property stored by openBIS may come back as a comma-separated
    // string (e.g. "permId1,permId2") or as an array whose elements are themselves
    // comma-separated strings. Normalise to a flat array of individual permIds.
    const toPermIds = (v: any): string[] => {
      if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };
    if (Array.isArray(value)) return value.flatMap(toPermIds);
    return toPermIds(value);
  }, [value]);

  // Find selected permIds not present in allComponents
  const missingSelectedPermIds = useMemo(() => {
    const allPermIds = new Set(allComponents.map(c => c.getPermId().getPermId()));
    return selectedPermIdsFromValue.filter(permId => !allPermIds.has(permId));
  }, [allComponents, selectedPermIdsFromValue]);

  // Fetch missing selected objects (only first, since single select)
  const missingObjectQuery = useGetObjectByPermId(missingSelectedPermIds.length > 0 ? missingSelectedPermIds[0] : undefined);
  const [componentTypes, setComponentTypes] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<Selection>(new Set([]));
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  const getSelectedCodes = (): string[] => {
    if (selectedKeys == "all") {
      return components.map(component => component.getCode());
    }
    const selectedPerms = Array.from(selectedKeys).map(k => k.valueOf() as string);
    return selectedPerms.map(permId => {
      const comp = components.find(c => c.getPermId().getPermId() === permId);
      return comp ? comp.getCode() : "";
    }).filter(code => code !== "");
  };

  const getSelectedPermIds = (): string[] => {
    if (selectedKeys == "all") return components.map(c => c.getPermId().getPermId());
    return Array.from(selectedKeys).map(k => k.valueOf() as string);
  };

  useEffect(() => {
    if (logentries) {
      // If editing a log entry, exclude the current entry code from the list
      let filteredLogEntries = logentries;
      if (storedCurrentObjectCode) {
        filteredLogEntries = logentries.filter((entry) => entry.getCode() !== storedCurrentObjectCode);
      }
      setAllComponents(filteredLogEntries);
      setComponents(filteredLogEntries);
      const componentTypes = filteredLogEntries.map((entry) => entry.getType().getCode());
      setComponentTypes([...new Set(componentTypes)]);
      return;
    }
    if (getObjectsResult.status === "success") {
      let filteredData = getObjectsResult.data;
      // Apply onlyIlog filter
      if (onlyIlog) {
        filteredData = filteredData.filter(
          (s) => s.getType().getMetaData()?.["ilog"] === "true"
        );
      }
      // Apply objectType filter
      if (objectType && objectType !== "any") {
        filteredData = filteredData.filter(
          (s) => s.getType().getCode() === objectType
        );
      }
      if (storedCurrentObjectCode) {
        filteredData = filteredData.filter((component) => 
          component.getCode() !== storedCurrentObjectCode
        );
      }
      // Filter based on LOCATION property — only when this editor is tied to a
      // specific instrument. Without an instrument context, show all objects.
      if (currentInstrumentPermId) {
        filteredData = filteredData.filter((component) => {
          const location = component.getProperty("LOCATION");
          const hasNoLocation = !location || location === "" || location === "-";
          return hasNoLocation || location === currentInstrumentPermId;
        });
      }
      setAllComponents(filteredData);
      setComponents(filteredData);
      const componentTypes = filteredData.map((component) => {
        return component.getType().getCode();
      });
      setComponentTypes([...new Set(componentTypes)]);
    }
  }, [getObjectsResult.status, getObjectsResult.data, objectType, storedCurrentObjectCode, currentInstrumentPermId, logentries]);

  // Separately, additively merge a missing selected object into allComponents.
  // Keeping this decoupled prevents an oscillation loop: if we merged and removed
  // the object inside the same effect that depends on missingObjectQuery.data, then
  // the merge would clear missingSelectedPermIds → disable the query → data becomes
  // undefined → effect re-runs without the object → missingSelectedPermIds is
  // non-empty again → instant cache hit → infinite cycle.
  useEffect(() => {
    if (!missingObjectQuery.data) return;
    const missingPermId = missingObjectQuery.data.getPermId().getPermId();
    setAllComponents((prev) => {
      if (prev.some((c) => c.getPermId().getPermId() === missingPermId)) return prev;
      return [...prev, missingObjectQuery.data!];
    });
    setComponentTypes((prev) => {
      const typeCode = missingObjectQuery.data!.getType().getCode();
      if (prev.includes(typeCode)) return prev;
      return [...prev, typeCode];
    });
  }, [missingObjectQuery.data]);

  useMemo(() => {
    if (allComponents.length === 0) return;
    let filteredComponents = [...allComponents];
    if (isReadOnly) {
      // In read-only mode always constrain to the selected value(s).
      // Split comma-separated strings the same way selectedPermIdsFromValue does.
      const toPermIds = (v: any): string[] => {
        if (typeof v === 'string') return v.split(',').map((s: string) => s.trim()).filter(Boolean);
        return [];
      };
      const selectedPermIds = Array.isArray(value)
        ? value.flatMap(toPermIds)
        : value ? toPermIds(value) : [];
      filteredComponents = filteredComponents.filter((component) =>
        selectedPermIds.includes(component.getPermId().getPermId())
      );
    } else {
      if (codeFilter) {
        filteredComponents = filteredComponents.filter((component) => {
          const name = component.getProperty("NAME") || component.getCode();
          return name.toLowerCase().includes(codeFilter.toLowerCase());
        });
      }
      if ((!objectType || objectType === "any") && typeFilter !== "all" && Array.from(typeFilter).length > 0) {
        const selectedTypes = Array.from(typeFilter).map(String);
        filteredComponents = filteredComponents.filter((component) =>
          selectedTypes.includes(component.getType().getCode())
        );
      }
      // Pin selected items to the top so they are always visible
      if (selectedKeys !== "all") {
        const selectedSet = new Set(Array.from(selectedKeys).map(k => k.valueOf() as string));
        if (selectedSet.size > 0) {
          const sel = filteredComponents.filter(c => selectedSet.has(c.getPermId().getPermId()));
          const unsel = filteredComponents.filter(c => !selectedSet.has(c.getPermId().getPermId()));
          filteredComponents = [...sel, ...unsel];
        }
      }
    }
    setComponents(filteredComponents);
  }, [codeFilter, typeFilter, objectType, componentTypes, allComponents, isReadOnly, value, selectedKeys]);

  const selectedPermIds = useMemo(() => {
    return getSelectedPermIds();
  }, [selectedKeys, components]);

  useEffect(() => {
    const currentValue = JSON.stringify(selectedPermIds);
    if (lastDispatchedRef.current === currentValue) {
      return;
    }
    // Block ALL dispatches until the selection has been fully initialized from
    // the value prop. Dispatching a partial selection (e.g. first match found
    // before second is available) would overwrite state with the incomplete list,
    // making value permanently shrink to that partial set.
    if (!hasInitializedRef.current) {
      return;
    }
    dispatch(selectedPermIds);
    onSelectedComponentsChange?.(selectedPermIds);
    lastDispatchedRef.current = currentValue;
  }, [selectedPermIds, dispatch, onSelectedComponentsChange]);

  useEffect(() => {
    const currentValueString = JSON.stringify(value);
    if (lastValueRef.current === currentValueString && hasInitializedRef.current) {
      return;
    }
    // Create normalized value array — split comma-separated strings the same way
    // selectedPermIdsFromValue does, as a safety net for values that come through
    // as comma-separated strings rather than proper arrays.
    const toPermIds = (v: any): string[] => {
      if (typeof v === 'string') return v.split(',').map((s: string) => s.trim()).filter(Boolean);
      return [];
    };
    const valueArray = Array.isArray(value) ? value.flatMap(toPermIds) : value ? toPermIds(value) : [];
    // If there is no value to select, clear selection
    if (valueArray.length === 0) {
      setSelectedKeys(new Set());
      lastValueRef.current = currentValueString;
      hasInitializedRef.current = true;
      return;
    }

    // Try to find matching components for each permId
    const matchingPermIds = new Set<string>();
    for (const val of valueArray) {
      const matchingComponent = components.find(component => component.getPermId().getPermId() === val);
      if (matchingComponent) matchingPermIds.add(matchingComponent.getPermId().getPermId());
    }

    // If we found no matching components, check if missingObjectQuery has the data
    // (it will have been injected into allComponents by the getObjectsResult effect).
    // Do NOT mutate allComponents here — the getObjectsResult effect already handles
    // injection of missingObjectQuery.data, so mutating here races with it and causes duplicates.
    if (matchingPermIds.size === 0 && missingObjectQuery.data) {
      const mo = missingObjectQuery.data;
      if (mo && valueArray.includes(mo.getPermId().getPermId())) {
        matchingPermIds.add(mo.getPermId().getPermId());
      }
    }

    setSelectedKeys(matchingPermIds);
    // Only mark as fully initialized when ALL values have been resolved into
    // matching components. If value is non-empty but not everything matched yet,
    // keep hasInitializedRef false so this effect re-runs when components changes.
    const fullyResolved = valueArray.length === 0 || matchingPermIds.size >= valueArray.length;
    if (fullyResolved) {
      lastValueRef.current = currentValueString;
      hasInitializedRef.current = true;
    }
  }, [value, components, missingObjectQuery.data, allComponents]);

  const sortComponents = (descriptor: SortDescriptor) => {
    const sortedComponents = [...components].sort((a, b) => {
      let first: string;
      let second: string;

      if (descriptor.column === "code") {
        first = a.getCode();
        second = b.getCode();
      } else if (descriptor.column === "name") {
        first = a.getProperty("NAME") || a.getCode();
        second = b.getProperty("NAME") || b.getCode();
      } else {
        first = a.getType().getCode();
        second = b.getType().getCode();
      }

      if (descriptor.direction === "ascending") {
        return first.localeCompare(second, undefined, { numeric: true });
      } else {
        return second.localeCompare(first, undefined, { numeric: true });
      }
    });
    // Re-apply selected-first pinning after sorting in edit mode
    if (!isReadOnly && selectedKeys !== "all") {
      const selectedSet = new Set(Array.from(selectedKeys).map(k => k.valueOf() as string));
      if (selectedSet.size > 0) {
        const sel = sortedComponents.filter(c => selectedSet.has(c.getPermId().getPermId()));
        const unsel = sortedComponents.filter(c => !selectedSet.has(c.getPermId().getPermId()));
        setComponents([...sel, ...unsel]);
        return;
      }
    }
    setComponents(sortedComponents);
  };

  const onSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    sortComponents(descriptor);
  };

  const renderTableRow = (component: openbis.Sample) => {
    const permId = component.getPermId().getPermId();
    if (logentries) {
      // Determine parent logbook entry (first logbook parent)
      let parents: any[] = [];
      try {
        parents = (component.getParents && component.getParents()) || [];
      } catch (e) {
        // getParents() throws NotFetchedException if parents were not fetched for this entry
      }
      let parentEntry = "";
      if (parents.length > 0) {
        for (const p of parents) {
          try {
            const isLogbookEntry = p.getExperiment && p.getExperiment().getCode() === logbookCollectionID;
            if (isLogbookEntry && !parentEntry) {
              parentEntry = p.getProperty("NAME") || p.getCode() || "";
            }
            if (parentEntry) break;
          } catch (e) {
            // ignore
          }
        }
      }

      // Omit preview column for logentries
      return (
        <TableRow
          key={component.getPermId().getPermId()}
          style={{
            cursor: !isReadOnly ? "pointer" : "default",
            border: "1px solid #E0E0E0",
          }}
        >
          <TableCell>{component.getProperty("NAME")}</TableCell>
          <TableCell style={{ color: component.getType().getMetaData()["color"] }}>{ component.getType().getDescription() }</TableCell>
          <TableCell>{parentEntry}</TableCell>
          <TableCell>{(component.getProperty("VALID_FROM") && typeof component.getProperty("VALID_FROM") === "string" && component.getProperty("VALID_FROM").includes("T"))
            ? component.getProperty("VALID_FROM").replace("T", " ").split(".")[0]
            : ""}
          </TableCell>
          <TableCell>{(() => { try { return component.getRegistrator()?.getPermId()?.getPermId() || ""; } catch { return ""; } })()}</TableCell>
        </TableRow>
      );
    }
    // Default: show preview column
    const isIlog = component.getType().getMetaData()?.["ilog"] === "true";
    const componentCode = component.getCode();
    return (
      <TableRow key={component.getPermId().getPermId()}>
        <TableCell>
          {previewImages[permId] ? (
            <img
              src={previewImages[permId] as string}
              alt="Preview"
              className="max-w-[70px] max-h-[70px] rounded shadow border"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span className="text-gray-400">No image</span>
          )}
        </TableCell>
        <TableCell>{component.getProperty("NAME")}</TableCell>
        <TableCell>
          {isReadOnly && isIlog ? (
            <Link
              to="/objects/creator"
              search={{ mode: "view", objectcode: componentCode } as any}
              className="text-blue-600 hover:underline"
            >
              {componentCode}
            </Link>
          ) : componentCode}
        </TableCell>
        <TableCell>{component.getType().getCode()}</TableCell>
      </TableRow>
    );
  };

  // Move topContent out of useMemo to ensure it always reflects latest isReadOnly
  const valueForTopContent = getSelectedCodes().length === 0 ?
    undefined :
    getSelectedCodes().map((item) => item).join(", ");

  const topContent = (
    <>
      {!isReadOnly && (
        <Textarea
          isDisabled
          minRows={1}
          label={multivalued ? "Selected objects" : "Selected object"}
          placeholder={multivalued ? "Select objects from the table below" : "Select an object from the table below"}
          value={valueForTopContent}
        />
      )}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          {!isReadOnly && (
            <Input
              isClearable
              className="w-full sm:max-w-[60%]"
              placeholder={`Filter by name...`}
              startContent={<SearchIcon />}
              value={codeFilter}
              onChange={(event) => setCodeFilter(event.target.value)}
              onClear={() => setCodeFilter("")}
            />
          )}
          <div className="flex gap-4">
            {!isReadOnly && (!objectType || objectType === "any") && (
              <Dropdown>
                <DropdownTrigger className="hidden md:flex">
                  <Button 
                    isDisabled={isReadOnly}
                    endContent={<ChevronDownIcon className="text-small" />} 
                    variant="flat"
                  >
                    Type
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  disallowEmptySelection={false}
                  aria-label="Type Filter"
                  closeOnSelect={false}
                  selectionMode="multiple"
                  selectedKeys={typeFilter}
                  onSelectionChange={setTypeFilter}
                >
                  {componentTypes.map((type) => (
                    <DropdownItem key={type}>
                      {type}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderTableHeaders = () => {
    if (logentries) {
      return <TableHeader>
        <TableColumn key="name" allowsSorting>Name</TableColumn>
        <TableColumn key="type" allowsSorting>Type</TableColumn>
        <TableColumn key="parentEntry" allowsSorting>Parent Entry</TableColumn>
        <TableColumn key="validFrom" allowsSorting>Valid From</TableColumn>
        <TableColumn key="responsible" allowsSorting>Responsible</TableColumn>
      </TableHeader>
    }
    return (
      <TableHeader>
        <TableColumn key="preview">Preview</TableColumn>
        <TableColumn key="name" allowsSorting>Name</TableColumn>
        <TableColumn key="code" allowsSorting>Code</TableColumn>
        <TableColumn key="type" allowsSorting>Type</TableColumn>
      </TableHeader>
    );
  }

  return (
    <>
      <Table 
        isHeaderSticky
        selectionMode={multivalued && !isReadOnly ? "multiple" : "single"} 
        aria-label={logentries ? "Logbook Entry List" : "Component list"}
        topContent={topContent}
        topContentPlacement="outside"
        selectedKeys={selectedKeys}
        onSelectionChange={isReadOnly ? () => {} : setSelectedKeys}
        classNames={{
          wrapper: "max-h-[300px]",
          tr: isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-gray-150",
        }}
        onSortChange={onSortChange}
        sortDescriptor={sortDescriptor}
      >
        {renderTableHeaders()}
        <TableBody emptyContent={"No objects found"}>
          {components.map((component) => {
            return renderTableRow(component);
          })}
        </TableBody>
      </Table>
    </>
  );
}

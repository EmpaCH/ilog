import React, { useMemo, useState, useEffect, useRef } from "react";
import { useGetObjectByPermId } from "../../apis/object/useGetObjectByPermId";
import { useGetObjects } from "../../apis/object/useGetObjects";
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
import { getSampleDatasets, getDatasetImageFilenameFromObject } from "../../apis/dataset/datasetAPI";
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
}) => {
  // console.log(value);
  const { apiFacade } = useContext(AuthContext);
  const getObjectsResult = useGetObjects();
  const lastDispatchedRef = useRef<string>('');
  const hasInitializedRef = useRef<boolean>(false);
  const lastValueRef = useRef<any>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [allComponents, setAllComponents] = useState<openbis.Sample[]>([]);
  const [components, setComponents] = useState<openbis.Sample[]>([]);
  const [previewImages, setPreviewImages] = useState<{ [permId: string]: string | null }>({});
  const [storedCurrentObjectCode, setStoredCurrentObjectCode] = useState<string | undefined>(currentObjectCode);
  
  // Remember the first non-empty currentObjectCode provided by the parent
  useEffect(() => {
    if (currentObjectCode && currentObjectCode !== storedCurrentObjectCode) {
      setStoredCurrentObjectCode(currentObjectCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentObjectCode]);

  // Load preview images for all components
  useEffect(() => {
    if (logentries) return; // Don't fetch images if using logentries
    const fetchImages = async () => {
      if (!components || components.length === 0) return;
      const newPreviewImages: { [permId: string]: string | null } = {};
      const sessionToken = (apiFacade as any)?._private?.sessionToken;
      for (const obj of components) {
        try {
          const datasets = await getSampleDatasets(apiFacade, obj.getPermId().getPermId());
          const elnPreviewDataset = datasets.find(ds => ds.getType()?.getCode() === "ELN_PREVIEW");
          if (elnPreviewDataset) {
            const datasetPermId = elnPreviewDataset.getPermId().getPermId();
            const filename = await getDatasetImageFilenameFromObject(elnPreviewDataset, apiFacade);
            if (filename && sessionToken) {
              const encodedFilename = encodeURIComponent(filename);
              const url = `/datastore_server/${datasetPermId}/original/${encodedFilename}?sessionID=${encodeURIComponent(sessionToken)}`;
              newPreviewImages[obj.getPermId().getPermId()] = url;
            } else if (filename) {
              const encodedFilename = encodeURIComponent(filename);
              newPreviewImages[obj.getPermId().getPermId()] = `/datastore_server/${datasetPermId}/original/${encodedFilename}`;
            } else {
              newPreviewImages[obj.getPermId().getPermId()] = null;
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
  }, [components, apiFacade, logentries]);

  // Track missing selected permIds (not in allComponents)
  const selectedPermIdsFromValue = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
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
      if (objectType && objectType !== "any") {
        filteredData = filteredData.filter((component) => 
          component.getType().getCode() === objectType
        );
      }
      if (storedCurrentObjectCode) {
        filteredData = filteredData.filter((component) => 
          component.getCode() !== storedCurrentObjectCode
        );
      }
      // Filter based on LOCATION property
      if (currentInstrumentPermId) {
        filteredData = filteredData.filter((component) => {
          const location = component.getProperty("LOCATION");
          return !location || location === "" || location === null || location === undefined || location === currentInstrumentPermId;
        });
      } else {
        filteredData = filteredData.filter((component) => {
          const location = component.getProperty("LOCATION");
          return !location || location === "" || location === null || location === undefined;
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
      // In read-only mode always constrain to the selected value(s)
      // An empty value means no parent is assigned, so an empty table
      const selectedPermIds = Array.isArray(value) ? value : value ? [value] : [];
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
    }
    setComponents(filteredComponents);
  }, [codeFilter, typeFilter, objectType, componentTypes, allComponents, isReadOnly, value]);

  const selectedPermIds = useMemo(() => {
    return getSelectedPermIds();
  }, [selectedKeys, components]);

  useEffect(() => {
    const currentValue = JSON.stringify(selectedPermIds);
    if (lastDispatchedRef.current === currentValue) {
      return;
    }
    // Only dispatch if we have actually initialized or if this is a user interaction
    // This prevents the initial empty dispatch that causes the feedback loop
    if (!hasInitializedRef.current && selectedPermIds.length === 0) {
      return;
    }
    dispatch(selectedPermIds);
    onSelectedComponentsChange?.(selectedPermIds);
    lastDispatchedRef.current = currentValue;
  }, [selectedPermIds, dispatch, onSelectedComponentsChange]);

  useEffect(() => {
    // console.log('effect');
    const currentValueString = JSON.stringify(value);
    // console.log(currentValueString);

    if (lastValueRef.current === currentValueString && hasInitializedRef.current) {
      return;
    }
    // Create normalized value array
    const valueArray = Array.isArray(value) ? [...value] : value ? [value] : [];
    // console.log(valueArray);
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
    // Only mark as fully initialized when we actually resolved the value into
    // matching components. If value is non-empty but nothing matched yet
    // (e.g. logentries haven't been populated yet), keep hasInitializedRef false
    // so this effect re-runs when components changes and tries again.
    const fullyResolved = valueArray.length === 0 || matchingPermIds.size > 0;
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
          <TableCell>{component.getRegistrator().getPermId().getPermId() || ""}</TableCell>
        </TableRow>
      );
    }
    // Default: show preview column
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
        <TableCell>{component.getCode()}</TableCell>
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

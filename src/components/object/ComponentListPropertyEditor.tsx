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
    let selectedCodes: string[] = [];
    if (selectedKeys == "all") {
      return components.map(component => component.getCode());
    }
    for (const key of selectedKeys) {
      selectedCodes.push(key.valueOf() as string);
    }
    return selectedCodes;
  };

  const getSelectedPermIds = (): string[] => {
    return components.filter((component) =>
      getSelectedCodes().includes(component.getCode())
    ).map((component) => {
      return component.getPermId().getPermId();
    });
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
      // If a selected object is missing, add it to the lists
      let mergedData = filteredData;
      if (missingObjectQuery.data && !filteredData.some(c => c.getPermId().getPermId() === missingObjectQuery.data?.getPermId().getPermId())) {
        mergedData = [...filteredData, missingObjectQuery.data];
      }
      setAllComponents(mergedData);
      setComponents(mergedData);
      const componentTypes = mergedData.map((component) => {
        return component.getType().getCode();
      });
      setComponentTypes([...new Set(componentTypes)]);
    }
  }, [getObjectsResult.status, getObjectsResult.data, objectType, storedCurrentObjectCode, currentInstrumentPermId, missingObjectQuery.data, logentries]);

  useMemo(() => {
    if (allComponents.length === 0) return;
    let filteredComponents = [...allComponents];
    if (isReadOnly) {
      // Only show selected components in readOnly mode
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
    if (!value || !Array.isArray(components) || components.length === 0) {
      return;
    }
    const currentValueString = JSON.stringify(value);
    if (lastValueRef.current === currentValueString) {
      return;
    }
    // Create a copy to avoid mutation
    const valueArray = Array.isArray(value) ? [...value] : [value];
    const matchingCodes = new Set<string>();

    valueArray.forEach(val => {
      const matchingComponent = components.find(component => 
        component.getPermId().getPermId() === val
      );
      if (matchingComponent) {
        matchingCodes.add(matchingComponent.getCode());
      }
    });

    setSelectedKeys(matchingCodes);
    lastValueRef.current = currentValueString;
    hasInitializedRef.current = true;
  }, [value, components]);

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
      // Omit preview column for logentries
      return (
        <TableRow key={component.getCode()}>
          <TableCell>{component.getProperty("NAME")}</TableCell>
          <TableCell>{component.getCode()}</TableCell>
          <TableCell>{component.getType().getCode()}</TableCell>
        </TableRow>
      );
    }
    // Default: show preview column
    return (
      <TableRow key={component.getCode()}>
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
        <TableColumn key="code" allowsSorting>Code</TableColumn>
        <TableColumn key="type" allowsSorting>Type</TableColumn>
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
        selectedKeys={isReadOnly ? [] : selectedKeys}
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
          {components.map((component) => (
            renderTableRow(component)
          ))}
        </TableBody>
      </Table>
    </>
  );
}

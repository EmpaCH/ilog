import React, { useMemo, useState, useEffect, useRef } from "react";
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

interface ComponentListPropertyEditorProps {
  dispatch: React.Dispatch<any>;
  objectType?: string;
  multivalued?: boolean;
  value?: string | string[] | any;
  currentObjectCode?: string;
  propertyCode?: string;
  onSelectedComponentsChange?: (permIds: string[]) => void;
  currentInstrumentPermId?: string;
}

export const ComponentListPropertyEditor: React.FC<ComponentListPropertyEditorProps> = ({
  dispatch,
  objectType,
  multivalued,
  value,
  currentObjectCode,
  onSelectedComponentsChange,
  currentInstrumentPermId,
}) => {
  const getObjectsResult = useGetObjects();
  const lastDispatchedRef = useRef<string>('');
  const hasInitializedRef = useRef<boolean>(false);
  const lastValueRef = useRef<any>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [allComponents, setAllComponents] = useState<openbis.Sample[]>([]);
  const [components, setComponents] = useState<openbis.Sample[]>([]);
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

  useMemo(() => {
    if (getObjectsResult.status === "success") {
      let filteredData = getObjectsResult.data;

      if (objectType && objectType !== "any") {
        filteredData = filteredData.filter((component) => 
          component.getType().getCode() === objectType
        );
      }
      if (currentObjectCode) {
        filteredData = filteredData.filter((component) => 
          component.getCode() !== currentObjectCode
        );
      }
      
      // Filter based on LOCATION property
      if (currentInstrumentPermId) {
        // Edit mode: show components attached to this instrument + available components
        // Hide components attached to other instruments
        filteredData = filteredData.filter((component) => {
          const location = component.getProperty("LOCATION");
          // Include if: no location (available) OR location is current instrument
          return !location || location === "" || location === null || location === undefined || location === currentInstrumentPermId;
        });
      } else {
        // Create mode: only show available components (not attached to any instrument)
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
      // Remove duplicates
      setComponentTypes([...new Set(componentTypes)]);
    }
  }, [getObjectsResult.status, getObjectsResult.data, objectType, currentObjectCode, currentInstrumentPermId]);

  useMemo(() => {
    if (allComponents.length === 0) return;
    let filteredComponents = [...allComponents];
    if (codeFilter) {
      filteredComponents = filteredComponents.filter((component) => {
        const name = component.getProperty("NAME") || component.getCode();
        return name.toLowerCase().includes(codeFilter.toLowerCase());
      });
    }

    if ((!objectType || objectType === "any") && typeFilter !== "all" && Array.from(typeFilter).length > 0) {
      filteredComponents = filteredComponents.filter((component) =>
        Array.from(typeFilter).includes(component.getType().getCode()),
      );
    }
    setComponents(filteredComponents);
  }, [codeFilter, typeFilter, objectType, componentTypes, allComponents]);

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
    return (
      <TableRow key={component.getCode()}>
        <TableCell>{component.getCode()}</TableCell>
        <TableCell>{component.getProperty("NAME") || component.getCode()}</TableCell>
        <TableCell>{component.getType().getCode()}</TableCell>
      </TableRow>
    );
  };

  const topContent = useMemo(() => {
    const value = getSelectedCodes().length === 0 ?
      undefined :
      getSelectedCodes().map((item) => item).join(", ");

    return (
      <>
        <Textarea
          isDisabled
          minRows={1}
          label={multivalued ? "Selected components" : "Selected component"}
          placeholder={multivalued ? "Select components from the table below" : "Select a component from the table below"}
          value={value}
        />
        <div className="flex flex-col gap-4">
          <div className="flex justify-between gap-3 items-end">
            <Input
              isClearable
              className="w-full sm:max-w-[60%]"
              placeholder={`Filter by component name...`}
              startContent={<SearchIcon />}
              value={codeFilter}
              onChange={(event) => setCodeFilter(event.target.value)}
              onClear={() => setCodeFilter("")}
            />
            <div className="flex gap-4">
              {(!objectType || objectType === "any") && (
                <Dropdown>
                  <DropdownTrigger className="hidden md:flex">
                    <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                      Component Type
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    disallowEmptySelection={false}
                    aria-label="Component Type Filter"
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
  }, [selectedKeys, codeFilter, typeFilter, components]);

  return (
    <>
      <Table 
        isHeaderSticky
        selectionMode={multivalued ? "multiple" : "single"} 
        aria-label="Component list"
        topContent={topContent}
        topContentPlacement="outside"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        classNames={{
          wrapper: "max-h-[300px]",
          tr: "cursor-pointer hover:bg-gray-150",
        }}
        onSortChange={onSortChange}
        sortDescriptor={sortDescriptor}
      >
        <TableHeader>
          <TableColumn key="name" allowsSorting>Name</TableColumn>
          <TableColumn key="code" allowsSorting>Code</TableColumn>
          <TableColumn key="type" allowsSorting>Type</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No components found"}>
          {components.map((component) => (
            renderTableRow(component)
          ))}
        </TableBody>
      </Table>
    </>
  );
}

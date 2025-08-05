import { useMemo, useState } from "react";
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
  dispatch: (input: string | boolean | Date | string[]) => void;
}

export const ComponentListPropertyEditor: React.FC<ComponentListPropertyEditorProps> = ({
  dispatch,
}) => {
  const getObjectsResult = useGetObjects();

  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [components, setComponents] = useState<openbis.Sample[]>([]);
  const [componentTypes, setComponentTypes] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<Selection>("all");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  useMemo(() => {
    if (getObjectsResult.status === "success" && getObjectsResult.data) {
      setComponents(getObjectsResult.data);
      const componentTypes = getObjectsResult.data.map((component) => {
        return component.getType().getCode();
      });
      setComponentTypes(componentTypes);
    }
  }, [getObjectsResult.status, getObjectsResult.data]);

  useMemo(() => {
    let filteredComponents = getObjectsResult.data ? [...getObjectsResult.data] : [];
    if (codeFilter) {
      filteredComponents = filteredComponents.filter((getObjectsResult) =>
        getObjectsResult.getCode().toLowerCase().includes(codeFilter.toLowerCase())
      );
    }
    if (typeFilter !== "all" && Array.from(typeFilter).length !== componentTypes.length) {
      filteredComponents = filteredComponents.filter((component) =>
        Array.from(typeFilter).includes(component.getType().getCode()),
      );
    }
    setComponents(filteredComponents);
  }, [codeFilter, typeFilter]);

  const sortComponents = (descriptor: SortDescriptor) => {
    const sortedComponents = [...components].sort((a, b) => {
      let first = descriptor.column === "name" ? a.getCode() : a.getType().getCode();
      let second = descriptor.column === "name" ? b.getCode() : b.getType().getCode();

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

  const renderTableRow = (component: openbis.Sample) => {
    return (
      <TableRow key={component.getCode()}>
        <TableCell>{component.getCode()}</TableCell>
        <TableCell>{component.getType().getCode()}</TableCell>
      </TableRow>
    );
  };

  const topContent = useMemo(() => {
    const value = getSelectedCodes().length === 0 ?
      undefined :
      getSelectedCodes().map((item) => item).join(", ");
    // dispatch the selected codes to the parent component
    dispatch(getSelectedPermIds());

    return (
      <>
        <Textarea
          isDisabled
          minRows={1}
          label="Selected components"
          placeholder="Select components from the table below"
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
              <Dropdown>
                <DropdownTrigger className="hidden md:flex">
                  <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                    Component Type
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  disallowEmptySelection
                  aria-label="Table Columns"
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
            </div>
          </div>
        </div>
      </>
    );
  }, [selectedKeys, codeFilter, typeFilter, components]);

  // Show loading state while data is being fetched
  if (getObjectsResult.isLoading) {
    return <div>Loading components...</div>;
  }

  // Show error state if query fails
  if (getObjectsResult.isError) {
    return <div>Error loading components: {getObjectsResult.error?.message}</div>;
  }

  return (
    <>
      <Table 
        isHeaderSticky
        isStriped
        selectionMode="multiple" 
        aria-label="Component list"
        topContent={topContent}
        topContentPlacement="outside"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        classNames={{
          wrapper: "max-h-[300px]",
        }}
        onSortChange={onSortChange}
        sortDescriptor={sortDescriptor}
      >
        <TableHeader>
          <TableColumn key="name" allowsSorting>Name</TableColumn>
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

import React, { useState, useReducer } from "react";
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import SearchIcon from "@mui/icons-material/Search";
import { useGetAllObjectTypes } from "../../apis/type/useGetAllObjectTypes";
import { useRemoveObjectTypeFromIlog } from "../../apis/type/useRemoveObjectTypeFromIlog";
import { useSetObjectTypeCategory } from "../../apis/type/useSetObjectTypeCategory";
import {
  categoryLabels,
  componentCategory,
  getTypeCategory,
  instrumentCategory,
  locationCategory,
  logbookEntryCategory,
} from "../../apis/shared/category";

const generalListFilter = "general";
const initialFilterState: Record<string, string> = { [generalListFilter]: "" };

// Categories that can be set on this page (logbook entry types are managed in the type creator)
const importableCategories = [instrumentCategory, componentCategory, locationCategory];

const isImportedToIlog = (type: any): boolean =>
  importableCategories.includes(getTypeCategory(type));

const getIlogType = (type: any): string | undefined => {
  const category = getTypeCategory(type);
  return importableCategories.includes(category) ? categoryLabels[category] : "-";
}

export const ImportTypesToIlog: React.FC = () => {
  const allObjectTypes = useGetAllObjectTypes();
  const removeMutation = useRemoveObjectTypeFromIlog();
  const categoryMutation = useSetObjectTypeCategory();
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | "all">(new Set());
  const [_page, setPage] = useState(1);
  const [filter, setFilterValue] = useReducer(
    (state: Record<string, string>, action: { key: string; value: string }) => {
      return { ...state, [action.key]: action.value };
    },
    initialFilterState
  );

  const filteredTypes = (allObjectTypes.data ?? [])
    // Logbook entry types are managed in the type creator, not imported here
    .filter((t) => getTypeCategory(t) !== logbookEntryCategory)
    .filter((t) =>
      t.getCode().toLowerCase().includes((filter[generalListFilter] ?? "").toLowerCase())
    )
    .sort((a, b) => a.getCode().localeCompare(b.getCode()));

  const selectedCodes =
    selectedKeys === "all"
      ? filteredTypes.map((t) => t.getCode())
      : Array.from(selectedKeys as Set<string>);

  const selectedTypes = filteredTypes.filter((t) =>
    selectedCodes.includes(t.getCode())
  );

  const canRemove = selectedTypes.length > 0 && selectedTypes.every((t) => isImportedToIlog(t));
  // Setting a category is only useful for types that don't have it yet
  const canSetInstrument = selectedTypes.some((t) => getTypeCategory(t) !== instrumentCategory);
  const canSetComponent = selectedTypes.some((t) => getTypeCategory(t) !== componentCategory);
  const canSetLocation = selectedTypes.some((t) => getTypeCategory(t) !== locationCategory);

  const onClear = React.useCallback(() => {
    Object.keys(filter).forEach(key => {
      setFilterValue({ key, value: "" });
    });
    setPage(1);
  }, [filter]);

  const onSearchChange = React.useCallback((value?: string) => {
    if (value) {
      setFilterValue({ key: generalListFilter, value: value });
      setPage(1);
    } else {
      setFilterValue({ key: generalListFilter, value: "" });
      setPage(1);
    }
  }, []);

  return (
    <div className="md-size-div pb-8">
      <h2 className="text-center mb-4">Import Object Types to iLog</h2>
      {allObjectTypes.isError && <p className="text-center text-red-500">Failed to load object types.</p>}
      {allObjectTypes.data && (
        <Table
          isHeaderSticky
          isStriped
          selectionMode="multiple"
          aria-label="Object Types"
          selectedKeys={selectedKeys}
          classNames={{ wrapper: "max-h-[557px]" }}
          onSelectionChange={(keys) => {
            if (keys === "all") {
              setSelectedKeys(keys);
            } else {
              setSelectedKeys(new Set(Array.from(keys as Set<React.Key>).map(String)));
            }
          }}
          topContentPlacement="outside"
          topContent={
            <div className="flex flex-col gap-4">
              {allObjectTypes.data && (
                <span className="text-default-400 text-small flex justify-start">Total {filteredTypes.length} items</span>
              )}
              <div className="flex justify-between items-center">
                <Input
                  isClearable
                  className="w-full sm:max-w-[44%]"
                  placeholder={`Search by code...`}
                  startContent={<SearchIcon />}
                  value={filter[generalListFilter]}
                  onClear={() => onClear()}
                  onValueChange={onSearchChange}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    color="secondary"
                    isDisabled={!canSetInstrument}
                    isLoading={categoryMutation.isPending}
                    onPress={() => categoryMutation.mutate({ codes: selectedCodes, category: instrumentCategory })}
                  >
                    Set as Instrument
                  </Button>
                  <Button
                    color="warning"
                    isDisabled={!canSetComponent}
                    isLoading={categoryMutation.isPending}
                    onPress={() => categoryMutation.mutate({ codes: selectedCodes, category: componentCategory })}
                  >
                    Set as Component
                  </Button>
                  <Button
                    color="success"
                    isDisabled={!canSetLocation}
                    isLoading={categoryMutation.isPending}
                    onPress={() => categoryMutation.mutate({ codes: selectedCodes, category: locationCategory })}
                  >
                    Set as Location
                  </Button>
                  <Button
                    color="danger"
                    isDisabled={!canRemove}
                    isLoading={removeMutation.isPending}
                    onPress={() => removeMutation.mutate(selectedCodes)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          }
        >
          <TableHeader>
            <TableColumn>Code</TableColumn>
            <TableColumn>iLog Type</TableColumn>
            <TableColumn> </TableColumn>
          </TableHeader>
          <TableBody emptyContent="No object types found">
            {filteredTypes.map((type) => (
              <TableRow key={type.getCode()}>
                <TableCell>{type.getCode()}</TableCell>
                <TableCell>{getIlogType(type)}</TableCell>
                <TableCell>
                  <div className="flex gap-1 min-h-[32px] items-center">
                    <Button
                      size="sm"
                      color="secondary"
                      variant="light"
                      isDisabled={getTypeCategory(type) === instrumentCategory}
                      onPress={() => categoryMutation.mutate({ codes: [type.getCode()], category: instrumentCategory })}
                    >
                      Set as Instrument
                    </Button>
                    <Button
                      size="sm"
                      color="warning"
                      variant="light"
                      isDisabled={getTypeCategory(type) === componentCategory}
                      onPress={() => categoryMutation.mutate({ codes: [type.getCode()], category: componentCategory })}
                    >
                      Set as Component
                    </Button>
                    <Button
                      size="sm"
                      color="success"
                      variant="light"
                      isDisabled={getTypeCategory(type) === locationCategory}
                      onPress={() => categoryMutation.mutate({ codes: [type.getCode()], category: locationCategory })}
                    >
                      Set as Location
                    </Button>
                    {isImportedToIlog(type) && 
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        onPress={() => removeMutation.mutate([type.getCode()])}
                      >
                        Remove
                      </Button>
                    }
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

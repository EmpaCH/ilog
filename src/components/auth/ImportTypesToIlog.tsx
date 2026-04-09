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
import { useImportObjectTypeToIlog } from "../../apis/type/useImportObjectTypeToIlog";
import { useRemoveObjectTypeFromIlog } from "../../apis/type/useRemoveObjectTypeFromIlog";
import { useSetObjectTypeCollectionType } from "../../apis/type/useSetObjectTypeCollectionType";
import { componentCollectionID, instrumentCollectionID } from "../../apis/shared/environment";

const generalListFilter = "general";
const initialFilterState: Record<string, string> = { [generalListFilter]: "" };

const isImportedToIlog = (type: any): boolean =>
  type.getMetaData()?.["ilog"] === "true";

const getIlogType = (type: any): string | undefined => {
 const base = type.getMetaData()?.["collectionType"];
 if (base === instrumentCollectionID) {
   return "Instrument";
 } else if (base === componentCollectionID) {
   return "Component";
 }
 else {
   return "-";
 }
}

export const ImportTypesToIlog: React.FC = () => {
  const allObjectTypes = useGetAllObjectTypes();
  const importMutation = useImportObjectTypeToIlog();
  const removeMutation = useRemoveObjectTypeFromIlog();
  const collectionTypeMutation = useSetObjectTypeCollectionType();
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | "all">(new Set());
  const [_page, setPage] = useState(1);
  const [filter, setFilterValue] = useReducer(
    (state: Record<string, string>, action: { key: string; value: string }) => {
      return { ...state, [action.key]: action.value };
    },
    initialFilterState
  );

  const filteredTypes = (allObjectTypes.data ?? [])
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

  const disabledKeys = new Set(
    filteredTypes
      .filter((t) => t.getMetaData()?.["collectionType"] === "LOGBOOK_BASE_TYPE")
      .map((t) => t.getCode())
  );

  const canImport = selectedTypes.length > 0 && selectedTypes.every((t) => !isImportedToIlog(t));
  const canRemove = selectedTypes.length > 0 && selectedTypes.every((t) => isImportedToIlog(t));
  const canSetInstrument = selectedTypes.length > 0;
  const canSetComponent = selectedTypes.length > 0;

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
          disabledKeys={disabledKeys}
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
                    color="primary"
                    isDisabled={!canImport}
                    isLoading={importMutation.isPending}
                    onPress={() => importMutation.mutate(selectedCodes)}
                  >
                    Import
                  </Button>
                  <Button
                    color="danger"
                    isDisabled={!canRemove}
                    isLoading={removeMutation.isPending}
                    onPress={() => removeMutation.mutate(selectedCodes)}
                  >
                    Remove
                  </Button>
                  <Button
                    color="secondary"
                    isDisabled={!canSetInstrument}
                    isLoading={collectionTypeMutation.isPending}
                    onPress={() => collectionTypeMutation.mutate({ codes: selectedCodes, collectionType: instrumentCollectionID })}
                  >
                    Set as Instrument
                  </Button>
                  <Button
                    color="warning"
                    isDisabled={!canSetComponent}
                    isLoading={collectionTypeMutation.isPending}
                    onPress={() => collectionTypeMutation.mutate({ codes: selectedCodes, collectionType: componentCollectionID })}
                  >
                    Set as Component
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
                  {disabledKeys.has(type.getCode()) ? null : (
                    <>
                      {isImportedToIlog(type) ? (
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          onPress={() => removeMutation.mutate([type.getCode()])}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          color="primary"
                          variant="light"
                          onPress={() => importMutation.mutate([type.getCode()])}
                        >
                          Import
                        </Button>
                      )}
                      <Button
                        size="sm"
                        color="secondary"
                        variant="light"
                        onPress={() => collectionTypeMutation.mutate({ codes: [type.getCode()], collectionType: instrumentCollectionID })}
                      >
                        Set as Instrument
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        variant="light"
                        onPress={() => collectionTypeMutation.mutate({ codes: [type.getCode()], collectionType: componentCollectionID })}
                      >
                        Set as Component
                      </Button>
                    </>
                  )}
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

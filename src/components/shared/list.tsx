import React, { useReducer } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Autocomplete,
  AutocompleteItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Divider,
  Pagination,
  SortDescriptor,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import HistoryIcon from "@mui/icons-material/History";
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import { Column, Row } from "./list.types";
import openbis from "@openbis/openbis.esm";

export const List = (props: {
  columns: Column[];
  rows: Row[];
  idColumn: string;
  hiddenCode?: boolean;
  defaultSortColumn?: string;
  defaultSortDirection?: "ascending" | "descending";
  navigatePath: string;
  enableHistory?: boolean;
  enableLogbook?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  onDelete: (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
  ) => void;
  onEdit: (
    code: string,
  ) => void;
  onHistory?: (
    code: string,
  ) => void;
  onView?: (
    code: string,
  ) => void;
}) => {
  const navigate = useNavigate();
  // Initialize filters from URL query params when present
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const filterableColumnKeys = props.columns.filter(col => col.filterable).map(c => c.key);
  const initialFilterState: Record<string, string> = {};
  filterableColumnKeys.forEach((key) => {
    const v = urlParams.get(key);
    if (v) initialFilterState[key] = v;
  });
  // support general search param 'q'
  const q = urlParams.get('q');
  if (q) initialFilterState["generalListFilter"] = q;

  const [filter, setFilterValue] = useReducer(
    (state: Record<string, string>, action: { key: string; value: string }) => {
      return { ...state, [action.key]: action.value };
    },
    initialFilterState
  );

  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: props.defaultSortColumn || props.idColumn,
    direction: props.defaultSortDirection ? props.defaultSortDirection : "ascending",
  });
  const generalListFilter = "generalListFilter";
  const [page, setPage] = React.useState(1);
  const hasSearchFilter = Boolean(filter[generalListFilter]);

  const filteredItems = React.useMemo(() => {
    let filteredItems: Row[] = [...props.rows];
    if (hasSearchFilter) {
      const searchField = props.idColumn;
      filteredItems = filteredItems.filter((items) =>
        items[searchField]
          ?.toString()
          .toLowerCase()
          .includes(filter[generalListFilter].toLowerCase())
      );
    }
    filteredItems = filteredItems.filter((item) => {
      return Object.entries(filter).every(([key, value]) => {
      if (!value || key === generalListFilter) return true;
      let regex: RegExp;
      try {
        regex = new RegExp(value, "i");
        return regex.test(item[key as keyof Row]?.toString() || "");
      } catch {
        return (item[key as keyof Row]?.toString() || "").toLowerCase().includes(value.toLowerCase());
      }
      });
    });
    return filteredItems;
  }, [props, filter]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage);
  const itemsPerPage = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [props, page, filteredItems, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...itemsPerPage].sort((a: Row, b: Row) => {
      const first = a[sortDescriptor.column as keyof Row] as string;
      const second = b[sortDescriptor.column as keyof Row] as string;
      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [props, sortDescriptor, itemsPerPage]);

  const onNextPage = React.useCallback(() => {
    if (page < pages) {
      setPage(page + 1);
    }
  }, [page, pages]);

  const onPreviousPage = React.useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const onRowsPerPageChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRowsPerPage(Number(e.target.value));
      setPage(1);
    },
    []
  );

  const onSearchChange = React.useCallback((value?: string) => {
    if (value) {
      setFilterValue({ key: generalListFilter, value: value });
      setPage(1);
    } else {
      setFilterValue({ key: generalListFilter, value: "" });
      setPage(1);
    }
  }, []);

  const onClear = React.useCallback(() => {
    Object.keys(filter).forEach(key => {
      setFilterValue({ key, value: "" });
    });
    setPage(1);
  }, [filter]);

  const onBack = () => {
    navigate({ to: props.navigatePath });
  };

  // Build filter bar for filterable columns
  const filterableColumns = props.columns.filter(col => col.filterable);
  // Open filters accordion if any initial filters were provided via URL
  const [openedFilters, setOpenedFilters] = React.useState<Set<string>>(
    Object.keys(initialFilterState).length > 0 ? new Set(["filters"]) : new Set()
  );

  const filterBar = filterableColumns.length > 0 && (
    <>
      <Accordion selectionMode="multiple" selectedKeys={openedFilters} onSelectionChange={(s) => setOpenedFilters(s as Set<string>)}>
        <AccordionItem
          key="filters"
          aria-label="Filters"
          title={<div style={{ display: 'inline-flex', gap: '0.5rem' }}><FilterAltIcon /> <span style={{ fontSize: '1.3rem' }}>Filters</span></div>}
        >
          <div className="flex flex-row flex-wrap gap-2 items-end mb-2">
            {filterableColumns.map(col => {
              const values = Array.from(new Set(props.rows.map(row => row[col.key]).filter(v => v != null))).sort();
              return (
                <div key={col.key} className="flex flex-col min-w-[230px]">
                  <span className="text-sm mb-1 font-bold text-left">{col.name}</span>
                  <div className="flex flex-row gap-1 items-center">
                    <Autocomplete
                      aria-label={col.name}
                      placeholder="Type or select..."
                      className="flex-1"
                      selectedKey={filter[col.key] || ""}
                      defaultItems={values}
                      onSelectionChange={(value) => setFilterValue({ key: col.key, value: value?.toString() || "" })}
                    >
                      {values.map((value) => (
                        <AutocompleteItem key={value} value={value} aria-label={value}>
                          {value}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  </div>
                </div>
              );
            })}
            <Button variant="ghost" color="primary" onPress={onClear}>
              Clear Filters
            </Button>
          </div>
        </AccordionItem>
      </Accordion>
      <Divider />
    </>
  );

  const topContent = (
    <div className="flex flex-col">
      {filterBar}
      <div className="flex justify-between gap-3 my-4 items-end">
        <Input
          isClearable
          className="w-full sm:max-w-[44%]"
          placeholder={`Search by ${props.idColumn}...`}
          startContent={<SearchIcon />}
          value={filter[generalListFilter]}
          onClear={() => onClear()}
          onValueChange={onSearchChange}
        />
        <div className="flex gap-3">
          <Button color="primary" onPress={() => onBack()}>
            Add New
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-default-400 text-small">
          Total {props.rows.length} items
        </span>
        <label className="flex items-center text-default-400 text-small">
          Rows per page:
          <select
            className="bg-transparent outline-none text-default-400 text-small"
            onChange={onRowsPerPageChange}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>
    </div>
  );

  const bottomContent = React.useMemo(() => {
    return (
      <div className="py-2 px-2 flex justify-between items-center">
        <Pagination
          isCompact
          showControls
          showShadow
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />
        <div className="hidden sm:flex w-[30%] justify-end gap-2">
          <Button
            isDisabled={pages === 1}
            size="sm"
            variant="flat"
            onPress={onPreviousPage}
          >
            Previous
          </Button>
          <Button
            isDisabled={pages === 1}
            size="sm"
            variant="flat"
            onPress={onNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }, [itemsPerPage.length, page, pages, hasSearchFilter]);

  const renderTableColumn = (column: Column) => {    
    return (
      <TableColumn
        key={column.key}
        allowsSorting={column.sorting}
        align={column.align}
      >
        {column.name}
      </TableColumn>
    );
  };

  const renderRowCells = (
    permId: any,
    row: { [key: string]: any }, // display-only row (may have `code` removed)
    idColumn: string,
    enableModification: boolean | undefined,
    enableHistory: boolean | undefined,
    enableLogbook: boolean | undefined,
    fullRow?: { [key: string]: any }, // original row used for actions
    color?: string,
  ): JSX.Element[] => {
    const cells = Object.entries(row).map(([key, value]) => (
      (<TableCell key={`${permId}-${key}`} style={{ color: key === "type" ? color : "inherit" }}>
        {key === "preview" ? (
          value === undefined ? (
            <div style={{ width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f5", borderRadius: "6px", color: "#d4d4d8", fontSize: "11px" }}>
              …
            </div>
          ) : value ? (
            <img src={value} alt="preview" style={{ width: "90px", height: "90px", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f5", borderRadius: "6px", color: "#a1a1aa", fontSize: "11px", textAlign: "center", lineHeight: "1.3" }}>
              No preview
            </div>
          )
        ) : (
          printText(value)
        )}
      </TableCell>)
    ));

    cells.push(
      <TableCell key={`${permId}-actions`} style={{ width: enableHistory ? "220px" : "155px" }}>
        {enableLogbook &&
          <Button
            isIconOnly
            type="button"
            color="primary"
            variant="light"
            size="sm"
            onPress={() => {
              const objectValue = fullRow ? fullRow["name"] : row["name"];
              navigate({ to: `/logbook?object=${encodeURIComponent(objectValue)}&openFilters=1` });
            }}
          >
            <LibraryBooksOutlinedIcon />
          </Button>
        }
        {enableHistory && 
          <Button
            isIconOnly
            type="button"
            color="secondary"
            variant="light"
            size="sm"
            onPress={() => props.onHistory && props.onHistory(fullRow ? fullRow["code"] : row[idColumn])}
          >
            <HistoryIcon />
          </Button>
        }
        {enableModification !== undefined ? enableModification : true && 
          <Button
            isIconOnly
            type="button"
            color="success"
            variant="light"
            size="sm"
            onPress={() => props.onEdit(fullRow ? fullRow["code"] : row[idColumn])}
          >
            <DriveFileRenameOutlineIcon />
          </Button>
        }
        {enableModification !== undefined ? enableModification : true &&
          <Button
            isIconOnly
            type="button"
            color="danger"
            variant="light"
            size="sm"
            onPress={() =>
              props.onDelete(permId, row[idColumn])
            }
          >
            <DeleteOutlineIcon />
          </Button>
        }
      </TableCell>
    );

    return cells;
  };

  const renderTableRow = (row: Row) => {
    const { permId, color, enableModification, ...rest } = row;
    const newRow = props.hiddenCode ? Object.fromEntries(Object.entries(rest).filter(([k]) => k !== "code")) : rest;
    return (
      <TableRow
        key={permId.getPermId()}
        style={{
          cursor: props.onView ? "pointer" : "default",
          border: "1px solid #E0E0E0",
        }}
        onClick={() => props.onView?.(props.hiddenCode ? row["code"] : row[props.idColumn])}
      >
        {renderRowCells(permId, newRow, props.idColumn, enableModification, props.enableHistory, props.enableLogbook, row, color)}
      </TableRow>
    );
  };

  const printText = (text: string | null) => {
    if (text == null) {
      return "";
    }
    const words = text.split(/\s+/);
    if (words[0].length > 0) {
      return words.slice(0, 20).join(" ") + (words.length > 20 ? "..." : "");
    }
    return "";
  };

  return (
    <Table
      aria-label="Items list"
      isHeaderSticky
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      topContent={topContent}
      topContentPlacement="outside"
      classNames={{
        wrapper: "max-h-[570px]",
      }}
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      style= {{
        border: "1px solid #E0E0E0",
        borderRadius: "8px",
      }}
    >
      <TableHeader>
        {props.columns.map((column) => renderTableColumn(column))}
      </TableHeader>
      <TableBody aria-label="Items found" emptyContent={"No items found"}>
        {sortedItems.map((item) => renderTableRow(item))}
      </TableBody>
    </Table>
  );
};

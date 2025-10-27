import React, { useReducer } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Pagination,
  SortDescriptor,
} from "@heroui/react";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterIcon from "@mui/icons-material/FilterAltTwoTone"; // Assuming FilterIcon is from MUI
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import HistoryIcon from "@mui/icons-material/History";
import { Column, Row } from "./list.types";
import openbis from "@openbis/openbis.esm";

export const List = (props: {
  columns: Column[];
  rows: Row[];
  defaultSortColumn: string;
  idColumn?: string;
  defaultSortDirection?: "ascending" | "descending";
  navigatePath: string;
  enableHistory?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  onDelete: (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
  ) => void;
  onEdit: (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
  ) => void;
  onHistory?: (
    code: string,
  ) => void;
}) => {
  const navigate = useNavigate();
  const [filter, setFilterValue] = useReducer(
    (state: Record<string, string>, action: { key: string; value: string }) => {
      return { ...state, [action.key]: action.value };
    },
    {}
  );

  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: props.defaultSortColumn,
    direction: props.defaultSortDirection ? props.defaultSortDirection : "ascending",
  });
  const generalListFilter = "generalListFilter";
  const [page, setPage] = React.useState(1);
  const hasSearchFilter = Boolean(filter[generalListFilter]);

  const filteredItems = React.useMemo(() => {
    let filteredItems: Row[] = [...props.rows];
    if (hasSearchFilter) {
      filteredItems = filteredItems.filter((items) =>
        items["name"]
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
    setFilterValue({ key: generalListFilter, value: "" });
    setPage(1);
  }, []);

  const onBack = () => {
    navigate({ to: props.navigatePath });
  };

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by name"
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
              <option value="20">50</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    filter,
    onSearchChange,
    onRowsPerPageChange,
    props.rows.length,
    hasSearchFilter,
  ]);

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
        {column.filterable
          ? (

            <div style={{ display: "flex", alignItems: "center" }}>
          <span>
            {column.name}
            </span>
            <button
              style={{
            marginLeft: "5px",
            background: "none",
            border: "none",
            cursor: "pointer",
              }}
              onClick={() => {
            const value = prompt(
              `Enter filter value for ${column.key}`,
              filter[column.key] || ""
            );
            if (value !== null) {
              setFilterValue({ key: column.key, value: value });
            }
              }}
            >
                <span
                role="img"
                aria-label="filter"
                style={{ color: filter[column.key] ? "red" : "inherit" }}
                >
                <FilterIcon />
                </span>
            </button>
            </div>
          )
          : column.name}
      </TableColumn>
    );
  };

  const renderRowCells = (
    permId: any,
    row: { [key: string]: any },
    idColumn: string | undefined,
    defaultSortColumn: string,
    enableModification: boolean | undefined,
    enableHistory: boolean | undefined,
  ): JSX.Element[] => {
    const cells = Object.entries(row).map(([key, value]) => (
      // §TODO: Fix such that key matches the column name, not just same order as input
      (<TableCell key={`${permId}-${key}`} >{printText(value)}</TableCell>)
    ));

    cells.push(
      <TableCell key={`${permId}-actions`} style={{ width: enableHistory ? "220px" : "155px" }}>
        {enableHistory && 
          <Button
            type="button"
            color="primary"
            variant="light"
            size="sm"
            onPress={() => props.onHistory && props.onHistory(row[idColumn ? idColumn : defaultSortColumn])}
          >
            <HistoryIcon />
          </Button>
        }
        {enableModification !== undefined ? enableModification : true && 
          <Button
            type="button"
            color="success"
            variant="light"
            size="sm"
            onPress={() => props.onEdit(permId, row[idColumn ? idColumn : defaultSortColumn])}
          >
            <DriveFileRenameOutlineIcon />
          </Button>
        }
        {enableModification !== undefined ? enableModification : true &&
          <Button
            type="button"
            color="danger"
            variant="light"
            size="sm"
            onPress={() =>
              props.onDelete(permId, (row as Record<string, string>)[idColumn ? idColumn : defaultSortColumn])
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
    const { permId, color, enableModification, ...newRow } = row;
    return (
      <TableRow
        key={permId.getPermId()}
        style={{
          backgroundColor: color,
        }}
      >
        {renderRowCells(permId, newRow, props.idColumn, props.defaultSortColumn, enableModification, props.enableHistory)}
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
      isStriped
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      topContent={topContent}
      topContentPlacement="outside"
      classNames={{
        wrapper: "max-h-[557px]",
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

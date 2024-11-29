import React from "react";
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
} from "@nextui-org/react";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import { Column, Row } from "./list.types";

export const List = (props: {
  columns: Column[];
  rows: Row[];
  defaultSortColumn: string;
  navigatePath: string;
  onDelete;
}) => {
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = React.useState("");
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: props.defaultSortColumn,
    direction: "ascending",
  });
  const [page, setPage] = React.useState(1);
  const hasSearchFilter = Boolean(filterValue);

  const filteredItems = React.useMemo(() => {
    let filteredItems: Row[] = [...props.rows];
    if (hasSearchFilter) {
      filteredItems = filteredItems.filter((items) =>
        items[props.defaultSortColumn]
          .toLowerCase()
          .includes(filterValue.toLowerCase())
      );
    }
    return filteredItems;
  }, [props, filterValue]);

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
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue("");
    }
  }, []);

  const onClear = React.useCallback(() => {
    setFilterValue("");
    setPage(1);
  }, []);

  const toCreator = () => {
    navigate({ to: props.navigatePath });
  };

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder={`Search by ${props.defaultSortColumn}...`}
            startContent={<SearchIcon />}
            value={filterValue}
            onClear={() => onClear()}
            onValueChange={onSearchChange}
          />
          <div className="flex gap-3">
            <Button color="primary" onClick={() => toCreator()}>
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
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    filterValue,
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
        {column.name}
      </TableColumn>
    );
  };

  const printText = (text: string | null) => {
    if (text === null) {
      return "";
    }
    const words = text.split(/\s+/);
    console.log(words);
    if (words[0].length > 0) {
      return words.slice(0, 20).join(" ") + (words.length > 20 ? "..." : "");
    }
    return "";
  };

  const renderTableRow = (row: Row) => {
    const { permId, ...newRow } = row;
    return (
      <TableRow key={permId.getPermId()}>
        {Object.entries(newRow).map(([key, value]) => (
          <TableCell key={`${permId}-${key}`}>{printText(value)}</TableCell>
        ))}
        <TableCell style={{ width: "155px" }}>
          <Button
            type="button"
            color="success"
            variant="light"
            size="sm"
            onClick={(e) => {
              console.log("onEdit", e);
            }}
          >
            <DriveFileRenameOutlineIcon />
          </Button>
          <Button
            type="button"
            color="danger"
            variant="light"
            size="sm"
            onClick={(e) =>
              props.onDelete(e, permId, newRow[props.defaultSortColumn])
            }
          >
            <DeleteOutlineIcon />
          </Button>
        </TableCell>
      </TableRow>
    );
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

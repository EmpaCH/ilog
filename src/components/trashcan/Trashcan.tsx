import React, { useMemo, useEffect, useState, useRef } from "react";
import { useGetTrashedObjects } from "../../apis/trashcan/useGetTrashedObjects";
import { useRestoreTrashedObjects } from "../../apis/trashcan/useRestoreTrashedObjects";
import { useDeleteTrashedObjects } from "../../apis/trashcan/useDeleteTrashedObjects";
import { MessageModal } from "../shared/messageModal";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button } from "@heroui/react";
import UndoIcon from "@mui/icons-material/Undo";
import ClearIcon from "@mui/icons-material/Clear";
import openbis from "@openbis/openbis.esm";

export const Trashcan = () => {
  const allTrashedObjectsResult = useGetTrashedObjects();
  const restoreTrashedObjects = useRestoreTrashedObjects();
  const deleteTrashedObjects = useDeleteTrashedObjects();

  const [deletedItems, setDeletedItems] = useState<openbis.Deletion[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | "all">(new Set());
  const [disabledButtons, setDisabledButtons] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);

  useMemo(() => {
    if (allTrashedObjectsResult.status == "success") {
      setDeletedItems(allTrashedObjectsResult.data);
    }
  }, [allTrashedObjectsResult.status, allTrashedObjectsResult.data]);

  useEffect(() => {
    setDisabledButtons(selectedKeys !== "all" && selectedKeys.size === 0);
  }, [selectedKeys]);

  const selectedKeysRef = useRef<Set<string> | "all">(new Set());
  useEffect(() => {
    selectedKeysRef.current = selectedKeys;
  }, [selectedKeys]);

  const getItems = (): openbis.IDeletionId[] => {
    const selectedKeys = selectedKeysRef.current;
    let deletionIds: openbis.IDeletionId[] = [];
    if (selectedKeys == "all") {
      return deletedItems.map(deletion => deletion.getId() as openbis.IDeletionId);
    }
    for (const key of selectedKeys) {
      deletionIds.push(
        JSON.parse((key.valueOf() as string).split("_")[0]) as openbis.IDeletionId
      );
    }
    return deletionIds;
  };

  const onRestore = async (
    item?: openbis.IDeletionId,
  ) => {
    const items = item ? [item] : getItems();
    await restoreTrashedObjects.mutateAsync(
      items,
    ).catch((e) => {
      setErrorMessage(e.message.replace(/\s*\([^)]*\)/g, ""));
      setShowMessage(true);
    }).finally(() => {
      setTimeout(() => {
        setSelectedKeys(new Set([]));
        setShowMessage(false);
        }, 3000);
    });
  };

  const onDelete = async (
    item?: openbis.IDeletionId,
  ) => {
    const items = item ? [item] : getItems();
    await deleteTrashedObjects.mutateAsync(
      items,
    ).catch((e) => {
      setErrorMessage(e.message.replace(/\s*\([^)]*\)/g, ""));
      setShowMessage(true);
    }).finally(() => {
      setTimeout(() => {
        setSelectedKeys(new Set([]));
        setShowMessage(false);
        }, 3000);
    });
  };

  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {deletedItems.length} items</span>
          <div className="flex gap-3">
            <Button
              color="success"
              startContent={<UndoIcon/>}
              className="text-white"
              isDisabled={disabledButtons}
              onPress={(e) => onRestore()}
            >
              Restore
            </Button>
            <Button
              color="danger"
              startContent={<ClearIcon/>}
              isDisabled={disabledButtons}
              onPress={(e) => onDelete()}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      </div>
    );
  }, [deletedItems, disabledButtons]);

  const getItemCategory = (item: openbis.DeletedObject) => {
    const kind = item.getEntityKind();
    return kind == "SAMPLE" ? "OBJECT" : kind;
  };

  const renderTableRow = (deletion: openbis.Deletion) => {
    const item = deletion.getDeletedObjects()[0];

    return (
      <TableRow key={`${JSON.stringify(deletion.getId())}_${item.getIdentifier()}`}>
        <TableCell>{item.getIdentifier().split("/").slice(-1)[0]}</TableCell>
        <TableCell>{getItemCategory(item)}</TableCell>
        <TableCell>{item.getEntityTypeCode()}</TableCell>
        <TableCell style={{ width: "155px"}}>
          <Button
            type="button"
            color="success"
            variant="light"
            size="sm"
            onPress={(e) => {onRestore(deletion.getId())}}
          >
            <UndoIcon/>
          </Button>
          <Button
            type="button"
            color="danger"
            variant="light"
            size="sm"
            onPress={(e) => {onDelete(deletion.getId())}}
          >
            <ClearIcon/>
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <h2>Trashcan</h2>
      <Table 
        isHeaderSticky
        isStriped
        selectionMode="multiple" 
        aria-label="Trashcan list"
        topContent={topContent}
        topContentPlacement="outside"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          if (keys === "all") {
            setSelectedKeys(keys);
          } else {
            setSelectedKeys(new Set(Array.from(keys as Set<React.Key>).map(String)));
          }
        }}
        classNames={{
          wrapper: "max-h-[557px]",
        }}
      >
        <TableHeader>
          <TableColumn>Name</TableColumn>
          <TableColumn>Category</TableColumn>
          <TableColumn>Type</TableColumn>
          <TableColumn> </TableColumn>
        </TableHeader>
        <TableBody emptyContent={"Trashcan is empty"}>
          {deletedItems.map((item) => (
            renderTableRow(item)
          ))}
        </TableBody>
      </Table>
      <MessageModal
        message={errorMessage}
        isOpen={showMessage}
        isSuccess={false}
      />
    </>
  );
}

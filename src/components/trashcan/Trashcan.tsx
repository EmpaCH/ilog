import React, { useContext, useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/auth/authContext';
import { getTrashedObjects, restoreTrashedObjects, deleteTrashedObjects } from '../../apis/trashcan/trashcanAPI';
import { MessageModal } from '../shared/messageModal';
import {Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Selection} from '@nextui-org/react';
import UndoIcon from '@mui/icons-material/Undo';
import ClearIcon from '@mui/icons-material/Clear';
import openbis from '@openbis/openbis.esm';

const Trashcan = () => {
  const { apiFacade } = useContext(AuthContext);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [disabledButtons, setDisabledButtons] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  const res = useQuery({
    queryKey: ['getTrashedObjects'],
    queryFn: async () => {
      return getTrashedObjects(apiFacade);
    },
  });

  const deletedItems = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  useEffect(() => {
    setDisabledButtons((selectedKeys as Set<any>).size == 0);
  }, [selectedKeys]);

  const getSelectedKeys = (): openbis.IDeletionId[] => {
    let deletionIds: openbis.IDeletionId[] = [];
    for (const key of selectedKeys) {
      deletionIds.push(
        JSON.parse((key.valueOf() as string).split('_')[0]) as openbis.IDeletionId
      );
    }
    return deletionIds;
  };

  const onRestore = async (
    event: React.MouseEvent<HTMLButtonElement>,
    items: openbis.IDeletionId[],
  ) => {
    event.preventDefault();
    await restoreTrashedObjects(
      apiFacade,
      items,
    ).then(() => {
      res.refetch();
    }).catch((e) => {
      setErrorMessage(e.message.replace(/\s*\([^)]*\)/g, ''));
      setShowMessage(true);
    }).finally(() => {
      setTimeout(() => {
        setShowMessage(false);
        }, 3000);
    });
  };

  const onDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    items: openbis.IDeletionId[],
  ) => {
    event.preventDefault();
    await deleteTrashedObjects(
      apiFacade,
      items,
    ).then(() => {
      res.refetch();
    }).catch((e) => {
      setErrorMessage(e.message.replace(/\s*\([^)]*\)/g, ''));
      setShowMessage(true);
    }).finally(() => {
      setTimeout(() => {
        setShowMessage(false);
        }, 3000);
    });
  };

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {deletedItems.length} items</span>
          <div className="flex gap-3">
            <Button
              color="success"
              startContent={<UndoIcon/>}
              className="text-white"
              disabled={disabledButtons}
              disableAnimation={disabledButtons}
              onClick={(e) => {onRestore(e, getSelectedKeys())}}
            >
              Restore
            </Button>
            <Button
              color="danger"
              startContent={<ClearIcon/>}
              disabled={disabledButtons}
              disableAnimation={disabledButtons}
              onClick={(e) => {onDelete(e, getSelectedKeys())}}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      </div>
    );
  }, [deletedItems]);

  const getItemCategory = (item: openbis.DeletedObject) => {
    const kind = item.getEntityKind();
    return kind == 'SAMPLE' ? 'OBJECT' : kind;
  };

  const renderTableRow = (deletion: openbis.Deletion) => {
    const item = deletion.getDeletedObjects()[0];

    return (
      <TableRow key={`${JSON.stringify(deletion.getId())}_${item.getIdentifier()}`}>
        <TableCell>{item.getIdentifier().split('/').slice(-1)[0]}</TableCell>
        <TableCell>{getItemCategory(item)}</TableCell>
        <TableCell>{item.getEntityTypeCode()}</TableCell>
        <TableCell style={{ width: "155px"}}>
          <Button
            type="button"
            color="success"
            variant="light"
            size="sm"
            onClick={(e) => {onRestore(e, [deletion.getId()])}}
          >
            <UndoIcon/>
          </Button>
          <Button
            type="button"
            color="danger"
            variant="light"
            size="sm"
            onClick={(e) => {onDelete(e, [deletion.getId()])}}
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
        onSelectionChange={setSelectedKeys}
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

export default Trashcan;

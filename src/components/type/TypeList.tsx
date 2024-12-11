import React,  { useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/auth/authContext';
import { getObjectTypes, deleteObjectType } from '../../apis/type/typeAPI';
import openbis from '@openbis/openbis.esm';
import { List } from '../shared/list';
import { MessageModal } from '../shared/messageModal';
import { Column, TypeRow } from '../shared/list.types';
import { iLogBaseTypesPropertyCode } from '../../apis/shared/common';

export const TypeList = () => {
  const { apiFacade } = useContext(AuthContext);
  const [deletionMessage, setDeletionMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const res = useQuery({
    queryKey: ['getObjectTypes'],
    queryFn: async () => {
      return getObjectTypes(apiFacade);
    },
  });

  const types = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  const onDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    permId: any,
    code: string,
  ) => {
    event.preventDefault();
    await deleteObjectType(
      apiFacade,
      permId as openbis.EntityTypePermId,
    ).then(() => {
      res.refetch();
      setDeletionMessage(`'${code}' deleted successfully.`);
      setIsSuccess(true);
      setShowMessage(true);
    }).catch((e) => {
      setDeletionMessage(e.message.replace(/\s*\([^)]*\)/g, ''));
      setIsSuccess(false);
      setShowMessage(true);
    }).finally(() => {
      setTimeout(() => {
        setShowMessage(false);
        }, 3000);
    });
  };

  const columns: Column[] = [
    {
      key: "code",
      name: "Code",
      sorting: true,
      align: "start",
    },
    {
      key: "prefix",
      name: "Prefix",
      sorting: false,
      align: "start",
    },
    {
      key: "description",
      name: "Description",
      sorting: false,
      align: "start",
    },
    {
      key: "category",
      name: "Category",
      sorting: false,
      align: "start",
    },
    {
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
    },
  ];

  const rows: TypeRow[] = types.map(
    (type: openbis.SampleType) => {
      const categoryAssignment = type.getPropertyAssignments()
        .find((assignment) => assignment.getPropertyType().getCode() === iLogBaseTypesPropertyCode);

      return {
        permId: type.getPermId(),
        code: type.getCode(),
        prefix: type.getGeneratedCodePrefix(),
        description: type.getDescription(),
        category: categoryAssignment?.getPropertyType().getCode(),
        // TODO: use 'category' to show whether the item it an Instrument or Component
      }
    }
  );

  return (
    <>
      <h2>Type List</h2>
      <List 
        columns={columns}
        rows={rows}
        defaultSortColumn="code"
        navigatePath="/types/creator"
        onDelete={onDelete}
      />
      <MessageModal
        message={deletionMessage}
        isOpen={showMessage}
        isSuccess={isSuccess}
      />
    </>
  );
}

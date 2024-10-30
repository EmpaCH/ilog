import React, { useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/auth/authContext';
import { getObjects, deleteObject } from '../../apis/object/objectAPI';
import openbis from '@openbis/openbis.esm';
import { List } from '../shared/list';
import { Column, ObjectRow } from '../shared/list.types';

export const ObjectList = () => {
  const { apiFacade } = useContext(AuthContext);

  const res = useQuery({
    queryKey: ['getObjects'],
    queryFn: async () => {
      return getObjects(apiFacade);
    },
  });

  const objects = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  const onDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    permId: openbis.ISampleId,
  ) => {
    event.preventDefault();
    await deleteObject(
      apiFacade,
      permId,
    ).then(() => {
      res.refetch();
    });
  };

  const columns: Column[] = [
    {
      key: "name",
      name: "Name",
      sorting: true,
      align: "start",
    },
    {
      key: "type",
      name: "Type",
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

  const rows: ObjectRow[] = objects.map(
    (obj: openbis.Sample) => {
      return {
        permId: obj.getPermId(),
        name: obj.getCode(),
        type: obj.getType().getCode(),
      }
    }
  );

  return (
    <>
      <h2>Object List</h2>
      <List 
        columns={columns}
        rows={rows}
        defaultSortColumn="name"
        navigatePath="/objects/creator"
        onDelete={onDelete}    
      />
    </>
  );
}

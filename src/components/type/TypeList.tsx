import React,  { useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/auth/authContext';
import { getTypes, deleteType } from '../../apis/type/typeAPI';
import openbis from '@openbis/openbis.esm';
import { List } from '../shared/list';
import { Column, TypeRow } from '../shared/list.types';

export const TypeList = () => {
  const { apiFacade } = useContext(AuthContext);

  const res = useQuery({
    queryKey: ['getTypes'],
    queryFn: async () => {
      return getTypes(apiFacade);
    },
  });

  const types = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  const onDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    permId: openbis.IEntityTypeId,
  ) => {
    event.preventDefault();
    await deleteType(
      apiFacade,
      permId,
    ).then(() => {
      res.refetch();
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
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
    },
  ];

  const rows: TypeRow[] = types.map(
    (type: openbis.SampleType) => {
      return {
        permId: type.getPermId(),
        code: type.getCode(),
        prefix: type.getGeneratedCodePrefix(),
        description: type.getDescription(),
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
    </>
  );
}

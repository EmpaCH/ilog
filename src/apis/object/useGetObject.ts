import { useQuery } from '@tanstack/react-query';
import { getObject, getObjectsByCode } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const GET_OBJECT_QUERY_PREFIX = 'GET_OBJECT';
const GET_OBJECTS_BY_CODE_QUERY_PREFIX = 'GET_OBJECTS_BY_CODE';

/** The object with this permId, with its history and type, as a list of zero or one objects */
export const useGetObject = (permId: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_OBJECT_QUERY_PREFIX, permId],
    queryFn: () => {
      return getObject(apiFacade, permId);
    },
    enabled: !!permId && permId !== '',
  });
};

/** The objects with this code. Only for old values that hold a code instead of a permId. */
export const useGetObjectsByCode = (code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_OBJECTS_BY_CODE_QUERY_PREFIX, code],
    queryFn: () => getObjectsByCode(apiFacade, code),
    enabled: !!code,
  });
};

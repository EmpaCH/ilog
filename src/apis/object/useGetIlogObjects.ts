import { useQuery } from '@tanstack/react-query';
import { getIlogObjects } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const GET_ALL_ILOG_OBJECTS_QUERY_PREFIX = "GET_ALL_ILOG_OBJECTS";

export const useGetIlogObjects = () => {
  const { apiFacade, isAuthenticated } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_ILOG_OBJECTS_QUERY_PREFIX],
    enabled: isAuthenticated,
    queryFn: () => {
      return getIlogObjects(apiFacade);
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { getObjectsOfType } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX = "GET_ALL_OBJECTS_OF_TYPE";

export const useGetObjectsOfType = (type: string) => {
  const { apiFacade, isAuthenticated } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX, type],
    enabled: isAuthenticated && !!type,
    queryFn: () => {
      return getObjectsOfType(apiFacade, type);
    },
  });
};

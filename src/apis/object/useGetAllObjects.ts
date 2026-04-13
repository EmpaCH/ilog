import { useQuery } from '@tanstack/react-query';
import { getAllObjects } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const GET_ALL_OBJECTS_QUERY_PREFIX = "GET_ALL_OBJECTS";

export const useGetAllObjects = () => {
  const { apiFacade, isAuthenticated } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX],
    enabled: isAuthenticated,
    queryFn: () => {
      return getAllObjects(apiFacade);
    },
  });
};

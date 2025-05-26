import { useQuery } from '@tanstack/react-query';
import { getTrashedObjects } from './trashcanAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX = "GET_ALL_TRASHED_OBJECTS";

export const useGetTrashedObjects = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX],
    queryFn: () => {
      return getTrashedObjects(apiFacade);
    },
  });
};

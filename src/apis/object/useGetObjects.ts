import { useQuery } from '@tanstack/react-query';
import { getObjects } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

const QUERY_PREFIX = "GET_ALL_OBJECTS";

export const useGetObjects = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: () => {
      return getObjects(apiFacade);
    },
  });
};

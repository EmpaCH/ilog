import { useQuery } from '@tanstack/react-query';
import { getLogbookEntryByPermId } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetLogbookEntryByPermId = (permId: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [permId],
    queryFn: () => {
      return getLogbookEntryByPermId(apiFacade, permId);
    },
  });
};

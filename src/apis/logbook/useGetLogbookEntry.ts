import { useQuery } from '@tanstack/react-query';
import { getLogbookEntry } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetLogbookEntry = (code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [code],
    queryFn: () => {
      return getLogbookEntry(apiFacade, code);
    },
  });
};

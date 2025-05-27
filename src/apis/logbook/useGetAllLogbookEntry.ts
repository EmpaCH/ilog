import { useQuery } from '@tanstack/react-query';
import { getAllLogbookEntries } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

const QUERY_PREFIX = "GET_ALL_LOGBOOK_ENTRIES";

export const useGetAllLogbookEntries = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: () => {
      return getAllLogbookEntries(apiFacade);
    },
  });
};

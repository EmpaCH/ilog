import { useQuery } from '@tanstack/react-query';
import { getAllLogbookEntries } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import { useGetLogbookCollection } from './useLogbookCollection';

export const GET_ALL_QUERY_PREFIX = "GET_ALL_LOGBOOK_ENTRIES";

export const useGetAllLogbookEntries = () => {
  const { apiFacade } = useContext(AuthContext);
  const logbookCollection = useGetLogbookCollection();

  return useQuery({
    queryKey: [GET_ALL_QUERY_PREFIX, logbookCollection.data],
    queryFn: () => {
      return getAllLogbookEntries(apiFacade, logbookCollection.data!);
    },
    // Without a logbook collection there are no logbook entries
    enabled: !!logbookCollection.data,
  });
};

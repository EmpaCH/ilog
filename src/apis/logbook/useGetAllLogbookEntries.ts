import { useQuery } from '@tanstack/react-query';
import { getAllLogbookEntries } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import { getCurrentLabID } from '../shared/environment';

const QUERY_PREFIX = "GET_ALL_LOGBOOK_ENTRIES";

export const useGetAllLogbookEntries = () => {
  const { apiFacade } = useContext(AuthContext);
  const labID = getCurrentLabID();

  return useQuery({
    queryKey: [QUERY_PREFIX, labID],
    queryFn: () => {
      return getAllLogbookEntries(apiFacade, labID);
    },
  });
};

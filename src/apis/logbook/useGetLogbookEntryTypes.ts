import { useQuery } from '@tanstack/react-query';
import { getLogbookEntryTypes } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const LOGBOOK_ENTRY_TYPES_QUERY_PREFIX = "GET_ALL_LOGBOOK_ENTRY_TYPES";

export const useGetLogbookEntryTypes = (search?: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [LOGBOOK_ENTRY_TYPES_QUERY_PREFIX, search],
    queryFn: async () => {
      const types = await getLogbookEntryTypes(apiFacade, search);
      return types.map(type => ({
        key: type.getCode(),
        code: type.getCode(),
        description: type.getDescription(),
        sampleType: type,
      }));
    },
  });
};

import { useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLogbookEntry } from './LogbookEntryAPI';
import { AuthContext } from '../../context/auth/authContext';
import { useGetLogbookCollection } from "./useLogbookCollection";
import { GET_ALL_QUERY_PREFIX } from "./useGetAllLogbookEntries";

export const useCreateLogbookEntry = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const logbookCollection = useGetLogbookCollection();

  return useMutation({
    mutationFn: ({
      type,
      properties,
      parentPermIds,
    }: {
      type: string;
      properties: object;
      parentPermIds?: string[];
    }) => {
      if (!logbookCollection.data) {
        return Promise.reject(new Error('Logbook collection is not set up. Set it up on the logbook page.'));
      }

      return createLogbookEntry(
        apiFacade,
        type,
        properties,
        logbookCollection.data,
        parentPermIds,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_ALL_QUERY_PREFIX] });
    },
  });
};

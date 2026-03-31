import { useMutation } from '@tanstack/react-query';
import { updateLogbookEntry } from './LogbookEntryAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import openbis from "@openbis/openbis.esm";

export const useUpdateLogbookEntry = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: ({
      sampleId,
      properties,
      parentPermIds,
    }: {
      sampleId: openbis.ISampleId;
      properties: object;
      parentPermIds?: string[];
    }) => {
      return updateLogbookEntry(
        apiFacade,
        sampleId,
        properties,
        parentPermIds,
      );
    },
  });
};

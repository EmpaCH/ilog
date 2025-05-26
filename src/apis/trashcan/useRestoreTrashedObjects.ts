import { useMutation, useQueryClient } from '@tanstack/react-query';
import { restoreTrashedObjects } from './trashcanAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import openbis from "@openbis/openbis.esm";
import { GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX } from './useGetTrashedObjects';
import { GET_ALL_OBJECTS_QUERY_PREFIX } from '../object/useGetObjects';

export const RESTORE_TRASHED_OBJECTS_MUTATION_KEY = "RESTORE_TRASHED_OBJECTS_MUTATION_KEY";

export const useRestoreTrashedObjects = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [RESTORE_TRASHED_OBJECTS_MUTATION_KEY],
    mutationFn: async (
      deletionIds: openbis.IDeletionId[],
    ) => {
      return restoreTrashedObjects(
        apiFacade,
        deletionIds,
      );
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX] });
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
    }
  });
};

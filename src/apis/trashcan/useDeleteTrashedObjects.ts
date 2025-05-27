import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTrashedObjects } from './trashcanAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import { GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX } from './useGetTrashedObjects';
import openbis from "@openbis/openbis.esm";

export const DELETE_TRASHED_OBJECTS_MUTATION_KEY = "DELETE_TRASHED_OBJECTS_MUTATION_KEY";

export const useDeleteTrashedObjects = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_TRASHED_OBJECTS_MUTATION_KEY],
    mutationFn: async (
      deletionIds: openbis.IDeletionId[],
    ) => {
      return deleteTrashedObjects(
        apiFacade,
        deletionIds,
      );
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX] });
    }
  });
};

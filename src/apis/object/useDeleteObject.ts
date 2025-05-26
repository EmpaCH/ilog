import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import openbis from "@openbis/openbis.esm";
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetObjects';
import { GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX } from '../trashcan/useGetTrashedObjects';

const DELETE_OBJECT_MUTATION_KEY = "DELETE_OBJECT_MUTATION_KEY";

export const useDeleteObject = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_OBJECT_MUTATION_KEY],
    mutationFn: async (
      sampleId: openbis.SamplePermId,
    ) => {
      return deleteObject(
        apiFacade,
        sampleId,
      );
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
      queryClient.refetchQueries({ queryKey: [GET_ALL_TRASHED_OBJECTS_QUERY_PREFIX] });
    }
  });
};

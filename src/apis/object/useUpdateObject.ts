import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetObjects';
import openbis from "@openbis/openbis.esm";

const UPDATE_OBJECT_MUTATION_KEY = "UPDATE_OBJECT_MUTATION_KEY";

export const useUpdateObject = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_OBJECT_MUTATION_KEY],
    mutationFn: ({
      sampleId,
      properties,
    }: {
      sampleId: openbis.ISampleId;
      properties: object;
    }) => {
      return updateObject(
        apiFacade,
        sampleId,
        properties,
      );
    },
    onSuccess:  () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
    }
  });
};

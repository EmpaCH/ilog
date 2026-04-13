import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import { GET_ALL_ILOG_OBJECTS_QUERY_PREFIX } from './useGetIlogObjects';
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetAllObjects';
import { GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX } from './useGetObjectsOfType';
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
      objectCode,
    }: {
      sampleId: openbis.ISampleId;
      properties: object;
      objectCode?: string;
    }) => {
      return updateObject(
        apiFacade,
        sampleId,
        properties,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_ILOG_OBJECTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX] });
      if (variables.objectCode) {
        queryClient.invalidateQueries({ queryKey: [variables.objectCode] });
      }
    }
  });
};

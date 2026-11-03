import { useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createObject } from './objectAPI';
import { AuthContext } from '../../context/auth/authContext';
import { GET_ALL_ILOG_OBJECTS_QUERY_PREFIX } from './useGetIlogObjects';
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetAllObjects';
import { GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX } from './useGetObjectsOfType';

const CREATE_OBJECT_MUTATION_KEY = "CREATE_OBJECT_MUTATION_KEY";

export const useCreateObject = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [CREATE_OBJECT_MUTATION_KEY],
    mutationFn: async ({
      collectionIdentifier,
      type,
      properties,
    }: {
      collectionIdentifier: string;
      type: string;
      properties: object;
    }) => {
      if (!collectionIdentifier) {
        throw new Error("Please select a collection to store the object in");
      }
      if (!apiFacade) {
        throw new Error("API facade not initialized");
      }

      // Return the permId of the new object so the caller can attach files etc.
      return createObject(apiFacade, type, properties, collectionIdentifier);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_ILOG_OBJECTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX] });
    }
  });
};

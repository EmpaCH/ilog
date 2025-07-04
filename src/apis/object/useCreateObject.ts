import { useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createObject } from './objectAPI';
import { AuthContext } from '../../context/auth/authContext';

import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetObjects';
import openbis from '@openbis/openbis.esm';

const CREATE_OBJECT_MUTATION_KEY = "CREATE_OBJECT_MUTATION_KEY";

export const useCreateObject = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [CREATE_OBJECT_MUTATION_KEY],
    mutationFn: async ({
      type,
      code,
      properties,
      spaceId,
      projectId,
      collectionId,
    }: {
      type: string;
      code: string | null;
      properties: object;
      spaceId: string;
      projectId: string;
      collectionId: string;
    }) => {
      if (!apiFacade) {
        throw new Error("API facade not initialized");
      }
      return createObject(
        apiFacade,
        type,
        code,
        properties,
        new openbis.SpacePermId(spaceId),
        new openbis.ProjectPermId(projectId),
        new openbis.ExperimentPermId(collectionId),
      );
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
    }
  });
};



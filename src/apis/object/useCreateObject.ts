import { useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createObject } from './objectAPI';
import { AuthContext } from '../../context/auth/authContext';
import { useGetSpace } from "../space/useGetSpace";
import { useGetProject } from "../project/useGetProject";
import { useGetCollection } from "../collection/useGetCollection";
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetObjects';
import { iLogID, labID, collectionID } from "../shared/common";

const CREATE_OBJECT_MUTATION_KEY = "CREATE_OBJECT_MUTATION_KEY";

export const useCreateObject = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const space = useGetSpace(labID);
  const project = useGetProject(labID, iLogID);
  const collection = useGetCollection(labID, iLogID, collectionID);

  return useMutation({
    mutationKey: [CREATE_OBJECT_MUTATION_KEY],
    mutationFn: async ({
      type,
      code,
      properties,
    }: {
      type: string;
      code: string;
      properties: object;
    }) => {
      if (!space.data || !project.data || !collection.data) {
        throw new Error("Space, project or collection not initialized");
      }
      if (!apiFacade) {
        throw new Error("API facade not initialized");
      }
      return createObject(
        apiFacade,
        type,
        code,
        properties,
        space.data.getPermId(),
        project.data.getPermId(),
        collection.data.getPermId(),
      );
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
    }
  });
};

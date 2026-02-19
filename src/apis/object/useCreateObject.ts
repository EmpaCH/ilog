import { useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import openbis from '@openbis/openbis.esm';
import { createObject } from './objectAPI';
import { AuthContext } from '../../context/auth/authContext';
import { useGetSpace } from "../space/useGetSpace";
import { useGetProject } from "../project/useGetProject";
import { useGetCollection } from "../collection/useGetCollection";
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetObjects';
import { iLogID, labID, componentCollectionID, instrumentCollectionID } from "../shared/common";

const CREATE_OBJECT_MUTATION_KEY = "CREATE_OBJECT_MUTATION_KEY";

export const useCreateObject = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const space = useGetSpace(labID);
  const project = useGetProject(labID, iLogID);
  const componentCollection = useGetCollection(labID, iLogID, componentCollectionID);
  const instrumentCollection = useGetCollection(labID, iLogID, instrumentCollectionID);

  return useMutation({
    mutationKey: [CREATE_OBJECT_MUTATION_KEY],
    mutationFn: async ({
      collection,
      type,
      properties,
    }: {
      collection: string;
      type: string;
      properties: object;
    }) => {
      if (!space.data || !project.data || !componentCollection.data || !instrumentCollection.data) {
        throw new Error("Space, project or collections not initialized");
      }
      if (!apiFacade) {
        throw new Error("API facade not initialized");
      }
      
      // Create the object
      await createObject(
        apiFacade,
        type,
        properties,
        space.data.getPermId(),
        project.data.getPermId(),
        collection === componentCollectionID ? componentCollection.data.getPermId() : instrumentCollection.data.getPermId(),
      );
      
      // Return success - the UI will refetch objects naturally
      return "success";
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
    }
  });
};

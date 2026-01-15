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
      await createObject(
        apiFacade,
        type,
        properties,
        space.data.getPermId(),
        project.data.getPermId(),
        collection === componentCollectionID ? componentCollection.data.getPermId() : instrumentCollection.data.getPermId(),
      );
      
      // Query the newly created object to get its code
      // Get all objects and return the code of the most recently created one
      const sc = new openbis.SampleSearchCriteria();
      sc.withExperiment().withCode().thatEquals(collection);
      const fo = new openbis.SampleFetchOptions();
      fo.withType();
      const result = await apiFacade.searchSamples(sc, fo);
      const objects = result.getObjects();
      // Return the code of the last object (most recently created)
      return objects.length > 0 ? objects[objects.length - 1].getCode() : "";
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
    }
  });
};

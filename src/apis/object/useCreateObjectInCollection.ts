import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetCollection } from "../collection/useGetCollection";
import { useGetProject } from "../project/useGetProject";
import { useGetSpace } from "../space/useGetSpace";
import { useCreateObject } from "./useCreateObject";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { wrapMutationWithResolver } from "../shared/wrappers";
import { createObject } from "./objectAPI";
import { GET_ALL_OBJECTS_QUERY_PREFIX } from "./useGetObjects";
import openbis from "@openbis/openbis.esm";

export const CREATE_OBJECT_MUTATION_KEY = "CREATE_OBJECT";
type DomainInput = {
  type: string;
  code: string | null;
  properties: object;
};

type InternalInput = DomainInput & {
  spaceId: openbis.SpacePermId;
  projectId: openbis.ProjectPermId;
  collectionId: openbis.ExperimentPermId;
};
export const useCreateObjectInCollection = (
  space: string,
  project: string,
  collection: string
) => {
  const { apiFacade } = useContext(AuthContext);
  const spaceQuery = useGetSpace(space);
  const projectQuery = useGetProject(space, project);
  const collectionQuery = useGetCollection(space, project, collection);
  const queryClient = useQueryClient();
  //Check that the query is ready
  const isReady =
    apiFacade && spaceQuery.data && projectQuery.data && collectionQuery.data;

  //Resolve the openbis ids
  const resolve = (input: DomainInput): InternalInput => {
    if (!isReady) throw new Error("OpenBIS context not ready");
    return {
      ...input,
      spaceId: spaceQuery.data!.getPermId(),
      projectId: projectQuery.data!.getPermId(),
      collectionId: collectionQuery.data!.getPermId(),
    };
  };

  const mutation = wrapMutationWithResolver<
    DomainInput,
    InternalInput,
    unknown
  >(
    ({ type, code, properties, spaceId, projectId, collectionId }) => {
      if (!apiFacade) throw new Error("API not initialized");
      return createObject(
        apiFacade,
        type,
        code,
        properties,
        spaceId,
        projectId,
        collectionId
      );
    },
    resolve,
    {
      mutationKey: [CREATE_OBJECT_MUTATION_KEY],
      onSuccess: () => {
        queryClient.refetchQueries({
          queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX],
        });
      },
    }
  );

  return {
    ...mutation,
    isReady: !!isReady,
    isLoading:
      spaceQuery.isLoading ||
      projectQuery.isLoading ||
      collectionQuery.isLoading,
  };
};

import { useEffect, useState } from "react";
import { useGetObject } from "./useGetObject";
import { useCreateObject } from "./useCreateObject";
import openbis from "@openbis/openbis.esm";
import { useGetSpacePermId } from "../space/useGetSpacePermId";
import { useGetCollectionPermId } from "../collection/useGetCollectionPermId";
import { useGetProjectPermId } from "../project/useGetProjectPermId";

export const useGetOrCreateObject = (
  code: string,
  type: string,
  space: string,
  project: string,
  collection: string,
  properties?: object | null
) => {
  const [object, setObject] = useState<openbis.SamplePermId | null>(null);
  const [requested, setRequested] = useState(false);

  const { data: existingObjects, isSuccess, isLoading } = useGetObject(code);
  const { permId: spacePermId, isSuccess: spaceAvailable } =
    useGetSpacePermId(space);
  const { permId: collectionPermId, isSuccess: collectionAvailable } =
    useGetCollectionPermId(space, project, collection);
  const { permId: projectPermId, isSuccess: projectAvailable } =
    useGetProjectPermId(space, project);
  const {
    mutateAsync: createObject,
    isPending: isCreating,
    error: createError,
  } = useCreateObject();
  const newProps = properties ?? {};

  useEffect(() => {
    if (!requested && isSuccess) {
      setRequested(true); // ensure this runs only once

      if (existingObjects.length > 0) {
        setObject(existingObjects[0].getPermId());
      } else {
        if (
          spaceAvailable &&
          collectionAvailable &&
          projectAvailable &&
          spacePermId !== undefined &&
          collectionPermId !== undefined &&
          projectPermId !== undefined
        ) {
          createObject({
            type: type,
            code: code,
            properties: newProps,
            spaceId: spacePermId?.getPermId(),
            projectId: projectPermId?.getPermId(),
            collectionId: collectionPermId?.getPermId(),
          }).then(setObject);
        }
      }
    }
  }, [
    isSuccess,
    requested,
    existingObjects,
    createObject,
    type,
    code,
    properties,
    space,
    project,
    collection,
  ]);

  return {
    data: object,
    isLoading: isLoading || isCreating || !requested,
    error: createError,
  };
};

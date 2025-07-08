import { useGetCollection } from "./useGetCollection";

export const useGetCollectionPermId = (space: string, project: string, collection: string) => {
  const {
    data: collectionResult,
    isSuccess,
    ...rest
  } = useGetCollection(space, project, collection);
  const permId = isSuccess ? collectionResult?.getPermId() : undefined;

  return { permId, isSuccess, ...rest };
};

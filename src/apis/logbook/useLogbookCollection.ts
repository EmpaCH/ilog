import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/auth/authContext";
import {
  NewLogbookCollection,
  createLogbookCollection,
  getLogbookCollection,
  setLogbookCollection,
} from "./logbookCollectionAPI";
import { GET_ALL_COLLECTIONS_QUERY_PREFIX } from "../collection/useGetCollections";

export const LOGBOOK_COLLECTION_QUERY_PREFIX = "GET_LOGBOOK_COLLECTION";

export const useGetLogbookCollection = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [LOGBOOK_COLLECTION_QUERY_PREFIX],
    queryFn: () => getLogbookCollection(apiFacade),
    // A missing setting or collection is reported to the user, so don't keep retrying
    retry: 1,
  });
};

/**
 * Set up the logbook collection, either by using an existing collection
 * or by creating a new one (including its space and project if needed).
 */
export const useSetupLogbookCollection = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      setup: { existing: string } | { create: NewLogbookCollection }
    ) => {
      const collectionIdentifier = "existing" in setup
        ? setup.existing
        : await createLogbookCollection(apiFacade, setup.create);
      await setLogbookCollection(apiFacade, collectionIdentifier);
      return collectionIdentifier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOGBOOK_COLLECTION_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_COLLECTIONS_QUERY_PREFIX] });
    },
  });
};

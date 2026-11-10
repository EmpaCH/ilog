import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/auth/authContext";
import {
  NewLogbookCollection,
  countLogbookEntries,
  createLogbookCollection,
  getLogbookCollection,
  getLogbookCollectionSetting,
  moveLogbookEntries,
  setLogbookCollection,
} from "./logbookCollectionAPI";
import { GET_ALL_COLLECTIONS_QUERY_PREFIX } from "../collection/useGetCollections";
import { GET_ALL_QUERY_PREFIX } from "./useGetAllLogbookEntries";

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
 * The configured logbook collection, whether it exists and how many entries it holds, for the Settings page.
 */
export const useLogbookCollectionSetting = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [LOGBOOK_COLLECTION_QUERY_PREFIX, "setting"],
    queryFn: async () => {
      const setting = await getLogbookCollectionSetting(apiFacade);
      const entryCount = setting.identifier && setting.exists
        ? await countLogbookEntries(apiFacade, setting.identifier)
        : 0;
      return { ...setting, entryCount };
    },
    retry: 1,
    refetchOnMount: "always",
  });
};

/**
 * Set the logbook collection, either to an existing collection or to a new one (including its
 * space and project if needed). Optionally moves the entries of the previous collection to it first,
 * so the setting only changes once the entries are moved.
 */
export const useSetupLogbookCollection = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      setup,
      moveEntriesFrom,
    }: {
      setup: { existing: string } | { create: NewLogbookCollection };
      moveEntriesFrom?: string;
    }) => {
      const collectionIdentifier = "existing" in setup
        ? setup.existing
        : await createLogbookCollection(apiFacade, setup.create);
      const movedEntries = moveEntriesFrom && moveEntriesFrom !== collectionIdentifier
        ? await moveLogbookEntries(apiFacade, moveEntriesFrom, collectionIdentifier)
        : 0;
      await setLogbookCollection(apiFacade, collectionIdentifier);
      return { collectionIdentifier, movedEntries };
    },
    onSettled: () => {
      // Also after an error: a collection may have been created or entries moved before it happened
      queryClient.invalidateQueries({ queryKey: [LOGBOOK_COLLECTION_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_COLLECTIONS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_QUERY_PREFIX] });
    },
  });
};

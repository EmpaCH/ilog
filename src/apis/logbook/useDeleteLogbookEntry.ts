import openbis from "@openbis/openbis.esm";
import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/auth/authContext";
import { deleteLogbookEntry } from "./LogbookEntryAPI";
import { GET_ALL_QUERY_PREFIX } from "./useGetAllLogbookEntries";

export const DELETE_LOGBOOK_ENTRY_MUTATION_KEY = "DELETE_LOGBOOK_ENTRY_MUTATION_KEY";

export const useDeleteLogbookEntry = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_LOGBOOK_ENTRY_MUTATION_KEY],
    mutationFn: async (id: openbis.SamplePermId) => {
      await deleteLogbookEntry(apiFacade, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_ALL_QUERY_PREFIX] });
    }
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { setObjectTypeCategory } from "./typeAPI";
import { ALL_OBJECT_TYPES_QUERY_PREFIX } from "./useGetAllObjectTypes";
import { ILOG_OBJECT_TYPES_QUERY_PREFIX } from "./useGetIlogObjectTypes";
import { LOGBOOK_ENTRY_TYPES_QUERY_PREFIX } from "../logbook/useGetLogbookEntryTypes";

export const useSetObjectTypeCategory = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ codes, category }: { codes: string[]; category: string }) => {
      for (const code of codes) {
        await setObjectTypeCategory(apiFacade, code, category);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALL_OBJECT_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [ILOG_OBJECT_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [LOGBOOK_ENTRY_TYPES_QUERY_PREFIX] });
    },
  });
};

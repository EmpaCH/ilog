import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/auth/authContext";
import { useContext } from "react";
import openbis from "@openbis/openbis.esm";
import { deleteObjectType } from "./typeAPI";
import { ILOG_OBJECT_TYPES_QUERY_PREFIX } from "./useGetIlogObjectTypes";
import { LOGBOOK_ENTRY_TYPES_QUERY_PREFIX } from "../logbook/useGetLogbookEntryTypes";

export const DELETE_OBJECT_TYPE_MUTATION_KEY = "DELETE_OBJECT_TYPE_MUTATION_KEY";

export const useDeleteObjectType = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_OBJECT_TYPE_MUTATION_KEY],
    mutationFn: async (typeId: string) => {
      await deleteObjectType(apiFacade, new openbis.EntityTypePermId(typeId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ILOG_OBJECT_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [LOGBOOK_ENTRY_TYPES_QUERY_PREFIX] });
    }
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/auth/authContext";
import { useContext } from "react";
import openbis from "@openbis/openbis.esm";
import { ILOG_OBJECT_TYPES_QUERY_PREFIX } from "./useGetIlogObjectTypes";

export const DELETE_OBJECT_TYPE_MUTATION_KEY = "DELETE_OBJECT_TYPE_MUTATION_KEY";

export const useDeleteObjectType = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_OBJECT_TYPE_MUTATION_KEY],
    mutationFn: async (typeId: string) => {
      const stdo = new openbis.SampleTypeDeletionOptions();
      stdo.setReason("Type no longer needed.");
      await apiFacade.deleteSampleTypes([new openbis.EntityTypePermId(typeId)], stdo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ILOG_OBJECT_TYPES_QUERY_PREFIX] });
    }
  });
};

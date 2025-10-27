import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../context/auth/authContext";
import { useContext } from "react";
import openbis from "@openbis/openbis.esm";
import { ALL_OBJECT_TYPES_QUERY_PREFIX } from "./useGetAllObjectTypes";

export const DELETE_OBJECT_TYPE_MUTATION_KEY = "DELETE_OBJECT_TYPE_MUTATION_KEY";

export const useDeleteObjectType = () => {
  const { apiFacade, isAuthenticated } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_OBJECT_TYPE_MUTATION_KEY],
    mutationFn: async (typeId: string) => {
      const stdo = new openbis.SampleTypeDeletionOptions();
      stdo.setReason("Type no longer needed.");
      console.log("useDeleteObjectType", typeId, isAuthenticated);
      await apiFacade.deleteSampleTypes([new openbis.EntityTypePermId(typeId)], stdo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALL_OBJECT_TYPES_QUERY_PREFIX] });
    }
  });
};

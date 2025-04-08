import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import { GET_ALL_SPACES_QUERY_PREFIX, useGetSpaces } from "./useGetSpaces";

export const useCreateSpace = (code: string, description: string) => {
  const { apiFacade } = useContext(AuthContext);
  const existingSpacesResult = useGetSpaces();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (existingSpacesResult.isSuccess) {
        const creation = new openbis.SpaceCreation();
        creation.setCode(code);
        creation.setDescription(description);
        if (
          !existingSpacesResult.data.some((space) => space.getCode() === code)
        ) {
          await apiFacade.createSpaces([creation]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_SPACES_QUERY_PREFIX],
      });
    },
  });
};

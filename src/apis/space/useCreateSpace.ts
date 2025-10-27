import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import { GET_ALL_SPACES_QUERY_PREFIX, fetchSpaces } from "./useGetSpaces";

export const useCreateSpace = (code: string, description: string) => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const existingSpaces = await fetchSpaces(apiFacade);
      const spaceExists = existingSpaces.some((space: any) => space.getCode() === code);

      if (!spaceExists) {
        const creation = new openbis.SpaceCreation();
        creation.setCode(code);
        creation.setDescription(description);
        await apiFacade.createSpaces([creation]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_SPACES_QUERY_PREFIX],
      });
    },
  });
};

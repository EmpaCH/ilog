import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { setObjectTypeCollectionType } from "./typeAPI";
import { ALL_OBJECT_TYPES_QUERY_PREFIX } from "./useGetAllObjectTypes";

export const useSetObjectTypeCollectionType = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ codes, collectionType }: { codes: string[]; collectionType: string }) => {
      for (const code of codes) {
        await setObjectTypeCollectionType(apiFacade, code, collectionType);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALL_OBJECT_TYPES_QUERY_PREFIX] });
    },
  });
};

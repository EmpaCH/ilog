import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { GET_AFS_FILES_QUERY_PREFIX } from "./useGetAFSFiles";

export const useDeleteAFSFile = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      owner,
      path,
    }: {
      owner: string;
      path: string;
    }) => {
      try {
        const afsFacade = apiFacade.getAfsServerFacade();
        const res = await afsFacade.delete(
          owner,
          path,
        );
        if (res) {
          return res;
        } else {
          throw new Error("Cannot delete file");
        }
      } catch (e) {
        throw e;
      }
    },
    onSuccess(_data, variables, _context) {
      queryClient.invalidateQueries({
        queryKey: [GET_AFS_FILES_QUERY_PREFIX, variables.owner, variables.path],
      });
    },
  });
};

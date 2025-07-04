import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { GET_AFS_FILES_QUERY_PREFIX } from "./useGetAFSFiles";

export const useCreateAFSFile = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      owner,
      file,
      path,
    }: {
      owner: string;
      file: File;
      path: string;
    }) => {
      try {
        const afsFacade = apiFacade.getAfsServerFacade();
        const res = await afsFacade.write(
          owner,
          path,
          file.size,
          "test content"
        );
        if (res) {
          return path;
        } else {
          throw new Error("Cannot create file");
        }
      } catch (e) {
        throw e;
      }
    },
    onSuccess(_data, variables, _context) {
      queryClient.invalidateQueries({
        queryKey: [GET_AFS_FILES_QUERY_PREFIX, variables.owner, variables.path + File.name],
      });
    },
  });
};

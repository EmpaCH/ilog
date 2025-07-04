import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

export const GET_AFS_FILES_QUERY_PREFIX = "GET_AFS_FILES";
export const useGetAFSFiles = (owner: string, path: string, recursive: boolean) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_AFS_FILES_QUERY_PREFIX, owner, path],
    queryFn: async () => {
      const afsFacade = apiFacade.getAfsServerFacade();
      console.log("Fetching files");
      const res = await afsFacade.list(owner, path, recursive)
      return res;
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import {
  GET_ALL_DATASETS_QUERY_PREFIX,
  useGetDataSets,
} from "./useGetDataSets";
import { useGetProjects } from "../project/useGetProjects";

export const useCreateDataSet = (
  object: string,
  code: string,
  description: string,
  type: string
) => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const dsFacade: openbis.OpenBISJavaScriptDSSFacade =
        apiFacade.getDataStoreFacade(["DSS1"]);
      const uploadId = await dsFacade.uploadFilesWorkspaceDSS([file]);
      return uploadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_DATASETS_QUERY_PREFIX],
      });
    },
  });
};

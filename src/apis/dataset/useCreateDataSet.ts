import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import {
  GET_ALL_DATASETS_QUERY_PREFIX,
  useGetDataSets,
} from "./useGetDataSets";
import { useGetProjects } from "../project/useGetProjects";

export const WORKSPACE_FILES_KEY = "workspace-files"

export const useUploadWorkspace = () => {
  const queryClient = useQueryClient();
  const { apiFacade, token, url: openBISUrl } = useContext(AuthContext);
  console.log(openBISUrl);
  return useMutation({
    mutationFn: async (file: File) => {
      const url = new URL(`${openBISUrl}openbis/file-service/eln-lims`, window.location.origin);
      console.log(url)
      url.searchParams.set('type', 'Files');
      url.searchParams.set('id', '1'); // replace with actual object/sample ID
      url.searchParams.set('sessionID', token);
      url.searchParams.set('startByte', '0');
      url.searchParams.set('endByte', '0');

      const formData = new FormData();
      formData.append('upload', file);

      const response = await fetch(url.toString().replace(url.protocol, ""), {
        method: 'POST',
        body: formData,
        credentials: 'include', // if openBIS relies on session cookies
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      return await response.json(); // or response.text() if openBIS doesn't return JSON
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKSPACE_FILES_KEY] });
    },
  });
};

export const useCreateDataSet = (
  object: string,
  code: string,
  description: string,
  type: string
) => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const upload = useUploadWorkspace()
  return useMutation({
    mutationFn: async (file: File) => {
      const dsFacade: openbis.OpenBISJavaScriptDSSFacade = apiFacade.getDataStoreFacade(["DSS1"]);
      const uploadId = await upload.mutateAsync(file)
      return uploadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_DATASETS_QUERY_PREFIX],
      });
    },
  });
};

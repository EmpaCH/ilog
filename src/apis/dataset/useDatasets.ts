import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { 
  uploadFileAsDataset, 
  getSampleDatasets, 
  getDatasetFileDownloadUrl, 
  deleteDataset 
} from "./datasetAPI";

export const DATASET_QUERY_PREFIX = "DATASET";

/**
 * Hook to upload a file as a dataset
 */
export const useUploadDataset = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      samplePermId,
      file,
      datasetTypeCode,
    }: {
      samplePermId: string;
      file: File;
      datasetTypeCode?: string;
    }) => {
      return uploadFileAsDataset(apiFacade, samplePermId, file, datasetTypeCode);
    },
    onSuccess: (_, variables) => {
      // Invalidate datasets query for this sample
      queryClient.invalidateQueries({
        queryKey: [DATASET_QUERY_PREFIX, "sample", variables.samplePermId],
      });
    },
  });
};

/**
 * Hook to get datasets for a sample
 */
export const useSampleDatasets = (samplePermId: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [DATASET_QUERY_PREFIX, "sample", samplePermId],
    queryFn: () => getSampleDatasets(apiFacade, samplePermId),
    enabled: !!samplePermId,
  });
};

/**
 * Hook to delete a dataset
 */
export const useDeleteDataset = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ datasetPermId }: { datasetPermId: string }) => {
      return deleteDataset(apiFacade, datasetPermId);
    },
    onSuccess: () => {
      // Invalidate all dataset queries
      queryClient.invalidateQueries({
        queryKey: [DATASET_QUERY_PREFIX],
      });
    },
  });
};

/**
 * Hook to get download URL for a dataset file
 */
export const useDatasetFileDownloadUrl = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({
      datasetPermId,
      filePath,
    }: {
      datasetPermId: string;
      filePath?: string;
    }) => {
      return getDatasetFileDownloadUrl(apiFacade, datasetPermId, filePath);
    },
  });
};
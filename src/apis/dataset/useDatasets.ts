import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { 
  uploadFileAsDataset, 
  getSampleDatasets, 
  getDatasetFileDownloadUrl, 
  deleteDataset,
  getPreviewImageInfo,
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
      // Invalidate datasets and preview queries for this sample
      queryClient.invalidateQueries({
        queryKey: [DATASET_QUERY_PREFIX, "sample", variables.samplePermId],
      });
      queryClient.invalidateQueries({
        queryKey: [DATASET_QUERY_PREFIX, "preview", variables.samplePermId],
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

/**
 * Hook to load preview image URLs for a list of sample permIds in parallel.
 * Returns a map of samplePermId -> URL string (or null if no preview).
 * Results cached by TanStack Query with a 5-minute stale time.
 */
export const usePreviewImages = (
  samplePermIds: string[],
  sessionToken: string | undefined
): { data: Record<string, string | null>; isLoaded: boolean } => {
  const { apiFacade } = useContext(AuthContext);

  const results = useQueries({
    queries: samplePermIds.map((permId) => ({
      queryKey: [DATASET_QUERY_PREFIX, "preview", permId],
      queryFn: () => getPreviewImageInfo(apiFacade, permId),
      staleTime: 5 * 60 * 1000,
      enabled: !!permId && !!sessionToken,
    })),
  });

  const isLoaded = results.every((r) => !r.isPending);

  const data: Record<string, string | null> = {};
  samplePermIds.forEach((permId, i) => {
    const info = results[i].data;
    if (info && sessionToken) {
      const encodedPath = info.filePath.split('/').map(encodeURIComponent).join('/');
      data[permId] = `/datastore_server/${info.datasetPermId}/${encodedPath}?sessionID=${encodeURIComponent(sessionToken)}`;
    } else {
      data[permId] = null;
    }
  });

  return { data, isLoaded };
};
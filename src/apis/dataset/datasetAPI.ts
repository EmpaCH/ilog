import openbis from "@openbis/openbis.esm";

/**
 * Upload a file as a dataset attached to a sample
 * @param api - The OpenBIS JavaScript facade instance
 * @param samplePermId - The permanent ID of the sample to attach the dataset to
 * @param file - The file to upload
 * @param datasetTypeCode - The dataset type code (should be "ELN_PREVIEW" for images)
 * @returns Promise<string> - The permanent ID of the created dataset
 */
export async function uploadFileAsDataset(
  api: openbis.OpenBISJavaScriptFacade,
  samplePermId: string,
  file: File,
  datasetTypeCode: string = "ELN_PREVIEW"
): Promise<string> {
  try {    
    // Ensure we're using ELN_PREVIEW for image uploads
    if (datasetTypeCode !== "ELN_PREVIEW") {
      datasetTypeCode = "ELN_PREVIEW";
    }
    // Check for existing datasets and clean up ELN_PREVIEW duplicates
    const existingDatasets = await getSampleDatasets(api, samplePermId);
    // Delete existing ELN_PREVIEW datasets to ensure only one image per object
    const existingPreviews = existingDatasets.filter(ds => 
      ds.getType()?.getCode() === "ELN_PREVIEW"
    );

    if (existingPreviews.length > 0) {
      for (const dataset of existingPreviews) {
        try {
          await deleteDataset(api, dataset.getPermId().getPermId());
        } catch (deleteError) {
          console.warn(`Failed to delete dataset ${dataset.getPermId().getPermId()}:`, deleteError);
        }
      }
    }

    const sessionToken = (api as any)?._private?.sessionToken;
    if (!sessionToken) {
      throw new Error('No session token available');
    }

    // Generate unique upload ID
    const generateUploadId = () => {
      const d = new Date()
      const pad = (n: number, w: number) => String(n).padStart(w, '0')
      const ts =
        d.getFullYear() +
        pad(d.getMonth() + 1, 2) +
        pad(d.getDate(), 2) +
        pad(d.getHours(), 2) +
        pad(d.getMinutes(), 2) +
        pad(d.getSeconds(), 2)
      const rand = pad(Math.round(Math.random() * 100000), 5)
      return `upload-${ts}-${rand}`
    }

    // Upload file to session workspace using the correct endpoint from upload.tsx
    const uploadFileToSessionWorkspace = async (uploadId: string, file: File) => {
      const chunkSize = 1024 * 1024
      const relativeName = file.webkitRelativePath || file.name
      const filenameParam = encodeURIComponent(`${uploadId}/${relativeName}`)
      const size = file.size

      // Use chunked upload like in upload.tsx
      for (let startByte = 0; startByte < size; startByte += chunkSize) {
        const endByte = Math.min(startByte + chunkSize, size)
        const url =
          `/datastore_server/session_workspace_file_upload` +
          `?sessionID=${encodeURIComponent(sessionToken)}` +
          `&filename=${filenameParam}` +
          `&id=1` +
          `&startByte=${startByte}` +
          `&endByte=${endByte}` +
          `&size=${size}` +
          `&emptyFolder=false`

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: file.slice(startByte, endByte),
        })
        
        if (!resp.ok) {
          const body = await resp.text().catch(() => '')
          throw new Error(`DSS upload failed (${relativeName}): HTTP ${resp.status} ${resp.statusText}. ${body}`)
        }
      }
    }

    // Create uploaded dataset using direct DSS call
    const createUploadedDataSetDirect = async (creation: openbis.UploadedDataSetCreation) => {
      const priv = (api as any)?._private
      if (!priv?.ajaxRequest) {
        throw new Error('openBIS client cannot access internal ajaxRequest for direct DSS call')
      }

      return priv.ajaxRequest({
        url: '/datastore_server/rmi-data-store-server-v3.json',
        data: {
          method: 'createUploadedDataSet',
          params: [sessionToken, creation],
        },
        returnType: { name: 'DataSetPermId' },
      })
    }

    // Step 1: Upload file to session workspace
    const uploadId = generateUploadId()
    await uploadFileToSessionWorkspace(uploadId, file)

    // Step 2: Create dataset with uploaded file
    const datasetCreation = new openbis.UploadedDataSetCreation();
    datasetCreation.setUploadId(uploadId);
    datasetCreation.setTypeId(new openbis.EntityTypePermId(datasetTypeCode.trim(), openbis.EntityKind.DATA_SET));
    datasetCreation.setSampleId(new openbis.SamplePermId(samplePermId));

    const createdPermId = await createUploadedDataSetDirect(datasetCreation);
    const datasetPermId = typeof (createdPermId as any)?.getPermId === 'function'
      ? String((createdPermId as any).getPermId())
      : String(createdPermId);

    return datasetPermId;
  } catch (error) {    
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Check if it's an openBIS-specific error
    if (error && typeof error === 'object' && 'message' in error) {
      console.error("openBIS error details:", error);
    }

    throw new Error(`Dataset upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all datasets attached to a sample
 * @param api - The OpenBIS JavaScript facade instance
 * @param samplePermId - The permanent ID of the sample
 * @returns Promise<openbis.DataSet[]> - Array of datasets
 */
export async function getSampleDatasets(
  api: openbis.OpenBISJavaScriptFacade,
  samplePermId: string
): Promise<openbis.DataSet[]> {
  try {    
    const sc = new openbis.DataSetSearchCriteria();
    const fo = new openbis.DataSetFetchOptions();
    sc.withSample().withPermId().thatEquals(samplePermId);
    fo.withType();
    fo.withSample();

    const result = await api.searchDataSets(sc, fo);
    const datasets = result.getObjects();
    return datasets;
  } catch (error) {
    throw error;
  }
}

/**
 * Get the actual image filename from an ELN_PREVIEW dataset using DSS API
 * @param api - The OpenBIS JavaScript facade instance
 * @param datasetPermId - The permanent ID of the dataset
 * @returns Promise<string | null> - The filename if found, null otherwise
 */
async function getImageFilenamviaAPI(
  api: openbis.OpenBISJavaScriptFacade,
  datasetPermId: string
): Promise<string | null> {
  try {
    const priv = (api as any)?._private;
    if (!priv?.ajaxRequest || !priv?.sessionToken) {
      return null;
    }

    // Call the DSS listFilesForDataSet API
    // This returns a list of all files in the dataset
    let result: any;
    try {
      result = await priv.ajaxRequest({
        url: '/datastore_server/rmi-dss-api-v1.json',
        data: {
          method: 'listFilesForDataSet',
          params: [priv.sessionToken, datasetPermId, "/", true], // list all files recursively
        },
        // Don't specify returnType - let it return raw JSON
      });
    } catch (deserializeError) {
      // If deserialization fails, try making a raw fetch instead
      const response = await fetch('/datastore_server/rmi-dss-api-v1.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'listFilesForDataSet',
          params: [priv.sessionToken, datasetPermId, "/", true],
          id: '1',
          jsonrpc: '2.0'
        })
      });

      if (!response.ok) {
        throw new Error(`DSS API failed: ${response.status}`);
      }

      const json = await response.json();
      result = json.result;
    }

    if (!result || !Array.isArray(result)) {
      return null;
    }

    // Find the first image file (not a directory)
    const imageFile = result.find((file: any) => {
      // Handle both object methods and plain properties
      const isDir = typeof file.isDirectory === 'function' 
        ? file.isDirectory() 
        : file.isDirectory;

      if (isDir) return false;

      const path = file.pathInDataSet || file.pathInListing || '';
      return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(path);
    });

    if (imageFile) {
      const filename = imageFile.pathInDataSet || imageFile.pathInListing;
      // Extract just the filename part (after the last /)
      // e.g., "original/Magnet 0.14T.jpg" -> "Magnet 0.14T.jpg"
      const lastSlash = filename.lastIndexOf('/');
      const justFilename = lastSlash >= 0 ? filename.substring(lastSlash + 1) : filename;

      return justFilename;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the actual image filename from an ELN_PREVIEW dataset object
 * @param dataset - The dataset object returned from getSampleDatasets
 * @param api - The OpenBIS facade for API calls (used to fetch via DSS)
 * @returns Promise<string | null> - The filename if found, null otherwise
 */
export async function getDatasetImageFilenameFromObject(
  dataset: openbis.DataSet,
  api?: openbis.OpenBISJavaScriptFacade
): Promise<string | null> {
  try {
    const datasetPermId = dataset.getPermId().getPermId();

    // Primary method: try to fetch via DSS API
    if (api) {
      const apiFilename = await getImageFilenamviaAPI(api, datasetPermId);
      if (apiFilename) {
        return apiFilename;
      }
    }

    // Fallback: try to get from dataset object metadata
    try {
      const physicalData = dataset.getPhysicalData?.();
      if (physicalData) {
        const files = physicalData.getFiles?.();
        if (files && files.length > 0) {
          const imageFile = files.find((file: any) => {
            const path = file.getRelativePath?.() || file.getPath?.();
            return path && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(path);
          });

          if (imageFile) {
            const filename = imageFile.getRelativePath?.() || imageFile.getPath?.();
            return filename;
          }
        }
      }
    } catch (innerError) {
      console.log("Could not access physical data:", (innerError as Error).message);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get download URL for a dataset file
 * @param api - The OpenBIS JavaScript facade instance
 * @param datasetPermId - The permanent ID of the dataset
 * @param filePath - The path to the file within the dataset (optional, defaults to all files)
 * @returns Promise<string> - Download URL
 */
export async function getDatasetFileDownloadUrl(
  api: openbis.OpenBISJavaScriptFacade,
  datasetPermId: string,
  filePath?: string
): Promise<string> {
  try {
    // For openBIS datasets, we can construct a direct download URL
    // This assumes the standard openBIS file server setup
    const baseUrl = (api as any)._private?.url || '';
    const downloadUrl = `${baseUrl}/datastore_server/store_share_file_download?sessionID=${(api as any)._private?.sessionToken}&method=getDataSetFilesFromStore&dataSetCode=${datasetPermId}`;
    
    return downloadUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a dataset
 * @param api - The OpenBIS JavaScript facade instance
 * @param datasetPermId - The permanent ID of the dataset to delete
 */
export async function deleteDataset(
  api: openbis.OpenBISJavaScriptFacade,
  datasetPermId: string
): Promise<void> {
  try {
    const deletionOptions = new openbis.DataSetDeletionOptions();
    deletionOptions.setReason("Image removed by user");
    
    await api.deleteDataSets([new openbis.DataSetPermId(datasetPermId)], deletionOptions);
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
}
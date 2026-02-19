import React, { useState, useEffect } from "react";
import { Card, Button, Input, Progress, Image } from "@heroui/react";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { useUploadDataset, useSampleDatasets, useDeleteDataset, useDatasetFileDownloadUrl } from "../../apis/dataset/useDatasets";
import openbis from "@openbis/openbis.esm";

interface ImageDatasetEditorProps {
  samplePermId: string;
  datasetTypeCode?: string;
  acceptedTypes?: string;
  maxSizeBytes?: number;
  onImageUploaded?: (datasetPermId: string) => void;
  onImageDeleted?: (datasetPermId: string) => void;
}

interface ImageDataset {
  datasetPermId: string;
  fileName: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

export const ImageDatasetEditor: React.FC<ImageDatasetEditorProps> = ({
  samplePermId,
  datasetTypeCode = "ELN_PREVIEW",
  acceptedTypes = "image/*",
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  onImageUploaded,
  onImageDeleted,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageDataset[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const uploadMutation = useUploadDataset();
  const deleteMutation = useDeleteDataset();
  const downloadUrlMutation = useDatasetFileDownloadUrl();
  const { data: datasets, isLoading, refetch } = useSampleDatasets(samplePermId);

  // Debug logging when component loads or datasets change
  useEffect(() => {
    if (samplePermId) {
      if (datasets && datasets.length > 0) {
        datasets.forEach((dataset, index) => {
          const type = dataset.getType()?.getCode();
          const permId = dataset.getPermId().getPermId();
        });
      }
    }
  }, [samplePermId, datasets]);

  // Process datasets to extract image information
  useEffect(() => {
    if (datasets) {
      const imageDatasets: ImageDataset[] = [];
      
      datasets.forEach((dataset) => {
        // For now, assume each dataset is an image dataset
        // In a real implementation, you might check dataset type or metadata
        const datasetType = dataset.getType()?.getCode();
        if (datasetType === datasetTypeCode || datasetType === "ELN_PREVIEW" || datasetType === "IMAGES") {
          imageDatasets.push({
            datasetPermId: dataset.getPermId().getPermId(),
            fileName: `image_${dataset.getPermId().getPermId().slice(-8)}.jpg`, // Simplified filename
          });
        }
      });
      
      setImages(imageDatasets);
    }
  }, [datasets, datasetTypeCode]);

  // Load download URLs for images
  useEffect(() => {
    images.forEach(async (image) => {
      if (!image.downloadUrl) {
        try {
          const url = await downloadUrlMutation.mutateAsync({
            datasetPermId: image.datasetPermId,
            filePath: image.fileName,
          });
          setImages((prev) =>
            prev.map((img) =>
              img.datasetPermId === image.datasetPermId
                ? { ...img, downloadUrl: url }
                : img
            )
          );
        } catch (error) {
          console.error("Error getting download URL:", error);
          // Set a fallback URL or handle the error gracefully
        }
      }
    });
  }, [images.length, downloadUrlMutation]);

  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeBytes) {
      alert(`File size must be less than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !samplePermId) return;
    try {
      const datasetPermId = await uploadMutation.mutateAsync({
        samplePermId,
        file: selectedFile,
        datasetTypeCode,
      });

      // Clear selection and preview
      setSelectedFile(null);
      setPreviewUrl("");
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Callback
      onImageUploaded?.(datasetPermId);

      // Refresh datasets
      refetch();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    }
  };

  const handleDelete = async (datasetPermId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      await deleteMutation.mutateAsync({ datasetPermId });
      onImageDeleted?.(datasetPermId);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed. Please try again.");
    }
  };

  if (isLoading) {
    return <div>Loading images...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Upload Image</h4>
          
          <Input
            type="file"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            startContent={<FileUploadIcon />}
            label="Select Image"
            description={`Max size: ${Math.round(maxSizeBytes / (1024 * 1024))}MB`}
          />

          {previewUrl && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Preview:</p>
              <Image
                src={previewUrl}
                alt="Preview"
                className="max-w-xs max-h-48"
              />
            </div>
          )}

          {selectedFile && (
            <div className="flex gap-2">
              <Button
                color="primary"
                onPress={handleUpload}
                isLoading={uploadMutation.isPending}
                isDisabled={!selectedFile}
              >
                Upload Image
              </Button>
              <Button
                color="default"
                variant="light"
                onPress={() => {
                  setSelectedFile(null);
                  setPreviewUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {uploadMutation.isPending && (
            <Progress
              label="Uploading..."
              value={undefined}
              className="max-w-md"
            />
          )}
        </div>
      </Card>

      {/* Existing Images */}
      {images.length > 0 && (
        <Card className="p-4">
          <h4 className="text-lg font-semibold mb-4">Attached Images</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.datasetPermId} className="space-y-2">
                {image.downloadUrl && (
                  <Image
                    src={image.downloadUrl}
                    alt={image.fileName}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm truncate" title={image.fileName}>
                    {image.fileName}
                  </span>
                  <div className="flex gap-1">
                    {image.downloadUrl && (
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => window.open(image.downloadUrl, '_blank')}
                        startContent={<DownloadIcon />}
                      >
                        Download
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleDelete(image.datasetPermId)}
                      isLoading={deleteMutation.isPending}
                      startContent={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
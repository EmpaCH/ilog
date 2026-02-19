import React from "react";
import { Card } from "@heroui/react";
import { ImageDatasetEditor } from "./ImageDatasetEditor";

interface ImagePropertyEditorProps {
  samplePermId?: string;
  onImageChange?: (datasetPermId: string) => void;
  isReadOnly?: boolean;
}

/**
 * Image Property Editor that uses openBIS AFS datasets instead of base64
 * This component is used when images are configured as property types with IMAGE widget
 */
export const ImagePropertyEditor = ({
  samplePermId,
  onImageChange,
  isReadOnly = false,
}: ImagePropertyEditorProps) => {
  // If no sample exists yet, show a message
  if (!samplePermId) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">
          Save the object first to upload images
        </p>
      </Card>
    );
  }

  // Use the dataset editor for AFS file management
  return (
    <ImageDatasetEditor
      samplePermId={samplePermId}
      datasetTypeCode="ELN_PREVIEW"
      onImageUploaded={(datasetPermId) => {
        console.log("Image uploaded with dataset ID:", datasetPermId);
        onImageChange?.(datasetPermId);
      }}
      onImageDeleted={(datasetPermId) => {
        console.log("Image deleted with dataset ID:", datasetPermId);
      }}
    />
  );
};

import React, { useState } from "react";
import { Card, Image, Input } from "@heroui/react";
import FileUploadIcon from "@mui/icons-material/FileUpload";

interface ImagePropertyEditorProps {
  image: string;
  onImageChange: (image: string) => void;
}

const type_re  = /data:image\/([a-zA-Z0-9]+);base64,/;
const mimeType = "image/*";

export const ImagePropertyEditor = ({
  image,
  onImageChange,
}: ImagePropertyEditorProps) => {
  const [currentImage, setCurrentImage] = useState(image ?? "");
  const [type, setType] = useState(currentImage.match(type_re)?.[1] ?? mimeType);

  const reader = new FileReader();

  reader.onloadend = (e) => {
    const imageData = e.target?.result
      ?.toString()
    const type = imageData?.match(type_re);
    setType(type?.[1] ?? mimeType);
    if (imageData) {
      setCurrentImage(imageData);
      console.log(imageData);
      onImageChange(imageData);
    }
  };

  const handleChangeImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget?.files) {
      reader.readAsDataURL(event.currentTarget.files[0]);
    }
  };

  return (
    <Card>
      <img
        alt="Icon"
        src={currentImage}
        width={240}
      />
      <Input
        startContent={<FileUploadIcon />}
        label="Replace image"
        placeholder="Click here to replace"
        type="file"
        accept={type}
        onChange={handleChangeImage}
      ></Input>
    </Card>
  );
};

import { react, useEffect, useState } from "react";
import { useGetDataSets } from "../../apis/dataset/useGetDataSets";
import { Button, Form, Input } from "@heroui/react";
import { useCreateDataSet } from "../../apis/dataset/useCreateDataSet";

interface DataSetListProps {
  onUpload: (file: File[]) => void;
}
export const DataSetUploader = ({ onUpload }: DataSetListProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log("Submitting files:", files);
    e.preventDefault();
    console.log("Files to upload:", files);
    onUpload(files);
    console.log("Files uploaded successfully");
    setFiles([]); // Clear the files after upload
  };
  return (
    <Form onSubmit={handleSubmit}>
      <Input
        type="file"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            setFiles([...files, file]);
          }
        }}
      ></Input>
      Upload dataset
      <Button type="submit" color="primary" className="ml-2">
        Upload
      </Button>
    </Form>
  );
};

export const DataSetList = () => {
  const { data: dataSets, isLoading, isError } = useGetDataSets();
  const handler = useCreateDataSet("object", "code", "description", "type");

  const handleUpload = async (files: File[]) => {
    console.log("Handling upload for files:", files);
    for (const file of files) {
      console.log("Uploading file:", file);
      const res = await handler.mutateAsync(file);
    }
  };

  if (isError) {
    return <div>Error loading data sets</div>;
  }
  if (isLoading) {
    return <div>Loading data sets...</div>;
  }

  return (
    <div>
      <h1>Data Sets</h1>
      <DataSetUploader onUpload={handleUpload} />
      <h1>{handler?.error?.message}</h1>
      <Button
        onPress={() =>
          handleUpload([
            new File(["This is a fake file content"], "fake-upload.txt"),
          ])
        }
        color="primary"
      >
        "Fake upload"
      </Button>
      <ul>
        {dataSets.map((dataSet) => (
          <li key={dataSet.getPermId().getPermId()}>
            {dataSet.getPermId().getPermId()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DataSetList;

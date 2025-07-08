import { useEffect, useState } from "react";
import { useGetObject } from "../../apis/object/useGetObject";
import {
  Button,
  Form,
  Input,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  TableColumn,
} from "@heroui/react";
import { useCreateDataSet } from "../../apis/dataset/useCreateDataSet";
import { useCreateObject } from "../../apis/object/useCreateObject";
import { useCreateObjectInCollection } from "../../apis/object/useCreateObjectInCollection";
import { useGetAFSFiles } from "../../apis/dataset/useGetAFSFiles";
import { useCreateAFSFile } from "../../apis/dataset/useCreateAFSFile";
import openbis from "@openbis/openbis.esm";
import { useGetOrCreateObject } from "../../apis/object/useGetOrCreateObject";
import { useGetProjects } from "../../apis/project/useGetProjects";
import { useDeleteAFSFile } from "../../apis/dataset/useDeleteAFSFile";
import DeleteIcon from "@mui/icons-material/Delete";

// interface DataSetListProps {
//   onUpload: (file: File[]) => void;
// }
// export const DataSetUploader = ({ onUpload }: DataSetListProps) => {
//   const [files, setFiles] = useState<File[]>([]);
//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     console.log("Submitting files:", files);
//     e.preventDefault();
//     console.log("Files to upload:", files);
//     onUpload(files);
//     console.log("Files uploaded successfully");
//     setFiles([]); // Clear the files after upload
//   };
//   return (
//     <Form onSubmit={handleSubmit}>
//       <Input
//         type="file"
//         onChange={(e) => {
//           const file = e.target.files[0];
//           if (file) {
//             setFiles([...files, file]);
//           }
//         }}
//       ></Input>
//       Upload dataset
//       <Button type="submit" color="primary" className="ml-2">
//         Upload
//       </Button>
//     </Form>
//   );
// };

// interface DatasetCreatorProps {
//   onCreate: (permId: string) => null;
// }

// export const DatasetCreator = ({ onCreate }: DatasetCreatorProps) => {
//   const {
//     mutateAsync: createObject,
//     mutate: create,
//     error: objectCreationError,
//   } = useCreateObjectInCollection("DEFAULT", "DEFAULT", "DEFAULT");
//   const { mutateAsync: createDataset, error: datasetCreationError } =
//     useCreateDataSet();

//   const handleUpload = async (files: File[]) => {
//     console.log("Handling upload for files:", files);
//     for (const file of files) {
//       console.log("Uploading file:", file);
//       const obj = await createObject({
//         type: "COMPONENT",
//         code: null,
//         properties: {},
//       });
//       console.log(obj);
//       const res = await createDataset({
//         objectPermId: obj.getPermId(),
//         type: "ELN_PREVIEW",
//         file: file,
//       });
//       onCreate(res.owner);
//     }
//   };

//   return (
//     <div>
//       {/* /*<DataSetUploader onUpload={handleUpload} //* */}
//       <Button
//         onPress={() =>
//           handleUpload([
//             new File(["This is a fake file content"], "fake-upload.txt"),
//           ])
//         }
//         color="primary"
//       >
//         Create data
//       </Button>
//     </div>
//   );
// };

// export const FileRow = ({ file }: { file: openbis.File }) => {
//   return (
//     <TableRow key={file.getName()}>
//       <TableCell>{file.getName()}</TableCell>
//       <TableCell>{file.getOwner()}</TableCell>
//       <TableCell>{file.getSize()}</TableCell>
//     </TableRow>
//   );
// };

export const FileActions = ({ file }: { file: openbis.File }) => {
  const { mutateAsync: deleteFile } = useDeleteAFSFile();
  const handleDelete = async () => {
    await deleteFile({ owner: file.getOwner(), path: file.getPath() });
  };
  return (
    <Button isIconOnly onPress={handleDelete} color="warning">
      <DeleteIcon />
      
    </Button>
  );
}

export const FileTable = ({ file }: { file: openbis.File[] }) => {
  if (file.length > 0) {
    return (
      <Table>
        <TableHeader>
          <TableColumn>Name</TableColumn>
          <TableColumn>Owner</TableColumn>
          <TableColumn>Size</TableColumn>
          <TableColumn>Path</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody items={file}>
          {(item) => (
            <TableRow key={item.getName()}>
              <TableCell>{item.getName()}</TableCell>
              <TableCell>{item.getOwner()}</TableCell>
              <TableCell>{item.getSize()}</TableCell>
              <TableCell>{item.getPath()}</TableCell>
              <TableCell><FileActions file={item} /></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
};

export const FileList = ({ permId }: { permId: string }) => {
  const { data: files, isSuccess } = useGetAFSFiles(permId, "./", true);

  if (isSuccess) {
    return <FileTable file={files} />;
  }
};

export const DatasetCreator = ({ permId }: { permId: string }) => {
  const { mutateAsync: create } = useCreateAFSFile();
  const handleCreate = async () => {
    const id = window.crypto.randomUUID();
    const fileId = `${id}.txt`;

    const fakeFile = new File(
      [`This is a fake file content generated at ${Date.now()}`],
      fileId
    );
    await create({ owner: permId, file: fakeFile, path: `./${fakeFile.name}` });
  };
  return (
    <div>
      <Button onPress={handleCreate}>Create random file</Button>
    </div>
  );
};

export const DataSetList = () => {
  const MY_CODE = "CIAO";
  const SPACE = "DEFAULT";
  const COLLECTION = "DEFAULT";
  const PROJECT = "DEFAULT";
  const { data: projects, isSuccess } = useCreateObjectInCollection(
    SPACE,
    PROJECT,
    COLLECTION
  );
  const { data: permId } = useGetOrCreateObject(
    MY_CODE,
    "COMPONENT",
    SPACE,
    PROJECT,
    COLLECTION
  );
  if (permId) {
    return (
      <div>
        <DatasetCreator permId={permId?.getPermId()} />
        {permId && <FileList permId={permId.getPermId()} />}
      </div>
    );
  }
};

export default DataSetList;

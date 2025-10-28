import { useContext, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, TypeRow } from "../shared/list.types";
import { useGetAllObjectTypes } from "../../apis/type/useGetAllObjectTypes";
import { useDeleteObjectType } from "../../apis/type/useDeleteObjectType";

export const TypeList = () => {
  const { apiFacade } = useContext(AuthContext);
  const navigate = useNavigate();
  const [deletionMessage, setDeletionMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const res = useGetAllObjectTypes();

  const types = res.data ? [...res.data] : [];
  
  const deletion = useDeleteObjectType();
  const onDelete = async (permId: any, code: string) => {
    await deletion.mutateAsync(permId.permId);
    if (deletion.isSuccess) {
      setDeletionMessage(`'${code}' deleted successfully.`);
      setIsSuccess(true);
      setShowMessage(true);
      // res.refetch();
    }
    if (deletion.isError) {
      setDeletionMessage(deletion.error.message.replace(/\s*\([^)]*\)/g, ""));
      setIsSuccess(false);
      setShowMessage(true);
    }
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };

  const onEdit = async (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string
  ) => {
    const type = types.find((t) => t.getCode() === code);
    if (type) {
      navigate({
        to: `/types/creator?mode=edit&objecttypecode=${type.getCode()}`,
      });
    } else {
      setDeletionMessage(`Type with code "${code}" not found.`);
      setIsSuccess(false);
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
      }, 3000);
    }
  };

  const columns: Column[] = [
    {
      key: "code",
      name: "Code",
      sorting: true,
      align: "start",
    },
    {
      key: "prefix",
      name: "Prefix",
      sorting: true,
      align: "start",
    },
    {
      key: "collectionType",
      name: "Collection Type",
      sorting: true,
      align: "start",
    },
    {
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
    },
  ];

  const rows: TypeRow[] = types.map((type: openbis.SampleType) => {
    const metadata = type.getMetaData();
    
    return {
      permId: type.getPermId(),
      code: type.getCode(),
      prefix: type.getGeneratedCodePrefix(),
      collectionType: metadata["collectionType"] || "Unknown",
    };
  });

  return (
    <>
      <h2>Type List</h2>
      <List
        columns={columns}
        rows={rows}
        defaultSortColumn="code"
        searchColumn="code"
        navigatePath="/types/creator"
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <MessageModal
        message={deletionMessage}
        isOpen={showMessage}
        isSuccess={isSuccess}
      />
    </>
  );
};

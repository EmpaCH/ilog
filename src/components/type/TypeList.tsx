import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import openbis from "@openbis/openbis.esm";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, TypeRow } from "../shared/list.types";
import { useGetAllObjectTypes } from "../../apis/type/useGetAllObjectTypes";
import { useDeleteObjectType } from "../../apis/type/useDeleteObjectType";

export const TypeList = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const res = useGetAllObjectTypes();
  const deletion = useDeleteObjectType();
  const types = res.data ? [...res.data] : [];

  const onDelete = async (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
  ) => {
    try {
      await deletion.mutateAsync(permId.getPermId());
      setMessage(`Type '${code}' deleted successfully.`);
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "Unknown error");
      setMessage(msg.replace(/\s*\([^)]*\)/g, ""));
      setIsSuccess(false);
    } finally {
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
      }, 3000);
    }
  };

  const onEdit = async (
    code: string,
  ) => {
    const type = types.find((t) => t.getCode() === code);
    if (type) {
      navigate({
        to: `/types/creator?mode=edit&objecttypecode=${type.getCode()}`,
      });
    } else {
      setMessage(`Type with code '${code}' not found.`);
      setIsSuccess(false);
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
      }, 3000);
    }
  };

  const onView = async (
    code: string,
  ) => {
    const type = types.find((t) => t.getCode() === code);
    if (type) {
      navigate({
        to: `/types/creator?mode=view&objecttypecode=${type.getCode()}`,
      });
    } else {
      setMessage(`Type with code '${code}' not found.`);
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
      filterable: true,
    },
    {
      key: "prefix",
      name: "Prefix",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "baseType",
      name: "Base Type",
      sorting: true,
      align: "start",
      filterable: true,
    },
    {
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
      filterable: false,
    },
  ];

  const rows: TypeRow[] = types.map((type: openbis.SampleType) => {
    const metadata = type.getMetaData();

    return {
      permId: type.getPermId(),
      code: type.getCode(),
      prefix: type.getGeneratedCodePrefix(),
      baseType: metadata["collectionType"] || "Unknown",
    };
  });

  return (
    <>
      <h2>Type List</h2>
      <List
        columns={columns}
        rows={rows}
        idColumn="code"
        navigatePath="/types/creator"
        onDelete={onDelete}
        onEdit={onEdit}
        onView={onView}
      />
      <MessageModal
        message={message}
        isOpen={showMessage}
        isSuccess={isSuccess}
      />
    </>
  );
};

import { useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AuthContext } from "../../context/auth/authContext";
import { getObjectTypes, deleteObjectType } from "../../apis/type/typeAPI";
import openbis from "@openbis/openbis.esm";
import { List } from "../shared/list";
import { MessageModal } from "../shared/messageModal";
import { Column, TypeRow } from "../shared/list.types";
import { iLogBaseTypesPropertyCode } from "../../apis/shared/common";

export const TypeList = () => {
  const { apiFacade } = useContext(AuthContext);
  const navigate = useNavigate();
  const [deletionMessage, setDeletionMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const res = useQuery({
    queryKey: ["getObjectTypes"],
    queryFn: async () => {
      return getObjectTypes(apiFacade);
    },
  });

  const types = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  const onDelete = async (
    permId: any,
    code: string,
  ) => {
    await deleteObjectType(
      apiFacade,
      permId as openbis.EntityTypePermId,
    ).then(() => {
      res.refetch();
      setDeletionMessage(`'${code}' deleted successfully.`);
      setIsSuccess(true);
      setShowMessage(true);
    }).catch((e) => {
      setDeletionMessage(e.message.replace(/\s*\([^)]*\)/g, ""));
      setIsSuccess(false);
      setShowMessage(true);
    }).finally(() => {
      setTimeout(() => {
        setShowMessage(false);
        }, 3000);
    });
  };
  
  const onEdit = async (
    permId: openbis.EntityTypePermId | openbis.SamplePermId,
    code: string,
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
      sorting: false,
      align: "start",
    },
    {
      key: "description",
      name: "Description",
      sorting: false,
      align: "start",
    },
    {
      key: "category",
      name: "Category",
      sorting: false,
      align: "start",
    },
    {
      key: "btns",
      name: "",
      sorting: false,
      align: "end",
    },
  ];

  const rows: TypeRow[] = types.map(
    (type: openbis.SampleType) => {
      const categoryAssignment = type.getPropertyAssignments()
        .find((assignment) => assignment.getPropertyType().getCode() === iLogBaseTypesPropertyCode);

      return {
        permId: type.getPermId(),
        code: type.getCode(),
        prefix: type.getGeneratedCodePrefix(),
        description: type.getDescription(),
        category: categoryAssignment?.getPropertyType().getCode(),
        // TODO: use "category" to show whether the item it an Instrument or Component
      }
    }
  );

  return (
    <>
      <h2>Type List</h2>
      <List 
        columns={columns}
        rows={rows}
        defaultSortColumn="code"
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
}

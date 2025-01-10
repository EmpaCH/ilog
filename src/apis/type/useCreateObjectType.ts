import { useMutation } from "@tanstack/react-query";
import { createObjectType } from "./typeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { ObjectTypeDefinition } from "./commonType";
import { updateObjectType } from "./typeAPI";
import openbis from "@openbis/openbis.esm";

export const useCreateObjectType = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({
      definition
    }: {
      definition: ObjectTypeDefinition
    }) => {
      await createObjectType(apiFacade, definition);
    },
  });
};


export const useUpdateObjectType = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({
      definition
    }: {
      definition: ObjectTypeDefinition
    }) => {
      await updateObjectType(apiFacade, definition);
    },
  });
};
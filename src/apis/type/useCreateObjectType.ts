import { useMutation } from "@tanstack/react-query";
import { createObjectType, createType, getAllPropertyTypes } from "./typeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import {
  ObjectTypeDefinition,
  convertCreationsToOperations,
  convertObjectTypeDefinitionToOperations,
} from "./commonType";
import openbis from "@openbis/openbis.esm";
import { useGetAllTypes } from "./useGetAllTypes";

export const useCreateObjectType = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({ definition }: { definition: ObjectTypeDefinition }) => {
      await createObjectType(apiFacade, definition);
    },
  });
};

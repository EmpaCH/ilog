import { useMutation } from "@tanstack/react-query";
import { createObjectType } from "./typeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { ObjectTypeDefinition } from "./commonType";

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

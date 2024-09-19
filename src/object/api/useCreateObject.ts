import { useMutation, useQueryClient } from "@tanstack/react-query";
import openbis from "@openbis/openbis.esm";
import { createObject, updateObject } from "../api/objectAPI";
import { useContext } from "react";
import { LoginContext } from "../../auth/LoginContext";

const CREATE_OBJECT_QUERY_KEY = "createOBject";

export const useCreateObject = () => {
  const queryClient = useQueryClient();
  const { apiFacade } = useContext(LoginContext);

  return useMutation({
    mutationFn: ({
      type,
      location,
      props,
    }: {
      type: string;
      location: string;
      props: { [key: string]: string };
    }) => {
      return createObject(apiFacade, type, location, props);
    },
  });
};

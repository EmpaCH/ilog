import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import openbis from "@openbis/openbis.esm";
import {
  createObject,
  updateObject,
  searchObjectTypes,
} from "../api/objectAPI";
import { useContext } from "react";
import { LoginContext } from "../../auth/LoginContext";

const SEARCH_OBJECT_TYPES_QUERY_KEY = "searchObjectTypes";

export const useSearchObjectTypes = (typeString: string) => {
  const { apiFacade } = useContext(LoginContext);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [SEARCH_OBJECT_TYPES_QUERY_KEY, typeString],
    queryFn: ({ type }: { type: string }) => {
      return searchObjectTypes(apiFacade, type);
    },
    queryClient: queryClient,
  });
};

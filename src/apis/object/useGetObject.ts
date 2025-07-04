import {
  DefinedInitialDataOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { getObject } from "./objectAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const GET_OBJECT_QUERY_PREFIX = "GET_OBJECT";

export const useGetObject = (
  code: string,
  options?: UseQueryOptions<openbis.Sample[]>
) => {
  const { apiFacade } = useContext(AuthContext);
  return useQuery({
    ...options,
    queryKey: [GET_OBJECT_QUERY_PREFIX, code],
    queryFn: () => {
      return getObject(apiFacade, code);
    },
  });
};

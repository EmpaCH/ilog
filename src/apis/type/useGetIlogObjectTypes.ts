import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { getIlogObjectTypes } from "./typeAPI";

export const ILOG_OBJECT_TYPES_QUERY_PREFIX = "GET_ILOG_OBJECT_TYPES";
export const useGetIlogObjectTypes = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [ILOG_OBJECT_TYPES_QUERY_PREFIX],
    queryFn: () => {
      return getIlogObjectTypes(apiFacade);
    },
  });
};

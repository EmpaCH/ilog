import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { getObjectTypes } from "./typeAPI";

export const ALL_OBJECT_TYPES_QUERY_PREFIX = "GET_ALL_OBJECT_TYPES";
export const useGetAllObjectTypes = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [ALL_OBJECT_TYPES_QUERY_PREFIX],
    queryFn: () => {
      return getObjectTypes(apiFacade);
    },
  });
};

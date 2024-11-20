import { useQuery } from "@tanstack/react-query";
import { createType, getAllPropertyTypes, resolveReferenceType } from "./typeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

const QUERY_PREFIX = "GET_ALL_TYPES";
export const useGetAllTypes = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: () => {
      return getAllPropertyTypes(apiFacade);
    },
  });
};

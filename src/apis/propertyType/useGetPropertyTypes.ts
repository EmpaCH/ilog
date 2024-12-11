import { useQuery } from "@tanstack/react-query";
import { getPropertyTypes } from "./propertyTypeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

const QUERY_PREFIX = "GET_ALL_TYPES";
export const useGetPropertyTypes = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: () => {
      return getPropertyTypes(apiFacade);
    },
  });
};

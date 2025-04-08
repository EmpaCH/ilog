import { useQuery } from "@tanstack/react-query";
import { getPropertyAssignments, getPropertyTypes } from "./propertyTypeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

export const ALL_PROPERTY_ASSIGNMENTS_QUERY_PREFIX =
  "GET_ALL_PROPERTY_ASSIGNMENTS";
export const useGetPropertyAssignments = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [ALL_PROPERTY_ASSIGNMENTS_QUERY_PREFIX],
    queryFn: async () => {
      const res = await getPropertyAssignments(apiFacade);
      return res;
    },
  });
};

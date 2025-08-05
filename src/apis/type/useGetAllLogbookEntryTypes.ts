import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { getLogbookEntryTypes } from "./typeAPI";

export const ALL_LOGBOOKENTRY_TYPES_QUERY_PREFIX = "GET_ALL_LOGBOOKENTRY_TYPES";
export const useGetAllLogbookEntryTypes = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [ALL_LOGBOOKENTRY_TYPES_QUERY_PREFIX],
    queryFn: () => {
      return getLogbookEntryTypes(apiFacade);
    },
  });
};

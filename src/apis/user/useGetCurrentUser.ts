import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { useGetUser } from "./useGetUser";

export const USER_QUERY_PREFIX = "GET_CURRENT_USER";
export const useGetCurrentUser = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const res = useGetUser(user || "");
  return useQuery({
    queryKey: [USER_QUERY_PREFIX, user],
    queryFn: async () => {
      return res.data;
    },
    enabled: isAuthenticated && !!user && res.isSuccess,
  });
};

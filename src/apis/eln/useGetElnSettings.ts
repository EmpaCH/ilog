import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { deserializeElnSettings, getElnSettings } from "./elnSettings";

const QUERY_PREFIX = "GET_ELN_SETTINGS";
export const useGetElnSettings = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: () => fetchElnSettings(apiFacade),
  });
};

export const fetchElnSettings = async (apiFacade: any) => {
  return deserializeElnSettings(
    await getElnSettings(apiFacade)
  );
};

import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import { deserializeElnSettings, getElnSettings } from "./elnSettings";

const QUERY_PREFIX = "GET_ELN_SETTINGS";
export const useGetElnSettings = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: async () => {
      return deserializeElnSettings(await getElnSettings(apiFacade));
    },
  });
};

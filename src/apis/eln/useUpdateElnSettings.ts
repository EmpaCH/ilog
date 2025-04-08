import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import {
  deserializeElnSettings,
  getElnSettings,
  ElnSettingsProperties,
  updateElnSettings,
} from "./elnSettings";

const QUERY_PREFIX = "UPDATE_ELN_SETTINGS";
export const useUpdateElnSettings = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({newSettings}: {newSettings: ElnSettingsProperties}) => {
      return updateElnSettings(apiFacade, newSettings);
    },
  });
};

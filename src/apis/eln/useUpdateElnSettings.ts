import { useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { ElnSettingsProperties, updateElnSettings } from "./elnSettings";

export const useUpdateElnSettings = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({newSettings}: {newSettings: ElnSettingsProperties}) => {
      return updateElnSettings(apiFacade, newSettings);
    },
  });
};

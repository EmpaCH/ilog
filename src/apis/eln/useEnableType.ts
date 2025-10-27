import { useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import {
  enableObjectTypesInElnSettings,
} from "./elnSettings";
import { fetchElnSettings } from "./useGetElnSettings";
import { useUpdateElnSettings } from "./useUpdateElnSettings";
import { AuthContext } from "../../context/auth/authContext";

export const useEnableObjectType = () => {
  const { apiFacade } = useContext(AuthContext);
  const settingUpdate = useUpdateElnSettings();

  return useMutation({
    mutationFn: async ({type}:{type: string}) => {
      const elnSettings = await fetchElnSettings(apiFacade);
      if (elnSettings) {
        const newSettings = enableObjectTypesInElnSettings(
          elnSettings,
          type
        );
        await settingUpdate.mutateAsync({ newSettings: newSettings });
      }
    },
  });
};

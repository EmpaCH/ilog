import { useMutation } from "@tanstack/react-query";
import {
  enableObjectTypesInElnSettings,
  updateElnSettings,
} from "./elnSettings";
import { useGetElnSettings } from "./useGetElnSettings";
import { useUpdateElnSettings } from "./useUpdateElnSettings";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

export const useEnableObjectType = () => {
  const { apiFacade } = useContext(AuthContext);
  const settingUpdate = useUpdateElnSettings();
  const elnSettings = useGetElnSettings();

  return useMutation({
    mutationFn: async ({type}:{type: string}) => {
      if (elnSettings.isSuccess) {
        const newSettings = enableObjectTypesInElnSettings(
          elnSettings.data,
          type
        );
        await settingUpdate.mutateAsync({ newSettings: newSettings });
      }
    },
  });
};

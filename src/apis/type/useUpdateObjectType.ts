import {useContext} from "react";
import {AuthContext} from "../../context/auth/authContext.ts";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {ObjectTypeDefinition} from "./commonType.ts";
import {updateObjectType} from "./typeAPI.ts";
import { useGetIlogObjectTypes, ILOG_OBJECT_TYPES_QUERY_PREFIX } from "./useGetIlogObjectTypes.ts";
import { LOGBOOK_ENTRY_TYPES_QUERY_PREFIX } from "../logbook/useGetLogbookEntryTypes";
import { ALL_OBJECT_TYPES_QUERY_PREFIX } from "./useGetAllObjectTypes";
import { useGetPropertyTypes, ALL_PROPERTY_TYPES_QUERY_PREFIX } from "../propertyType/useGetPropertyTypes.ts";
import { useGetPropertyAssignments, ALL_PROPERTY_ASSIGNMENTS_QUERY_PREFIX } from "../propertyType/useGetPropertyAssignments.ts";

export const useUpdateObjectType = () => {
  const {apiFacade} = useContext(AuthContext);
  const queryClient = useQueryClient();
  const existingObjectTypesResult = useGetIlogObjectTypes();
  const existingPropertyTypesResult = useGetPropertyTypes();
  const existingPropertyAssigments = useGetPropertyAssignments();

  return useMutation({
    mutationFn: async ({
      definition
    }: {
      definition: ObjectTypeDefinition
    }) => {
      if (existingObjectTypesResult.isSuccess && existingPropertyTypesResult.isSuccess && existingPropertyAssigments.isSuccess) {
        await updateObjectType(apiFacade, definition);
      }
    },
    // Also refresh after an error: the type may have been updated even if enabling it in the ELN failed
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ALL_OBJECT_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [ILOG_OBJECT_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [ALL_PROPERTY_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [ALL_PROPERTY_ASSIGNMENTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [LOGBOOK_ENTRY_TYPES_QUERY_PREFIX] });
    },
  });
};

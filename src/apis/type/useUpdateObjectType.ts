import {useContext} from "react";
import {AuthContext} from "../../context/auth/authContext.ts";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {ObjectTypeDefinition} from "./commonType.ts";
import {updateObjectType} from "./typeAPI.ts";
import { useGetAllObjectTypes, ALL_OBJECT_TYPES_QUERY_PREFIX } from "./useGetAllObjectTypes.ts";
import { useGetPropertyTypes, ALL_PROPERTY_TYPES_QUERY_PREFIX } from "../propertyType/useGetPropertyTypes.ts";
import { useGetPropertyAssignments, ALL_PROPERTY_ASSIGNMENTS_QUERY_PREFIX } from "../propertyType/useGetPropertyAssignments.ts";

export const useUpdateObjectType = () => {
  const {apiFacade} = useContext(AuthContext);
  const queryClient = useQueryClient();
  const existingObjectTypesResult = useGetAllObjectTypes();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALL_OBJECT_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [ALL_PROPERTY_TYPES_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [ALL_PROPERTY_ASSIGNMENTS_QUERY_PREFIX] });
    },
  });
};

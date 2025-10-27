import {useContext} from "react";
import {AuthContext} from "../../context/auth/authContext.ts";
import {useMutation} from "@tanstack/react-query";
import {ObjectTypeDefinition} from "./commonType.ts";
import {updateObjectType} from "./typeAPI.ts";
import { useGetAllObjectTypes } from "./useGetAllObjectTypes.ts";
import { useGetPropertyTypes } from "../propertyType/useGetPropertyTypes.ts";
import { useGetPropertyAssignments } from "../propertyType/useGetPropertyAssignments.ts";

export const useUpdateObjectType = () => {
  const {apiFacade} = useContext(AuthContext);
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
  });
};

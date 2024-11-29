import { useMutation } from "@tanstack/react-query";
import { createType, getAllPropertyTypes } from "./typeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import {
  ObjectTypeDefinition,
  convertCreationsToOperations,
  convertObjectTypeDefinitionToOperations,
} from "./commonType";
import openbis from "@openbis/openbis.esm";
import { useGetAllTypes } from "./useGetAllTypes";

export const useCreateObjectType = () => {
  const { apiFacade } = useContext(AuthContext);

  return useMutation({
    mutationFn: async ({ definition }: { definition: ObjectTypeDefinition }) => {
      const existingTypes = await getAllPropertyTypes(apiFacade);

      const creations = convertObjectTypeDefinitionToOperations(definition);
      const filteredCreation = creations.propertyTypeCreations.filter(
        (creation) => {
          return !existingTypes.some(
            (type) => type.code === creation.getCode()
          );
        }
      );

      const ops = convertCreationsToOperations({
        propertyTypeCreations: filteredCreation,
        objectTypeCreations: creations.objectTypeCreations,
      });
      const props = new openbis.SynchronousOperationExecutionOptions();
      props.setExecuteInOrder(true);
      return await apiFacade.executeOperations(ops, props);
    },
  });
};

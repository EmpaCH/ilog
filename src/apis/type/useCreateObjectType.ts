import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createObjectType } from "./typeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import {
  ObjectTypeDefinition,
  convertOpenBISSampleTypeToObjectTypeDefinition,
} from "./commonType";
import {
  ALL_OBJECT_TYPES_QUERY_PREFIX,
  useGetAllObjectTypes,
} from "./useGetAllObjectTypes";
import {
  ALL_PROPERTY_TYPES_QUERY_PREFIX,
  useGetPropertyTypes,
} from "../propertyType/useGetPropertyTypes";
import {
  convertCreationsToOperations,
  convertObjectTypeDefinitionToOperations,
  convertObjectTypeDefinitionToUpdateOperations,
  convertPropertyTypesSchemaToUpdateOperations,
  createObjectTypeSettingsDefinition,
  flattenObjectSchema,
} from "./helpersTypeAPI";

import openbis from "@openbis/openbis.esm";
import { useGetPropertyAssignments } from "../propertyType/useGetPropertyAssignments";
import {
  PropertyAssignment,
  convertPropertyTypeToCreation,
  convertPropertyTypeToUpdate,
} from "../propertyType/commonPropertyType";
import { useUpdateElnSettings } from "../eln/useUpdateElnSettings";
import { useEnableObjectType } from "../eln/useEnableType";

function filterUpdates(
  updates: openbis.PropertyTypeUpdate[],
  existingPropertyAssigments: PropertyAssignment[]
) {
  return updates.filter((update) => {
    return existingPropertyAssigments.some((assignment) => {
      return (
        assignment.propertyTypeCode ===
        (update.getTypeId() as openbis.PropertyTypePermId).getPermId()
      );
    });
  });
}
/**
 * This is a tricky function.
  Essentially, we want to run different operations depending on the case
  We have the following situations
  1. The object does not exist and the property types do not exist
  2. The object does not exist but the property types do exist
  3. The object exists but the property types do not exist
  4. The object exists and the property types exist
  What we need to do to cover all cases is the following:
  - Create a list of all property types assigned to the object to be created/updated
  - Get a list of existing property types
  - Get a list of existing objects
  - Filter out the property types that already exist unless they are assigned to the object
  - Convert the new property types to create operations
  - Convert the property types assigned to the object to update operations
  - Convert the object to create or update operations depending if it exists or not
  - Run the operations

 *  */
export const useCreateObjectType = () => {
  const { apiFacade, isAuthenticated } = useContext(AuthContext);
  const existingObjectTypesResult = useGetAllObjectTypes();
  const existingPropertyTypesResult = useGetPropertyTypes();
  const existingPropertyAssigmentsResult = useGetPropertyAssignments();
  const queryClient = useQueryClient();
  const enableType = useEnableObjectType();

  // const fetchData = async () => {
  //   console.log(`Preparing to create object type, api is ${isAuthenticated}`);
  //   const [objectTypes, propertyTypes, propertyAssignments] = await Promise.all(
  //     [
  //       existingObjectTypesResult.refetch(),
  //       existingPropertyTypesResult.refetch(),
  //       existingPropertyAssigmentsResult.refetch(),
  //     ]
  //   );

  //   if (
  //     objectTypes.isSuccess &&
  //     propertyTypes.isSuccess &&
  //     propertyAssignments.isSuccess
  //   ) {
  //     return {
  //       objectTypes: objectTypes.data,
  //       propertyTypes: propertyTypes.data,
  //       propertyAssignments: propertyAssignments.data,
  //     };
  //   } else {
  //     const errors = [
  //       objectTypes.error,
  //       propertyTypes.error,
  //       propertyAssignments.error,
  //     ];
  //     console.error(errors);
  //     throw new AggregateError(errors);
  //   }
  // };

  return useMutation({
    //Only update the object setting definition if the creation of the object type was successful
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ALL_OBJECT_TYPES_QUERY_PREFIX,
          ALL_PROPERTY_TYPES_QUERY_PREFIX,
        ],
      });
      // console.log("Creating object type settings definition");
      // await enableType.mutateAsync({ type: variables.definition.code });
      // console.log("Object type settings definition created");
    },
    onError: (error) => {
      console.error(error);
    },
    mutationFn: async ({
      definition,
    }: {
      definition: ObjectTypeDefinition;
    }) => {
      // const { objectTypes, propertyTypes, propertyAssignments } =
      //   await fetchData();
      // console.log("Called");
      if (
        existingObjectTypesResult.isSuccess &&
        existingPropertyTypesResult.isSuccess &&
        existingPropertyAssigmentsResult.isSuccess
      ) {
        const objectTypes = existingObjectTypesResult.data;
        const propertyTypes = existingPropertyTypesResult.data;
        const propertyAssignments = existingPropertyAssigmentsResult.data;
        console.log("objectTypes", objectTypes);
        const operations = convertObjectTypeDefinitionToOperations(
          definition,
          propertyTypes,
          objectTypes.map(convertOpenBISSampleTypeToObjectTypeDefinition),
          propertyAssignments
        );
        const props = new openbis.SynchronousOperationExecutionOptions();
        props.setExecuteInOrder(true);
        const ops = convertCreationsToOperations(operations);
        console.log("Starting to create object type", definition, ops);
        await apiFacade.executeOperations(ops, props);
      }
    },
  });
};

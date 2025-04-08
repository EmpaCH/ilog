import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { ALL_PROPERTY_TYPES_QUERY_PREFIX, useGetPropertyTypes } from "../propertyType/useGetPropertyTypes";
import { ILOG_BASE_TYPES_PROPERTY } from "./types";
import { useSearchPropertyType } from "../propertyType/useSearchPropertyType";
import openbis from "@openbis/openbis.esm";
import { LocalPropertyType, PropertyType, convertPropertyTypeToCreation } from "./commonPropertyType";
import { convertDataTypeToOpenBISDataType } from "../type/commonType";



export const useCreatePropertyType = (type: LocalPropertyType) => {
    const { apiFacade } = useContext(AuthContext);
    const existingPropertyTypesResult = useGetPropertyTypes();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const existingTypes = await existingPropertyTypesResult.refetch();
            if(existingTypes.status == "success"){
                if (!existingTypes.data.find(pr => pr.code == type.code)) {
                    const newProp = new openbis.PropertyTypeCreation();
                    const cr = convertPropertyTypeToCreation(type);
                    await apiFacade.createPropertyTypes([cr]);
                    console.log(`Property ${type} created.`);
                  }
                  else {
                    console.log(`Property type ${type} already exists.`);
                  }
            }
            
        },
        onError: (error) => {
            console.error("Error creating property type", error);
        },
        onSuccess(data, variables, context) {
            queryClient.invalidateQueries({
                queryKey: [
                    ALL_PROPERTY_TYPES_QUERY_PREFIX,
                ],
            });
        },
    });
}
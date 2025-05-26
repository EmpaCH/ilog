import { useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { useGetPropertyTypes } from "../propertyType/useGetPropertyTypes";
import { ILOG_BASE_TYPES_PROPERTY } from "./types";
import { useSearchPropertyType } from "../propertyType/useSearchPropertyType";
import openbis from "@openbis/openbis.esm";
import { iLogID, iLogLogbookID } from "./common";


export const useCreateIlogTypeProperty = () => {
    const { apiFacade } = useContext(AuthContext);
    const existingPropertyTypesResult = useGetPropertyTypes();
    const ilogExisting = useSearchPropertyType(iLogID);
    return useMutation({
        mutationFn: async () => {
            const ilogExistingRes = await ilogExisting.refetch();
            const existingPropertyTypesResultRes = await existingPropertyTypesResult.refetch();
            if(existingPropertyTypesResultRes.isSuccess && ilogExistingRes.isSuccess){
                if (ilogExistingRes.data === null) {
                    const newProp = new openbis.PropertyTypeCreation();
                    newProp.setCode(iLogID);
                    newProp.setLabel(iLogID);
                    newProp.setDataType('BOOLEAN');
                    newProp.setDescription('This is the iLog identifier.');
                    await apiFacade.createPropertyTypes([newProp]);
                    console.log('iLog property type initialized.');
                  }
                  else {
                    console.log('iLog property type already exists.');
                  }
            } else {
                console.log('Error while retrieving properties, specifically iLog property type.');
            }
            
        },
    });
}

export const useCreateIlogLogbookProperty = () => {
    const { apiFacade } = useContext(AuthContext);
    const existingPropertyTypesResult = useGetPropertyTypes();
    const ilogLogbookExisting = useSearchPropertyType(iLogLogbookID);
    return useMutation({
        mutationFn: async () => {
            const ilogLogbookExistingRes = await ilogLogbookExisting.refetch();
            const existingPropertyTypesResultRes = await existingPropertyTypesResult.refetch();
            if (ilogLogbookExistingRes.isSuccess && existingPropertyTypesResultRes.isSuccess) {
                if (ilogLogbookExistingRes.data === null) {
                    const newProp = new openbis.PropertyTypeCreation();
                    newProp.setCode(iLogLogbookID);
                    newProp.setLabel(iLogLogbookID);
                    newProp.setDataType('BOOLEAN');
                    newProp.setDescription('This is the iLog logbook entry identifier.');
                    await apiFacade.createPropertyTypes([newProp]);
                    console.log('iLog logbook property type initialized.');
                } else {
                    console.log('iLog logbook property type already exists.');
                }
            } else {
                console.log('Error while retrieving properties, specifically iLog property type.');
            }
        },
    });
}

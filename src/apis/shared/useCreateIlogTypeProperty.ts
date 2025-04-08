import { useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { useGetPropertyTypes } from "../propertyType/useGetPropertyTypes";
import { ILOG_BASE_TYPES_PROPERTY } from "./types";
import { useSearchPropertyType } from "../propertyType/useSearchPropertyType";
import openbis from "@openbis/openbis.esm";
import { iLogID } from "./common";


export const useCreateIlogTypeProperty = () => {
    const { apiFacade } = useContext(AuthContext);
    const existingPropertyTypesResult = useGetPropertyTypes();
    const ilogExisting = useSearchPropertyType(ILOG_BASE_TYPES_PROPERTY.code);
    return useMutation({
        mutationFn: async () => {
            const ilogExistingRes = await ilogExisting.refetch();
            const existingPropertyTypesResultRes = await existingPropertyTypesResult.refetch();
            if(ilogExistingRes.isSuccess && existingPropertyTypesResultRes.isSuccess){
                if (ilogExistingRes.data !== null) {
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
            }
            
        },
    });
}
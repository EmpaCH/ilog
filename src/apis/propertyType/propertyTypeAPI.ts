import openbis from "@openbis/openbis.esm";
import { convertObjectTypeDefinitionToOperations, convertOpenBISPropertyType } from "../type/commonType";
import { PropertyType, convertPropertyTypeToCreation } from "./commonPropertyType";


export async function getPropertyType(
    api: openbis.OpenBISJavaScriptFacade,
    propertyTypeCode: string
  ): Promise<PropertyType | null> {
    const searchCriteria = new openbis.PropertyTypeSearchCriteria();
    searchCriteria.withCode().thatEquals(propertyTypeCode);
    const result = await api.searchPropertyTypes(
      searchCriteria,
      new openbis.PropertyTypeFetchOptions()
    );
    const propertyType = result.getObjects()[0];
    if (!propertyType) {
      return null;
    }
    else{
        return convertOpenBISPropertyType(propertyType);
    }
  }

export async function createPropertyType(
    api: openbis.OpenBISJavaScriptFacade,
    propertyType: PropertyType
  ): Promise<void> {
    const ops = convertPropertyTypeToCreation(propertyType);
    const options = new openbis.SynchronousOperationExecutionOptions();
    options.setExecuteInOrder(true);
    if (!ops) {
      return;
    }else{
        await api.executeOperations([ops], options);
    }
  }
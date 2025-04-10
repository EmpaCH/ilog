import openbis from "@openbis/openbis.esm";
import { convertOpenBISPropertyType } from "../type/commonType";
import {
  PropertyType,
  convertPropertyTypeToCreation,
  LocalPropertyType,
  convertPropertyAssignment,
  PropertyAssignment,
} from "./commonPropertyType";

/**
 * Fetches a property type by its code.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param propertyTypeCode - The code of the property type to fetch.
 * @returns A promise that resolves to the PropertyType object or null if not found.
 */
export async function getPropertyType(
  api: openbis.OpenBISJavaScriptFacade,
  propertyTypeCode: string
): Promise<PropertyType | null> {
  // Create search criteria for the property type code
  const searchCriteria = new openbis.PropertyTypeSearchCriteria();
  searchCriteria.withCode().thatEquals(propertyTypeCode);
  const fo = new openbis.PropertyTypeFetchOptions();
  fo.withVocabulary();
  // Search for the property type
  const result = await api.searchPropertyTypes(
    searchCriteria,
    fo
  );
  // Get the first result
  const propertyType = result.getObjects()[0];
  // Return null if not found, otherwise convert and return the property type
  if (!propertyType) {
    return null;
  } else {
    return convertOpenBISPropertyType(propertyType);
  }
}

/**
 * Creates a new property type.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param propertyType - The PropertyType object to create.
 * @returns A promise that resolves when the property type is created.
 */
export async function createPropertyType(
  api: openbis.OpenBISJavaScriptFacade,
  propertyType: PropertyType
): Promise<void> {
  // Convert the property type to creation operations
  const ops = convertPropertyTypeToCreation(propertyType);
  // Set execution options to execute operations in order
  const options = new openbis.SynchronousOperationExecutionOptions();
  options.setExecuteInOrder(true);

  if (!ops) {
    return;
  } else {
    await api.createPropertyTypes([ops]);
  }
}

/**
 * Get all property types that are not managed internally.
 * @param api - The OpenBIS JavaScript facade instance.
 * @returns A promise that resolves to an array of LocalPropertyType objects.
 */
export async function getPropertyTypes(
  api: openbis.OpenBISJavaScriptFacade
): Promise<LocalPropertyType[]> {
  // Create search criteria and fetch options
  const sc = new openbis.PropertyTypeSearchCriteria();
  const fo = new openbis.PropertyTypeFetchOptions();
  fo.withVocabulary();
  fo.withSampleType();
  // Search for property types
  const result = await api.searchPropertyTypes(sc, fo);
  // Filter out internally managed property types and convert the rest
  return result.getObjects().map(convertOpenBISPropertyType);
}

export async function getPropertyAssignments(
  api: openbis.OpenBISJavaScriptFacade
): Promise<PropertyAssignment[]> {
  const fetchOptions = new openbis.PropertyAssignmentFetchOptions();
  fetchOptions.withPropertyType();
  fetchOptions.withEntityType();
  const assigments = await api.searchPropertyAssignments(
    new openbis.PropertyAssignmentSearchCriteria(),
    fetchOptions
  );
  //console.log("getPropertyAssignments", assigments.getObjects());
  return assigments.getObjects().map(convertPropertyAssignment);
}

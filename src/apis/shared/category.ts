import openbis from "@openbis/openbis.esm";

// Object type metadata key holding the iLog category of the type
export const categoryMetadataKey = "category";
// Older iLog versions stored the category as collectionType = "<CATEGORY>_COLLECTION".
// It is still read as a fallback and replaced by the new key when a type is saved.
export const legacyCategoryMetadataKey = "collectionType";

export const instrumentCategory = "INSTRUMENT";
export const componentCategory = "COMPONENT";
export const logbookEntryCategory = "LOGBOOK_ENTRY";

export const categoryLabels: Record<string, string> = {
  [instrumentCategory]: "Instrument",
  [componentCategory]: "Component",
  [logbookEntryCategory]: "Logbook entry",
};

const legacyCategories: Record<string, string> = {
  INSTRUMENT_COLLECTION: instrumentCategory,
  COMPONENT_COLLECTION: componentCategory,
  LOGBOOK_COLLECTION: logbookEntryCategory,
};

/**
 * Get the iLog category from object type metadata.
 * @param metadata - The object type metadata.
 * @returns The category, or "" if the type is not an iLog type.
 */
export function getCategoryFromMetadata(metadata: Record<string, string> | null | undefined): string {
  const category = metadata?.[categoryMetadataKey];
  if (category) {
    return category;
  }
  return legacyCategories[metadata?.[legacyCategoryMetadataKey] ?? ""] ?? "";
}

/**
 * Get the iLog category of an object type.
 * @param type - The openBIS sample type.
 * @returns The category, or "" if the type is not an iLog type.
 */
export function getTypeCategory(type: openbis.SampleType | null | undefined): string {
  return getCategoryFromMetadata(type?.getMetaData());
}

/**
 * Get the iLog category of an object, based on its type. The type must have been fetched.
 * @param sample - The openBIS sample.
 * @returns The category, or "" if the object's type is not an iLog type.
 */
export function getSampleCategory(sample: openbis.Sample): string {
  return getTypeCategory(sample.getType());
}

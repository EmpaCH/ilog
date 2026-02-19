import openbis from "@openbis/openbis.esm";

/**
 * Create the ELN_PREVIEW dataset type if it doesn't exist
 * @param api - The OpenBIS JavaScript facade instance
 */
export async function ensureImageDatasetType(
  api: openbis.OpenBISJavaScriptFacade
): Promise<void> {
  try {
    // Check if ELN_PREVIEW dataset type already exists
    const sc = new openbis.DataSetTypeSearchCriteria();
    sc.withCode().thatEquals("ELN_PREVIEW");
    
    const fo = new openbis.DataSetTypeFetchOptions();
    const result = await api.searchDataSetTypes(sc, fo);
    
    if (result.getObjects().length === 0) {
      // Create the ELN_PREVIEW dataset type
      const creation = new openbis.DataSetTypeCreation();
      creation.setCode("ELN_PREVIEW");
      creation.setDescription("Dataset type for storing preview images");
      creation.setMainDataSetPattern(".*");
      creation.setMainDataSetPath("/");
      creation.setDisallowDeletion(false);
      
      await api.createDataSetTypes([creation]);
      console.log("ELN_PREVIEW dataset type created successfully");
    }
  } catch (error) {
    console.error("Error ensuring ELN_PREVIEW dataset type:", error);
    // Don't throw - this might be a permissions issue, but the type might already exist
  }
}
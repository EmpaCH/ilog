import openbis from "@openbis/openbis.esm";

// SampleType settings for object types
export const propertyElnSettings = '$ELN_SETTINGS';
export const generalElnSettings = "/ELN_SETTINGS/GENERAL_ELN_SETTINGS";

// ELN Settings definitions
export interface SampleTypeDefinitionExtension {
  ENABLE_STORAGE: boolean;
  SAMPLE_CHILDREN_ANY_TYPE_DISABLED: boolean;
  SAMPLE_CHILDREN_DISABLED: boolean;
  SAMPLE_PARENTS_ANY_TYPE_DISABLED: boolean;
  SAMPLE_PARENTS_DISABLED: boolean;
  SHOW: boolean;
  SHOW_ON_NAV: boolean;
  USE_AS_PROTOCOL: boolean;
}

interface SampleTypeDefinitionExtensionRecords {
  [key: string]: SampleTypeDefinitionExtension;
}

export interface ElnSettingsProperties {
  inventorySpaces: string[];
  sampleTypeDefinitionsExtension: SampleTypeDefinitionExtensionRecords;
}

// New type default settings
export const newTypeSettings: SampleTypeDefinitionExtension = {
  ENABLE_STORAGE: false,
  SAMPLE_CHILDREN_ANY_TYPE_DISABLED: false,
  SAMPLE_CHILDREN_DISABLED: false,
  SAMPLE_PARENTS_ANY_TYPE_DISABLED: false,
  SAMPLE_PARENTS_DISABLED: false,
  SHOW: true,
  SHOW_ON_NAV: true,
  USE_AS_PROTOCOL: false,
};

/**
 * Fetches the ELN settings from the given OpenBIS API.
 * @param api - The OpenBIS API instance.
 * @returns A promise that resolves to a dictionary of samples.
 */
export async function getElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<{[index: string]: openbis.Sample}> {
  const fo = new openbis.SampleFetchOptions();
  fo.withProperties();
  const id = new openbis.SampleIdentifier(generalElnSettings);
  return await api.getSamples([id], fo);
}

/**
 * Parses the ELN settings properties from the given OpenBIS API.
 * @param api - The OpenBIS API instance.
 * @returns A promise that resolves to the ELN settings properties.
 */
export async function parseElnSettingsProperties(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<ElnSettingsProperties> {
  const res = await getElnSettings(api);
  return JSON.parse(res[generalElnSettings].getProperty(propertyElnSettings)) as ElnSettingsProperties;
}

/**
 * Updates the ELN settings with new properties in the given OpenBIS API.
 * @param api - The OpenBIS API instance.
 * @param newProperties - The new ELN settings properties.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
  newProperties: ElnSettingsProperties,
): Promise<void> {
  const su = new openbis.SampleUpdate();
  su.setProperty(propertyElnSettings, JSON.stringify(newProperties));
  su.setSampleId(new openbis.SampleIdentifier(generalElnSettings));
  await api.updateSamples([su]);
}

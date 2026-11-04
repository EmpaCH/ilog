import openbis from "@openbis/openbis.esm";

// SampleType settings for object types
export const propertyElnSettings = "ELN_SETTINGS";
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
  // iLog: identifier of the collection all logbook entries are stored in, e.g. "/SPACE/PROJECT/COLLECTION"
  ilogLogbookCollection?: string;
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
  return deserializeElnSettings(res);
}

export function deserializeElnSettings(res: { [index: string]: openbis.Sample; }): ElnSettingsProperties | PromiseLike<ElnSettingsProperties> {

  return JSON.parse(res[generalElnSettings].getJsonProperty(propertyElnSettings) ?? "{}") as ElnSettingsProperties;
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

/**
 * Enable an object type in the ELN, so it is shown in the ELN menus.
 * The ELN only lists object types that have an entry in sampleTypeDefinitionsExtension.
 * An existing entry is left unchanged, so a lab's own ELN configuration of the type is kept.
 * @param api - The OpenBIS API instance.
 * @param typeCode - The code of the object type.
 */
export async function registerObjectTypeInElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
  typeCode: string,
): Promise<void> {
  // Read the settings right before writing, so changes made in the meantime are not lost
  const properties = await parseElnSettingsProperties(api);
  if (properties.sampleTypeDefinitionsExtension?.[typeCode]) {
    return;
  }
  properties.sampleTypeDefinitionsExtension = {
    ...properties.sampleTypeDefinitionsExtension,
    [typeCode]: { ...newTypeSettings },
  };
  await updateElnSettings(api, properties);
}

/**
 * Remove the ELN settings entry of a deleted object type.
 * @param api - The OpenBIS API instance.
 * @param typeCode - The code of the object type.
 */
export async function unregisterObjectTypeInElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
  typeCode: string,
): Promise<void> {
  const properties = await parseElnSettingsProperties(api);
  if (!properties.sampleTypeDefinitionsExtension?.[typeCode]) {
    return;
  }
  delete properties.sampleTypeDefinitionsExtension[typeCode];
  await updateElnSettings(api, properties);
}

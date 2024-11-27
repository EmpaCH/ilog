import openbis from '@openbis/openbis.esm';

// env creation settings
export const iLogID = 'ILOG';
export const labID = '205';
export const collectionID = 'EQUIPMENT';
// inventory space creation settings
export const customServiceCode = 'as-eln-lims-api';
export const createSpaceMethod = 'createSpace';
// sample type settings
export const generalElnSettings = '/ELN_SETTINGS/GENERAL_ELN_SETTINGS';
export const propertyElnSettings = '$ELN_SETTINGS';

// Environment definition
// Space (lab) > Project (iLog) > Collection (i.e. Equipment)
class Env {
  collection: openbis.Experiment | null;
  project: openbis.Project | null;
  space: openbis.Space | null;

  constructor(collection = null, project = null, space = null) {
    this.collection = collection;
    this.project = project;
    this.space = space;
  }

  setEnv(collection: openbis.Experiment, project: openbis.Project, space: openbis.Space) {
    this.collection = collection;
    this.project = project;
    this.space = space;
  }

  isDefined(): boolean {
    return this.collection != null && this.project != null && this.space != null;
  }
}

export const env = new Env();

// ELN Settings definitions
export interface SampleTypeDefinitionExtension {
  ENABLE_STORAGE: boolean
  SAMPLE_CHILDREN_ANY_TYPE_DISABLED: boolean
  SAMPLE_CHILDREN_DISABLED: boolean
  SAMPLE_PARENTS_ANY_TYPE_DISABLED: boolean
  SAMPLE_PARENTS_DISABLED: boolean
  SHOW: boolean
  SHOW_ON_NAV: boolean
  USE_AS_PROTOCOL: boolean
}

interface SampleTypeDefinitionExtensionRecords {
  [key: string]: SampleTypeDefinitionExtension
}

export interface ElnSettingsProperties {
  inventorySpaces: string[],
  sampleTypeDefinitionsExtension: SampleTypeDefinitionExtensionRecords
}

// ELN settings and property extraction functions
export async function getElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<{[index: string]: openbis.Sample}> {
  const fo = new openbis.SampleFetchOptions();
  fo.withProperties();
  const id = new openbis.SampleIdentifier(generalElnSettings);
  return await api.getSamples([id], fo);
}

export async function parseElnSettingsProperties(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<ElnSettingsProperties> {
  const res = await getElnSettings(api);
  return JSON.parse(res[generalElnSettings].getProperty(propertyElnSettings)) as ElnSettingsProperties;
}

export async function updateElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
  newProperties: ElnSettingsProperties,
): Promise<void> {
  const su = new openbis.SampleUpdate();
  su.setProperty(propertyElnSettings, JSON.stringify(newProperties));
  su.setSampleId(new openbis.SampleIdentifier(generalElnSettings));
  await api.updateSamples([su]);
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

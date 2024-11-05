import openbis from '@openbis/openbis.esm';

export const iLogID = 'ILOG';
export const labID = '205';
export const collectionID = 'EQUIPMENT';
export const elnSettings = '$ELN_SETTINGS';
export const generalElnSettings = '/ELN_SETTINGS/GENERAL_ELN_SETTINGS';

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

// ELN Settings definition for Samples (Objects)
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

export interface ElnSettings {
  sampleTypeDefinitionsExtension: SampleTypeDefinitionExtensionRecords
}

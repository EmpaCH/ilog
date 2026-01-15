import openbis from "@openbis/openbis.esm";

// Environment creation settings
export const iLogID = "ILOG";
export const iLogLogbookID = "ILOG_LOGBOOK";
export const labID = "LAB205_EQUIPMENT";
export const componentCollectionID = "COMPONENT_COLLECTION";
export const componentCollectionName = "Components";
export const instrumentCollectionID = "INSTRUMENT_COLLECTION";
export const instrumentCollectionName = "Instruments";
export const logbookCollectionID = "LOGBOOK_COLLECTION";
export const logbookCollectionName = "Logbook";

// Helper functions
export function getCurrentLabID(): string {
  return labID;
}

let isInitializing = false;

export function setIsInitializing(value: boolean): void {
  isInitializing = value;
}

export function getIsInitializing(): boolean {
  return isInitializing;
}

// Space (lab) > Project (iLog) > Collection (i.e. Components, Instruments)
class Env {
  componentCollection: openbis.Experiment | null;
  instrumentCollection: openbis.Experiment | null;
  project: openbis.Project | null;
  space: openbis.Space | null;

  constructor(collection = null, project = null, space = null) {
    this.componentCollection = collection;
    this.instrumentCollection = collection;
    this.project = project;
    this.space = space;
  }

  setEnv(
    componentCollection: openbis.Experiment,
    instrumentCollection: openbis.Experiment,
    project: openbis.Project,
    space: openbis.Space
  ) {
    this.componentCollection = componentCollection;
    this.instrumentCollection = instrumentCollection;
    this.project = project;
    this.space = space;
  }

  isDefined(): boolean {
    return (
      this.componentCollection != null && this.instrumentCollection != null && this.project != null && this.space != null
    );
  }
}

export const env = new Env();

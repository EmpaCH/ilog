import openbis from "@openbis/openbis.esm";

// Environment creation settings
export const iLogID = "ILOG";
export const labID = "205";
export const collectionID = "EQUIPMENT";

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

  setEnv(
    collection: openbis.Experiment,
    project: openbis.Project,
    space: openbis.Space
  ) {
    this.collection = collection;
    this.project = project;
    this.space = space;
  }

  isDefined(): boolean {
    return (
      this.collection != null && this.project != null && this.space != null
    );
  }
}

export const env = new Env();

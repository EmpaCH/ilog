import openbis from "@openbis/openbis.esm";

/**
 * Store an object in a collection by setting the space, project and experiment ids
 * of a sample creation (new object) or update (move) from the collection identifier.
 * @param creation - The sample creation or update to modify.
 * @param collectionIdentifier - The collection identifier, e.g. "/SPACE/PROJECT/COLLECTION".
 */
export function setCollectionIds(
  creation: openbis.SampleCreation | openbis.SampleUpdate,
  collectionIdentifier: string,
): void {
  const [, space, project, code] = collectionIdentifier.split("/");
  if (!space || !project || !code) {
    throw new Error(`Invalid collection identifier: ${collectionIdentifier}`);
  }
  creation.setSpaceId(new openbis.SpacePermId(space));
  creation.setProjectId(new openbis.ProjectIdentifier(`/${space}/${project}`));
  creation.setExperimentId(new openbis.ExperimentIdentifier(collectionIdentifier));
}

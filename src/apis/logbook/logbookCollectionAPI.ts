import openbis from "@openbis/openbis.esm";
import { setCollectionIds } from "../collection/collectionIdentifier";
import { fetchElnSettings } from "../eln/useGetElnSettings";
import {
  deserializeElnSettings,
  generalElnSettings,
  getElnSettings,
  updateElnSettings,
} from "../eln/elnSettings";

export interface NewLogbookCollection {
  space: string;
  project: string;
  code: string;
  name: string;
}

export interface LogbookCollectionSetting {
  // The configured collection identifier, null if no logbook collection is set up yet
  identifier: string | null;
  // Whether the configured collection exists (and is accessible to the user)
  exists: boolean;
}

/**
 * Get the logbook collection configured in the general ELN settings, and whether it still exists.
 * @param api - The OpenBIS JavaScript facade instance.
 * @throws If the ELN settings can't be read.
 */
export async function getLogbookCollectionSetting(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<LogbookCollectionSetting> {
  const elnSettings = await getElnSettings(api);
  if (!elnSettings[generalElnSettings]) {
    throw new Error(
      `The ELN settings (${generalElnSettings}) were not found or are not accessible. ` +
      "The logbook needs the openBIS ELN to be installed on this instance."
    );
  }
  const identifier = (await deserializeElnSettings(elnSettings)).ilogLogbookCollection || null;
  if (!identifier) {
    return { identifier: null, exists: false };
  }

  const collections = await api.getExperiments(
    [new openbis.ExperimentIdentifier(identifier)], new openbis.ExperimentFetchOptions()
  );
  return { identifier, exists: !!collections[identifier] };
}

/**
 * Get the collection all logbook entries are stored in.
 * @param api - The OpenBIS JavaScript facade instance.
 * @returns The collection identifier, or null if no logbook collection is set up yet.
 * @throws If the ELN settings can't be read, or the configured collection no longer exists.
 */
export async function getLogbookCollection(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<string | null> {
  const { identifier, exists } = await getLogbookCollectionSetting(api);
  if (identifier && !exists) {
    throw new Error(
      `The logbook collection ${identifier} was not found. It may have been deleted, moved or renamed, ` +
      "or you don't have access to it."
    );
  }
  return identifier;
}

/**
 * Count the objects (logbook entries) stored in a collection.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param collectionIdentifier - The collection identifier, e.g. "/SPACE/PROJECT/COLLECTION".
 */
export async function countLogbookEntries(
  api: openbis.OpenBISJavaScriptFacade,
  collectionIdentifier: string,
): Promise<number> {
  const sc = new openbis.SampleSearchCriteria();
  sc.withExperiment().withIdentifier().thatEquals(collectionIdentifier);
  const fo = new openbis.SampleFetchOptions();
  fo.count(0);
  const result = await api.searchSamples(sc, fo);
  return result.getTotalCount();
}

/**
 * Move all objects (logbook entries) from one collection to another.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param from - The identifier of the collection the entries are in now.
 * @param to - The identifier of the collection to move them to.
 * @returns The number of moved entries.
 */
export async function moveLogbookEntries(
  api: openbis.OpenBISJavaScriptFacade,
  from: string,
  to: string,
): Promise<number> {
  const sc = new openbis.SampleSearchCriteria();
  sc.withExperiment().withIdentifier().thatEquals(from);
  const result = await api.searchSamples(sc, new openbis.SampleFetchOptions());
  const updates = result.getObjects().map((sample) => {
    const update = new openbis.SampleUpdate();
    update.setSampleId(sample.getPermId());
    setCollectionIds(update, to);
    return update;
  });
  if (updates.length > 0) {
    await api.updateSamples(updates);
  }
  return updates.length;
}

/**
 * Store the logbook collection in the general ELN settings, keeping all other settings.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param collectionIdentifier - The collection identifier, e.g. "/SPACE/PROJECT/COLLECTION".
 */
export async function setLogbookCollection(
  api: openbis.OpenBISJavaScriptFacade,
  collectionIdentifier: string,
): Promise<void> {
  // Read the settings right before writing, so changes made in the meantime are not lost
  const settings = await fetchElnSettings(api);
  settings.ilogLogbookCollection = collectionIdentifier;
  await updateElnSettings(api, settings);
}

/**
 * Create the space, project and collection for the logbook, skipping the ones that already exist.
 * A newly created space is added to the ELN inventory spaces.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param collection - The codes of the space, project and collection and the collection name.
 * @returns The identifier of the collection.
 */
export async function createLogbookCollection(
  api: openbis.OpenBISJavaScriptFacade,
  { space, project, code, name }: NewLogbookCollection,
): Promise<string> {
  const projectIdentifier = `/${space}/${project}`;
  const collectionIdentifier = `${projectIdentifier}/${code}`;

  const existingSpaces = await api.getSpaces([new openbis.SpacePermId(space)], new openbis.SpaceFetchOptions());
  if (!existingSpaces[space]) {
    const spaceCreation = new openbis.SpaceCreation();
    spaceCreation.setCode(space);
    await api.createSpaces([spaceCreation]);
    try {
      const settings = await fetchElnSettings(api);
      if (!(settings.inventorySpaces ?? []).includes(space)) {
        settings.inventorySpaces = [...(settings.inventorySpaces ?? []), space];
        await updateElnSettings(api, settings);
      }
    } catch (error) {
      // The collection still works without this, it is just not listed in the ELN inventory
      console.warn("Could not add space to ELN inventory spaces:", error);
    }
  }

  const existingProjects = await api.getProjects(
    [new openbis.ProjectIdentifier(projectIdentifier)], new openbis.ProjectFetchOptions()
  );
  if (!existingProjects[projectIdentifier]) {
    const projectCreation = new openbis.ProjectCreation();
    projectCreation.setCode(project);
    projectCreation.setSpaceId(new openbis.SpacePermId(space));
    await api.createProjects([projectCreation]);
  }

  const existingCollections = await api.getExperiments(
    [new openbis.ExperimentIdentifier(collectionIdentifier)], new openbis.ExperimentFetchOptions()
  );
  if (!existingCollections[collectionIdentifier]) {
    const collectionCreation = new openbis.ExperimentCreation();
    collectionCreation.setCode(code);
    collectionCreation.setTypeId(new openbis.EntityTypePermId("COLLECTION"));
    collectionCreation.setProjectId(new openbis.ProjectIdentifier(projectIdentifier));
    if (name) {
      collectionCreation.setProperties({ NAME: name });
    }
    await api.createExperiments([collectionCreation]);
  }

  return collectionIdentifier;
}

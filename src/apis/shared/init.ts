import openbis from '@openbis/openbis.esm';
import * as common from './common';
import { initProperties } from './initElnSettings';

export async function createIlogIdentifier(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<void> {
  const sc = new openbis.PropertyTypeSearchCriteria();
  sc.withCode().thatEquals(common.iLogID);
  const fo = new openbis.PropertyTypeFetchOptions();
  const result = await api.searchPropertyTypes(sc, fo);
  if (result.getTotalCount() == 0) {
    const newProp = new openbis.PropertyTypeCreation();
    newProp.setCode(common.iLogID);
    newProp.setLabel(common.iLogID);
    newProp.setDataType('BOOLEAN');
    newProp.setDescription('This is the iLog identifier.');
    await api.createPropertyTypes([newProp]);
    console.log('iLog property type initialized.');
  }
  else {
    console.log('iLog property type already exists.');
  }
}

export async function createElnSettingsProperties(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<void> {
  const res = await common.getElnSettings(api);
  console.log(res);
  if (!res[common.generalElnSettings].getProperty(common.propertyElnSettings)) {
    await common.updateElnSettings(api, initProperties);
    console.log('Eln settings initialized.');
  }
  else {
    console.log('Eln settings already defined.');
  }
}

export async function createSpace(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<openbis.ISpaceId> {
  const sc = new openbis.SpaceSearchCriteria();
  sc.withCode().thatEquals(common.labID);
  const fo = new openbis.SpaceFetchOptions();
  const result = await api.searchSpaces(sc, fo);
  if (result.getTotalCount() == 0) {
    const newSpace = new openbis.SpaceCreation();
    newSpace.setCode(common.labID);
    const result = await api.createSpaces([newSpace]);
    const settings = await common.parseElnSettingsProperties(api);
    settings.inventorySpaces = [
      ...settings.inventorySpaces,
      common.labID
    ];
    await common.updateElnSettings(api, settings);
    console.log('Inventory space initialized.');
    return result[0];
  }
  console.log(`Inventory space ${common.labID} already exists.`);
  return result.getObjects()[0].getPermId();
}

export async function createProject(
  api: openbis.OpenBISJavaScriptFacade,
  spaceId: openbis.ISpaceId,
): Promise<openbis.IProjectId> {
  const sc = new openbis.ProjectSearchCriteria();
  sc.withCode().thatEquals(common.iLogID);
  sc.withSpace().withCode().thatEquals(common.labID);
  const fo = new openbis.ProjectFetchOptions();
  const result = await api.searchProjects(sc, fo);
  if (result.getTotalCount() == 0) {
    const newProject = new openbis.ProjectCreation();
    newProject.setCode(common.iLogID);
    newProject.setSpaceId(spaceId);
    const result = await api.createProjects([newProject]);
    console.log('Project initialized.');
    return result[0];
  }
  console.log(`Project ${common.iLogID} already exists for lab ${common.labID}.`);
  return result.getObjects()[0].getPermId();
}

export async function createCollection(
  api: openbis.OpenBISJavaScriptFacade,
  projectId: openbis.IProjectId,
): Promise<openbis.Experiment> {
  const sc = new openbis.ExperimentSearchCriteria();
  sc.withCode().thatEquals(common.collectionID);
  sc.withProject().withCode().thatEquals(common.iLogID);
  sc.withProject().withSpace().withCode().thatEquals(common.labID);
  const fo = new openbis.ExperimentFetchOptions();
  fo.withProject().withSpace();
  const result = await api.searchExperiments(sc, fo);
  if (result.getTotalCount() == 0) {
    const newCollection = new openbis.ExperimentCreation();
    newCollection.setTypeId(new openbis.EntityTypePermId('COLLECTION'));
    newCollection.setCode(common.collectionID);
    newCollection.setProjectId(projectId);
    const newExp = await api.createExperiments([newCollection]);
    const sc = new openbis.ExperimentSearchCriteria();
    sc.withPermId().thatEquals(newExp[0].getPermId());
    const result = await api.searchExperiments(sc, fo);
    console.log('Collection initialized.');
    return result.getObjects()[0];
  }
  console.log(`Collection ${common.collectionID} already exists in project ${common.iLogID} for lab ${common.labID}.`);
  return result.getObjects()[0];
}

export async function initIlog(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<void> {
  await createIlogIdentifier(api);
  await createElnSettingsProperties(api);
  const spaceId = await createSpace(api);
  const projectId = await createProject(api, spaceId);
  const collection = await createCollection(api, projectId);
  common.env.setEnv(collection, collection.getProject(), collection.getProject().getSpace());
  console.log('App environment initialized.');
}

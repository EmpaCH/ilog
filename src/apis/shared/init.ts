import openbis from '@openbis/openbis.esm';
import {
  iLogID,
  labID,
  collectionID,
  customServiceCode,
  createSpaceMethod,
  env
} from '../shared/common';

// Initialize the iLog property type
export async function createIlogIdentifier(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<void> {
  const sc = new openbis.PropertyTypeSearchCriteria();
  sc.withCode().thatEquals(iLogID);
  const fo = new openbis.PropertyTypeFetchOptions();
  const result = await api.searchPropertyTypes(sc, fo);
  if (result.getTotalCount() == 0) {
    const newProp = new openbis.PropertyTypeCreation();
    newProp.setCode(iLogID);
    newProp.setLabel(iLogID);
    newProp.setDataType('BOOLEAN');
    newProp.setDescription('This is the iLog identifier.');
    await api.createPropertyTypes([newProp]);
    console.log('iLog property type initialized.');
  }
  else {
    console.log('iLog property type already exists.');
  }
}

async function createInventorySpace(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<openbis.ISpaceId> {
  const servCode = new openbis.CustomASServiceCode(customServiceCode);
  const servOpt = new openbis.CustomASServiceExecutionOptions();
  servOpt.withParameter('method', createSpaceMethod);
  servOpt.withParameter('isInventory', true);
  servOpt.withParameter('postfix', labID);
  servOpt.withParameter('group', '');
  const inv = await api.executeCustomASService(servCode, servOpt);
  return inv[0];
}

export async function createSpace(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<openbis.ISpaceId> {
  const sc = new openbis.SpaceSearchCriteria();
  sc.withCode().thatEquals(labID);
  const fo = new openbis.SpaceFetchOptions();
  const result = await api.searchSpaces(sc, fo);
  if (result.getTotalCount() == 0) {
    return await createInventorySpace(api);
  }
  console.log(`Space ${labID} already exists.`);
  return result.getObjects()[0].getPermId();
}

export async function createProject(
  api: openbis.OpenBISJavaScriptFacade,
  spaceId: openbis.ISpaceId,
): Promise<openbis.IProjectId> {
  const sc = new openbis.ProjectSearchCriteria();
  sc.withCode().thatEquals(iLogID);
  sc.withSpace().withCode().thatEquals(labID);
  const fo = new openbis.ProjectFetchOptions();
  const result = await api.searchProjects(sc, fo);
  if (result.getTotalCount() == 0) {
    const newProject = new openbis.ProjectCreation();
    newProject.setCode(iLogID);
    newProject.setSpaceId(spaceId);
    const result = await api.createProjects([newProject]);
    return result[0];
  }
  console.log(`Project ${iLogID} already exists for lab ${labID}.`);
  return result.getObjects()[0].getPermId();
}

export async function createCollection(
  api: openbis.OpenBISJavaScriptFacade,
  projectId: openbis.IProjectId,
): Promise<openbis.Experiment> {
  const sc = new openbis.ExperimentSearchCriteria();
  sc.withCode().thatEquals(collectionID);
  sc.withProject().withCode().thatEquals(iLogID);
  sc.withProject().withSpace().withCode().thatEquals(labID);
  const fo = new openbis.ExperimentFetchOptions();
  fo.withProject().withSpace();
  const result = await api.searchExperiments(sc, fo);
  if (result.getTotalCount() == 0) {
    const newCollection = new openbis.ExperimentCreation();
    newCollection.setTypeId(new openbis.EntityTypePermId('COLLECTION'));
    newCollection.setCode(collectionID);
    newCollection.setProjectId(projectId);
    const newExp = await api.createExperiments([newCollection]);
    const result = await api.getExperiments(newExp, fo);
    return result[0];
  }
  console.log(`Collection ${collectionID} already exists in project ${iLogID} for lab ${labID}.`);
  return result.getObjects()[0];
}

export async function initIlog(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<void> {
  await createIlogIdentifier(api);
  const spaceId = await createSpace(api);
  const projectId = await createProject(api, spaceId);
  const collection = await createCollection(api, projectId);
  env.setEnv(collection, collection.getProject(), collection.getProject().getSpace());
  console.log('App environment initialized.');
}

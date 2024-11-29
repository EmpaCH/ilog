import openbis from '@openbis/openbis.esm';
import { iLogID, labID, collectionID, env, ILOG_BASE_TYPES_VOCABULARY, iLogBaseTypesPropertyCode, ILOG_BASE_TYPES_PROPERTY } from '../shared/common';

import { createVocabulary, getVocabulary } from '../vocabulary/vocabularyAPI';
import { createPropertyType } from '../propertyType/propertyTypeAPI';


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

export async function createIlogTypeVariants(api: openbis.OpenBISJavaScriptFacade){
  const voc = await getVocabulary(api, ILOG_BASE_TYPES_VOCABULARY.code);
  if (voc == null){
    console.log("ILog type variants vocabulary does not exist. Creating it now.");
    await createVocabulary(api, ILOG_BASE_TYPES_VOCABULARY);
  }
  console.log("ILog type variants vocabulary already exists.");
}

export async function createIlogBaseTypeProperty(api: openbis.OpenBISJavaScriptFacade){
  const sc = new openbis.PropertyTypeSearchCriteria();
  sc.withCode().thatEquals(iLogBaseTypesPropertyCode);
  const fo = new openbis.PropertyTypeFetchOptions();
  const result = await api.searchPropertyTypes(sc, fo);
  if (result.getTotalCount() == 0) {
    await createPropertyType(api, ILOG_BASE_TYPES_PROPERTY);
    console.log('iLog base type property initialized.');
  }
  else {
    console.log('iLog base type property already exists.');
  }
}

export async function createIlogTypeProperty(
  api: openbis.OpenBISJavaScriptFacade)
{
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

export async function createSpace(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<openbis.ISpaceId> {
  const sc = new openbis.SpaceSearchCriteria();
  sc.withCode().thatEquals(labID);
  const fo = new openbis.SpaceFetchOptions();
  const result = await api.searchSpaces(sc, fo);
  if (result.getTotalCount() == 0) {
    const newSpace = new openbis.SpaceCreation();
    newSpace.setCode(labID);
    const result = await api.createSpaces([newSpace]);
    return result[0];
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
  await createIlogTypeVariants(api);
  const spaceId = await createSpace(api);
  const projectId = await createProject(api, spaceId);
  const collection = await createCollection(api, projectId);
  const baseType = await createIlogBaseTypeProperty(api);
  env.setEnv(collection, collection.getProject(), collection.getProject().getSpace());
  console.log('App environment initialized.');
}

export async function deleteSpace(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<void> {
  const sc = new openbis.SpaceSearchCriteria();
  sc.withCode().thatStartsWith(labID);
  const fo = new openbis.SpaceFetchOptions();
  const result = await api.searchSpaces(sc, fo);
  const id = result.getObjects()[0].getId();
  const sdo = new openbis.SpaceDeletionOptions();
  sdo.setReason('Space no longer needed.');
  await api.deleteSpaces([id], sdo);
}

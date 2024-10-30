import openbis from '@openbis/openbis.esm';
import { iLogID } from '../shared/common';

// TODO
// 1.Look for templates in the settings
// 2.Export async function createInheritedType(api: openbis.OpenBISJavaScriptFacade, baseType: string, ):
//   Search for a type of type baseType and copy all property assignments into the new type.
//   Use a set to keep the list of assignments to make sure that they are unique between the base type and the derived type
//   Probably we can use some internal field to keep track of the inheritance relationships on the openbis 
//   Maybe we create a very base type in openbis which has some hidden fields that we use to track the inheritance

function hasProperty<T>(dict: { [key: string]: T }, key: string, value: T): boolean {
  return dict[key] === value;
}

export async function getObjects(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<openbis.Sample[]> {
  const sc = new openbis.SampleSearchCriteria();
  const fo = new openbis.SampleFetchOptions();
  fo.withType();
  fo.withProperties();
  const result = await api.searchSamples(sc, fo);
  const iLogObjs = result.getObjects().filter(
    obj => hasProperty(obj.getProperties(), iLogID, 'true')
  );
  return iLogObjs;
}

export async function createObject(
  api: openbis.OpenBISJavaScriptFacade,
  type: string,
  name: string,
  location: string,
  props:  {[key: string]: string},
): Promise<void> {
  const newObj = new openbis.SampleCreation();
  newObj.setTypeId(new openbis.EntityTypePermId(type));
  newObj.setCode(name);
  newObj.setProperty(iLogID, true);
  await api.createSamples([newObj]);
}

export async function deleteObject(
  api: openbis.OpenBISJavaScriptFacade,
  sampleId: openbis.ISampleId,
): Promise<void> {
  const sdo = new openbis.SampleDeletionOptions();
  sdo.setReason('Object no longer needed.');
  await api.deleteSamples([sampleId], sdo);
}

// TODO
export async function updateObject(
  api: openbis.OpenBISJavaScriptFacade,
  sampleId: openbis.ISampleId,
  props:  {[key: string]: string},
): Promise<void> {
  const update = new openbis.SampleUpdate();
  update.setSampleId(sampleId);
  update.setProperties(props);
  await api.updateSamples([update]);
}

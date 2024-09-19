import openbis from "@openbis/openbis.esm";

export async function createObject(api: openbis.OpenBISJavaScriptFacade, type: string, location: string, props:  {[key: string]: string}): Promise<openbis.Sample> {
    const creation = new openbis.SampleCreation();
    creation.setTypeId(new openbis.EntityTypePermId(type));
    creation.setExperimentId(new openbis.ExperimentIdentifier(location));
    creation.setProperties(props)
    const createdSampleId = await api.createSamples([creation]);
    const fo = new openbis.SampleFetchOptions();
    const sample = await api.getSamples(createdSampleId, fo);
    return sample[createdSampleId[0].getPermId()];
}

export async function updateObject(api: openbis.OpenBISJavaScriptFacade, sampleId: openbis.ISampleId, props:  {[key: string]: string}): Promise<void> {
    const update = new openbis.SampleUpdate();
    update.setSampleId(sampleId);
    update.setProperties(props);
    await api.updateSamples([update]);
}

export async function searchObjectTypes(api: openbis.OpenBISJavaScriptFacade, typeName: string): Promise<openbis.SampleType[]> {
    const fo = new openbis.SampleTypeFetchOptions();
    const sc = new openbis.SampleTypeSearchCriteria();
    sc.withCode().thatStartsWith(typeName);
    const result = await api.searchSampleTypes(sc, fo);
    return result.getObjects();

}
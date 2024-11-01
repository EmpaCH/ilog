import openbis from '@openbis/openbis.esm';

export async function getTrashedObjects(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<openbis.Deletion[]> {
  const sc = new openbis.DeletionSearchCriteria();
  sc.withId()
  const fo = new openbis.DeletionFetchOptions();
  fo.withDeletedObjects();
  const result = await api.searchDeletions(sc, fo);
  return result.getObjects();
}

export async function restoreTrashedObjects(
  api: openbis.OpenBISJavaScriptFacade,
  deletionIds: openbis.IDeletionId[],
): Promise<void> {
  await api.revertDeletions(deletionIds);
}

export async function deleteTrashedObjects(
  api: openbis.OpenBISJavaScriptFacade,
  deletionIds: openbis.IDeletionId[],
): Promise<void> {
  await api.confirmDeletions(deletionIds);
}

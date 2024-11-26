import openbis from "@openbis/openbis.esm";
import {
  convertOpenBISVocabularyToVocabulary,
  convertVocabularyToOperations,
  Vocabulary,
  VocabularyTerm,
} from "./commonVocabulary";

export async function createVocabulary(
  api: openbis.OpenBISJavaScriptFacade,
  vocabulary: Vocabulary
): Promise<void> {
  const ops = convertVocabularyToOperations(vocabulary);
  const options = new openbis.SynchronousOperationExecutionOptions();
  options.setExecuteInOrder(true);
  await api.executeOperations(ops, options);
}

export async function getVocabulary(
  api: openbis.OpenBISJavaScriptFacade,
  vocabularyCode: string
): Promise<Vocabulary | null> {
  const sc = new openbis.VocabularySearchCriteria();
  sc.withCode().thatEquals(vocabularyCode);
  const fo = new openbis.VocabularyFetchOptions();
  fo.withTerms();
  const result = await api.searchVocabularies(sc, fo);
  return result.getTotalCount() > 0
    ? convertOpenBISVocabularyToVocabulary(result.getObjects()[0])
    : null;
}

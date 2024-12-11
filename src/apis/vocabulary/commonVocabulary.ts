import openbis from "@openbis/openbis.esm";


export interface VocabularyTerm {
  code: string;
  label: string;
  description: string;
}

export interface Vocabulary {
  code: string;
  terms: VocabularyTerm[];
}


export function convertOpenBISVocabularyToVocabulary(
  vocabulary: openbis.Vocabulary
): Vocabulary {
  const terms = vocabulary.getTerms().map((term) => {
    return {
      code: term.getCode(),
      label: term.getLabel(),
      description: term.getDescription(),
    };
  });
  return {
    code: vocabulary.getCode(),
    terms,
  };
}

export function convertVocabularyToOperations(
  vocabulary: Vocabulary
): openbis.IOperation[] {
  const creation = new openbis.VocabularyCreation();
  const vocabularyId = new openbis.VocabularyPermId(vocabulary.code);
  creation.setCode(vocabulary.code);

  const termCreations = vocabulary.terms.map((term) => {
    const creation = new openbis.VocabularyTermCreation();
    creation.setCode(term.code);
    creation.setLabel(term.label);
    creation.setDescription(term.description);
    creation.setVocabularyId(vocabularyId);
    return creation;
  });
  return [new openbis.CreateVocabulariesOperation([creation]), new openbis.CreateVocabularyTermsOperation(termCreations)];
}



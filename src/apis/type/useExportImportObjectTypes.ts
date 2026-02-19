import { useCallback } from "react";
import openbis from "@openbis/openbis.esm";
import { iLogID } from "../shared/environment";

interface UseExportImportObjectTypesProps {
  apiFacade: any;
}

export const useExportImportObjectTypes = ({
  apiFacade,
}: UseExportImportObjectTypesProps) => {
  const exportObjectTypes = useCallback(async () => {
    try {
      const sc = new openbis.SampleTypeSearchCriteria();
      const fo = new openbis.SampleTypeFetchOptions();
      const paf = new openbis.PropertyAssignmentFetchOptions();
      const ptf = new openbis.PropertyTypeFetchOptions();
      ptf.withSampleType(); // Fetch the sample type reference for object properties
      ptf.withVocabulary();
      paf.withPropertyTypeUsing(ptf);
      fo.withPropertyAssignmentsUsing(paf);
      fo.withValidationPlugin();

      const result = await apiFacade.searchSampleTypes(sc, fo);
      const objectTypes = result.getObjects();

      // Export vocabularies
      const vsc = new openbis.VocabularySearchCriteria();
      const vfo = new openbis.VocabularyFetchOptions();
      vfo.withTerms();
      const vocabResult = await apiFacade.searchVocabularies(vsc, vfo);
      const vocabularies = vocabResult.getObjects();

      const vocabExportData = vocabularies.map((vocab: any) => ({
        code: vocab.getCode(),
        description: vocab.getDescription(),
        urlTemplate: vocab.getUrlTemplate(),
        terms: vocab.getTerms().map((term: any) => ({
          code: term.getCode(),
          label: term.getLabel(),
          description: term.getDescription(),
        })),
      }));

      const exportData = {
        objectTypes: objectTypes.map((type: any) => ({
          code: type.getCode(),
          description: type.getDescription(),
          generatedCodePrefix: type.getGeneratedCodePrefix(),
          validationPlugin: type.getValidationPlugin(),
          metadata: type.getMetaData(),
          propertyAssignments: type.getPropertyAssignments().map((pa: any) => ({
            code: pa.getPropertyType().getCode(),
            label: pa.getPropertyType().getLabel(),
            description: pa.getPropertyType().getDescription(),
            dataType: pa.getPropertyType().getDataType(),
            multivalued: pa.getPropertyType().isMultiValue(),
            mandatory: pa.isMandatory(),
            section: pa.getSection(),
            sampleType: pa.getPropertyType().getSampleType()?.getCode(),
            vocabulary: pa.getPropertyType().getVocabulary()?.getCode(), // Include referenced vocabulary
          })),
        })),
        vocabularies: vocabExportData,
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `types-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting object types:", err);
      throw err;
    }
  }, [apiFacade]);

  const importObjectTypes = useCallback(
    async (
      file: File,
      onProgress: (message: string) => void
    ): Promise<{ success: number; skipped: number; failed: number }> => {
      const stats = { success: 0, skipped: 0, failed: 0 };

      try {
        const fileContent = await file.text();
        const importedFile = JSON.parse(fileContent);

        // Handle both old format (array) and new format (object with objectTypes and vocabularies)
        let importedData: any[];
        let importedVocabularies: any[] = [];

        if (Array.isArray(importedFile)) {
          importedData = importedFile;
        } else if (importedFile.objectTypes && Array.isArray(importedFile.objectTypes)) {
          importedData = importedFile.objectTypes;
          importedVocabularies = importedFile.vocabularies || [];
        } else {
          throw new Error("Invalid file format: expected an array of object types or an object with objectTypes and vocabularies");
        }

        // Get existing vocabulary codes
        const vsc = new openbis.VocabularySearchCriteria();
        const vfo = new openbis.VocabularyFetchOptions();
        const existingVocabResult = await apiFacade.searchVocabularies(vsc, vfo);
        const existingVocabCodes = new Set(
          existingVocabResult.getObjects().map((v: any) => v.getCode())
        );

        // Get existing type codes and property type codes
        const sc = new openbis.SampleTypeSearchCriteria();
        const fo = new openbis.SampleTypeFetchOptions();
        const existingResult = await apiFacade.searchSampleTypes(sc, fo);
        const existingCodes = new Set(
          existingResult.getObjects().map((t: any) => t.getCode())
        );

        // Get existing property types
        const psc = new openbis.PropertyTypeSearchCriteria();
        const pfo = new openbis.PropertyTypeFetchOptions();
        const existingPropsResult = await apiFacade.searchPropertyTypes(psc, pfo);
        const existingPropertyCodes = new Set(
          existingPropsResult.getObjects().map((p: any) => p.getCode())
        );

        // Step 1: Create vocabularies first
        if (importedVocabularies.length > 0) {
          onProgress("Creating vocabularies...");
          const vocabulariesToCreate: any[] = [];
          
          for (const vocabData of importedVocabularies) {
            if (!existingVocabCodes.has(vocabData.code)) {
              const vocabCreation = new openbis.VocabularyCreation();
              vocabCreation.setCode(vocabData.code);
              vocabCreation.setDescription(vocabData.description || "");
              if (vocabData.urlTemplate) {
                vocabCreation.setUrlTemplate(vocabData.urlTemplate);
              }

              // Add terms to vocabulary
              if (Array.isArray(vocabData.terms)) {
                const terms: any[] = [];
                for (const term of vocabData.terms) {
                  const termCreation = new openbis.VocabularyTermCreation();
                  termCreation.setCode(term.code);
                  termCreation.setLabel(term.label);
                  termCreation.setDescription(term.description || "");
                  terms.push(termCreation);
                }
                vocabCreation.setTerms(terms);
              }

              vocabulariesToCreate.push(vocabCreation);
            }
          }

          if (vocabulariesToCreate.length > 0) {
            await apiFacade.createVocabularies(vocabulariesToCreate);
            onProgress(`Created ${vocabulariesToCreate.length} vocabularies`);
            // Update existing codes
            for (const vocab of importedVocabularies) {
              existingVocabCodes.add(vocab.code);
            }
          }
        }

        // Collect all property types needed and check for object type references
        const neededPropertyTypes: Map<string, any> = new Map();

        for (const typeData of importedData) {
          if (Array.isArray(typeData.propertyAssignments)) {
            for (const pa of typeData.propertyAssignments) {
              neededPropertyTypes.set(pa.code.toUpperCase(), {
                code: pa.code.toUpperCase(),
                dataType: pa.dataType,
                label: pa.label,
                description: pa.description,
                sampleType: pa.sampleType,
                vocabulary: pa.vocabulary,
                multivalued: pa.multivalued,
              });
            }
          }
        }

        // Step 2: Create sample types WITHOUT property assignments first
        onProgress("Creating sample types (without properties)...");
        const sampleTypesToCreate: any[] = [];
        for (let i = 0; i < importedData.length; i++) {
          const typeData = importedData[i];
          if (!existingCodes.has(typeData.code)) {
            const creation = new openbis.SampleTypeCreation();
            creation.setCode(typeData.code);
            creation.setDescription(typeData.description);
            creation.setAutoGeneratedCode(true);
            const prefix = typeData.generatedCodePrefix.length > 0
                ? typeData.generatedCodePrefix
                : typeData.code.slice(0, 4);
            creation.setGeneratedCodePrefix(prefix.toUpperCase());

            if (typeData.metadata && Object.keys(typeData.metadata).length > 0) {
              creation.setMetaData(typeData.metadata);
            } else if (typeData.propertyAssignments.some((pa: any) => pa.code === iLogID)) {
              console.log("Processing typeData", typeData);
              let metadata: { collectionType: string; baseType?: string } = {
                collectionType: typeData.code.includes("INSTRUMENT")
                  ? "INSTRUMENT_COLLECTION"
                  : "COMPONENT_COLLECTION",
              };
              creation.setMetaData(metadata);
            }
            sampleTypesToCreate.push({ code: typeData.code, creation });
          }
        }

        // Create all sample types first
        if (sampleTypesToCreate.length > 0) {
          const creations = sampleTypesToCreate.map((st) => st.creation);
          await apiFacade.createSampleTypes(creations);
          onProgress(
            `Created ${sampleTypesToCreate.length} sample types`
          );
          // Update existing codes
          for (const st of sampleTypesToCreate) {
            existingCodes.add(st.code);
          }
        }

        // Step 3: Create missing property types (which may reference the sample types or vocabularies we just created)
        const propertyTypesToCreate: any[] = [];
        for (const [propCode, propData] of neededPropertyTypes.entries()) {
          if (!existingPropertyCodes.has(propCode)) {
            const propCreation = new openbis.PropertyTypeCreation();
            propCreation.setCode(propCode);
            propCreation.setDataType(
              propData.dataType || openbis.DataType.VARCHAR
            );
            propCreation.setLabel(propData.label || propCode);
            propCreation.setDescription(
              propData.description || `Auto-created property type: ${propCode}`
            );
            propCreation.setMultiValue(propData.multivalued || false);

            // If this property references an object type, set it
            if (propData.sampleType) {
              propCreation.setSampleTypeId(
                new openbis.EntityTypePermId(
                  propData.sampleType.toUpperCase(),
                  "SAMPLE"
                )
              );
            }

            // If this property references a vocabulary, set it
            if (propData.vocabulary) {
              propCreation.setVocabularyId(
                new openbis.VocabularyPermId(propData.vocabulary.toUpperCase())
              );
            }

            propertyTypesToCreate.push(propCreation);
          }
        }

        if (propertyTypesToCreate.length > 0) {
          onProgress(
            `Creating ${propertyTypesToCreate.length} missing property types...`
          );
          await apiFacade.createPropertyTypes(propertyTypesToCreate);
          onProgress(
            `Successfully created ${propertyTypesToCreate.length} property types`
          );
        }

        // Step 4: Update sample types with property assignments
        onProgress("Adding property assignments to sample types...");
        for (let i = 0; i < importedData.length; i++) {
          const typeData = importedData[i];

          if (
            sampleTypesToCreate.find((st) => st.code === typeData.code) &&
            Array.isArray(typeData.propertyAssignments)
          ) {
            try {
              const update = new openbis.SampleTypeUpdate();
              update.setTypeId(
                new openbis.EntityTypePermId(typeData.code.toUpperCase())
              );

              const propertyAssignments: any[] = [];
              for (const pa of typeData.propertyAssignments) {
                const assignment = new openbis.PropertyAssignmentCreation();
                const propertyTypeId = new openbis.PropertyTypePermId(
                  pa.code.toUpperCase()
                );
                assignment.setPropertyTypeId(propertyTypeId);
                assignment.setMandatory(pa.mandatory);
                assignment.setSection(pa.section);
                propertyAssignments.push(assignment);
              }

              const assignmentUpdates = new openbis.PropertyAssignmentListUpdateValue();
              assignmentUpdates.set(propertyAssignments);
              update.setPropertyAssignmentActions(assignmentUpdates.getActions());
              await apiFacade.updateSampleTypes([update]);
              stats.success++;
            } catch (err) {
              let errorMessage = "Unknown error";
              if (err instanceof Error) {
                errorMessage = err.message;
              } else if (typeof err === "object" && err !== null) {
                const errorObj = err as any;
                if (errorObj.data?.message) {
                  const firstSentence = errorObj.data.message.split(/[.!?]/)[0];
                  errorMessage = firstSentence || errorObj.data.message;
                } else if (errorObj.message) {
                  errorMessage = errorObj.message;
                }
              }
              onProgress(`Failed to add properties to ${typeData.code}: ${errorMessage}`);
              stats.failed++;
            }
          } else if (existingCodes.has(typeData.code)) {
            stats.skipped++;
          }
        }
      } catch (err) {
        console.error("Error importing object types:", err);
        throw err;
      }

      return stats;
    },
    [apiFacade]
  );

  return { exportObjectTypes, importObjectTypes };
};

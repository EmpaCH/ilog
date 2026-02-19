export * from "../eln/elnSettings";
export * from "./environment";
export * from "./types";

/**
 * Strips the vocabulary name from a property value if it's in the format "VALUE [VOCABULARY]"
 * @param propertyValue - The property value potentially containing vocabulary name
 * @returns The cleaned property value without the vocabulary name
 */
export function stripVocabularyName(propertyValue: any): any {
  if (!propertyValue || typeof propertyValue !== 'string') {
    return propertyValue;
  }
  // Remove trailing " [VOCABULARY_NAME]" pattern
  return propertyValue.replace(/\s*\[[^\]]*\]$/, '').trim();
}
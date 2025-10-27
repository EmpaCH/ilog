import openbis from "@openbis/openbis.esm";
import {
  ZonedDateTime,
  now,
  getLocalTimeZone,
  parseZonedDateTime,
} from "@internationalized/date";
import {
  LogbookEntryDefinition,
  ReconstructedHistory,
} from "./commonLogbookEntry";

/**
 * Creates an empty LogbookEntryDefinition with the current timestamp.
 * @returns An empty LogbookEntryDefinition.
 */
export function createEmptyLogbookEntryDefinition(): LogbookEntryDefinition {
  return {
    id: null,
    type: "",
    code: "",
    validFrom: now(getLocalTimeZone()),
    propertiesSchema: {},
    propertyValues: {},
  };
}

/**
 * Converts an openBIS Sample and its list of latest property history entries to a local LogbookEntryDefinition.
 * @param sample - The openBIS Sample to convert.
 * @param history - The openBIS PropertyHistoryEntry[] to convert.
 * @param validFrom? - If provided, overwrites the validFrom property of the LogbookEntryDefinition.
 * @returns The corresponding local LogbookEntryDefinition.
 */
export function convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition(
  sample: openbis.Sample,
  history: openbis.PropertyHistoryEntry[],
  validFrom?: ZonedDateTime,
): LogbookEntryDefinition {
  const transformedHistory = history.reduce((acc: { [key: string]: any }, curr) => {
    acc[curr.getPropertyName()] = curr.getPropertyValue();
    return acc;
  }, {});

  return {
    id: sample.getIdentifier(),
    type: sample.getType().getCode(),
    code: sample.getCode(),
    validFrom: validFrom ?? parseZonedDateTime(transformedHistory["VALID_FROM"]),
    propertiesSchema: {},
    propertyValues: transformedHistory,
  };
}

/**
 * Reconstructs the history of a logbook entry based on its property history entries.
 *
 * This function takes a list of property history entries and reconstructs the
 * state of the logbook entry at different points in time. It returns an object where
 * the keys are timestamps and the values are the reconstructed states of the logbook entry at those timestamps.
 *
 * @param history - The list of property history entries.
 * @returns An object where the keys are timestamps and the values are the reconstructed states of the logbook entry.
 */
export function reconstructHistory(
  history: openbis.PropertyHistoryEntry[],
): ReconstructedHistory {
  // Create array with entries where propertyName == "VALID_FROM" and sort by propertyValue
  const validFromEntries = history.filter(
    entry => entry.getPropertyName() === "VALID_FROM"
  ).sort(
    (a, b) => a.getPropertyValue() < b.getPropertyValue() ? -1 : 1
  );

  // Create a dictionary where key is the propertyValue of each "VALID_FROM" entry
  // and value is an array of all entries with that "VALID_FROM" entry's validFrom timestamp
  const validFromDict = validFromEntries.reduce((acc: { [key: string]: openbis.PropertyHistoryEntry[] }, entry) => {
    const key = entry.getPropertyValue();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key] = history.filter(
      propEntry => propEntry.getValidFrom().toString() === entry.getValidFrom().toString()
    );
    return acc;
  }, {});

  // Traverse forward in time and complete the validFromDict dictionary
  const keys = Object.keys(validFromDict);
  for (let i = 1; i < keys.length; i++) {
    const previousKey = keys[i - 1];
    const currentKey = keys[i];
    const previousArray = validFromDict[previousKey];
    const currentArray = validFromDict[currentKey];

    previousArray.forEach((entry, index) => {
      if (!currentArray[index]) {
        currentArray[index] = entry;
      }
    });
  }
  return validFromDict;
};

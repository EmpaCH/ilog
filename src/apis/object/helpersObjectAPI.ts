import openbis from "@openbis/openbis.esm";
import {
  ZonedDateTime,
  now,
  getLocalTimeZone,
  parseZonedDateTime,
} from "@internationalized/date";
import {
  ObjectDefinition,
  ReconstructedHistory,
} from "./commonObject";

/**
 * Creates an empty ObjectDefinition with the current timestamp.
 * @returns An empty ObjectDefinition.
 */
export function createEmptyObjectDefinition(): ObjectDefinition {
  return {
    id: null,
    collection: "",
    type: "",
    validFrom: now(getLocalTimeZone()),
    propertiesSchema: {},
    propertyValues: {},
  };
}

/**
 * Converts an openBIS Sample and its list of latest property history entries to a local ObjectDefinition.
 * @param sample - The openBIS Sample to convert.
 * @param history - The openBIS PropertyHistoryEntry[] to convert.
 * @param validFrom? - If provided, overwites the validFrom property of the ObjectDefinition.
 * @returns The corresponding local ObjectDefinition.
 */
export function convertOpenBISPropertyHistoryEntryListToObjectDefinition(
  sample: openbis.Sample,
  history: openbis.PropertyHistoryEntry[],
  validFrom?: ZonedDateTime,
): ObjectDefinition {
  const transformedHistory = history.reduce((acc: { [key: string]: any }, curr) => {
    const propertyName = curr.getPropertyName();
    const propertyValue = curr.getPropertyValue();

    // If property already exists, convert to array or append to existing array
    if (acc[propertyName]) {
      if (Array.isArray(acc[propertyName])) {
        acc[propertyName].push(propertyValue);
      } else {
        acc[propertyName] = [acc[propertyName], propertyValue];
      }
    } else {
      acc[propertyName] = propertyValue;
    }
    return acc;
  }, {});

  return {
    id: sample.getIdentifier(),
    collection: sample.getExperiment().getCode(),
    type: sample.getType().getCode(),
    validFrom: validFrom ? parseZonedDateTime(transformedHistory["VALID_FROM"]) : now(getLocalTimeZone()), 
    propertiesSchema: {},
    propertyValues: transformedHistory,
  };
}

/**
 * Reconstructs the history of an object based on its property history entries.
 *
 * This function takes a list of property history entries and reconstructs the
 * state of the object at different points in time. It returns an object where
 * the keys are timestamps and the values are the reconstructed states of the
 * object at those timestamps.
 *
 * @param history - The list of property history entries.
 * @returns An object where the keys are timestamps and the values are the reconstructed states of the object.
 */
export function reconstructHistory (
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
      propEntry => propEntry.getValidFrom() === entry.getValidFrom()
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

    const currentPropertyNames = new Set(currentArray.map(entry => entry.getPropertyName()));
    previousArray.forEach((previousEntry) => {
      const propertyName = previousEntry.getPropertyName();
      if (!currentPropertyNames.has(propertyName)) {
        currentArray.push(previousEntry);
      }
    });
  }
  return validFromDict;
};

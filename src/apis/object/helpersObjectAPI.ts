import openbis from "@openbis/openbis.esm";
import {
  ObjectDefinition,
  ReconstructedHistory,
} from "./commonObject";
import { stripVocabularyName } from "../shared/common";


export function createEmptyObjectDefinition(): ObjectDefinition {
  return {
    id: null,
    collection: "",
    type: "",
    propertiesSchema: {},
    propertyValues: {},
  };
}

/**
 * Converts an openBIS Sample and a list of property history entries to a local ObjectDefinition.
 * Each entry's property value is used as-is; vocabulary prefixes are stripped.
 * If the same property appears more than once in the list, the values are collected into an array.
 * @param sample - The openBIS Sample to convert.
 * @param history - The property history entries representing the object state at a given point in time.
 * @returns The corresponding local ObjectDefinition.
 */
export function convertOpenBISPropertyHistoryEntryListToObjectDefinition(
  sample: openbis.Sample,
  history: openbis.PropertyHistoryEntry[],
): ObjectDefinition {
  const transformedHistory = history.reduce((acc: { [key: string]: any }, curr) => {
    const propertyName = curr.getPropertyName();
    let propertyValue = curr.getPropertyValue();
    
    // Strip vocabulary name from the value if present
    if (typeof propertyValue === 'string') {
      propertyValue = stripVocabularyName(propertyValue);
    }

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
    collection: "",//sample.getExperiment().getCode(),
    type: sample.getType().getCode(),
    propertiesSchema: {},
    propertyValues: transformedHistory,
  };
}

/**
 * Reconstructs the full object state at each point in time from its property history entries.
 *
 * Entries are grouped by their openBIS modification timestamp and processed in
 * chronological order. At each timestamp, changed properties overwrite the
 * accumulated state so that every snapshot contains the complete set of
 * properties, not just the ones that changed.
 *
 * @param history - The list of property history entries from openBIS.
 * @returns A map from timestamp (ms, as string) to the full list of property
 *   history entries representing the object state at that point in time.
 */
export function reconstructHistory(
  history: openbis.PropertyHistoryEntry[],
): ReconstructedHistory {
  const validFromDict: { [key: string]: openbis.PropertyHistoryEntry[] } = {};

  // Group all history entries by their OpenBIS modification time
  const entriesByTime = new Map<number, openbis.PropertyHistoryEntry[]>();

  history.forEach(entry => {
    const time = entry.getValidFrom() as number;
    if (!entriesByTime.has(time)) {
      entriesByTime.set(time, []);
    }
    entriesByTime.get(time)!.push(entry);
  });

  // Sort timestamps and accumulate state so each snapshot contains the full property set
  const sortedTimestamps = Array.from(entriesByTime.keys()).sort((a, b) => a - b);
  const accumulated = new Map<string, openbis.PropertyHistoryEntry>();

  sortedTimestamps.forEach(time => {
    const entries = entriesByTime.get(time)!;
    // Update accumulated state with new/changed entries at this timestamp
    entries.forEach(entry => {
      accumulated.set(entry.getPropertyName(), entry);
    });
    validFromDict[time.toString()] = Array.from(accumulated.values());
  });

  return validFromDict;
};

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
import { stripVocabularyName } from "../shared/common";

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
 * @param timestamp? - If provided, uses this as the validFrom timestamp. Otherwise falls back to current time.
 * @returns The corresponding local LogbookEntryDefinition.
 */
export function convertOpenBISPropertyHistoryEntryListToLogbookEntryDefinition(
  sample: openbis.Sample,
  history: openbis.PropertyHistoryEntry[],
  timestamp?: number,
): LogbookEntryDefinition {
  const transformedHistory = history.reduce((acc: { [key: string]: any }, curr) => {
    const propertyName = curr.getPropertyName();
    
    // Skip VALID_FROM - it's metadata for the timestamp, not a displayable property
    if (propertyName === "VALID_FROM") {
      return acc;
    }
    
    let propertyValue = curr.getPropertyValue();
    // Strip vocabulary name from the value if present
    if (typeof propertyValue === 'string') {
      propertyValue = stripVocabularyName(propertyValue);
    }
    acc[curr.getPropertyName()] = propertyValue;
    return acc;
  }, {});

  // Use the getValidFrom() from the first entry - all entries in a group have the same getValidFrom()
  let validFrom: ZonedDateTime;
  if (history.length > 0 && history[0].getValidFrom()) {
    try {
      const dateObj = history[0].getValidFrom();
      // Parse the date string directly - it should already have timezone info
      validFrom = parseZonedDateTime(dateObj.toISOString());
    } catch (e) {
      validFrom = now(getLocalTimeZone());
    }
  } else {
    validFrom = now(getLocalTimeZone());
  }

  return {
    id: sample.getIdentifier(),
    type: sample.getType().getCode(),
    code: sample.getCode(),
    validFrom: validFrom,
    propertiesSchema: {},
    propertyValues: transformedHistory,
  };
}

/**
 * Reconstructs the history of a logbook entry based on its property history entries.
 *
 * This function takes a list of property history entries and reconstructs the
 * state of the logbook entry at different points in time. It returns an object where
 * the keys are timestamps in milliseconds and the values are the reconstructed states of the logbook entry at those timestamps.
 *
 * The history always starts with the registration date as the initial state,
 * followed by any VALID_FROM entries that represent subsequent modifications.
 *
 * @param history - The list of property history entries.
 * @param registrationDate - The entry's registration date in milliseconds. Used as the initial state timestamp.
 * @returns An object where the keys are timestamps in milliseconds and the values are the reconstructed states of the logbook entry.
 */
export function reconstructHistory(
  history: openbis.PropertyHistoryEntry[],
  registrationDate: number,
): ReconstructedHistory {
  const validFromDict: { [key: string]: openbis.PropertyHistoryEntry[] } = {};

  // Step 1: Group all history entries by their OpenBIS modification time
  const entriesByTime = new Map<number, openbis.PropertyHistoryEntry[]>();
  
  history.forEach(entry => {
    const time = entry.getValidFrom() as number;
    if (!entriesByTime.has(time)) {
      entriesByTime.set(time, []);
    }
    entriesByTime.get(time)!.push(entry);
  });

  // Step 2: For each modification time, extract the VALID_FROM value
  const timeToValidFrom = new Map<number, number>();
  
  entriesByTime.forEach((entries, time) => {
    // Look for VALID_FROM property at this time
    const validFromEntry = entries.find(e => e.getPropertyName() === "VALID_FROM");
    
    if (validFromEntry) {
      // An explicit VALID_FROM was set
      const validFromValue = validFromEntry.getPropertyValue();
      if (validFromValue) {
        try {
          const ms = new Date(validFromValue).getTime();
          if (!isNaN(ms)) {
            timeToValidFrom.set(time, ms);
            return;
          }
        } catch (e) {
          // Fall through to default
        }
      }
    }
    
    // No VALID_FROM property found or parsing failed - use the modification time as-is
    timeToValidFrom.set(time, time);
  });

  // Step 3: Collect all unique VALID_FROM timestamps and sort them
  const timestamps = new Set(Array.from(timeToValidFrom.values()));
  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

  // Step 4: For each VALID_FROM timestamp, find the properties modified at that logical point
  sortedTimestamps.forEach((targetValidFrom) => {
    const timestampStr = targetValidFrom.toString();
    const propertyMap = new Map<string, openbis.PropertyHistoryEntry>();
    
    // Find which OpenBIS modification time corresponds to this VALID_FROM
    timeToValidFrom.forEach((validFrom, time) => {
      if (validFrom === targetValidFrom) {
        // Get all entries modified at this OpenBIS time
        const entriesAtTime = entriesByTime.get(time) || [];
        
        entriesAtTime.forEach(entry => {
          // Skip the VALID_FROM property itself
          if (entry.getPropertyName() !== "VALID_FROM") {
            const propertyName = entry.getPropertyName();
            propertyMap.set(propertyName, entry);
          }
        });
      }
    });
    
    // Only add to dict if we have properties for this timestamp
    if (propertyMap.size > 0) {
      validFromDict[timestampStr] = Array.from(propertyMap.values());
    }
  });

  return validFromDict;
}

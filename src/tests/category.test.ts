import { describe, expect, test } from "vitest";
import openbis from "@openbis/openbis.esm";
import {
  componentCategory,
  getCategoryFromMetadata,
  getMissingRequiredProperties,
  getTypeCategory,
  instrumentCategory,
  locationCategory,
  logbookEntryCategory,
} from "../apis/shared/category";

// Minimal stand-in for an openBIS object type with metadata and property assignments
const fakeType = (metadata: Record<string, string>, propertyCodes: string[] = []) =>
  ({
    getMetaData: () => metadata,
    getPropertyAssignments: () =>
      propertyCodes.map((code) => ({ getPropertyType: () => ({ getCode: () => code }) })),
  }) as unknown as openbis.SampleType;

describe("getCategoryFromMetadata", () => {
  test("reads the category key", () => {
    expect(getCategoryFromMetadata({ category: instrumentCategory })).toBe(instrumentCategory);
    expect(getCategoryFromMetadata({ category: locationCategory })).toBe(locationCategory);
  });

  test("falls back to the legacy collectionType key", () => {
    expect(getCategoryFromMetadata({ collectionType: "INSTRUMENT_COLLECTION" })).toBe(instrumentCategory);
    expect(getCategoryFromMetadata({ collectionType: "COMPONENT_COLLECTION" })).toBe(componentCategory);
    expect(getCategoryFromMetadata({ collectionType: "LOGBOOK_COLLECTION" })).toBe(logbookEntryCategory);
  });

  test("prefers the category key over the legacy key", () => {
    expect(
      getCategoryFromMetadata({ category: componentCategory, collectionType: "INSTRUMENT_COLLECTION" })
    ).toBe(componentCategory);
  });

  test("returns an empty string for types that are not iLog types", () => {
    expect(getCategoryFromMetadata({})).toBe("");
    expect(getCategoryFromMetadata(null)).toBe("");
    expect(getCategoryFromMetadata(undefined)).toBe("");
    expect(getCategoryFromMetadata({ collectionType: "SOMETHING_ELSE" })).toBe("");
  });
});

describe("getTypeCategory", () => {
  test("reads the category from the type metadata", () => {
    expect(getTypeCategory(fakeType({ category: componentCategory }))).toBe(componentCategory);
  });

  test("returns an empty string without a type", () => {
    expect(getTypeCategory(null)).toBe("");
    expect(getTypeCategory(undefined)).toBe("");
  });
});

describe("getMissingRequiredProperties", () => {
  test("reports a component type without LOCATION", () => {
    expect(getMissingRequiredProperties(fakeType({ category: componentCategory }, ["NAME"]))).toEqual([
      "LOCATION",
    ]);
  });

  test("accepts a component type with LOCATION", () => {
    expect(
      getMissingRequiredProperties(fakeType({ category: componentCategory }, ["NAME", "LOCATION"]))
    ).toEqual([]);
  });

  test("requires nothing for other categories and non-iLog types", () => {
    expect(getMissingRequiredProperties(fakeType({ category: instrumentCategory }))).toEqual([]);
    expect(getMissingRequiredProperties(fakeType({ category: locationCategory }))).toEqual([]);
    expect(getMissingRequiredProperties(fakeType({}))).toEqual([]);
  });
});

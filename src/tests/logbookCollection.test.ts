import { describe, expect, test, vi } from "vitest";
import openbis from "@openbis/openbis.esm";
import {
  countLogbookEntries,
  createLogbookCollection,
  getLogbookCollection,
  getLogbookCollectionSetting,
  moveLogbookEntries,
  setLogbookCollection,
} from "../apis/logbook/logbookCollectionAPI";
import { generalElnSettings, propertyElnSettings } from "../apis/eln/elnSettings";

const LOGBOOK = "/LAB/ILOG/LOGBOOK";

// A fake openBIS facade: the ELN settings object holds the given settings JSON (or is missing if
// settings is null), and the listed collections, projects and spaces exist
const fakeApi = ({
  settings = {} as Record<string, unknown> | null,
  collections = [] as string[],
  projects = [] as string[],
  spaces = [] as string[],
  samples = [] as string[],
} = {}) => {
  const byId = (ids: string[], key: (id: any) => string) => (requested: any[]) =>
    Object.fromEntries(requested.map(key).filter((id) => ids.includes(id)).map((id) => [id, { id }]));
  return {
    getSamples: vi.fn(async () =>
      settings === null
        ? {}
        : { [generalElnSettings]: { getJsonProperty: () => JSON.stringify(settings) } }
    ),
    updateSamples: vi.fn(async () => []),
    getExperiments: vi.fn(async (ids: any[]) => byId(collections, (id) => id.getIdentifier())(ids)),
    getProjects: vi.fn(async (ids: any[]) => byId(projects, (id) => id.getIdentifier())(ids)),
    getSpaces: vi.fn(async (ids: any[]) => byId(spaces, (id) => id.getPermId())(ids)),
    createSpaces: vi.fn(async () => []),
    createProjects: vi.fn(async () => []),
    createExperiments: vi.fn(async () => []),
    searchSamples: vi.fn(async () => ({
      getObjects: () => samples.map((permId) => ({ getPermId: () => new openbis.SamplePermId(permId) })),
      getTotalCount: () => samples.length,
    })),
  };
};

const asApi = (api: ReturnType<typeof fakeApi>) => api as unknown as openbis.OpenBISJavaScriptFacade;

// The ELN settings JSON written by the last updateSamples call
const writtenSettings = (api: ReturnType<typeof fakeApi>) => {
  const calls = api.updateSamples.mock.calls as unknown as openbis.SampleUpdate[][][];
  const update = calls[calls.length - 1][0][0];
  return JSON.parse(update.getProperties()[propertyElnSettings] as string);
};

describe("getLogbookCollectionSetting", () => {
  test("fails when the ELN settings are missing", async () => {
    await expect(getLogbookCollectionSetting(asApi(fakeApi({ settings: null })))).rejects.toThrow(
      /ELN settings/
    );
  });

  test("returns no identifier when no logbook collection is set up", async () => {
    const api = fakeApi({ settings: { inventorySpaces: [] } });
    expect(await getLogbookCollectionSetting(asApi(api))).toEqual({ identifier: null, exists: false });
    expect(api.getExperiments).not.toHaveBeenCalled();
  });

  test("reports whether the configured collection exists", async () => {
    const settings = { ilogLogbookCollection: LOGBOOK };
    expect(
      await getLogbookCollectionSetting(asApi(fakeApi({ settings, collections: [LOGBOOK] })))
    ).toEqual({ identifier: LOGBOOK, exists: true });
    expect(await getLogbookCollectionSetting(asApi(fakeApi({ settings })))).toEqual({
      identifier: LOGBOOK,
      exists: false,
    });
  });
});

describe("getLogbookCollection", () => {
  test("returns the configured collection", async () => {
    const api = fakeApi({ settings: { ilogLogbookCollection: LOGBOOK }, collections: [LOGBOOK] });
    expect(await getLogbookCollection(asApi(api))).toBe(LOGBOOK);
  });

  test("returns null when no logbook collection is set up", async () => {
    expect(await getLogbookCollection(asApi(fakeApi()))).toBeNull();
  });

  test("fails when the configured collection no longer exists or is not accessible", async () => {
    const api = fakeApi({ settings: { ilogLogbookCollection: LOGBOOK } });
    await expect(getLogbookCollection(asApi(api))).rejects.toThrow(
      `The logbook collection ${LOGBOOK} was not found`
    );
  });
});

describe("setLogbookCollection", () => {
  test("stores the collection and keeps the other ELN settings", async () => {
    const api = fakeApi({ settings: { inventorySpaces: ["LAB"], ilogLogbookCollection: "/OLD/P/C" } });
    await setLogbookCollection(asApi(api), LOGBOOK);
    expect(writtenSettings(api)).toEqual({ inventorySpaces: ["LAB"], ilogLogbookCollection: LOGBOOK });
  });
});

describe("countLogbookEntries", () => {
  test("returns the number of objects in the collection", async () => {
    const api = fakeApi({ samples: ["S1", "S2", "S3"] });
    expect(await countLogbookEntries(asApi(api), LOGBOOK)).toBe(3);
  });
});

describe("moveLogbookEntries", () => {
  test("moves every entry to the new collection", async () => {
    const api = fakeApi({ samples: ["S1", "S2"] });
    expect(await moveLogbookEntries(asApi(api), "/OLD/P/C", LOGBOOK)).toBe(2);

    const updates = (api.updateSamples.mock.calls as unknown as openbis.SampleUpdate[][][])[0][0];
    expect(updates.map((u) => (u.getSampleId() as openbis.SamplePermId).getPermId())).toEqual(["S1", "S2"]);
    for (const update of updates) {
      const collection = update.getExperimentId().getValue() as openbis.ExperimentIdentifier;
      const project = update.getProjectId().getValue() as openbis.ProjectIdentifier;
      expect(collection.getIdentifier()).toBe(LOGBOOK);
      expect(project.getIdentifier()).toBe("/LAB/ILOG");
    }
  });

  test("does nothing when the collection is empty", async () => {
    const api = fakeApi();
    expect(await moveLogbookEntries(asApi(api), "/OLD/P/C", LOGBOOK)).toBe(0);
    expect(api.updateSamples).not.toHaveBeenCalled();
  });
});

describe("createLogbookCollection", () => {
  const collection = { space: "LAB", project: "ILOG", code: "LOGBOOK", name: "Logbook" };

  test("creates the space, project and collection and lists the space in the ELN inventory", async () => {
    const api = fakeApi({ settings: { inventorySpaces: ["OTHER"] } });
    expect(await createLogbookCollection(asApi(api), collection)).toBe(LOGBOOK);

    const [[space]] = api.createSpaces.mock.calls[0] as unknown as openbis.SpaceCreation[][];
    expect(space.getCode()).toBe("LAB");
    const [[project]] = api.createProjects.mock.calls[0] as unknown as openbis.ProjectCreation[][];
    expect(project.getCode()).toBe("ILOG");
    expect((project.getSpaceId() as openbis.SpacePermId).getPermId()).toBe("LAB");
    const [[experiment]] = api.createExperiments.mock.calls[0] as unknown as openbis.ExperimentCreation[][];
    expect(experiment.getCode()).toBe("LOGBOOK");
    expect((experiment.getProjectId() as openbis.ProjectIdentifier).getIdentifier()).toBe("/LAB/ILOG");
    expect(experiment.getProperties()).toEqual({ NAME: "Logbook" });

    expect(writtenSettings(api).inventorySpaces).toEqual(["OTHER", "LAB"]);
  });

  test("only creates what doesn't exist yet", async () => {
    const api = fakeApi({ spaces: ["LAB"], projects: ["/LAB/ILOG"] });
    await createLogbookCollection(asApi(api), collection);
    expect(api.createSpaces).not.toHaveBeenCalled();
    expect(api.createProjects).not.toHaveBeenCalled();
    expect(api.createExperiments).toHaveBeenCalledTimes(1);
    expect(api.updateSamples).not.toHaveBeenCalled();
  });

  test("creates nothing when the collection already exists", async () => {
    const api = fakeApi({ spaces: ["LAB"], projects: ["/LAB/ILOG"], collections: [LOGBOOK] });
    expect(await createLogbookCollection(asApi(api), collection)).toBe(LOGBOOK);
    expect(api.createExperiments).not.toHaveBeenCalled();
  });
});

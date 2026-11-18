import { describe, expect, test, vi } from "vitest";
import openbis from "@openbis/openbis.esm";
import {
  getAccessCandidates,
  getLogbookAccess,
  getLogbookProject,
  grantLogbookAccess,
  revokeLogbookAccess,
} from "../apis/logbook/logbookAccessAPI";

const LOGBOOK = "/LAB/ILOG/LOGBOOK";

const searchResult = <T,>(objects: T[]) => ({ getObjects: () => objects });

const person = (userId: string, firstName = "", lastName = "", active = true) => ({
  getUserId: () => userId,
  getFirstName: () => firstName,
  getLastName: () => lastName,
  isActive: () => active,
});

const group = (code: string, description = "") => ({
  getCode: () => code,
  getDescription: () => description,
});

const assignment = (
  id: string,
  role: string,
  level: string,
  holder: { user?: ReturnType<typeof person>; group?: ReturnType<typeof group> },
) => ({
  getId: () => id,
  getRole: () => role,
  getRoleLevel: () => level,
  getUser: () => holder.user ?? null,
  getAuthorizationGroup: () => holder.group ?? null,
});

const asApi = (api: object) => api as unknown as openbis.OpenBISJavaScriptFacade;

test("getLogbookProject reads the space and project of a collection identifier", () => {
  expect(getLogbookProject(LOGBOOK)).toEqual({ space: "LAB", project: "ILOG" });
});

describe("getLogbookAccess", () => {
  test("lists the roles on the project and on the space", async () => {
    const searchRoleAssignments = vi
      .fn()
      .mockResolvedValueOnce(
        searchResult([
          assignment("ra1", "USER", "PROJECT", { group: group("LAB_MEMBERS") }),
          assignment("ra2", "OBSERVER", "PROJECT", { user: person("jdoe", "Jane", "Doe") }),
        ])
      )
      .mockResolvedValueOnce(
        searchResult([assignment("ra3", "POWER_USER", "SPACE", { user: person("bsmith") })])
      );

    expect(await getLogbookAccess(asApi({ searchRoleAssignments }), LOGBOOK)).toEqual([
      { id: "ra1", role: "USER", level: "PROJECT", holder: { kind: "group", id: "LAB_MEMBERS", label: "LAB_MEMBERS" } },
      { id: "ra2", role: "OBSERVER", level: "PROJECT", holder: { kind: "user", id: "jdoe", label: "Jane Doe" } },
      // Without a name, the user ID is shown
      { id: "ra3", role: "POWER_USER", level: "SPACE", holder: { kind: "user", id: "bsmith", label: "bsmith" } },
    ]);
  });

  test("leaves out instance-level roles and roles without a user or group", async () => {
    const searchRoleAssignments = vi
      .fn()
      .mockResolvedValueOnce(searchResult([assignment("ra1", "USER", "PROJECT", {})]))
      .mockResolvedValueOnce(
        searchResult([assignment("ra2", "ADMIN", "INSTANCE", { user: person("admin") })])
      );

    expect(await getLogbookAccess(asApi({ searchRoleAssignments }), LOGBOOK)).toEqual([]);
  });
});

describe("grantLogbookAccess", () => {
  const grant = async (holder: Parameters<typeof grantLogbookAccess>[2]) => {
    const createRoleAssignments = vi.fn(async () => []);
    await grantLogbookAccess(asApi({ createRoleAssignments }), LOGBOOK, holder, "USER");
    const calls = createRoleAssignments.mock.calls as unknown as openbis.RoleAssignmentCreation[][][];
    expect(calls).toHaveLength(1);
    const creation = calls[0][0][0];
    expect((creation.getProjectId() as openbis.ProjectIdentifier).getIdentifier()).toBe("/LAB/ILOG");
    expect(creation.getRole()).toBe("USER");
    return creation;
  };

  test("gives a user a role on the logbook project", async () => {
    const creation = await grant({ userId: "jdoe" });
    expect((creation.getUserId() as openbis.PersonPermId).getPermId()).toBe("jdoe");
    expect(creation.getAuthorizationGroupId()).toBeFalsy();
  });

  test("gives a user group a role on the logbook project", async () => {
    const creation = await grant({ groupCode: "LAB_MEMBERS" });
    expect((creation.getAuthorizationGroupId() as openbis.AuthorizationGroupPermId).getPermId()).toBe(
      "LAB_MEMBERS"
    );
    expect(creation.getUserId()).toBeFalsy();
  });
});

test("revokeLogbookAccess deletes the role assignment with a reason", async () => {
  const deleteRoleAssignments = vi.fn(async () => undefined);
  const id = new openbis.RoleAssignmentTechId(42);
  await revokeLogbookAccess(asApi({ deleteRoleAssignments }), id);

  const [[ids, options]] = deleteRoleAssignments.mock.calls as unknown as [
    openbis.IRoleAssignmentId[],
    openbis.RoleAssignmentDeletionOptions,
  ][];
  expect(ids).toEqual([id]);
  expect(options.getReason()).toBeTruthy();
});

test("getAccessCandidates lists active users and all groups, sorted by label", async () => {
  const api = {
    searchPersons: vi.fn(async () =>
      searchResult([
        person("zuser", "Zoe", "Zed"),
        person("retired", "Old", "User", false),
        person("auser"),
      ])
    ),
    searchAuthorizationGroups: vi.fn(async () =>
      searchResult([group("STAFF", "All staff"), group("ADMINS")])
    ),
  };

  expect(await getAccessCandidates(asApi(api))).toEqual({
    users: [
      { id: "auser", label: "auser" },
      { id: "zuser", label: "Zoe Zed (zuser)" },
    ],
    groups: [
      { id: "ADMINS", label: "ADMINS" },
      { id: "STAFF", label: "STAFF – All staff" },
    ],
  });
});

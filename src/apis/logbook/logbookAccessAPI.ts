import openbis from "@openbis/openbis.esm";

// Roles an admin can give on the logbook project, from least to most rights
export const LOGBOOK_ACCESS_ROLES = ["OBSERVER", "USER", "POWER_USER"] as const;
export type LogbookAccessRole = typeof LOGBOOK_ACCESS_ROLES[number];

export interface LogbookAccessEntry {
  id: openbis.IRoleAssignmentId;
  role: string;
  // PROJECT: given on the logbook project and managed here. SPACE: inherited from the whole space.
  level: "PROJECT" | "SPACE";
  holder: { kind: "user" | "group"; id: string; label: string };
}

export type LogbookAccessHolder = { userId: string } | { groupCode: string };

/**
 * openBIS gives roles per space or project, not per collection, so access to the logbook collection
 * is managed on its project.
 * @param collectionIdentifier - The logbook collection identifier, e.g. "/SPACE/PROJECT/COLLECTION".
 */
export function getLogbookProject(collectionIdentifier: string): { space: string; project: string } {
  const [space, project] = collectionIdentifier.split("/").filter(Boolean);
  return { space, project };
}

function toAccessEntry(assignment: openbis.RoleAssignment): LogbookAccessEntry | null {
  const level = assignment.getRoleLevel();
  if (level !== "PROJECT" && level !== "SPACE") {
    return null;
  }
  const user = assignment.getUser();
  const group = assignment.getAuthorizationGroup();
  const holder = user
    ? {
      kind: "user" as const,
      id: user.getUserId(),
      label: [user.getFirstName(), user.getLastName()].filter(Boolean).join(" ") || user.getUserId(),
    }
    : group
      ? { kind: "group" as const, id: group.getCode(), label: group.getCode() }
      : null;
  if (!holder) {
    return null;
  }
  return { id: assignment.getId(), role: assignment.getRole(), level, holder };
}

/**
 * Get who has access to the logbook collection: the roles given on its project, and those on its whole space.
 * Instance-level roles (e.g. instance admins) are not listed.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param collectionIdentifier - The logbook collection identifier, e.g. "/SPACE/PROJECT/COLLECTION".
 */
export async function getLogbookAccess(
  api: openbis.OpenBISJavaScriptFacade,
  collectionIdentifier: string,
): Promise<LogbookAccessEntry[]> {
  const { space, project } = getLogbookProject(collectionIdentifier);
  const fo = new openbis.RoleAssignmentFetchOptions();
  fo.withUser();
  fo.withAuthorizationGroup();

  const projectCriteria = new openbis.RoleAssignmentSearchCriteria();
  projectCriteria.withProject().withId().thatEquals(new openbis.ProjectIdentifier(`/${space}/${project}`));
  const spaceCriteria = new openbis.RoleAssignmentSearchCriteria();
  spaceCriteria.withSpace().withId().thatEquals(new openbis.SpacePermId(space));

  const [onProject, onSpace] = await Promise.all([
    api.searchRoleAssignments(projectCriteria, fo),
    api.searchRoleAssignments(spaceCriteria, fo),
  ]);
  return [...onProject.getObjects(), ...onSpace.getObjects()]
    .map(toAccessEntry)
    .filter((entry): entry is LogbookAccessEntry => entry !== null);
}

/**
 * Give a user or user group a role on the project of the logbook collection.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param collectionIdentifier - The logbook collection identifier, e.g. "/SPACE/PROJECT/COLLECTION".
 */
export async function grantLogbookAccess(
  api: openbis.OpenBISJavaScriptFacade,
  collectionIdentifier: string,
  holder: LogbookAccessHolder,
  role: LogbookAccessRole,
): Promise<void> {
  const { space, project } = getLogbookProject(collectionIdentifier);
  const creation = new openbis.RoleAssignmentCreation();
  creation.setProjectId(new openbis.ProjectIdentifier(`/${space}/${project}`));
  creation.setRole(role as openbis.Role);
  if ("userId" in holder) {
    creation.setUserId(new openbis.PersonPermId(holder.userId));
  } else {
    creation.setAuthorizationGroupId(new openbis.AuthorizationGroupPermId(holder.groupCode));
  }
  await api.createRoleAssignments([creation]);
}

/**
 * Remove a role given on the project of the logbook collection.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param id - The role assignment ID.
 */
export async function revokeLogbookAccess(
  api: openbis.OpenBISJavaScriptFacade,
  id: openbis.IRoleAssignmentId,
): Promise<void> {
  const options = new openbis.RoleAssignmentDeletionOptions();
  options.setReason("Logbook access removed in iLog");
  await api.deleteRoleAssignments([id], options);
}

/**
 * Get the active users and the user groups a role can be given to.
 * @param api - The OpenBIS JavaScript facade instance.
 */
export async function getAccessCandidates(api: openbis.OpenBISJavaScriptFacade): Promise<{
  users: { id: string; label: string }[];
  groups: { id: string; label: string }[];
}> {
  const [persons, groups] = await Promise.all([
    api.searchPersons(new openbis.PersonSearchCriteria(), new openbis.PersonFetchOptions()),
    api.searchAuthorizationGroups(
      new openbis.AuthorizationGroupSearchCriteria(), new openbis.AuthorizationGroupFetchOptions()
    ),
  ]);
  return {
    users: persons.getObjects()
      .filter((p) => p.isActive())
      .map((p) => {
        const name = [p.getFirstName(), p.getLastName()].filter(Boolean).join(" ");
        return { id: p.getUserId(), label: name ? `${name} (${p.getUserId()})` : p.getUserId() };
      })
      .sort((a, b) => a.label.localeCompare(b.label)),
    groups: groups.getObjects()
      .map((g) => ({
        id: g.getCode(),
        label: g.getDescription() ? `${g.getCode()} – ${g.getDescription()}` : g.getCode(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

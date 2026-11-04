import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const IS_ADMIN_QUERY_PREFIX = "IS_ADMIN";

function hasInstanceAdminRole(roleAssignments: openbis.RoleAssignment[] | null | undefined): boolean {
  return (roleAssignments ?? []).some(
    (assignment) => assignment.getRole() === "ADMIN" && assignment.getRoleLevel() === "INSTANCE"
  );
}

/**
 * Check whether a user is an openBIS instance admin, either directly or through a user group.
 * Only instance admins can create object types and change the ELN settings.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param userId - The user ID.
 */
export async function isInstanceAdmin(
  api: openbis.OpenBISJavaScriptFacade,
  userId: string,
): Promise<boolean> {
  const personCriteria = new openbis.PersonSearchCriteria();
  personCriteria.withUserId().thatEquals(userId);
  const personOptions = new openbis.PersonFetchOptions();
  personOptions.withRoleAssignments();
  const persons = await api.searchPersons(personCriteria, personOptions);
  if (persons.getObjects().some((person) => hasInstanceAdminRole(person.getRoleAssignments()))) {
    return true;
  }

  try {
    const groupCriteria = new openbis.AuthorizationGroupSearchCriteria();
    groupCriteria.withUser().withUserId().thatEquals(userId);
    const groupOptions = new openbis.AuthorizationGroupFetchOptions();
    groupOptions.withRoleAssignments();
    const groups = await api.searchAuthorizationGroups(groupCriteria, groupOptions);
    return groups.getObjects().some((group) => hasInstanceAdminRole(group.getRoleAssignments()));
  } catch (error) {
    // Users without the rights to list user groups are not admins
    console.warn("Could not read the user's groups:", error);
    return false;
  }
}

/**
 * Whether the logged-in user is an openBIS instance admin. Undefined while loading.
 */
export const useIsAdmin = () => {
  const { apiFacade, user, isAuthenticated } = useContext(AuthContext);

  return useQuery({
    queryKey: [IS_ADMIN_QUERY_PREFIX, user],
    queryFn: () => isInstanceAdmin(apiFacade, user!),
    enabled: isAuthenticated && !!user && !!apiFacade,
    // Roles rarely change during a session
    staleTime: 5 * 60 * 1000,
  });
};

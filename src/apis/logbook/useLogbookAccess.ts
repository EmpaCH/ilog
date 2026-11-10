import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import openbis from "@openbis/openbis.esm";
import { AuthContext } from "../../context/auth/authContext";
import {
  LogbookAccessHolder,
  LogbookAccessRole,
  getAccessCandidates,
  getLogbookAccess,
  grantLogbookAccess,
  revokeLogbookAccess,
} from "./logbookAccessAPI";

export const LOGBOOK_ACCESS_QUERY_PREFIX = "GET_LOGBOOK_ACCESS";

/**
 * Who has access to the logbook collection (roles on its project or space).
 */
export const useLogbookAccess = (collectionIdentifier: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [LOGBOOK_ACCESS_QUERY_PREFIX, collectionIdentifier],
    queryFn: () => getLogbookAccess(apiFacade, collectionIdentifier),
    refetchOnMount: "always",
  });
};

/**
 * The active users and user groups that access can be given to.
 */
export const useAccessCandidates = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [LOGBOOK_ACCESS_QUERY_PREFIX, "candidates"],
    queryFn: () => getAccessCandidates(apiFacade),
  });
};

export const useGrantLogbookAccess = (collectionIdentifier: string) => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holder, role }: { holder: LogbookAccessHolder; role: LogbookAccessRole }) =>
      grantLogbookAccess(apiFacade, collectionIdentifier, holder, role),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [LOGBOOK_ACCESS_QUERY_PREFIX, collectionIdentifier] }),
  });
};

export const useRevokeLogbookAccess = (collectionIdentifier: string) => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: openbis.IRoleAssignmentId) => revokeLogbookAccess(apiFacade, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [LOGBOOK_ACCESS_QUERY_PREFIX, collectionIdentifier] }),
  });
};

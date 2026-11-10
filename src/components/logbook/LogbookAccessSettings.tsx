import { useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import {
  LOGBOOK_ACCESS_ROLES,
  LogbookAccessRole,
  getLogbookProject,
} from "../../apis/logbook/logbookAccessAPI";
import {
  useAccessCandidates,
  useGrantLogbookAccess,
  useLogbookAccess,
  useRevokeLogbookAccess,
} from "../../apis/logbook/useLogbookAccess";

const roleLabels: Record<string, string> = {
  OBSERVER: "Observer – can view logbook entries",
  USER: "User – can view, create and edit logbook entries",
  POWER_USER: "Power user – user rights plus more, e.g. deleting entries of others",
  ADMIN: "Admin",
};

const shortRoleLabel = (role: string) => roleLabels[role]?.split(" – ")[0] ?? role;

/**
 * Settings section to manage who can use the logbook collection. openBIS gives roles per space or
 * project, so access is given on the project of the logbook collection. Roles on the whole space are
 * listed too, but are managed in openBIS.
 */
export const LogbookAccessSettings = ({ collectionIdentifier }: { collectionIdentifier: string }) => {
  const { space, project } = getLogbookProject(collectionIdentifier);
  const access = useLogbookAccess(collectionIdentifier);
  const candidates = useAccessCandidates();
  const grant = useGrantLogbookAccess(collectionIdentifier);
  const revoke = useRevokeLogbookAccess(collectionIdentifier);
  const [holderKind, setHolderKind] = useState<"group" | "user">("group");
  const [holderId, setHolderId] = useState("");
  const [role, setRole] = useState<LogbookAccessRole>("USER");
  const [error, setError] = useState<string | null>(null);

  const options = (holderKind === "user" ? candidates.data?.users : candidates.data?.groups) ?? [];
  const showError = (err: Error) => setError(err.message.split(" (Context:")[0]);

  const onGrant = () => {
    setError(null);
    grant.mutate(
      { holder: holderKind === "user" ? { userId: holderId } : { groupCode: holderId }, role },
      { onSuccess: () => setHolderId(""), onError: showError },
    );
  };

  return (
    <div className="flex flex-col gap-3 text-left">
      <h4 className="font-semibold">Access</h4>
      <p className="text-sm text-gray-600">
        Users can only see and create logbook entries with a role on the project /{space}/{project} of the
        logbook collection, or on the whole space /{space}. Giving the role to a user group means new
        colleagues get access as soon as they are added to the group. Instance admins always have access.
      </p>

      {access.isError && <p className="text-sm text-danger">{access.error.message.split(" (Context:")[0]}</p>}
      <Table aria-label="Logbook access" removeWrapper isStriped>
        <TableHeader>
          <TableColumn>Who</TableColumn>
          <TableColumn>Role</TableColumn>
          <TableColumn>Given on</TableColumn>
          <TableColumn align="end"> </TableColumn>
        </TableHeader>
        <TableBody
          isLoading={access.isLoading}
          loadingContent="Loading..."
          emptyContent="Nobody but the instance admins has access yet."
        >
          {(access.data ?? []).map((entry) => (
            <TableRow key={`${entry.level}-${entry.holder.kind}-${entry.holder.id}-${entry.role}`}>
              <TableCell>
                {entry.holder.kind === "group" ? `Group ${entry.holder.label}` : entry.holder.label}
              </TableCell>
              <TableCell>{shortRoleLabel(entry.role)}</TableCell>
              <TableCell>{entry.level === "PROJECT" ? `Project /${space}/${project}` : `Space /${space}`}</TableCell>
              <TableCell>
                {entry.level === "PROJECT" ? (
                  <Button
                    size="sm"
                    color="danger"
                    variant="light"
                    isLoading={revoke.isPending && revoke.variables === entry.id}
                    onPress={() => {
                      setError(null);
                      revoke.mutate(entry.id, { onError: showError });
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500">managed in openBIS</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-2">
        <RadioGroup
          orientation="horizontal"
          value={holderKind}
          onValueChange={(value) => {
            setHolderKind(value as "group" | "user");
            setHolderId("");
          }}
        >
          <Radio value="group">User group</Radio>
          <Radio value="user">Single user</Radio>
        </RadioGroup>
        <div className="flex flex-wrap gap-2 items-center">
          <Autocomplete
            aria-label={holderKind === "user" ? "User" : "User group"}
            placeholder={holderKind === "user" ? "Choose a user..." : "Choose a user group..."}
            className="flex-1 min-w-[14rem]"
            isLoading={candidates.isLoading}
            defaultItems={options}
            selectedKey={holderId || null}
            onSelectionChange={(key) => setHolderId(key?.toString() ?? "")}
          >
            {(item) => <AutocompleteItem key={item.id}>{item.label}</AutocompleteItem>}
          </Autocomplete>
          <Select
            aria-label="Role"
            className="flex-1 min-w-[14rem]"
            selectedKeys={[role]}
            disallowEmptySelection
            onSelectionChange={(keys) => setRole(Array.from(keys)[0] as LogbookAccessRole)}
          >
            {LOGBOOK_ACCESS_ROLES.map((r) => (
              <SelectItem key={r}>{roleLabels[r]}</SelectItem>
            ))}
          </Select>
          <Button color="primary" onPress={onGrant} isDisabled={!holderId} isLoading={grant.isPending}>
            Give access
          </Button>
        </div>
        {holderKind === "group" && candidates.isSuccess && candidates.data.groups.length === 0 && (
          <p className="text-xs text-gray-500">
            There are no user groups on this openBIS instance yet. They can be created in the openBIS admin UI.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
};

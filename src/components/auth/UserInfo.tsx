import openbis from "@openbis/openbis.esm";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { useGetCurrentUser } from "../../apis/user/useGetCurrentUser";

const renderTableRow = (person: openbis.Person) => {
  return (
    <TableRow key={person.getPermId().getPermId()}>
      <TableCell>{person.getUserId()}</TableCell>
      <TableCell>
        {new Date(person.getRegistrationDate()).toLocaleDateString()}
      </TableCell>
      <TableCell>{person.getRoleAssignments().flatMap(role=>`${role.getRole()}`)}</TableCell>
    </TableRow>
  );
};

const UserInfo = () => {
  const res = useGetCurrentUser();

  if (res.isLoading) {
    return <div>Loading...</div>;
  }

  if (res.isError) {
    return <div>Error: {res.error.message}</div>;
  }

  return (
    <div className="md-size-div">
      <h2>User Info</h2>
      <Table aria-label="User info">
        <TableHeader>
          <TableColumn>User ID</TableColumn>
          <TableColumn>Registration Date</TableColumn>
          <TableColumn>Permissions</TableColumn>
        </TableHeader>
        <TableBody>
          {res.data ? res.data.map((person) => renderTableRow(person)) : <></>}
        </TableBody>
      </Table>
    </div>
  );
};

export { UserInfo };

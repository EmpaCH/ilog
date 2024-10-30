import { useQuery } from '@tanstack/react-query';
import { useContext, useMemo } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import openbis from '@openbis/openbis.esm';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@nextui-org/react';

const renderTableRow = (person: openbis.Person) => {
  return (
    <TableRow key={person.getPermId().getPermId()}>
      <TableCell>{person.getUserId()}</TableCell>
      <TableCell>{new Date(person.getRegistrationDate()).toLocaleDateString()}</TableCell>
    </TableRow>
  );
};

const UserInfo = () => {
  const { apiFacade, user } = useContext(AuthContext);

  const res = useQuery({
    queryKey: ["user", user],
    queryFn: async () => {
      const fo = new openbis.PersonFetchOptions();
      const sc = new openbis.PersonSearchCriteria();
      sc.withUserId().thatEquals(user as string);
      fo.withSpace();
      const queryResult = await apiFacade.searchPersons(
        sc,
        fo
      );
      return queryResult.getObjects();
    },
  });

  const users = useMemo(() => {
    return res.data ? [...res.data] : [];
  }, [res]);

  return (
    <div className="md-size-div">
      <h2>User Info</h2>
      <Table aria-label="User info">
        <TableHeader>
          <TableColumn>User ID</TableColumn>
          <TableColumn>Registration Date</TableColumn>
        </TableHeader>
        <TableBody>
          {users.map((person) => (
            renderTableRow(person)
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserInfo;

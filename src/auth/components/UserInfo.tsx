import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { LoginContext } from "../LoginContext";
import openbis from "@openbis/openbis.esm";
import { Table, Row, Form } from "react-bootstrap";

const TableRow = ({ person }: { person: openbis.Person }) => {
  return (
    <tr key={person.getPermId().getPermId()}>
      <td>{person.getUserId()}</td>
      <td>{person.getFirstName()}</td>
      <td>{new Date(person.getRegistrationDate()).toLocaleDateString()}</td>
    </tr>
  );
};

const UserInfo = () => {
  const { apiFacade, user, isAuthenticated } = useContext(LoginContext);

  const res = useQuery({
    queryKey: ["user", user],
    queryFn: async () => {
      const fo = new openbis.PersonFetchOptions();
      const sc = new openbis.PersonSearchCriteria();
      sc.withUserId().thatEquals(user);
      fo.withSpace();
      const queryResult = await apiFacade.searchPersons(
        sc,
        fo
      );
      return queryResult.getObjects();
    },
  });

  return (
    <div>
      <h2>User Info</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Registration date</th>
          </tr>
        </thead>
        <tbody>
          {res.data?.map((person) => (
            <TableRow key={person.getUserId()} person={person} />
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default UserInfo;

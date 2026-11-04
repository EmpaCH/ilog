import { ReactNode, useContext } from "react";
import { AuthContext } from "../context/auth/authContext";
import Login from "./Login";

const TestComponent = ({ children }: { children: ReactNode }) => {
  const api = useContext(AuthContext);
  return <div>{api.isAuthenticated ? children : <Login />}</div>;
};

export default TestComponent;

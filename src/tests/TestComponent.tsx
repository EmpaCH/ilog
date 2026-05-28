import { ReactNode, useContext } from "react";
import { AuthContext } from "../context/auth/authContext";
import Login from "./Login";
import InitComponent from "./InitComponent";

const TestComponent = ({ children }: { children: ReactNode }) => {
  const api = useContext(AuthContext);
  return <div>{api.isAuthenticated ? <InitComponent>{children}</InitComponent> : <Login />}</div>;
};

export default TestComponent;

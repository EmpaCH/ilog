import { ReactNode, useContext } from "react";
import { AuthContext } from "../context/auth/authContext";
import Login from "./Login";
import { useInitIlog } from "../apis/shared/useInitIlog";
import InitComponent from "./InitComponent";

// const InitComponent = ({ children }: { children: ReactNode }) => {
//     const initResult = useInitIlog();
//     initResult.mutate();
//     if (initResult.status === "pending") {
//       return <div>Loading...</div>;
//     }else if (initResult.status === "error") {
//       return <div>Error: {initResult.error.message}</div>;
//     }
//     else if (initResult.status === "success") {
//       return <div>{children}</div>;
//     }
//   }


const TestComponent = ({ children }: { children: ReactNode }) => {
    const api = useContext(AuthContext);
    return <div>{api.isAuthenticated ? <InitComponent>{children}</InitComponent> : <Login />}</div>;
  };

export default TestComponent;
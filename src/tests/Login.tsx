import { useContext } from "react";
import { AuthContext } from "../context/auth/authContext";

const Login = () => {
  const api = useContext(AuthContext);
  return (
    <div>
      <button
        onClick={async () => {
          await api.login("admin", "mysecretpassword");
        }}
      >
        Login
      </button>
    </div>
  );
};

export default Login;

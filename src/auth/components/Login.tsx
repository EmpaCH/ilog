import { LoginContext } from "../LoginContext";
import { useContext, useState } from "react";
import { Alert } from "react-bootstrap";
import { useLocation, useNavigate } from "@tanstack/react-router";

function Login() {
  const { login, apiFacade } = useContext(LoginContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formValues = form.elements as typeof form.elements & {
      username: { value: string };
      password: { value: string };
    };
    console.log(formValues.username.value);
    console.log(formValues.password.value);
    login(formValues.username.value, formValues.password.value)
      .then(() => {
        console.log("Logged in");
        const searchParams = new URLSearchParams(location.search);
        const redirectTo = searchParams.get("redirect") || "/";
        navigate({ to: redirectTo });
      })
      .catch((e) => {
        console.log("Login failed");
        setShowError(true);
        setErrorMessage("Login failed");
      });
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" id="username" />
        <input type="password" placeholder="Password" id="password" />
        <button type="submit">Login</button>
      </form>
      <Alert variant="error" show={showError}>
        {errorMessage}
      </Alert>
    </div>
  );
}

export default Login;

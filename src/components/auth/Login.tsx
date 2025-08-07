import { useContext, useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { Button, Input, Divider } from "@heroui/react";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { AuthContext } from '../../context/auth/authContext';
import '../../assets/styles/Login.css';

function Login() {
  const { login, isLoading } = useContext(AuthContext);
  const router = useRouter();

  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formValues = form.elements as typeof form.elements & {
      username: { value: string };
      password: { value: string };
    };

    login(formValues.username.value, formValues.password.value)
    .then(async (res) => {
      if (res) {
        console.log('Login successful.');
        // Small delay to ensure auth state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        await router.invalidate();
      } else {
        setShowError(true);
        setErrorMessage('Login failed. Please check your credentials.');
      }
    });
  };

  return (
    <div className="main-div">
      <div className="login-div">
        <h2>Log In</h2>
        <form onSubmit={handleSubmit}>
          <Input
            isRequired
            id="username"
            label="Username"
            type="text"
            className="form-field"
          />
          <Input
            isRequired
            id="password"
            label="Password"
            endContent={
              <Button isIconOnly variant="light" type="button" onPress={toggleVisibility} aria-label="toggle password visibility">
                {isVisible ? (
                  <VisibilityIcon className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <VisibilityOffIcon className="text-2xl text-default-400 pointer-events-none" />
                )}
              </Button>
            }
            type={isVisible ? "text" : "password"}
            className="form-field"
          />
          <Button type="submit" color="primary" className="login-button">
            Submit
          </Button>
        </form>
        {showError && (
          <div className="login-error-msg">
            {errorMessage}
          </div>
        )}
        <Divider className="my-4" />
        <Link to="/" className="[&.active]:font-bold">
          Back
        </Link>
      </div>
    </div>
  );
}

export default Login;

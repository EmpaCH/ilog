import { useContext, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button, Input, Divider } from "@heroui/react";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { AuthContext } from '../../context/auth/authContext';
import '../../assets/styles/Login.css';
import { router } from '../../router';

function Login() {
  const { login, loginWithToken, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'token'>('credentials');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleVisibility = () => setIsVisible(!isVisible);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formValues = form.elements as typeof form.elements & {
      username: { value: string };
      password: { value: string };
      token: { value: string };
    };

    const onSuccess = () => {
      console.log('Login successful.');
      setTimeout(async () => {
        await router.invalidate();
      }, 50);
    };

    const onError = (error: string) => {
      setShowError(true);
      setErrorMessage(error);
    };

    // Clear any previous errors
    setShowError(false);
    
    if (loginMethod === 'token') {
      loginWithToken(formValues.token.value, onSuccess, onError);
    } else {
      login(formValues.username.value, formValues.password.value, onSuccess, onError);
    }
  };  return (
    <div className="main-div">
      <div className="login-div">
        <h2>Log In</h2>
        
        {/* Login method toggle */}
        <div className="mb-4">
          <Button
            color={loginMethod === 'credentials' ? 'primary' : 'default'}
            variant={loginMethod === 'credentials' ? 'solid' : 'bordered'}
            size="sm"
            onPress={() => setLoginMethod('credentials')}
            className="mr-2"
          >
            Username & Password
          </Button>
          <Button
            color={loginMethod === 'token' ? 'primary' : 'default'}
            variant={loginMethod === 'token' ? 'solid' : 'bordered'}
            size="sm"
            onPress={() => setLoginMethod('token')}
          >
            Personal Access Token
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          {loginMethod === 'credentials' ? (
            <>
              <Input
                isRequired
                id="username"
                name="username"
                label="Username"
                type="text"
                className="form-field"
              />
              <Input
                isRequired
                id="password"
                name="password"
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
            </>
          ) : (
            <Input
              isRequired
              id="token"
              name="token"
              label="Personal Access Token"
              type="password"
              placeholder="Enter your personal access token"
              className="form-field"
              description="Use your OpenBIS personal access token to authenticate"
            />
          )}
          <Button 
            type="submit" 
            color="primary" 
            className="login-button"
          >
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

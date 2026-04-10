import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Input, Divider } from "@heroui/react";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { AuthContext } from '../../context/auth/authContext';
import '../../assets/styles/Login.css';
import { router } from '../../router';

function Login() {
  const { login, loginWithToken } = useContext(AuthContext);

  const [isVisible, setIsVisible] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'token'>('credentials');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginMethod === 'token') {
      const form = event.currentTarget as HTMLFormElement;
      const formValues = form.elements as typeof form.elements & {
        token: { value: string };
      };
      setShowError(false);

      try {
        const result = await loginWithToken(formValues.token.value);
        if (result) {
          console.log('Login successful.');
          setTimeout(async () => {
            await router.invalidate();
          }, 50);
        } else {
          setShowError(true);
          setErrorMessage('Login failed - invalid credentials');
        }
      } catch (error: any) {
        setShowError(true);
        setErrorMessage(error?.message || 'Login failed');
      }
    } else {
      const form = event.currentTarget as HTMLFormElement;
      const formValues = form.elements as typeof form.elements & {
        username: { value: string };
        password: { value: string };
      };
      setShowError(false);

      try {
        const result = await login(formValues.username.value, formValues.password.value);
        if (result) {
          console.log('Login successful.');
          setTimeout(async () => {
            await router.invalidate();
          }, 50);
        } else {
          setShowError(true);
          setErrorMessage('Login failed - invalid credentials');
        }
      } catch (error: any) {
        setShowError(true);
        setErrorMessage(error?.message || 'Login failed');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <header className="w-full flex items-center justify-between p-4">
        <div className="flex items-end gap-3">
          <img src="/openbis_logo.png" alt="openBIS logo" className="h-10 logo-margin"/>
          <div className="text-2xl font-bold">iLog</div>
        </div>
        <img src="/company_logo.png" alt="Company logo" className="h-16" />
      </header>
      <div className="login-div">
        <h2 className="mb-4">Log In</h2>
        <Divider className="my-4" />
        {/* Login method toggle */}
        <div className="mb-6">
          <span className="text-sm mr-4">Select Login Method:</span>
          <Button
            color={loginMethod === 'credentials' ? 'primary' : 'default'}
            variant={loginMethod === 'credentials' ? 'solid' : 'ghost'}
            size="sm"
            onPress={() => setLoginMethod('credentials')}
            className="mr-2"
          >
            Username & Password
          </Button>
          <Button
            color={loginMethod === 'token' ? 'primary' : 'default'}
            variant={loginMethod === 'token' ? 'solid' : 'ghost'}
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
              label="PAT"
              type="password"
              className="form-field"
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

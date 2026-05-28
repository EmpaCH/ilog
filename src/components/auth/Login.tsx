import { useContext, useState } from 'react';
import { Button, Input, Divider, SelectItem , Select } from "@heroui/react";
import { AuthContext } from '../../context/auth/authContext';
import '../../assets/styles/Login.css';
import { OPENBIS_INSTANCES } from '../../config/instances';

function Login() {
  const { loginWithToken } = useContext(AuthContext);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedHostname, setSelectedHostname] = useState<string | undefined>(undefined);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formValues = form.elements as typeof form.elements & {
      token: { value: string };
    };
    setShowError(false);

    try {
      const result = await loginWithToken(formValues.token.value, selectedHostname || undefined);
      if (!result) {
        setShowError(true);
        setErrorMessage('Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      setShowError(true);
      setErrorMessage(error?.message || 'Login failed');
    }
  };

  return (
    <div className="login-div">
      <h2 className="mb-4">Welcome!</h2>
      <Divider className="my-4" />
      <p className="mb-6">Please, log in with your PAT.</p>
      <form onSubmit={handleSubmit}>
        <Select
          fullWidth
          value={selectedHostname}
          onChange={(event) => {
            const value = event.target.value;
            setSelectedHostname(value || undefined);
          }}
          placeholder="Select your openBIS instance"
          aria-label="Select your openBIS instance"
        >
          {OPENBIS_INSTANCES.map((instance) => (
            <SelectItem  key={instance.hostname} id={instance.hostname} textValue={instance.label}>
              {instance.label}
            </SelectItem >
          ))}
        </Select>
        <Input
          isRequired
          id="token"
          name="token"
          label="Personal Access Token"
          type="password"
          className="form-field"
        />
        <Divider className="my-4" />
        <Button
          type="submit" 
          color="primary" 
          className="login-button"
        >
          Log In
        </Button>
      </form>
      {showError && (
        <div className="login-error-msg">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default Login;

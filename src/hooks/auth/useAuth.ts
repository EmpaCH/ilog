import openbis from '@openbis/openbis.esm';
import { useState, useEffect } from 'react';

class OpenBISApiFacade {
  private static instance: openbis.openbis;

  private constructor() {}

  public static getInstance(url: string): openbis.openbis {
    if (!OpenBISApiFacade.instance) {
      OpenBISApiFacade.instance = new openbis.openbis(url);
    }
    return OpenBISApiFacade.instance;
  }
}

const openBISHookFactory = (url: string) => {
  const apiFacade = OpenBISApiFacade.getInstance(url);

  return () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Check for token and user in localStorage on initialization
    useEffect(() => { 
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        verifyToken(storedToken, storedUser)
        .then(() => {
          console.log('Token verified');
        })
        .catch((e) => {
          removeLoginInfo();
        })
      }
    });

    // Function to verify token validity
    const verifyToken = async (token: string, user: string) => {
      try {
        apiFacade.setSessionToken(token);
        await apiFacade.getServerInformation();
        await setLoginInfo(user, token);
      } catch (e) {
        throw new Error('Token verification failed');
      }
    };

    // Login function
    const login = async (username: string, password: string) => {
      console.log('Logging in...');
      try {
        const sessionToken = await apiFacade.login(username, password); // Assuming login returns a token
        await setLoginInfo(username, sessionToken);
      } catch (e) {
        throw new Error(e as string);
      }
    };

    // Logout function
    const logout = async () => {
      await apiFacade.logout();
      removeLoginInfo();
    };

    // Helper function to set user/token info on successfull login
    async function setLoginInfo(
      user: string,
      token: string
    ) {
      setIsAuthenticated(true);
      setUser(user);
      setToken(token);
      localStorage.setItem('user', user);
      localStorage.setItem('token', token);
    }

    // Helper function to remove user/token info on logout
    function removeLoginInfo() {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }

    return {
      isAuthenticated,
      user,
      token,
      login,
      logout,
      apiFacade,
    };
  };
};

export const useOpenBIS = openBISHookFactory('/openbis/');

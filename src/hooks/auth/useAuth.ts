import openbis from "@openbis/openbis.esm";
import { useState, useEffect } from "react";

/**
 * A factory to create singleton instances of the openBIS API facade.
 */
export class OpenBISApiFacade {
  private static instances: Map<string, openbis.openbis> = new Map();

  private constructor() {}

  public static getInstance(url: string): openbis.openbis {
    console.log("Getting instance with URL:", url);
    if (OpenBISApiFacade.instances.get(url) === undefined) {
      console.log("Creating new instance with URL:", url);
      OpenBISApiFacade.instances.set(url, new openbis.openbis(url));
    }
    console.log("Returning instance with URL:", url);
    const current = OpenBISApiFacade.instances.get(url) as openbis.openbis;
    return current;
  }
}

export const TOKEN_KEY = "token";
export const USER_KEY = "user";

export const openBISHookFactory = (url: string) => {
  return () => {
    //const apiFacade = new openbis.openbis(url);
    const apiFacade = OpenBISApiFacade.getInstance(url);
    // @ts-ignore
    apiFacade._private.log = () => {};
    const id = new Date();
    const idLogger = (...msgs: any) => {
      console.log(`Facade created, ${msgs}`);
    };
    idLogger(`Creating hook with URL: ${url}`);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Add loading state

    // // Check for token and user in localStorage on initialization
    useEffect(() => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      idLogger(`Stored token: ${storedToken}`);
      const checkStoredToken = async () => {
        if (storedToken !== null && storedUser !== null) {
          const result = await verifyToken(storedToken, storedUser);
          idLogger("Token verified");
          if (result) {
            idLogger("Token is valid");
            setLoginInfo(storedUser, storedToken);
          } else {
            removeLoginInfo();
          }
        } else {
          idLogger("No token stored");
          //removeLoginInfo();
        }
        setIsLoading(false); // Set loading to false after check
      };
      checkStoredToken();
      //   const result = await verifyToken(storedToken, storedUser).then((res) => {
      //     idLogger("Token verified");
      //     if (res) {
      //       idLogger("Token is valid");
      //       setLoginInfo(storedUser, storedToken);
      //     } else {
      //       removeLoginInfo();
      //     }
      //   });
      // } else {
      //   idLogger("No token stored");
      //   removeLoginInfo();
      // }}
    }, []);

    // Function to verify token validity
    const verifyToken = async (token: string, _user: string) => {
      try {
        apiFacade.setSessionToken(token);
        await apiFacade.getServerInformation();
        return true;
      } catch (e) {
        return false;
      }
    };

    // Login function
    const login = async (
      username: string,
      password: string
    ): Promise<string | null> => {
      idLogger("Logging in...");
      try {
        //apiFacade.setSessionToken(null);

        const sessionToken = await apiFacade.login(username, password); // Assuming login returns a token
        idLogger("Login successful");
        if (sessionToken === undefined) {
          return null;
        }
        setLoginInfo(username, sessionToken);

        return sessionToken;
      } catch (e) {
        idLogger("Login failed");
        removeLoginInfo();
        return null;
      }
    };

    // Logout function
    const logout = async () => {
      await apiFacade.logout();
      removeLoginInfo();
    };

    // Helper function to set user/token info on successfull login
    function setLoginInfo(user: string, token: string) {
      setIsAuthenticated(true);
      setUser(user);
      setToken(token);
      apiFacade.setSessionToken(token);
      idLogger(`Setting token: ${token}`);
      localStorage.setItem(USER_KEY, user);
      localStorage.setItem(TOKEN_KEY, token);
      idLogger(`Stored token: ${localStorage.getItem(TOKEN_KEY)}`);
    }

    // Helper function to remove user/token info on logout
    function removeLoginInfo() {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setIsLoading(false); // Set loading to false when removing login info
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    return {
      isAuthenticated,
      user,
      token,
      login,
      logout,
      apiFacade,
      url,
      id,
      isLoading, // Return loading state
    };
  };
};

export const useOpenBIS = openBISHookFactory("/openbis/");
